import type { AgentTask } from "@/types";

/**
 * User-visible progress labels shown while an agent runs.
 * These describe WHAT the agent is doing (tool/system steps), never its private reasoning.
 */
export const TASK_STEPS: Record<AgentTask, string[]> = {
  "intake.analyse": [
    "Reading intake request",
    "Retrieving procurement policy PP-3 and IS-2",
    "Classifying spend category",
    "Checking thresholds and completeness",
    "Preparing evidence summary",
  ],
  "rfx.generate": [
    "Loading approved RFP template (IT platforms v4.2)",
    "Mapping requirements from approved demand",
    "Drafting scope, requirements and questions",
    "Applying evaluation methodology and weightings",
    "Assembling timetable",
  ],
  "rfx.policy": ["Loading policy library", "Comparing RFx against 7 policy rules", "Summarising findings"],
  "supplier.assess": [
    "Retrieving supplier master records",
    "Running sanctions screening (5 lists)",
    "Reading performance scorecards",
    "Querying external risk feed (permitted use only)",
    "Identifying conflicts and diligence gaps",
    "Preparing shortlist recommendation",
  ],
  "evaluation.analyse": [
    "Opening sealed submissions (4)",
    "Checking mandatory requirements pass/fail",
    "Scoring against published criteria",
    "Applying risk adjustments from Supplier 360",
    "Computing weighted totals",
  ],
  "evaluation.deviations": ["Comparing responses to RFx terms", "Classifying deviations"],
  "evaluation.missing": ["Checking responses to all mandatory questions", "Listing gaps"],
  "evaluation.commercial": ["Normalising pricing to 3-year TCO", "Testing assumptions and exclusions"],
  "evaluation.brief": ["Collating scores and findings", "Drafting committee brief", "Formatting decision record"],
  "approval.prepare": [
    "Reading delegation-of-authority matrix",
    "Validating value AED 2.15M against thresholds",
    "Determining required approvers (6)",
    "Assembling decision pack",
    "Routing to approvers",
  ],
  "contract.extract": [
    "Parsing contract (64 pages, 38 clauses)",
    "Extracting obligations and SLAs",
    "Extracting payment milestones",
    "Identifying renewal, termination and penalty terms",
    "Flagging data and security obligations",
    "Summarising key risks",
  ],
  "contract.ask": ["Searching contract clauses", "Composing cited answer"],
  "monitoring.assess": [
    "Detecting event from delivery tracker",
    "Linking to contract milestone M3",
    "Identifying affected obligations",
    "Recalculating supplier risk score",
    "Preparing recommended actions",
  ],
};
