// Stands in for the Anthropic SDK in the browser bundle. Model calls belong on the server, where the
// API key lives; in the page the rule extractors run alone, so nothing here is ever called.
const serverOnly = () => {
  throw new Error("Claude extraction runs on the server; this page runs the rule extractors");
};

export default class Anthropic {
  beta = { messages: { parse: async (_params: Record<string, unknown>): Promise<{ parsed_output: unknown; stop_reason: string | null; model: string }> => serverOnly() } };
}

export const betaZodOutputFormat = (_schema: unknown): never => serverOnly();
