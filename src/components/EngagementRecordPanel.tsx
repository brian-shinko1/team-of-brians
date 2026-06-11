"use client";

import { useState } from "react";
import { useAgents } from "@/context/AgentsContext";
import { EngagementDecision, OpenQuestion, OpenQuestionPriority, Stakeholder } from "@/lib/types";
import { serializeEngagementRecord } from "@/lib/agents";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, string> = {
  blocking: "text-red-600 bg-red-50 border-red-200",
  high:     "text-orange-500 bg-orange-50 border-orange-200",
  medium:   "text-amber-500 bg-amber-50 border-amber-200",
  low:      "text-zinc-500 bg-zinc-50 border-zinc-200",
};

function nextId(prefix: string, existing: { id: string }[]): string {
  const nums = existing.map((x) => parseInt(x.id.replace(prefix + "-", ""), 10)).filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, summary, children }: {
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-zinc-100">
      <button
        className="w-full flex items-center justify-between py-2.5 text-left hover:opacity-70 transition-opacity"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[12px] font-medium text-zinc-700">{title}</span>
        <div className="flex items-center gap-2">
          {summary && <span className="text-[11px] text-zinc-400">{summary}</span>}
          <span className="text-[10px] text-zinc-400">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && <div className="pb-3 space-y-2">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  );
}

const inputCls = "w-full text-[12px] border border-zinc-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-zinc-400 bg-white";
const textareaCls = `${inputCls} resize-none`;

// ── Main component ────────────────────────────────────────────────────────────

export function EngagementRecordPanel() {
  const { engagementRecord: record, updateEngagementRecord, driveFolders } = useAgents();

  const [saving, setSaving] = useState(false);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);

  // ── Stakeholder add form
  const [addingStakeholder, setAddingStakeholder] = useState(false);
  const [newSH, setNewSH] = useState({ name: "", organisation: "", role: "", contact: "" });

  // ── Decision add form
  const [addingDecision, setAddingDecision] = useState(false);
  const [newD, setNewD] = useState({ decision: "", rationale: "", source: "", date: "" });

  // ── Open question add form
  const [addingOQ, setAddingOQ] = useState(false);
  const [newOQ, setNewOQ] = useState({ question: "", owner: "", blocks: "", priority: "medium" as OpenQuestionPriority });

  // ── Resolve state: tracks which OQ is being resolved + resolution text
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const unresolvedCount = record.openQuestions.filter((q) => q.status !== "resolved").length;
  const blockingCount = record.openQuestions.filter((q) => q.priority === "blocking" && q.status !== "resolved").length;

  // ── Drive save ─────────────────────────────────────────────────────────────

  async function saveToDrive() {
    const rootFolderId = driveFolders?.projectRoot;
    if (!rootFolderId) return;
    setSaving(true);
    try {
      const content = serializeEngagementRecord(record);
      const res = await fetch("/api/drive/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, folderId: rootFolderId }),
      });
      if (res.ok) {
        const data = await res.json();
        setDriveUrl(data.url ?? null);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Stakeholder actions ────────────────────────────────────────────────────

  function addStakeholder() {
    if (!newSH.name.trim()) return;
    const s: Stakeholder = {
      id: `sh-${Date.now()}`,
      name: newSH.name.trim(),
      organisation: newSH.organisation.trim(),
      role: newSH.role.trim(),
      contact: newSH.contact.trim(),
    };
    updateEngagementRecord({ stakeholders: [...record.stakeholders, s] });
    setNewSH({ name: "", organisation: "", role: "", contact: "" });
    setAddingStakeholder(false);
  }

  function removeStakeholder(id: string) {
    updateEngagementRecord({ stakeholders: record.stakeholders.filter((s) => s.id !== id) });
  }

  // ── Decision actions ───────────────────────────────────────────────────────

  function addDecision() {
    if (!newD.decision.trim()) return;
    const d: EngagementDecision = {
      id: nextId("D", record.decisions),
      decision: newD.decision.trim(),
      rationale: newD.rationale.trim() || undefined,
      source: newD.source.trim(),
      date: newD.date || new Date().toISOString().slice(0, 10),
    };
    updateEngagementRecord({ decisions: [...record.decisions, d] });
    setNewD({ decision: "", rationale: "", source: "", date: "" });
    setAddingDecision(false);
  }

  function removeDecision(id: string) {
    updateEngagementRecord({ decisions: record.decisions.filter((d) => d.id !== id) });
  }

  // ── Open question actions ──────────────────────────────────────────────────

  function addOpenQuestion() {
    if (!newOQ.question.trim()) return;
    const q: OpenQuestion = {
      id: nextId("OQ", record.openQuestions),
      question: newOQ.question.trim(),
      owner: newOQ.owner.trim(),
      blocks: newOQ.blocks.trim(),
      priority: newOQ.priority,
      status: "open",
      resolution: null,
    };
    updateEngagementRecord({ openQuestions: [...record.openQuestions, q] });
    setNewOQ({ question: "", owner: "", blocks: "", priority: "medium" });
    setAddingOQ(false);
  }

  function resolveQuestion(id: string) {
    updateEngagementRecord({
      openQuestions: record.openQuestions.map((q) =>
        q.id === id ? { ...q, status: "resolved", resolution: resolutionText.trim() || "Resolved" } : q
      ),
    });
    setResolvingId(null);
    setResolutionText("");
  }

  function removeOpenQuestion(id: string) {
    updateEngagementRecord({ openQuestions: record.openQuestions.filter((q) => q.id !== id) });
  }

  // ── Scope out actions ──────────────────────────────────────────────────────

  const [newScopeItem, setNewScopeItem] = useState("");

  function addScopeItem() {
    if (!newScopeItem.trim()) return;
    updateEngagementRecord({ scopeOut: [...record.scopeOut, newScopeItem.trim()] });
    setNewScopeItem("");
  }

  function removeScopeItem(i: number) {
    updateEngagementRecord({ scopeOut: record.scopeOut.filter((_, idx) => idx !== i) });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasContent = record.clientBackground || record.projectBrief || record.stakeholders.length > 0;

  return (
    <div className="border border-zinc-200 rounded-xl p-[18px] mb-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[13px] font-medium text-zinc-900">Engagement Record</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {hasContent
              ? `${record.stakeholders.length} stakeholder${record.stakeholders.length !== 1 ? "s" : ""} · ${record.decisions.length} decision${record.decisions.length !== 1 ? "s" : ""} · ${unresolvedCount} open question${unresolvedCount !== 1 ? "s" : ""}${blockingCount > 0 ? ` (${blockingCount} blocking)` : ""}`
              : "Client context, stakeholders, decisions, open questions — prepended to every agent run"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {driveUrl && (
            <a href={driveUrl} target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-zinc-500 hover:text-zinc-800 transition-colors">
              ↗ Drive
            </a>
          )}
          {driveFolders?.projectRoot && (
            <button
              onClick={saveToDrive}
              disabled={saving}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save to Drive"}
            </button>
          )}
        </div>
      </div>

      {/* Section: Context */}
      <Section title="Context" summary={record.clientBackground ? record.clientBackground.slice(0, 48) + "…" : "Client background · industry · regulatory"}>
        <Field label="Client Background">
          <textarea
            className={textareaCls}
            rows={3}
            defaultValue={record.clientBackground}
            placeholder="Who is the client, what do they do?"
            onBlur={(e) => updateEngagementRecord({ clientBackground: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Industry">
            <input className={inputCls} defaultValue={record.industry} placeholder="e.g. Healthcare"
              onBlur={(e) => updateEngagementRecord({ industry: e.target.value })} />
          </Field>
          <Field label="Regulatory Context">
            <input className={inputCls} defaultValue={record.regulatoryContext} placeholder="e.g. ACCC compliance"
              onBlur={(e) => updateEngagementRecord({ regulatoryContext: e.target.value })} />
          </Field>
        </div>
      </Section>

      {/* Section: Project */}
      <Section title="Project" summary={record.projectBrief ? record.projectBrief.slice(0, 48) + "…" : "Brief · go-live · scope out"}>
        <Field label="Project Brief">
          <textarea
            className={textareaCls}
            rows={3}
            defaultValue={record.projectBrief}
            placeholder="2-3 sentence description of what's being built and why"
            onBlur={(e) => updateEngagementRecord({ projectBrief: e.target.value })}
          />
        </Field>
        <Field label="Target Go-Live">
          <input className={inputCls} defaultValue={record.targetGoLive} placeholder="e.g. 2026-09-01 or TBC"
            onBlur={(e) => updateEngagementRecord({ targetGoLive: e.target.value })} />
        </Field>
        <Field label="Out of Scope">
          <div className="space-y-1">
            {record.scopeOut.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-zinc-50 rounded-md px-2.5 py-1.5">
                <span className="text-[11px] text-zinc-700 flex-1">{item}</span>
                <button onClick={() => removeScopeItem(i)} className="text-[11px] text-zinc-400 hover:text-red-500">×</button>
              </div>
            ))}
            <div className="flex gap-1.5">
              <input className={`${inputCls} flex-1`} value={newScopeItem} onChange={(e) => setNewScopeItem(e.target.value)}
                placeholder="Add out-of-scope item"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addScopeItem(); } }} />
              <button onClick={addScopeItem}
                className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50">+</button>
            </div>
          </div>
        </Field>
      </Section>

      {/* Section: Stakeholders */}
      <Section title="Stakeholders" summary={`${record.stakeholders.length} added`}>
        <div className="space-y-1.5">
          {record.stakeholders.map((s) => (
            <div key={s.id} className="flex items-start justify-between bg-zinc-50 rounded-md px-2.5 py-2">
              <div>
                <p className="text-[12px] font-medium text-zinc-800">{s.name}</p>
                <p className="text-[11px] text-zinc-500">{s.organisation} · {s.role}{s.contact ? ` · ${s.contact}` : ""}</p>
              </div>
              <button onClick={() => removeStakeholder(s.id)} className="text-[11px] text-zinc-400 hover:text-red-500 ml-2 shrink-0">×</button>
            </div>
          ))}
        </div>

        {addingStakeholder ? (
          <div className="border border-zinc-200 rounded-md p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Name" value={newSH.name} onChange={(e) => setNewSH({ ...newSH, name: e.target.value })} />
              <input className={inputCls} placeholder="Organisation" value={newSH.organisation} onChange={(e) => setNewSH({ ...newSH, organisation: e.target.value })} />
              <input className={inputCls} placeholder="Role" value={newSH.role} onChange={(e) => setNewSH({ ...newSH, role: e.target.value })} />
              <input className={inputCls} placeholder="Contact (optional)" value={newSH.contact} onChange={(e) => setNewSH({ ...newSH, contact: e.target.value })} />
            </div>
            <div className="flex gap-1.5">
              <button onClick={addStakeholder}
                className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-zinc-900 text-white hover:opacity-80">Add</button>
              <button onClick={() => setAddingStakeholder(false)}
                className="text-[11px] px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingStakeholder(true)}
            className="text-[11px] text-zinc-500 hover:text-zinc-800 transition-colors">+ Add stakeholder</button>
        )}
      </Section>

      {/* Section: Decisions */}
      <Section title="Confirmed Decisions" summary={`${record.decisions.length} recorded`}>
        <div className="space-y-1.5">
          {record.decisions.map((d) => (
            <div key={d.id} className="flex items-start justify-between bg-zinc-50 rounded-md px-2.5 py-2">
              <div>
                <p className="text-[11px] text-zinc-400 mb-0.5">{d.id} · {d.date}</p>
                <p className="text-[12px] text-zinc-800">{d.decision}</p>
                {d.rationale && <p className="text-[11px] text-zinc-500 mt-0.5">{d.rationale}</p>}
                <p className="text-[10px] text-zinc-400 mt-0.5">Source: {d.source}</p>
              </div>
              <button onClick={() => removeDecision(d.id)} className="text-[11px] text-zinc-400 hover:text-red-500 ml-2 shrink-0">×</button>
            </div>
          ))}
        </div>

        {addingDecision ? (
          <div className="border border-zinc-200 rounded-md p-3 space-y-2">
            <textarea className={textareaCls} rows={2} placeholder="Decision" value={newD.decision}
              onChange={(e) => setNewD({ ...newD, decision: e.target.value })} />
            <input className={inputCls} placeholder="Rationale (optional)" value={newD.rationale}
              onChange={(e) => setNewD({ ...newD, rationale: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Source (e.g. CPS v0.1)" value={newD.source}
                onChange={(e) => setNewD({ ...newD, source: e.target.value })} />
              <input className={inputCls} type="date" value={newD.date}
                onChange={(e) => setNewD({ ...newD, date: e.target.value })} />
            </div>
            <div className="flex gap-1.5">
              <button onClick={addDecision}
                className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-zinc-900 text-white hover:opacity-80">Add</button>
              <button onClick={() => setAddingDecision(false)}
                className="text-[11px] px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingDecision(true)}
            className="text-[11px] text-zinc-500 hover:text-zinc-800 transition-colors">+ Add decision</button>
        )}
      </Section>

      {/* Section: Open Questions */}
      <Section
        title="Open Questions"
        summary={`${unresolvedCount} unresolved${blockingCount > 0 ? ` · ${blockingCount} blocking` : ""}`}
      >
        <div className="space-y-1.5">
          {record.openQuestions.map((q) => (
            <div key={q.id} className={`rounded-md px-2.5 py-2 ${q.status === "resolved" ? "bg-zinc-50 opacity-50" : "bg-zinc-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_BADGE[q.priority]}`}>
                      {q.priority}
                    </span>
                    <span className="text-[10px] text-zinc-400">{q.id}</span>
                    {q.status === "resolved" && (
                      <span className="text-[10px] text-emerald-600">✓ resolved</span>
                    )}
                  </div>
                  <p className="text-[12px] text-zinc-800">{q.question}</p>
                  {q.owner && <p className="text-[11px] text-zinc-500 mt-0.5">Owner: {q.owner}{q.blocks ? ` · Blocks: ${q.blocks}` : ""}</p>}
                  {q.resolution && <p className="text-[11px] text-zinc-400 mt-0.5 italic">{q.resolution}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {q.status !== "resolved" && (
                    <button
                      onClick={() => { setResolvingId(q.id); setResolutionText(""); }}
                      className="text-[10px] font-medium px-2 py-0.5 rounded border border-zinc-200 hover:bg-zinc-100 text-zinc-600"
                    >
                      Resolve
                    </button>
                  )}
                  <button onClick={() => removeOpenQuestion(q.id)} className="text-[11px] text-zinc-400 hover:text-red-500">×</button>
                </div>
              </div>

              {/* Inline resolve form */}
              {resolvingId === q.id && (
                <div className="mt-2 space-y-1.5">
                  <input
                    className={inputCls}
                    placeholder="Resolution note (optional)"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button onClick={() => resolveQuestion(q.id)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:opacity-80">
                      Mark resolved
                    </button>
                    <button onClick={() => setResolvingId(null)}
                      className="text-[11px] px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {addingOQ ? (
          <div className="border border-zinc-200 rounded-md p-3 space-y-2">
            <textarea className={textareaCls} rows={2} placeholder="Question" value={newOQ.question}
              onChange={(e) => setNewOQ({ ...newOQ, question: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Owner" value={newOQ.owner}
                onChange={(e) => setNewOQ({ ...newOQ, owner: e.target.value })} />
              <input className={inputCls} placeholder="Blocks (e.g. FR-002, NFR-004)" value={newOQ.blocks}
                onChange={(e) => setNewOQ({ ...newOQ, blocks: e.target.value })} />
            </div>
            <div>
              <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Priority</p>
              <div className="flex gap-1.5">
                {(["blocking", "high", "medium", "low"] as OpenQuestionPriority[]).map((p) => (
                  <button key={p}
                    onClick={() => setNewOQ({ ...newOQ, priority: p })}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors ${
                      newOQ.priority === p ? PRIORITY_BADGE[p] : "border-zinc-200 text-zinc-400"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={addOpenQuestion}
                className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-zinc-900 text-white hover:opacity-80">Add</button>
              <button onClick={() => setAddingOQ(false)}
                className="text-[11px] px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingOQ(true)}
            className="text-[11px] text-zinc-500 hover:text-zinc-800 transition-colors">+ Add question</button>
        )}
      </Section>
    </div>
  );
}
