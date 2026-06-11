interface Participant {
  name: string;
  role: string;
}

interface ExistingSolution {
  solution: string;
  context: string;
}

interface NextStep {
  action: string;
  owner: string;
  due: string;
}

interface SummariseOutput {
  participants?: Participant[];
  what_went_well?: string[];
  what_needs_work?: string[];
  what_is_not_needed?: string[];
  existing_solutions_to_use?: ExistingSolution[];
  next_steps?: NextStep[];
  summary?: string;
  transcript_condensed?: string;
}

export function summariseJsonToMd(raw: string): string {
  let d: SummariseOutput;
  try {
    d = JSON.parse(raw);
  } catch {
    return raw; // not JSON — return as-is
  }

  const lines: string[] = [];

  if (d.summary) {
    lines.push(d.summary, "");
  }

  if (d.participants?.length) {
    lines.push("## Participants", "");
    d.participants.forEach((p) => {
      lines.push(`- **${p.name}**${p.role ? `  ·  ${p.role}` : ""}`);
    });
    lines.push("");
  }

  if (d.what_went_well?.length) {
    lines.push("## What Went Well", "");
    d.what_went_well.forEach((s) => lines.push(`- ${s}`));
    lines.push("");
  }

  if (d.what_needs_work?.length) {
    lines.push("## What Needs Work", "");
    d.what_needs_work.forEach((s) => lines.push(`- ${s}`));
    lines.push("");
  }

  if (d.what_is_not_needed?.length) {
    lines.push("## What Is Not Needed", "");
    d.what_is_not_needed.forEach((s) => lines.push(`- ${s}`));
    lines.push("");
  }

  if (d.existing_solutions_to_use?.length) {
    lines.push("## Existing Solutions", "");
    d.existing_solutions_to_use.forEach((s) => {
      lines.push(`- **${s.solution}**`);
      if (s.context) lines.push(`  ${s.context}`);
    });
    lines.push("");
  }

  if (d.next_steps?.length) {
    lines.push("## Next Steps", "");
    d.next_steps.forEach((s) => {
      lines.push(`- ${s.action}`);
      if (s.owner || s.due) lines.push(`  *${[s.owner, s.due].filter(Boolean).join("  ·  ")}*`);
    });
    lines.push("");
  }

  if (d.transcript_condensed) {
    lines.push("## Condensed Transcript", "");
    lines.push(d.transcript_condensed);
  }

  return lines.join("\n").trim();
}

// ── CPS ───────────────────────────────────────────────────────────────────────

interface CpsStakeholder { name: string; role: string; influence: string }
interface CpsComponent   { name: string; owner: string; purpose: string }
interface CpsRisk        { risk: string; impact: string; likelihood: string; mitigation: string }
interface CpsTradeOff    { decision: string; chosen: string; rationale: string; alternatives: string }
interface CpsOption      { option: string; rationale: string; ruled_out_reason: string }
interface CpsNextStep    { action: string; owner: string; due: string }
interface CpsChangeLog   { date: string; version: string; summary_of_changes: string; summary?: string }

interface CpsOutput {
  meta?: { client?: string; project?: string; status?: string; version?: string; last_updated?: string; meeting_inputs?: string[] }
  context?: { trigger?: string; environment?: string; organisation?: string; stakeholders?: CpsStakeholder[] }
  problem?: { primary_problem?: string; problem_detail?: string; constraints?: string[]; key_challenges?: string[]; what_has_been_tried?: string[] }
  ideation?: { open_questions?: string[]; options_considered?: CpsOption[] }
  solution?: { approach?: string; strategy?: string; components?: CpsComponent[]; risk_assessment?: CpsRisk[]; trade_off_analysis?: CpsTradeOff[] }
  next_steps?: CpsNextStep[]
  change_log?: CpsChangeLog[]
}

export function cpsJsonToMd(raw: string): string {
  let d: CpsOutput;
  try { d = JSON.parse(raw); } catch { return raw; }

  const lines: string[] = [];

  // Header
  if (d.meta?.project) lines.push(`# ${d.meta.project}`, "");
  if (d.meta) {
    if (d.meta.client)       lines.push(`**Client:** ${d.meta.client}`);
    if (d.meta.status)       lines.push(`**Status:** ${d.meta.status}  ·  **Version:** ${d.meta.version ?? "—"}  ·  **Updated:** ${d.meta.last_updated ?? "—"}`);
    if (d.meta.meeting_inputs?.length) lines.push(`**Meeting inputs:** ${d.meta.meeting_inputs.join("; ")}`);
    lines.push("");
  }

  // Context
  if (d.context) {
    lines.push(`## Context`);
    lines.push("");
    if (d.context.trigger)      lines.push("**Trigger**", "", d.context.trigger, "");
    if (d.context.environment)  lines.push("**Environment**", "", d.context.environment, "");
    if (d.context.organisation) lines.push("**Organisation**", "", d.context.organisation, "");
    if (d.context.stakeholders?.length) {
      lines.push("**Stakeholders**", "");
      d.context.stakeholders.forEach((s) => lines.push(`- **${s.name}** — ${s.role}  ·  Influence: ${s.influence}`));
      lines.push("");
    }
  }

  // Problem
  if (d.problem) {
    lines.push(`## Problem`);
    lines.push("");
    if (d.problem.primary_problem) lines.push("**Primary Problem**", "", d.problem.primary_problem, "");
    if (d.problem.problem_detail)  lines.push("**Detail**", "", d.problem.problem_detail, "");
    if (d.problem.constraints?.length) {
      lines.push("**Constraints**", "");
      d.problem.constraints.forEach((c) => lines.push(`- ${c}`));
      lines.push("");
    }
    if (d.problem.key_challenges?.length) {
      lines.push("**Key Challenges**", "");
      d.problem.key_challenges.forEach((c) => lines.push(`- ${c}`));
      lines.push("");
    }
    if (d.problem.what_has_been_tried?.length) {
      lines.push("**What Has Been Tried**", "");
      d.problem.what_has_been_tried.forEach((c) => lines.push(`- ${c}`));
      lines.push("");
    }
  }

  // Ideation
  if (d.ideation) {
    lines.push(`## Ideation`);
    lines.push("");
    if (d.ideation.open_questions?.length) {
      lines.push("**Open Questions**", "");
      d.ideation.open_questions.forEach((q) => lines.push(`- ${q}`));
      lines.push("");
    }
    if (d.ideation.options_considered?.length) {
      lines.push("**Options Considered**", "");
      d.ideation.options_considered.forEach((o) => {
        lines.push(`- **${o.option}**`);
        if (o.rationale)        lines.push(`  Rationale: ${o.rationale}`);
        if (o.ruled_out_reason) lines.push(`  Ruled out: ${o.ruled_out_reason}`);
      });
      lines.push("");
    }
  }

  // Solution
  if (d.solution) {
    lines.push(`## Solution`);
    lines.push("");
    if (d.solution.approach)  lines.push("**Approach**", "", d.solution.approach, "");
    if (d.solution.strategy)  lines.push("**Strategy**", "", d.solution.strategy, "");
    if (d.solution.components?.length) {
      lines.push("**Components**", "");
      d.solution.components.forEach((c) => {
        lines.push(`- **${c.name}** (${c.owner})`);
        lines.push(`  ${c.purpose}`);
      });
      lines.push("");
    }
    if (d.solution.risk_assessment?.length) {
      lines.push("**Risk Assessment**", "");
      d.solution.risk_assessment.forEach((r) => {
        lines.push(`- **${r.risk}**`);
        lines.push(`  Impact: ${r.impact}  ·  Likelihood: ${r.likelihood}`);
        lines.push(`  Mitigation: ${r.mitigation}`);
      });
      lines.push("");
    }
    if (d.solution.trade_off_analysis?.length) {
      lines.push("**Trade-off Analysis**", "");
      d.solution.trade_off_analysis.forEach((t) => {
        lines.push(`- **${t.decision}**`);
        lines.push(`  Chosen: ${t.chosen}`);
        lines.push(`  Rationale: ${t.rationale}`);
      });
      lines.push("");
    }
  }

  // Next Steps
  if (d.next_steps?.length) {
    lines.push(`## Next Steps`);
    lines.push("");
    d.next_steps.forEach((s) => {
      lines.push(`- ${s.action}`);
      lines.push(`  ${s.owner}  ·  ${s.due}`);
    });
    lines.push("");
  }

  // Change Log
  if (d.change_log?.length) {
    lines.push(`## Change Log`);
    lines.push("");
    d.change_log.forEach((c) => lines.push(`- **${c.version ?? "—"}**${c.date ? ` (${c.date})` : ""} — ${c.summary_of_changes ?? c.summary ?? ""}`));
  }

  return lines.join("\n").trim();
}

export function cpsJsonToPreview(raw: string): string {
  let d: CpsOutput;
  try { d = JSON.parse(raw); } catch { return raw; }

  const parts: string[] = [];
  if (d.meta?.project) parts.push(d.meta.project);
  if (d.meta?.client)  parts.push(`Client: ${d.meta.client}`);

  const stats: string[] = [];
  if (d.context?.stakeholders?.length)        stats.push(`${d.context.stakeholders.length} stakeholders`);
  if (d.solution?.risk_assessment?.length)    stats.push(`${d.solution.risk_assessment.length} risks`);
  if (d.next_steps?.length)                   stats.push(`${d.next_steps.length} next steps`);
  if (d.meta?.status)                         stats.push(d.meta.status);
  if (stats.length) parts.push(stats.join("  ·  "));

  return parts.join("\n\n");
}

// ── PRD ───────────────────────────────────────────────────────────────────────

interface PrdMeta { title?: string; project?: string; client?: string; status?: string; version?: string; last_updated?: string; author?: string; prd_version?: string; cps_version?: string }
interface PrdObjective { objective?: string; goal?: string; title?: string; description?: string; success_metric?: string; cps_reference?: string }
interface PrdOutOfScope { item?: string; title?: string; name?: string; reason?: string; description?: string; cps_reference?: string }
interface PrdFR { id?: string; status?: string; priority?: string; component?: string; user_story?: string; acceptance_criteria?: string[]; flagged_for_clarification?: string; cps_reference?: string }
interface PrdNFR { id?: string; category?: string; priority?: string; requirement?: string; description?: string; acceptance_criteria?: string[]; cps_reference?: string }
interface PrdRisk { id?: string; risk?: string; title?: string; description?: string; likelihood?: string; impact?: string; mitigation?: string }
interface PrdChangeLog { date?: string; version?: string; summary?: string; summary_of_changes?: string; cps_version_at_change?: string }

interface PrdOutput {
  meta?: PrdMeta
  overview?: string
  executive_summary?: string
  problem_statement?: string
  objectives?: PrdObjective[] | string[]
  goals?: PrdObjective[] | string[]
  functional_requirements?: PrdFR[]
  non_functional_requirements?: PrdNFR[]
  out_of_scope?: PrdOutOfScope[] | string[]
  risks?: PrdRisk[]
  assumptions?: string[]
  change_log?: PrdChangeLog[]
  [key: string]: unknown
}

function unwrapPrdEnvelope(raw: string): string {
  // AIRIA wraps output in [{ "$type": "modelStructured", "Value": {...} }]
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed[0]?.["$type"] === "modelStructured" && parsed[0]?.Value) {
      return JSON.stringify(parsed[0].Value);
    }
  } catch { /* fall through */ }
  return raw;
}

export function prdJsonToMd(raw: string): string {
  const unwrapped = unwrapPrdEnvelope(raw);
  let d: PrdOutput;
  try { d = JSON.parse(unwrapped); } catch { return raw; }

  const L: string[] = [];
  const sec = (title: string) => { L.push("", `---`, "", `## ${title}`, ""); };

  // ── Title + metadata ─────────────────────────────────────────────────────────
  const title = d.meta?.title ?? d.meta?.project;
  if (title) L.push(`# ${title}`, "");
  if (d.meta) {
    const badges: string[] = [];
    if (d.meta.client)                              badges.push(`**Client:** ${d.meta.client}`);
    if (d.meta.status)                              badges.push(`**Status:** ${d.meta.status}`);
    if (d.meta.version || d.meta.prd_version)       badges.push(`**Version:** ${d.meta.version ?? d.meta.prd_version}`);
    if (d.meta.cps_version)                         badges.push(`**CPS:** v${d.meta.cps_version}`);
    if (d.meta.last_updated)                        badges.push(`**Updated:** ${d.meta.last_updated}`);
    if (badges.length) L.push(badges.join("  ·  "), "");
  }

  // ── Overview ─────────────────────────────────────────────────────────────────
  const overview = d.overview ?? d.executive_summary;
  if (overview) { sec("Overview"); L.push(overview, ""); }

  // ── Problem Statement ─────────────────────────────────────────────────────────
  if (d.problem_statement) { sec("Problem Statement"); L.push(d.problem_statement, ""); }

  // ── Objectives ───────────────────────────────────────────────────────────────
  const objectives = (d.objectives ?? d.goals) as Array<PrdObjective | string> | undefined;
  if (Array.isArray(objectives) && objectives.length) {
    sec("Objectives");
    objectives.forEach((o, i) => {
      if (typeof o === "string") { L.push(`${i + 1}. ${o}`); return; }
      const text = o.objective ?? o.goal ?? o.title ?? o.description ?? "";
      L.push(`${i + 1}. ${text}`);
      if (o.success_metric) L.push(`   *Success metric: ${o.success_metric}*`);
    });
    L.push("");
  }

  // ── Functional Requirements ───────────────────────────────────────────────────
  if (d.functional_requirements?.length) {
    sec("Functional Requirements");

    // Summary table
    L.push("| ID | Component | Priority |");
    L.push("| --- | --- | --- |");
    d.functional_requirements.forEach((r) => {
      L.push(`| ${r.id ?? "—"} | ${r.component ?? "—"} | ${r.priority ?? "—"} |`);
    });
    L.push("");

    // Detail blocks
    d.functional_requirements.forEach((r) => {
      L.push(`### ${r.id ?? ""} · ${r.component ?? ""}`, "");
      if (r.status)     L.push(`*${r.status}*  ·  *${r.priority ?? ""}*`, "");
      if (r.user_story) L.push(r.user_story, "");
      if (r.acceptance_criteria?.length) {
        L.push("**Acceptance Criteria**", "");
        r.acceptance_criteria.forEach((c) => L.push(`- ${c}`));
        L.push("");
      }
      if (r.flagged_for_clarification) {
        L.push(`> ⚠️ **Flagged for clarification:** ${r.flagged_for_clarification}`, "");
      }
    });
  }

  // ── Non-Functional Requirements ───────────────────────────────────────────────
  if (d.non_functional_requirements?.length) {
    sec("Non-Functional Requirements");

    // Summary table
    L.push("| ID | Category | Priority | Requirement |");
    L.push("| --- | --- | --- | --- |");
    d.non_functional_requirements.forEach((r) => {
      const req = (r.requirement ?? r.description ?? "").replace(/\|/g, "&#124;").slice(0, 120);
      L.push(`| ${r.id ?? "—"} | ${r.category ?? "—"} | ${r.priority ?? "—"} | ${req}${req.length === 120 ? "…" : ""} |`);
    });
    L.push("");

    // Detail blocks
    d.non_functional_requirements.forEach((r) => {
      L.push(`### ${r.id ?? ""} · ${r.category ?? ""}`, "");
      if (r.priority)    L.push(`*${r.priority}*`, "");
      if (r.requirement ?? r.description) L.push(r.requirement ?? r.description ?? "", "");
      if (r.acceptance_criteria?.length) {
        L.push("**Acceptance Criteria**", "");
        r.acceptance_criteria.forEach((c) => L.push(`- ${c}`));
        L.push("");
      }
    });
  }

  // ── Out of Scope ──────────────────────────────────────────────────────────────
  if (d.out_of_scope?.length) {
    sec("Out of Scope");
    L.push("| Item | Reason |");
    L.push("| --- | --- |");
    (d.out_of_scope as Array<PrdOutOfScope | string>).forEach((s) => {
      if (typeof s === "string") { L.push(`| ${s} | |`); return; }
      const item   = (s.item ?? s.title ?? s.name ?? "").replace(/\|/g, "&#124;");
      const reason = (s.reason ?? s.description ?? "").replace(/\|/g, "&#124;");
      L.push(`| ${item} | ${reason} |`);
    });
    L.push("");
  }

  // ── Risks ─────────────────────────────────────────────────────────────────────
  if (d.risks?.length) {
    sec("Risks");
    d.risks.forEach((r) => {
      const label = r.risk ?? r.title ?? r.description ?? r.id ?? "";
      L.push(`**${label}**`);
      if (r.likelihood || r.impact) L.push(`Likelihood: ${r.likelihood ?? "—"}  ·  Impact: ${r.impact ?? "—"}`);
      if (r.mitigation) L.push(`Mitigation: ${r.mitigation}`);
      L.push("");
    });
  }

  // ── Assumptions ───────────────────────────────────────────────────────────────
  if (d.assumptions?.length) {
    sec("Assumptions");
    d.assumptions.forEach((a) => L.push(`- ${a}`));
    L.push("");
  }

  // ── Unknown top-level keys ────────────────────────────────────────────────────
  const handled = new Set(["meta","overview","executive_summary","problem_statement","objectives","goals","functional_requirements","non_functional_requirements","out_of_scope","risks","assumptions","change_log"]);
  for (const [key, val] of Object.entries(d)) {
    if (handled.has(key) || val === null || val === undefined || val === "") continue;
    sec(titleCase(key));
    if (typeof val === "string") { L.push(val, ""); }
    else if (Array.isArray(val)) {
      (val as unknown[]).forEach((item) => {
        if (typeof item === "string") L.push(`- ${item}`);
        else if (typeof item === "object" && item !== null) {
          const o = item as Record<string, unknown>;
          const text = Object.values(o).filter((v) => typeof v === "string").join("  ·  ");
          L.push(`- ${text}`);
        }
      });
      L.push("");
    } else {
      L.push(jsonNodeToMd(val, 1), "");
    }
  }

  // ── Change Log ────────────────────────────────────────────────────────────────
  if (d.change_log?.length) {
    sec("Change Log");
    d.change_log.forEach((c) => {
      const summary = c.summary ?? c.summary_of_changes ?? "";
      L.push(`- **v${c.version ?? "—"}**${c.date ? ` (${c.date})` : ""} — ${summary}`);
    });
    L.push("");
  }

  return L.join("\n").trim();
}

// ── Generic JSON → Markdown ─────────────────────────────────────────────────

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function jsonNodeToMd(val: unknown, depth = 0): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    return val
      .map((item) =>
        typeof item === "object" && item !== null
          ? jsonNodeToMd(item, depth + 1)
          : `- ${item}`
      )
      .join("\n");
  }
  if (typeof val === "object") {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
      if (value === null || value === undefined || value === "") continue;
      const label = titleCase(key);
      const heading = depth === 0 ? `## ${label}` : `### ${label}`;
      if (typeof value === "string") {
        lines.push(heading, value, "");
      } else if (Array.isArray(value) && value.length > 0) {
        lines.push(heading);
        lines.push(
          ...value.map((v) =>
            typeof v === "object" && v !== null
              ? jsonNodeToMd(v, depth + 1)
              : `- ${v}`
          ),
          ""
        );
      } else if (typeof value === "object") {
        lines.push(heading, jsonNodeToMd(value, depth + 1), "");
      } else {
        lines.push(heading, String(value), "");
      }
    }
    return lines.join("\n").trim();
  }
  return String(val);
}

export function genericJsonToMd(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return jsonNodeToMd(parsed);
  } catch {
    return raw;
  }
}

// ── Principles ────────────────────────────────────────────────────────────────

interface PrinciplesMeta { client?: string; project?: string; status?: string; version?: string; prd_version?: string; event_storming_version?: string; last_updated?: string }
interface PrinciplesChangeLog { date?: string; version?: string; summary_of_changes?: string; summary?: string; prd_version_at_change?: string; event_storming_version_at_change?: string }
interface HallucinationRule { id?: string; rule?: string; context?: string; severity?: string; prd_reference?: string; event_storming_reference?: string; evaluation_method?: string }
interface HumanInLoopRule { id?: string; trigger?: string; reason?: string; approval_level?: string; prd_reference?: string; event_storming_reference?: string; evaluation_method?: string }
interface AuditTrailRule { id?: string; events?: string[]; reason?: string; retention?: string; what_to_capture?: string; prd_reference?: string; event_storming_reference?: string; evaluation_method?: string }
interface GeneralPrinciple { id?: string; name?: string; status?: string; statement?: string; rationale?: string; source_reference?: string; evaluation_method?: string }
interface UbiquitousTerm { term?: string; definition?: string; context?: string; source?: string; event_storming_reference?: string }

interface PrinciplesOutput {
  meta?: PrinciplesMeta
  change_log?: PrinciplesChangeLog[]
  hallucination_rules?: HallucinationRule[]
  human_in_loop_rules?: HumanInLoopRule[]
  audit_trail_rules?: AuditTrailRule[]
  general_principles?: GeneralPrinciple[]
  ubiquitous_language?: UbiquitousTerm[]
}

export function principlesJsonToMd(raw: string): string {
  let d: PrinciplesOutput;
  try { d = JSON.parse(raw); } catch { return raw; }
  const L: string[] = [];

  if (d.meta?.project) L.push(`# ${d.meta.project} — Principles Document`, "");
  if (d.meta) {
    const parts = [d.meta.client && `**Client:** ${d.meta.client}`, d.meta.status && `**Status:** ${d.meta.status}`, d.meta.version && `**Version:** ${d.meta.version}`, d.meta.last_updated && `**Updated:** ${d.meta.last_updated}`].filter(Boolean);
    if (parts.length) L.push(parts.join("  ·  "), "");
    if (d.meta.prd_version) L.push(`PRD v${d.meta.prd_version}  ·  Event Storming v${d.meta.event_storming_version ?? "—"}`, "");
  }

  if (d.hallucination_rules?.length) {
    L.push("## Hallucination Rules", "");
    d.hallucination_rules.forEach((r) => {
      L.push(`### ${r.id} — ${r.context ?? ""}`);
      if (r.severity) L.push(`**Severity:** ${r.severity}`);
      if (r.rule) L.push("", r.rule);
      if (r.prd_reference) L.push(``, `*PRD: ${r.prd_reference}*`);
      if (r.evaluation_method) L.push(`*Evaluation: ${r.evaluation_method}*`);
      L.push("");
    });
  }

  if (d.human_in_loop_rules?.length) {
    L.push("## Human-in-Loop Rules", "");
    d.human_in_loop_rules.forEach((r) => {
      L.push(`### ${r.id}`);
      if (r.trigger) L.push(`**Trigger:** ${r.trigger}`);
      if (r.approval_level) L.push(`**Approval:** ${r.approval_level}`);
      if (r.reason) L.push("", r.reason);
      if (r.prd_reference) L.push("", `*PRD: ${r.prd_reference}*`);
      if (r.evaluation_method) L.push(`*Evaluation: ${r.evaluation_method}*`);
      L.push("");
    });
  }

  if (d.audit_trail_rules?.length) {
    L.push("## Audit Trail Rules", "");
    d.audit_trail_rules.forEach((r) => {
      L.push(`### ${r.id}`);
      if (r.events?.length) L.push(`**Events:** ${r.events.join(", ")}`);
      if (r.retention) L.push(`**Retention:** ${r.retention}`);
      if (r.reason) L.push("", r.reason);
      if (r.what_to_capture) L.push(`**Capture:** ${r.what_to_capture}`);
      if (r.prd_reference) L.push("", `*PRD: ${r.prd_reference}*`);
      L.push("");
    });
  }

  if (d.general_principles?.length) {
    L.push("## General Principles", "");
    d.general_principles.forEach((p) => {
      L.push(`### ${p.id} — ${p.name ?? ""}`);
      if (p.status) L.push(`**Status:** ${p.status}`);
      if (p.statement) L.push("", `> ${p.statement}`);
      if (p.rationale) L.push("", p.rationale);
      if (p.source_reference) L.push("", `*Source: ${p.source_reference}*`);
      if (p.evaluation_method) L.push(`*Evaluation: ${p.evaluation_method}*`);
      L.push("");
    });
  }

  if (d.ubiquitous_language?.length) {
    L.push("## Ubiquitous Language", "");
    L.push("| Term | Context | Definition |", "|------|---------|------------|");
    d.ubiquitous_language.forEach((t) => {
      L.push(`| **${t.term ?? ""}** | ${t.context ?? ""} | ${t.definition ?? ""} |`);
    });
    L.push("");
  }

  if (d.change_log?.length) {
    L.push("## Change Log", "");
    d.change_log.forEach((c) => L.push(`- **${c.version ?? "—"}**${c.date ? ` (${c.date})` : ""} — ${c.summary_of_changes ?? c.summary ?? ""}`));
  }

  return L.join("\n").trim();
}

// ── Domain Model ──────────────────────────────────────────────────────────────

interface DomainMeta { client?: string; project?: string; status?: string; version?: string; prd_version?: string; event_storming_version?: string; principles_version?: string; last_updated?: string }
interface BoundedContext { id?: string; name?: string; status?: string; description?: string; responsibility?: string; aggregates?: string[]; event_storming_reference?: string; conflict_note?: string }
interface Aggregate {
  id?: string; name?: string;
  bounded_context?: string; bounded_context_id?: string;  // actual field name from pipeline
  status?: string; responsibility?: string;
  invariants?: string[]; value_objects?: string[]; entities?: string[];
  handles_commands?: string[]; produces_events?: string[];  // actual field names from pipeline
  event_storming_reference?: string; conflict_note?: string
}
interface DomainCommand { id?: string; name?: string; aggregate?: string; target_aggregate_id?: string; issued_by?: string; produces_event_id?: string; produces_event?: string; produces_events?: string | string[]; event_storming_reference?: string; prd_reference?: string }
interface DomainEvent {
  id?: string; name?: string;
  aggregate?: string; produced_by?: string; produced_by_aggregate_id?: string;
  payload?: string[];        // actual field name from pipeline
  payload_fields?: string[]; // fallback
  triggers_policy_id?: string; triggers_policy?: string;
  event_storming_reference?: string; prd_reference?: string
}
interface Policy { id?: string; name?: string; statement?: string; triggered_by_event_id?: string; triggered_by?: string; issues_command_id?: string; issues_command?: string; rationale?: string; event_storming_reference?: string }
interface DomainConstraint { id?: string; description?: string; source?: string; type?: string }
interface DataFlow { id?: string; description?: string; steps?: string[] }
interface ArchImplication { id?: string; statement?: string; source?: string; prd_reference?: string }
interface PrdGap { id?: string; prd_reference?: string; description?: string; resolution?: string }
interface DomainChangeLog { date?: string; version?: string; summary_of_changes?: string; summary?: string; prd_version_at_change?: string; event_storming_version_at_change?: string }

interface DomainModelOutput {
  meta?: DomainMeta
  change_log?: DomainChangeLog[]
  bounded_contexts?: BoundedContext[]
  aggregates?: Aggregate[]
  commands?: DomainCommand[]
  domain_events?: DomainEvent[]
  policies?: Policy[]
  constraints?: DomainConstraint[]
  data_flows?: DataFlow[]
  architecture_implications?: ArchImplication[]
  prd_gaps?: PrdGap[]
}

export function domainModelJsonToMd(raw: string): string {
  // Unwrap AIRIA modelStructured envelope
  let src = raw;
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p) && p[0]?.["$type"] === "modelStructured" && p[0]?.Value) src = JSON.stringify(p[0].Value);
  } catch { /* use raw */ }

  let d: DomainModelOutput;
  try { d = JSON.parse(src); } catch { return raw; }
  const L: string[] = [];

  if (d.meta?.project) L.push(`# ${d.meta.project} — Domain Model`, "");
  if (d.meta) {
    const parts = [d.meta.client && `**Client:** ${d.meta.client}`, d.meta.status && `**Status:** ${d.meta.status}`, d.meta.version && `**Version:** ${d.meta.version}`, d.meta.last_updated && `**Updated:** ${d.meta.last_updated}`].filter(Boolean);
    if (parts.length) L.push(parts.join("  ·  "), "");
  }

  const heading = (id?: string, name?: string) =>
    id && name ? `${id} — ${name}` : name ?? id ?? "";

  if (d.bounded_contexts?.length) {
    L.push("## Bounded Contexts", "");
    L.push("| Name | Aggregates |");
    L.push("| --- | --- |");
    d.bounded_contexts.forEach((bc) => {
      const aggs = bc.aggregates?.join(", ") ?? "—";
      L.push(`| **${bc.name ?? "—"}** | ${aggs} |`);
    });
    L.push("");
    // Description below the table
    d.bounded_contexts.forEach((bc) => {
      const detail = bc.description ?? bc.responsibility;
      if (!detail && !bc.conflict_note) return;
      L.push(`**${bc.name ?? bc.id ?? ""}**`);
      if (detail)           L.push(detail);
      if (bc.conflict_note) L.push(`⚠ ${bc.conflict_note}`);
      L.push("");
    });
  }

  if (d.aggregates?.length) {
    L.push("## Aggregates", "");
    L.push("| Name | Bounded Context |");
    L.push("| --- | --- |");
    d.aggregates.forEach((a) => {
      const ctx = a.bounded_context ?? a.bounded_context_id ?? "—";
      L.push(`| **${a.name ?? "—"}** | ${ctx} |`);
    });
    L.push("");
    // Detail blocks for aggregates that have meaningful content
    d.aggregates.forEach((a) => {
      const cmds   = a.handles_commands ?? [];
      const evts   = a.produces_events ?? [];
      const hasDetail = a.responsibility || a.invariants?.length || a.entities?.length || a.value_objects?.length || cmds.length || evts.length || a.conflict_note;
      if (!hasDetail) return;
      L.push(`**${a.name ?? a.id ?? ""}**`);
      if (a.responsibility)  L.push(a.responsibility);
      if (cmds.length)       L.push(`Commands: ${cmds.join(", ")}`);
      if (evts.length)       L.push(`Events: ${evts.join(", ")}`);
      if (a.invariants?.length) L.push(`Invariants: ${a.invariants.join(" · ")}`);
      if (a.entities?.length)   L.push(`Entities: ${a.entities.join(", ")}`);
      if (a.value_objects?.length) L.push(`Value Objects: ${a.value_objects.join(", ")}`);
      if (a.conflict_note)   L.push(`⚠ ${a.conflict_note}`);
      L.push("");
    });
  }

  if (d.commands?.length) {
    L.push("## Commands", "");
    L.push("| Command | Aggregate | Issued By | Produces Event |");
    L.push("| --- | --- | --- | --- |");
    d.commands.forEach((c) => {
      const produces = c.produces_event_id ?? c.produces_event ?? (Array.isArray(c.produces_events) ? c.produces_events.join(", ") : c.produces_events) ?? "—";
      L.push(`| **${c.name ?? c.id ?? "—"}** | ${c.aggregate ?? c.target_aggregate_id ?? "—"} | ${c.issued_by ?? "—"} | ${produces} |`);
    });
    L.push("");
  }

  if (d.domain_events?.length) {
    L.push("## Domain Events", "");
    L.push("| Event | Aggregate | Payload Fields |");
    L.push("| --- | --- | --- |");
    d.domain_events.forEach((e) => {
      const producer = e.aggregate ?? e.produced_by_aggregate_id ?? e.produced_by ?? "—";
      const payload  = (e.payload ?? e.payload_fields ?? []).join(", ") || "—";
      L.push(`| **${e.name ?? e.id ?? "—"}** | ${producer} | ${payload} |`);
    });
    L.push("");
  }

  if (d.policies?.length) {
    L.push("## Policies", "");
    L.push("| Policy | Triggered By | Issues Command |");
    L.push("| --- | --- | --- |");
    d.policies.forEach((p) => {
      L.push(`| **${p.name ?? p.id ?? "—"}** | ${p.triggered_by_event_id ?? p.triggered_by ?? "—"} | ${p.issues_command_id ?? p.issues_command ?? "—"} |`);
    });
    // Rationale / statement below table
    d.policies.forEach((p) => {
      const detail = p.statement ?? p.rationale;
      if (!detail) return;
      L.push(`*${p.name ?? p.id ?? ""}:* ${detail}`);
    });
    L.push("");
  }

  if (d.constraints?.length) {
    L.push("## Constraints", "");
    d.constraints.forEach((c) => {
      L.push(`- **${c.id ? `${c.id} ` : ""}${c.type ?? ""}** ${c.description ?? ""}`);
      if (c.source) L.push(`  *Source: ${c.source}*`);
    });
    L.push("");
  }

  if (d.data_flows?.length) {
    L.push("## Data Flows", "");
    d.data_flows.forEach((f) => {
      L.push(`**${f.id ?? f.description ?? ""}**${f.id && f.description ? ` — ${f.description}` : ""}`);
      if (f.steps?.length) L.push(f.steps.join(" → "));
      L.push("");
    });
  }

  if (d.architecture_implications?.length) {
    L.push("## Architecture Implications", "");
    d.architecture_implications.forEach((ai) => L.push(`- ${ai.id ? `**${ai.id}** ` : ""}${ai.statement ?? ""}`));
    L.push("");
  }

  if (d.prd_gaps?.length) {
    L.push("## PRD Gaps", "");
    d.prd_gaps.forEach((g) => {
      const label = g.id ? `**${g.id}**` : "";
      const ref = g.prd_reference ? ` (${g.prd_reference})` : "";
      L.push(`- ${label}${ref}${label || ref ? " — " : ""}${g.description ?? ""}`);
      if (g.resolution) L.push(`  Resolution: ${g.resolution}`);
    });
    L.push("");
  }

  if (d.change_log?.length) {
    L.push("## Change Log", "");
    d.change_log.forEach((c) => L.push(`- **${c.version ?? "—"}**${c.date ? ` (${c.date})` : ""} — ${c.summary_of_changes ?? c.summary ?? ""}`));
  }

  return L.join("\n").trim();
}

// ── Architecture ──────────────────────────────────────────────────────────────

interface ArchMeta { client?: string; project?: string; status?: string; version?: string; domain_model_version?: string; principles_version?: string; event_storming_version?: string; last_updated?: string }
interface Service { id?: string; name?: string; bounded_context_id?: string; status?: string; responsibility?: string; owns_aggregates?: string[]; exposes?: string[]; publishes_events?: string[]; domain_model_reference?: string; conflict_note?: string }
interface Integration { id?: string; from_service_id?: string; from?: string; to_service_id?: string; to?: string; pattern?: string; payload?: string; payload_description?: string; events?: string | string[]; domain_model_reference?: string }
interface ValidationLayer { id?: string; applies_to_service_id?: string; mechanism?: string; enforces?: string; principles_reference?: string }
interface ApprovalWorkflow { id?: string; trigger?: string; approval_service_id?: string; approval_level?: string; on_approval?: string; on_rejection?: string; principles_reference?: string }
interface AuditComponent { id?: string; captures_events?: string[]; storage_mechanism?: string; retention?: string; principles_reference?: string }
interface DependencyNode { service_id?: string; depends_on?: string[]; rank?: number }
interface ArchChangeLog { date?: string; version?: string; summary_of_changes?: string; summary?: string; domain_model_version_at_change?: string; principles_version_at_change?: string }

interface ArchitectureOutput {
  meta?: ArchMeta
  change_log?: ArchChangeLog[]
  services?: Service[]
  integrations?: Integration[]
  validation_layers?: ValidationLayer[]
  approval_workflows?: ApprovalWorkflow[]
  audit_components?: AuditComponent[]
  dependency_graph?: DependencyNode[]
}

export function architectureJsonToMd(raw: string): string {
  let d: ArchitectureOutput;
  try { d = JSON.parse(raw); } catch { return raw; }
  const L: string[] = [];

  if (d.meta?.project) L.push(`# ${d.meta.project} — Architecture`, "");
  else L.push("# Architecture Document", "");
  if (d.meta) {
    const parts = [d.meta.client && `**Client:** ${d.meta.client}`, d.meta.status && `**Status:** ${d.meta.status}`, d.meta.version && `**Version:** ${d.meta.version}`, d.meta.last_updated && `**Updated:** ${d.meta.last_updated}`].filter(Boolean);
    if (parts.length) L.push(parts.join("  ·  "), "");
  }

  const h = (id?: string, name?: string) => id && name ? `${id} — ${name}` : name ?? id ?? "";

  if (d.services?.length) {
    L.push("## Services", "");
    d.services.forEach((s) => {
      L.push(`### ${h(s.id, s.name)}`);
      if (s.status || s.bounded_context_id) L.push(`**Status:** ${s.status ?? "—"}  ·  **Context:** ${s.bounded_context_id ?? "—"}`);
      if (s.responsibility) L.push("", s.responsibility);
      if (s.owns_aggregates?.length) L.push("", `**Owns:** ${s.owns_aggregates.join(", ")}`);
      if (s.exposes?.length) L.push(`**Exposes:** ${s.exposes.join(", ")}`);
      if (s.publishes_events?.length) L.push(`**Publishes:** ${s.publishes_events.join(", ")}`);
      if (s.conflict_note) L.push("", `⚠ **Conflict:** ${s.conflict_note}`);
      L.push("");
    });
  }

  if (d.integrations?.length) {
    L.push("## Integrations", "");
    L.push("| ID | From | To | Pattern |", "|----|------|----|---------|");
    d.integrations.forEach((i) => {
      const from = i.from_service_id ?? i.from ?? "";
      const to = i.to_service_id ?? i.to ?? "";
      L.push(`| ${i.id ?? ""} | ${from} | ${to} | ${i.pattern ?? ""} |`);
    });
    L.push("");
  }

  if (d.validation_layers?.length) {
    L.push("## Validation Layers", "");
    d.validation_layers.forEach((v) => {
      const label = [v.id, v.applies_to_service_id].filter(Boolean).join(" · ");
      L.push(`- **${label || "—"}** — ${v.mechanism ?? ""}: *${v.enforces ?? ""}*`);
      if (v.principles_reference) L.push(`  *${v.principles_reference}*`);
    });
    L.push("");
  }

  if (d.approval_workflows?.length) {
    L.push("## Approval Workflows", "");
    d.approval_workflows.forEach((a) => {
      L.push(`### ${a.id ?? "Workflow"}`);
      if (a.trigger) L.push(`**Trigger:** ${a.trigger}`);
      if (a.approval_level) L.push(`**Approval:** ${a.approval_level}`);
      if (a.on_approval) L.push(`**On approval:** ${a.on_approval}`);
      if (a.on_rejection) L.push(`**On rejection:** ${a.on_rejection}`);
      if (a.principles_reference) L.push(`*${a.principles_reference}*`);
      L.push("");
    });
  }

  if (d.audit_components?.length) {
    L.push("## Audit Components", "");
    d.audit_components.forEach((a) => {
      L.push(`- **${a.id ?? "—"}** — ${a.storage_mechanism ?? ""}  ·  Retain: ${a.retention ?? "—"}`);
      if (a.captures_events?.length) L.push(`  Events: ${a.captures_events.join(", ")}`);
    });
    L.push("");
  }

  if (d.dependency_graph?.length) {
    L.push("## Service Dependency Order", "");
    const sorted = [...d.dependency_graph].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    sorted.forEach((n) => {
      const deps = n.depends_on?.length ? ` — depends on: ${n.depends_on.join(", ")}` : " — no dependencies";
      L.push(`${n.rank ?? ""}. **${n.service_id ?? ""}**${deps}`);
    });
    L.push("");
  }

  if (d.change_log?.length) {
    L.push("## Change Log", "");
    d.change_log.forEach((c) => L.push(`- **${c.version ?? "—"}**${c.date ? ` (${c.date})` : ""} — ${c.summary_of_changes ?? c.summary ?? ""}`));
  }

  return L.join("\n").trim();
}

// ── Spec ──────────────────────────────────────────────────────────────────────

interface SpecMeta { client?: string; project?: string; status?: string; version?: string; architecture_version?: string; domain_model_version?: string; principles_version?: string; last_updated?: string }
interface AiriaPipelineStep { step_type?: string; description?: string }
interface AiriaImplementation { trigger?: string; agent_type?: string; pipeline_steps?: AiriaPipelineStep[]; platform_constraints?: string[] }
interface Endpoint { id?: string; path?: string; method?: string; service_id?: string; status?: string; description?: string; request_schema_id?: string; response_schema_id?: string; error_responses?: { status_code: number; description: string }[]; architecture_reference?: string; domain_model_reference?: string; airia_implementation?: AiriaImplementation }
interface SchemaField { name?: string; type?: string; required?: boolean; validation?: string; principles_reference?: string }
interface Schema { id?: string; name?: string; type?: string; variant?: string; fields?: SchemaField[]; domain_model_reference?: string }
interface IntegrationContract { id?: string; pattern?: string; airia_mechanism?: string; publisher_service_id?: string; consumer_service_id?: string; payload_schema_id?: string; timeout_ms?: number; architecture_reference?: string }
interface SpecChangeLog { date?: string; version?: string; summary_of_changes?: string; summary?: string; breaking_changes?: string[]; architecture_version_at_change?: string }

interface SpecOutput {
  meta?: SpecMeta
  change_log?: SpecChangeLog[]
  endpoints?: Endpoint[]
  schemas?: Schema[]
  integration_contracts?: IntegrationContract[]
}

export function specJsonToMd(raw: string): string {
  let d: SpecOutput;
  try { d = JSON.parse(raw); } catch { return raw; }
  const L: string[] = [];

  if (d.meta?.project) L.push(`# ${d.meta.project} — API Spec`, "");
  else L.push("# API Spec", "");
  if (d.meta) {
    const parts = [d.meta.client && `**Client:** ${d.meta.client}`, d.meta.status && `**Status:** ${d.meta.status}`, d.meta.version && `**Version:** ${d.meta.version}`, d.meta.last_updated && `**Updated:** ${d.meta.last_updated}`].filter(Boolean);
    if (parts.length) L.push(parts.join("  ·  "), "");
  }

  if (d.endpoints?.length) {
    L.push("## Endpoints", "");
    L.push("| Method | Path | Service |", "|--------|------|---------|");
    d.endpoints.forEach((e) => L.push(`| \`${e.method ?? ""}\` | \`${e.path ?? ""}\` | ${e.service_id ?? ""} |`));
    L.push("");
    d.endpoints.forEach((e) => {
      L.push(`### ${e.id ?? ""} \`${e.method ?? ""} ${e.path ?? ""}\``);
      if (e.service_id) L.push(`**Service:** ${e.service_id}${e.status ? `  ·  **Status:** ${e.status}` : ""}`);
      if (e.description) L.push("", e.description);
      if (e.request_schema_id) L.push("", `**Request:** ${e.request_schema_id}  ·  **Response:** ${e.response_schema_id ?? "—"}`);
      if (e.error_responses?.length) {
        L.push("", "**Errors:**");
        e.error_responses.forEach((err) => L.push(`- \`${err.status_code}\` — ${err.description}`));
      }
      if (e.airia_implementation) {
        const ai = e.airia_implementation;
        L.push("", `**Airia Implementation:** ${[ai.trigger, ai.agent_type].filter(Boolean).join(" · ")}`);
        if (ai.pipeline_steps?.length) {
          L.push("");
          ai.pipeline_steps.forEach((s, i) => L.push(`${i + 1}. \`${s.step_type ?? ""}\` — ${s.description ?? ""}`));
        }
        if (ai.platform_constraints?.length) {
          L.push("", "**Constraints:**");
          ai.platform_constraints.forEach((c) => L.push(`- ${c}`));
        }
      }
      L.push("");
    });
  }

  if (d.schemas?.length) {
    L.push("## Schemas", "");
    d.schemas.forEach((s) => {
      const label = [s.id, s.name].filter(Boolean).join(" — ");
      const variant = s.variant ?? s.type;
      L.push(`### ${label}${variant ? ` *(${variant})*` : ""}`, "");
      if (s.fields?.length) {
        L.push("| Field | Type | Required | Validation |", "|-------|------|----------|------------|");
        s.fields.forEach((f) => {
          const validation = [f.validation, f.principles_reference ? `⚠ ${f.principles_reference}` : ""].filter(Boolean).join("  ");
          L.push(`| \`${f.name ?? ""}\` | ${f.type ?? ""} | ${f.required ? "yes" : "no"} | ${validation || "—"} |`);
        });
      }
      L.push("");
    });
  }

  if (d.integration_contracts?.length) {
    L.push("## Integration Contracts", "");
    L.push("| ID | Pattern | Publisher | Consumer | Mechanism |", "|----|---------|-----------|----------|-----------|");
    d.integration_contracts.forEach((ic) => {
      const mechanism = ic.airia_mechanism ?? (ic.pattern === "async-event" ? "async" : ic.timeout_ms ? `${ic.timeout_ms}ms` : "—");
      L.push(`| ${ic.id ?? ""} | ${ic.pattern ?? ""} | ${ic.publisher_service_id ?? ""} | ${ic.consumer_service_id ?? ""} | ${mechanism} |`);
    });
    L.push("");
  }

  if (d.change_log?.length) {
    L.push("## Change Log", "");
    d.change_log.forEach((c) => {
      const datePart = c.date ? ` (${c.date})` : "";
      L.push(`- **${c.version ?? "—"}**${datePart} — ${c.summary_of_changes ?? c.summary ?? ""}`);
      if (c.breaking_changes?.length) c.breaking_changes.forEach((b) => L.push(`  ⚠ Breaking: ${b}`));
    });
  }

  return L.join("\n").trim();
}

export function formatOutput(agentId: string, raw: string): string {
  if (!raw) return "";
  if (agentId === "summarise")    return summariseJsonToMd(raw);
  if (agentId === "cps")          return cpsJsonToMd(raw);
  if (agentId === "prd")          return prdJsonToMd(raw);
  if (agentId === "principles")   return principlesJsonToMd(raw);
  if (agentId === "domain_model") return domainModelJsonToMd(raw);
  if (agentId === "architecture") return architectureJsonToMd(raw);
  if (agentId === "spec")         return specJsonToMd(raw);
  // Try to parse as JSON for all other agents
  if (raw.trimStart().startsWith("{") || raw.trimStart().startsWith("[")) {
    return genericJsonToMd(raw);
  }
  return raw;
}

/** Card preview: just the summary line + a stat bar */
export function summariseJsonToPreview(raw: string): string {
  let d: SummariseOutput;
  try {
    d = JSON.parse(raw);
  } catch {
    return raw;
  }

  const parts: string[] = [];
  if (d.summary) parts.push(d.summary);

  const stats: string[] = [];
  if (d.participants?.length)            stats.push(`${d.participants.length} participants`);
  if (d.next_steps?.length)              stats.push(`${d.next_steps.length} next steps`);
  if (d.what_went_well?.length)          stats.push(`${d.what_went_well.length} highlights`);
  if (d.what_needs_work?.length)         stats.push(`${d.what_needs_work.length} open items`);

  if (stats.length) parts.push(stats.join("  ·  "));

  return parts.join("\n\n");
}

// ── Context compression — lean summaries for prompt injection ─────────────────
// These keep injected context under ~300 tokens regardless of document size.

function trunc(s: string | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/** Extracts a lean ~80-token brief from a CPS JSON output for prompt injection. */
export function compressCpsForContext(raw: string): string {
  try {
    const d = JSON.parse(raw) as {
      meta?: { project?: string; client?: string; version?: string; status?: string };
      problem?: { primary_problem?: string; constraints?: string[]; key_challenges?: string[] };
      solution?: { approach?: string };
      ideation?: { open_questions?: string[] };
    };
    const lines: string[] = [];
    const m = d.meta ?? {};
    lines.push(`Project: ${m.project ?? "—"}  |  Client: ${m.client ?? "—"}  |  v${m.version ?? "—"}  |  ${m.status ?? "Draft"}`);
    if (d.problem?.primary_problem) lines.push(`Problem: ${trunc(d.problem.primary_problem, 140)}`);
    if (d.solution?.approach)       lines.push(`Solution: ${trunc(d.solution.approach, 140)}`);
    const constraints = d.problem?.constraints?.slice(0, 3) ?? [];
    if (constraints.length) lines.push(`Constraints: ${constraints.map((c) => trunc(c, 60)).join(" · ")}`);
    const questions = d.ideation?.open_questions?.slice(0, 3) ?? [];
    if (questions.length) lines.push(`Open questions: ${questions.map((q) => trunc(q, 60)).join(" · ")}`);
    return lines.join("\n");
  } catch {
    return trunc(raw, 400);
  }
}

/** Extracts a lean ~80-token brief from a PRD JSON output for prompt injection. */
export function compressPrdForContext(raw: string): string {
  try {
    // Unwrap AIRIA envelope if present
    let src = raw;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed[0]?.["$type"] === "modelStructured" && parsed[0]?.Value) {
        src = JSON.stringify(parsed[0].Value);
      }
    } catch { /* use raw */ }

    const d = JSON.parse(src) as {
      meta?: { version?: string; status?: string };
      objectives?: Array<{ objective?: string; goal?: string }> | string[];
      functional_requirements?: Array<{ id?: string; component?: string; priority?: string; flagged_for_clarification?: string }>;
      non_functional_requirements?: Array<{ id?: string; category?: string }>;
      out_of_scope?: Array<{ item?: string } | string>;
    };

    const lines: string[] = [];
    const m = d.meta ?? {};
    const frCount  = d.functional_requirements?.length ?? 0;
    const nfrCount = d.non_functional_requirements?.length ?? 0;
    lines.push(`PRD v${m.version ?? "—"}  |  ${m.status ?? "Draft"}  |  ${frCount} FRs  |  ${nfrCount} NFRs`);

    const objs = (d.objectives ?? []).slice(0, 3);
    if (objs.length) {
      const texts = objs.map((o) => {
        if (typeof o === "string") return trunc(o, 80);
        return trunc(o.objective ?? o.goal ?? "", 80);
      }).filter(Boolean);
      if (texts.length) lines.push(`Objectives: ${texts.join(" · ")}`);
    }

    const flagged = (d.functional_requirements ?? []).filter((r) => r.flagged_for_clarification).map((r) => r.id ?? "?");
    if (flagged.length) lines.push(`Flagged for clarification: ${flagged.join(", ")}`);

    const oos = (d.out_of_scope ?? []).slice(0, 4).map((s) => {
      if (typeof s === "string") return s;
      return s.item ?? "";
    }).filter(Boolean);
    if (oos.length) lines.push(`Out of scope: ${oos.join(", ")}`);

    return lines.join("\n");
  } catch {
    return trunc(raw, 400);
  }
}

/** Extracts a one-line session headline from a Summarise agent output (JSON or plain text). */
export function extractSessionHeadline(raw: string): string {
  try {
    const d = JSON.parse(raw) as { summary?: string; next_steps?: Array<{ action?: string }> };
    if (d.summary) return trunc(d.summary, 120);
    if (d.next_steps?.length) return `${d.next_steps.length} next steps identified: ${d.next_steps.slice(0, 2).map((s) => s.action).filter(Boolean).join("; ")}`;
  } catch { /* plain text */ }
  // Plain text: use first non-empty line
  const firstLine = raw.split("\n").map((l) => l.trim()).find((l) => l.length > 10) ?? "";
  return trunc(firstLine, 120);
}

import type { EngagementDecision, EngagementRecord, OpenQuestion, Stakeholder, SessionLogEntry } from "./types";

// ── Engagement record auto-extraction ────────────────────────────────────────

function erNextId(prefix: string, existing: { id: string }[]): string {
  const nums = existing.map((x) => parseInt(x.id.replace(`${prefix}-`, ""), 10)).filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

/**
 * Parses a completed agent output and returns a partial EngagementRecord patch.
 * Only populates fields that are currently empty; never overwrites existing data.
 * Returns null if nothing was extracted or the output couldn't be parsed.
 */
export function extractEngagementFromAgent(
  agentId: string,
  output: string,
  current: EngagementRecord
): Partial<EngagementRecord> | null {
  const patch: Partial<EngagementRecord> = {};

  try {
    if (agentId === "summarise") {
      const d = JSON.parse(output) as SummariseOutput;
      if (d.participants?.length) {
        const existingNames = new Set(current.stakeholders.map((s) => s.name.toLowerCase()));
        const added: Stakeholder[] = d.participants
          .filter((p) => p.name && !existingNames.has(p.name.toLowerCase()))
          .map((p) => ({
            id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            name: p.name,
            organisation: "",
            role: p.role ?? "",
            contact: "",
          }));
        if (added.length) patch.stakeholders = [...current.stakeholders, ...added];
      }
    }

    if (agentId === "cps") {
      const d = JSON.parse(output) as CpsOutput;
      const today = new Date().toISOString().slice(0, 10);

      // Client background — use organisation or client name
      if (!current.clientBackground) {
        const bg = d.context?.organisation ?? d.meta?.client ?? "";
        if (bg) patch.clientBackground = bg;
      }

      // Project brief — compose from trigger + problem + solution
      if (!current.projectBrief) {
        const parts = [
          d.context?.trigger,
          d.problem?.primary_problem && `Problem: ${d.problem.primary_problem}`,
          d.solution?.approach && `Approach: ${d.solution.approach}`,
        ].filter(Boolean) as string[];
        if (parts.length) patch.projectBrief = parts.join("\n\n");
      }

      // Stakeholders from CPS context
      if (d.context?.stakeholders?.length) {
        const base = patch.stakeholders ?? current.stakeholders;
        const existingNames = new Set(base.map((s) => s.name.toLowerCase()));
        const added: Stakeholder[] = d.context.stakeholders
          .filter((s) => s.name && !existingNames.has(s.name.toLowerCase()))
          .map((s) => ({
            id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            name: s.name,
            organisation: patch.clientBackground ?? current.clientBackground ?? "",
            role: s.role ?? "",
            contact: "",
          }));
        if (added.length) patch.stakeholders = [...base, ...added];
      }

      // Open questions from ideation
      if (d.ideation?.open_questions?.length) {
        const base = patch.openQuestions ?? current.openQuestions;
        const existing = new Set(base.map((q) => q.question.toLowerCase()));
        const added: OpenQuestion[] = d.ideation.open_questions
          .filter((q) => q && !existing.has(q.toLowerCase()))
          .map((q, i) => ({
            id: erNextId("OQ", [...base, ...Array(i).fill({ id: "OQ-0" })]),
            question: q,
            owner: "",
            status: "open" as const,
            resolution: null,
            blocks: "",
            priority: "medium" as const,
          }));
        if (added.length) patch.openQuestions = [...base, ...added];
      }

      // Decisions from trade-off analysis
      if (d.solution?.trade_off_analysis?.length) {
        const base = patch.decisions ?? current.decisions;
        const existing = new Set(base.map((d) => d.decision.toLowerCase()));
        const added: EngagementDecision[] = d.solution.trade_off_analysis
          .filter((t) => t.decision && !existing.has(`${t.decision}: ${t.chosen}`.toLowerCase()))
          .map((t, i) => ({
            id: erNextId("D", [...base, ...Array(i).fill({ id: "D-0" })]),
            decision: `${t.decision}: ${t.chosen}`,
            rationale: t.rationale ?? undefined,
            source: "CPS",
            date: today,
          }));
        if (added.length) patch.decisions = [...base, ...added];
      }
    }

    if (agentId === "prd") {
      // Unwrap AIRIA envelope if present
      let src = output;
      try {
        const p = JSON.parse(output);
        if (Array.isArray(p) && p[0]?.["$type"] === "modelStructured" && p[0]?.Value) {
          src = JSON.stringify(p[0].Value);
        }
      } catch { /* use raw */ }

      const d = JSON.parse(src) as PrdOutput;
      const today = new Date().toISOString().slice(0, 10);

      // Scope out
      if (!current.scopeOut.length && d.out_of_scope?.length) {
        const items = (d.out_of_scope as Array<PrdOutOfScope | string>)
          .map((s) => (typeof s === "string" ? s : s.item ?? s.title ?? s.name ?? ""))
          .filter(Boolean) as string[];
        if (items.length) patch.scopeOut = items;
      }

      // Flagged FRs → open questions
      if (d.functional_requirements?.length) {
        const flagged = d.functional_requirements.filter((r) => r.flagged_for_clarification);
        if (flagged.length) {
          const base = patch.openQuestions ?? current.openQuestions;
          const existing = new Set(base.map((q) => q.question.toLowerCase()));
          const added: OpenQuestion[] = flagged
            .filter((r) => !existing.has(r.flagged_for_clarification!.toLowerCase()))
            .map((r, i) => ({
              id: erNextId("OQ", [...base, ...Array(i).fill({ id: "OQ-0" })]),
              question: r.flagged_for_clarification!,
              owner: "",
              status: "open" as const,
              resolution: null,
              blocks: r.id ?? "",
              priority: "high" as const,
            }));
          if (added.length) patch.openQuestions = [...base, ...added];
        }
      }

      // Assumptions → decisions
      if (d.assumptions?.length) {
        const base = patch.decisions ?? current.decisions;
        const existing = new Set(base.map((d) => d.decision.toLowerCase()));
        const added: EngagementDecision[] = d.assumptions
          .filter((a) => a && !existing.has(a.toLowerCase()))
          .map((a, i) => ({
            id: erNextId("D", [...base, ...Array(i).fill({ id: "D-0" })]),
            decision: a,
            source: "PRD",
            date: today,
          }));
        if (added.length) patch.decisions = [...base, ...added];
      }
    }
  } catch {
    return null;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * Builds the lean project context string injected into Co-Pilot and Jarvis.
 * Total is ~300 tokens regardless of how many sessions or how large the docs are.
 */
export function buildProjectContext(
  agents: Record<string, { output?: string }>,
  sessionLog: SessionLogEntry[] = [],
): string {
  const parts: string[] = [];

  if (agents.cps?.output)
    parts.push(`[CPS — PROJECT BRIEF]\n${compressCpsForContext(agents.cps.output)}`);

  if (agents.prd?.output)
    parts.push(`[PRD — REQUIREMENTS BRIEF]\n${compressPrdForContext(agents.prd.output)}`);

  const recentLog = sessionLog.slice(-5);
  if (recentLog.length) {
    const entries = recentLog.map((e) => `• ${e.date}: ${e.headline}`).join("\n");
    parts.push(`[SESSION LOG — last ${recentLog.length} session${recentLog.length > 1 ? "s" : ""}]\n${entries}`);
  }

  return parts.join("\n\n");
}
