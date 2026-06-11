import { Agent, Client, EngagementRecord, PipelineProfile, Project } from "./types";

// Compresses the full event storm JSON into a compact domain vocabulary summary.
// Used when injecting event storm as frozen context into downstream agents,
// keeping token count low while preserving all essential domain concepts.
export function compressEventStorm(raw: string): string {
  try {
    const es = JSON.parse(raw) as Record<string, unknown>;

    type Named = { name?: string; description?: string; statement?: string };
    type Aggregate = { name?: string; commands?: string[]; events?: string[]; handles_commands?: string[]; emits_events?: string[] };

    const names = (arr: unknown) =>
      Array.isArray(arr) ? (arr as Named[]).map((x) => x.name).filter(Boolean) : [];

    const domain_events = names(es.domain_events);
    const commands = names(es.commands);

    const aggregates = Array.isArray(es.aggregates)
      ? (es.aggregates as Aggregate[]).map((a) => ({
          name: a.name,
          handles_commands: a.commands ?? a.handles_commands ?? [],
          emits_events: a.events ?? a.emits_events ?? [],
        }))
      : [];

    const business_rules = Array.isArray(es.policies)
      ? (es.policies as Named[]).map((p) => p.statement ?? p.description ?? p.name).filter(Boolean)
      : [];

    const bounded_contexts = names(es.bounded_contexts);
    const ubiquitous_language = Array.isArray(es.ubiquitous_language)
      ? (es.ubiquitous_language as { term?: string; definition?: string }[]).map(
          (u) => `${u.term}: ${u.definition}`
        )
      : [];

    return JSON.stringify(
      { domain_events, commands, aggregates, business_rules, bounded_contexts, ubiquitous_language },
      null,
      2
    );
  } catch {
    return raw; // fall back to full output if parse fails
  }
}

export const PHASE_COLORS: Record<string, string> = {
  Plan: "#5C4EE5",
  Design: "#0F6E56",
  Architecture: "#9B3D1E",
  Review: "#0891B2",
  Build: "#1A56DB",
  Eval: "#6B21A8",
};

// Agents whose Drive file is updated in-place (one living doc per project).
// All others always create a new versioned file on each save.
export const LIVING_DOC_AGENTS = new Set([
  "cps",
  "prd",
  "architecture",
  "domain_model",
  "principles",
]);

const e = process.env;

export const INITIAL_AGENTS: Agent[] = [
  // ── Plan ────────────────────────────────────────────────────────────────
  {
    id: "meeting_input",
    name: "Meeting Input",
    desc: "Upload · transcript · notes · any form of input",
    phase: "Plan",
    phaseColor: PHASE_COLORS.Plan,
    pipelineId: null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "meeting_copilot",
    name: "Meeting Co-Pilot",
    desc: "Pre-meeting checklist · live transcript update · gap report",
    phase: "Plan",
    phaseColor: PHASE_COLORS.Plan,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_MEETING_COPILOT || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "stt",
    name: "STT Agent",
    desc: "xAI Grok · audio transcription",
    phase: "Plan",
    phaseColor: PHASE_COLORS.Plan,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_STT || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "summarise",
    name: "Summarisation Agent",
    desc: "What worked · gaps · options — AI summarisation",
    phase: "Plan",
    phaseColor: PHASE_COLORS.Plan,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_SUMMARISE || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "cps",
    name: "CPS Agent",
    desc: "Context · Problem · Solution document generator",
    phase: "Plan",
    phaseColor: PHASE_COLORS.Plan,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_CPS || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "prd",
    name: "PRD Agent",
    desc: "Continuously updated living product requirements document",
    phase: "Plan",
    phaseColor: PHASE_COLORS.Plan,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_PRD || null,
    output: "",
    status: "idle",
    lastRun: null,
  },

  {
    id: "jarvis",
    name: "Jarvis",
    desc: "Technical & domain Q&A · answers what you don't know mid-conversation",
    phase: "Plan",
    phaseColor: PHASE_COLORS.Plan,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_JARVIS || null,
    output: "",
    status: "idle",
    lastRun: null,
  },

  // ── Design ───────────────────────────────────────────────────────────────
  {
    id: "event_storm",
    name: "Event Storming Agent",
    desc: "Domain event identification and bounded context mapping",
    phase: "Design",
    phaseColor: PHASE_COLORS.Design,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_EVENT_STORM || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "spec",
    name: "Spec Agent",
    desc: "API contracts · data schemas · integration specs · technical constraints",
    phase: "Architecture",
    phaseColor: PHASE_COLORS.Architecture,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_SPEC || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "principles",
    name: "Principles Agent",
    desc: "Principles · HITL · no hallucinations · audit trail · ubiquitous language",
    phase: "Design",
    phaseColor: PHASE_COLORS.Design,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_PRINCIPLES || null,
    output: "",
    status: "idle",
    lastRun: null,
  },

  // ── Architecture ─────────────────────────────────────────────────────────
  {
    id: "domain_model",
    name: "Domain Model Agent",
    desc: "Entities · aggregates · value objects",
    phase: "Design",
    phaseColor: PHASE_COLORS.Design,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_DOMAIN_MODEL || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "architecture",
    name: "Architecture Agent",
    desc: "Technical blueprint · data transfer design",
    phase: "Architecture",
    phaseColor: PHASE_COLORS.Architecture,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_ARCHITECTURE || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "agents_md",
    name: "Agents.md Agent",
    desc: "Code-level agent context file · AI-consumable spec",
    phase: "Architecture",
    phaseColor: PHASE_COLORS.Architecture,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_AGENTS_MD || null,
    output: "",
    status: "idle",
    lastRun: null,
  },

  // ── Review ───────────────────────────────────────────────────────────────
  {
    id: "security_agent",
    name: "Security Agent",
    desc: "Inherit · configure · gap — security posture review",
    phase: "Review",
    phaseColor: PHASE_COLORS.Review,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_SECURITY || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "doc_agent",
    name: "Doc Agent",
    desc: "Fills the definition template — pre-build definition doc for sign-off",
    phase: "Review",
    phaseColor: PHASE_COLORS.Review,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_DOCS || null,
    output: "",
    status: "idle",
    lastRun: null,
  },

  // ── Build ─────────────────────────────────────────────────────────────────
  {
    id: "pm_agent",
    name: "PM Agent",
    desc: "Generates structured tickets from agents.md spec",
    phase: "Build",
    phaseColor: PHASE_COLORS.Build,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_PM || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
  {
    id: "reverse_doc",
    name: "Reverse Doc Agent",
    desc: "Handover document · what was built · backlog · audit",
    phase: "Build",
    phaseColor: PHASE_COLORS.Build,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_REVERSE_DOC || null,
    output: "",
    status: "idle",
    lastRun: null,
  },

  // ── Eval ──────────────────────────────────────────────────────────────────
  {
    id: "eval_agent",
    name: "Evaluation Agent",
    desc: "LangSmith · client-defined thresholds · HITL queue",
    phase: "Eval",
    phaseColor: PHASE_COLORS.Eval,
    pipelineId: e.NEXT_PUBLIC_PIPELINE_EVAL || null,
    output: "",
    status: "idle",
    lastRun: null,
  },
];

// Auto-chain: maps each agent to the next one in the pipeline
export const NEXT_AGENT: Record<string, string> = {
  meeting_input:    "summarise",
  stt:              "summarise",
  summarise:     "cps",
  cps:           "prd",
  prd:           "event_storm",
  event_storm:   "principles",
  principles:    "domain_model",
  domain_model:  "architecture",
  architecture:  "spec",
  spec:           "agents_md",
  agents_md:      "security_agent",
  security_agent: "doc_agent",
  doc_agent:      "reverse_doc",
  reverse_doc:    "eval_agent",
};

// Agents that require human approval before auto-chaining to them
export const HITL_AGENTS = new Set([
  "meeting_copilot", // interactive 3-tab tool — must be opened manually, never auto-run
  "cps",          // review summary before generating CPS
  "prd",          // sign-off on CPS before generating PRD
  "event_storm",  // Plan → Design phase boundary
  "principles",   // session-notes agent — runs deliberately, not automatically
  "architecture",   // Design → Architecture phase boundary
  "security_agent", // Architecture → Review phase boundary
  "reverse_doc",    // Review sign-off gate → Build phase boundary
  "eval_agent",     // Build → Eval phase boundary
]);

// Maps each agent to the one whose output it should consume
export const PREVIOUS_AGENT: Record<string, string> = {
  summarise:    "meeting_input",
  cps:          "summarise",
  prd:          "cps",
  // principles has no PREVIOUS_AGENT — input comes from session notes
  domain_model: "principles",
  architecture: "domain_model",
  spec:         "architecture",
  agents_md:      "spec",
  security_agent: "agents_md",
  doc_agent:      "security_agent",
  pm_agent:       "prd",
  reverse_doc:    "doc_agent",
  eval_agent:     "reverse_doc",
};

// Secondary "use output" button — shown alongside the primary PREVIOUS_AGENT button
export const SECONDARY_AGENT: Record<string, string> = {
  event_storm:  "prd",
  domain_model: "prd",
};

// Fallback chain: if the primary PREVIOUS_AGENT has no output, use this instead.
// security_agent normally reads agents_md — in Quick mode (Architecture bypassed),
// it falls back to prd, which is the best available description of what's being built.
export const FALLBACK_AGENT: Record<string, string> = {
  security_agent: "prd",
};

// Additional context agents: outputs injected alongside the direct chain input
// These agents' outputs are prepended as shared context when the target agent runs
export const CONTEXT_AGENTS: Record<string, string[]> = {
  // principles takes no frozen context — session notes are the source of truth
  domain_model: ["event_storm", "prd"],
  architecture: ["event_storm", "principles"],
  spec:           ["domain_model", "principles"],
  agents_md:      ["architecture", "domain_model", "principles"],
  security_agent: ["cps", "prd"],   // customer context from Plan alongside agents_md input
  doc_agent:      ["agents_md", "prd"],  // agents_md in Standard/Full; prd fallback in Quick when agents_md is empty
  pm_agent:       ["spec", "agents_md"],
};

// Agents that run once and should be skipped in auto-chain if they already have output
export const FROZEN_AGENTS = new Set(["event_storm"]);

// ── Pipeline profiles ─────────────────────────────────────────────────────────
// Each profile defines which agents are BYPASSED by auto-chain.
// Bypassed agents are skipped over — the chain jumps to the next active agent.

export const PROFILE_LABELS: Record<PipelineProfile, string> = {
  quick:    "Quick",
  standard: "Standard",
  full:     "Full",
};

export const PROFILE_DESCRIPTIONS: Record<PipelineProfile, string> = {
  quick:    "Plan → Review → Build → Eval — skips Design & Architecture, security always runs",
  standard: "All 6 phases — full pipeline including security review",
  full:     "All 6 phases with maximum oversight — enterprise / high-stakes delivery",
};

// Agents that auto-chain SKIPS for each profile.
// Security (Review phase) is always active — never bypassed.
export const PROFILE_BYPASS: Record<PipelineProfile, Set<string>> = {
  quick:    new Set(["event_storm", "principles", "domain_model", "architecture", "spec", "agents_md"]),
  standard: new Set(),
  full:     new Set(),
};

// Which phases are active (not bypassed) for each profile
export const PROFILE_ACTIVE_PHASES: Record<PipelineProfile, Set<string>> = {
  quick:    new Set(["Plan", "Review", "Build", "Eval"]),
  standard: new Set(["Plan", "Design", "Architecture", "Review", "Build", "Eval"]),
  full:     new Set(["Plan", "Design", "Architecture", "Review", "Build", "Eval"]),
};

export function makeProject(id: string, name: string): Project {
  return {
    id,
    name,
    agents: Object.fromEntries(INITIAL_AGENTS.map((a) => [a.id, { ...a }])),
    feed: [],
    settings: {
      airiaKey: "",
      airiaUrl: "https://prodaus.api.airia.ai",
      xaiKey: "",
      googleDriveFolderId: "",
      autoChain: true,
      hitlAll: false,
      queryPipelineId: e.NEXT_PUBLIC_PIPELINE_QUERY || null,
      pipelineProfile: "standard",
    },
    createdAt: new Date().toISOString(),
  };
}

// Agents that receive the engagement record prepended to their input on every run
export const ENGAGEMENT_RECORD_AGENTS = new Set(["summarise", "cps", "prd", "event_storm"]);

export function serializeEngagementRecord(record: EngagementRecord): string {
  const lines: string[] = ["[ENGAGEMENT RECORD — Project Context]"];

  if (record.clientBackground) lines.push(`\nClient Background:\n${record.clientBackground}`);
  if (record.industry) lines.push(`\nIndustry: ${record.industry}`);
  if (record.regulatoryContext) lines.push(`Regulatory Context: ${record.regulatoryContext}`);
  if (record.projectBrief) lines.push(`\nProject Brief:\n${record.projectBrief}`);
  if (record.targetGoLive) lines.push(`\nTarget Go-Live: ${record.targetGoLive}`);

  if (record.stakeholders.length > 0) {
    lines.push("\nStakeholders:");
    for (const s of record.stakeholders) {
      const contact = s.contact ? ` · ${s.contact}` : "";
      lines.push(`  - ${s.name} (${s.organisation}) — ${s.role}${contact}`);
    }
  }

  if (record.decisions.length > 0) {
    lines.push("\nConfirmed Decisions:");
    for (const d of record.decisions) {
      lines.push(`  - ${d.id}: ${d.decision}`);
      if (d.rationale) lines.push(`    Rationale: ${d.rationale}`);
      lines.push(`    Source: ${d.source} · ${d.date}`);
    }
  }

  const unresolved = record.openQuestions.filter((q) => q.status !== "resolved");
  if (unresolved.length > 0) {
    lines.push("\nOpen Questions:");
    for (const q of unresolved) {
      const blocks = q.blocks ? ` · Blocks: ${q.blocks}` : "";
      lines.push(`  - [${q.priority.toUpperCase()}] ${q.id}: ${q.question}`);
      if (q.owner) lines.push(`    Owner: ${q.owner}${blocks}`);
    }
  }

  const resolved = record.openQuestions.filter((q) => q.status === "resolved" && q.resolution);
  if (resolved.length > 0) {
    lines.push("\nResolved Questions:");
    for (const q of resolved) {
      lines.push(`  - ${q.id}: ${q.question}`);
      lines.push(`    Answer: ${q.resolution}`);
    }
  }

  if (record.scopeOut.length > 0) {
    lines.push("\nOut of Scope:");
    for (const item of record.scopeOut) {
      lines.push(`  - ${item}`);
    }
  }

  return lines.join("\n");
}

export function makeClient(id: string, name: string, firstProjectName = "Project 1"): Client {
  return {
    id,
    name,
    projects: [makeProject(`${id}-p1`, firstProjectName)],
    createdAt: new Date().toISOString(),
  };
}

export const DEMO_CLIENTS: Client[] = [
  {
    id: "client-acme",
    name: "Acme Corp",
    createdAt: new Date().toISOString(),
    projects: [
      {
        ...makeProject("client-acme-p1", "Project X"),
        agents: Object.fromEntries(
          INITIAL_AGENTS.map((a) => [
            a.id,
            a.id === "cps"
              ? {
                  ...a,
                  output:
                    '{"meta":{"project":"Project X","client":"Acme Corp","status":"Draft","version":"0.1"},"context":{"trigger":"Need AI-powered document processing pipeline"},"problem":{"primary_problem":"Manual document review takes 3-5 days per submission"},"solution":{"approach":"Multi-agent pipeline with AIRIA orchestration and HITL validation"}}',
                  status: "done" as const,
                  lastRun: "2h ago",
                }
              : a.id === "prd"
              ? {
                  ...a,
                  output:
                    "PRD v0.3 — Updated post session 2.\n\nAdded: authentication flow, audit trail spec, evaluation thresholds.\nRemoved: legacy batch processing (confirmed out of scope).",
                  status: "done" as const,
                  lastRun: "1h ago",
                }
              : a.id === "eval_agent"
              ? {
                  ...a,
                  output:
                    "Evaluation complete.\n\n96/100 executions passed client threshold.\n4 flagged for HITL review.\nAudit trail: 100 entries logged.",
                  status: "done" as const,
                  lastRun: "30m ago",
                }
              : { ...a },
          ])
        ),
        feed: [
          {
            id: "f1",
            time: "12 min ago",
            agent: "Evaluation Agent",
            phase: "Eval",
            phaseColor: PHASE_COLORS.Eval,
            content: "Evaluation complete. 96% pass rate. 4 items flagged for human review.",
          },
          {
            id: "f2",
            time: "1h ago",
            agent: "PRD Agent",
            phase: "Plan",
            phaseColor: PHASE_COLORS.Plan,
            content: "PRD updated to v0.3. Auth flow and audit trail spec added.",
          },
          {
            id: "f3",
            time: "2h ago",
            agent: "CPS Agent",
            phase: "Plan",
            phaseColor: PHASE_COLORS.Plan,
            content: "CPS document generated. Context, Problem, and Solution sections complete.",
          },
        ],
      },
      makeProject("client-acme-p2", "Internal Automation Pilot"),
    ],
  },
];
