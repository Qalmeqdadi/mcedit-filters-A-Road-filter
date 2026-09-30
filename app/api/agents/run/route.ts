import { NextResponse } from "next/server";
import { AGENT_BY_ID } from "@/data/agents";
import { MOCK_RESPONSES } from "@/agents/mock-responses";
import type { AgentRunRequest, AgentRunResult } from "@/types";

/**
 * Server-side bridge to an OpenAI-compatible LLM. Not used by the default
 * mock provider. Returns 501 when no key is configured so the client falls
 * back to deterministic responses.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as AgentRunRequest;
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  const agent = AGENT_BY_ID[body.agentId];
  const template = MOCK_RESPONSES[body.task];

  if (!agent || !template) return NextResponse.json({ error: "Unknown agent or task" }, { status: 400 });
  if (!baseUrl || !apiKey) return NextResponse.json({ error: "LLM provider not configured" }, { status: 501 });

  // The mock result doubles as the JSON schema example the model must follow.
  const example = template(body.input);
  const system = [
    `You are the ${agent.name} in an enterprise procurement platform.`,
    `Mission: ${agent.mission}`,
    `You may: ${agent.permissions.join("; ")}. You must never: ${agent.prohibited.join("; ")}.`,
    "Return ONLY JSON with keys `output` and `reasoning`, matching the example shape exactly.",
    "`reasoning` is a concise evidence summary (evidence, rulesApplied, recommendation, confidence 0-1, humanDecision) — never a step-by-step chain of thought.",
  ].join("\n");

  const started = Date.now();
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "api-key": apiKey },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ task: body.task, input: body.input ?? null, example }) },
      ],
    }),
  });
  if (!res.ok) return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });

  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  const result: AgentRunResult = {
    agentId: body.agentId,
    task: body.task,
    output: parsed.output ?? example.output,
    reasoning: parsed.reasoning ?? example.reasoning,
    provider: `openai-compatible:${model}`,
    durationMs: Date.now() - started,
    completedAt: new Date().toISOString(),
  };
  return NextResponse.json(result);
}
