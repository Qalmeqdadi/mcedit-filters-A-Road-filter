import type { AgentId, Finding, Recommendation } from "@/lib/types";
import { Agent, type AgentContext } from "./agent";

export class OperationsAgent extends Agent {
  protected readonly tagSource = "production-plan" as const;
  constructor() {
    super("operations");
  }
  /** The coordinating agent owns the consolidated recommendation set. */
  recommend(ctx: AgentContext, _findings: Finding[]): Recommendation[] {
    return ctx.pack.recommendations.map((r, i) => ({ id: `${ctx.investigationId}-rec-${i}`, ...r }));
  }
}

export class ProcessAgent extends Agent {
  protected readonly tagSource = "historian" as const;
  constructor() {
    super("process");
  }
}

export class AssetAgent extends Agent {
  protected readonly tagSource = "asset-health" as const;
  constructor() {
    super("asset");
  }
  // machinery signals are noisier — require a larger deviation
  protected significance() {
    return 3;
  }
}

export class EnergyAgent extends Agent {
  protected readonly tagSource = "historian" as const;
  constructor() {
    super("energy");
  }
  protected significance() {
    return 1;
  }
}

export class QualityAgent extends Agent {
  protected readonly tagSource = "lab" as const;
  constructor() {
    super("quality");
  }
  // purity is reported in wt% — tiny relative changes matter
  protected significance(tagId: string) {
    return tagId === "MEOH-PURITY" ? 0.03 : 5;
  }
}

export class HseAgent extends Agent {
  protected readonly tagSource = "procedures" as const;
  constructor() {
    super("hse");
  }
}

export class EngineeringAgent extends Agent {
  protected readonly tagSource = "documents" as const;
  constructor() {
    super("engineering");
  }
}

export class ProductionAgent extends Agent {
  protected readonly tagSource = "production-plan" as const;
  constructor() {
    super("production");
  }
}

export class ShiftAgent extends Agent {
  protected readonly tagSource = "procedures" as const;
  constructor() {
    super("shift");
  }
}

export function createAgentRegistry(): Record<AgentId, Agent> {
  return {
    operations: new OperationsAgent(),
    process: new ProcessAgent(),
    asset: new AssetAgent(),
    energy: new EnergyAgent(),
    quality: new QualityAgent(),
    hse: new HseAgent(),
    engineering: new EngineeringAgent(),
    production: new ProductionAgent(),
    shift: new ShiftAgent(),
  };
}
