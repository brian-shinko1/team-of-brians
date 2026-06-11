"use client";

import { useState } from "react";
import Link from "next/link";
import { useAgents } from "@/context/AgentsContext";
import { AgentCard } from "@/components/AgentCard";
import { AgentModal } from "@/components/AgentModal";
import type { Ticket, TicketStatus, TicketType, TicketPriority } from "@/lib/types";

const COLOR = "#1A56DB";

const STATUS_COLORS: Record<TicketStatus, string> = {
  todo: "bg-zinc-100 text-zinc-500",
  wip: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
  backlogged: "bg-red-100 text-red-600",
};
const STATUS_LABELS: Record<TicketStatus, string> = {
  todo: "To do", wip: "In progress", done: "Done", backlogged: "Backlogged",
};
const TYPE_COLORS: Record<TicketType, string> = {
  Story: "bg-blue-50 text-blue-600",
  Task: "bg-zinc-100 text-zinc-600",
  Bug: "bg-red-50 text-red-600",
};
const PRIORITY_COLORS: Record<TicketPriority, string> = {
  Low: "text-zinc-400",
  Medium: "text-amber-500",
  High: "text-orange-500",
  Critical: "text-red-600",
};

const STATUSES: TicketStatus[] = ["todo", "wip", "done", "backlogged"];
const TYPES: TicketType[] = ["Story", "Task", "Bug"];
const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Critical"];

function exportCSV(tickets: Ticket[]) {
  const headers = ["Summary", "Issue Type", "Priority", "Description", "Labels", "Acceptance Criteria"];
  const rows = tickets.map((t) => [
    t.title,
    t.type,
    t.priority,
    t.description,
    t.category ?? "",
    t.acceptanceCriteria.join(" | "),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tickets.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Ticket Card ───────────────────────────────────────────────────────────────

function TicketCard({ ticket }: { ticket: Ticket }) {
  const { updateTicket, removeTicket } = useAgents();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState({ title: ticket.title, description: ticket.description, notes: ticket.notes, category: ticket.category ?? "", acceptanceCriteria: [...ticket.acceptanceCriteria] });
  const [newCriterion, setNewCriterion] = useState("");

  const handleStatusChange = (status: TicketStatus) => {
    updateTicket(ticket.id, { status }, [{ field: "status", from: STATUS_LABELS[ticket.status], to: STATUS_LABELS[status] }]);
  };

  const handleSave = () => {
    const auditEntries: { field: string; from: string; to: string }[] = [];
    if (draft.title !== ticket.title) auditEntries.push({ field: "title", from: ticket.title, to: draft.title });
    if (draft.description !== ticket.description) auditEntries.push({ field: "description", from: "previous", to: "updated" });
    if (draft.notes !== ticket.notes) auditEntries.push({ field: "notes", from: "previous", to: "updated" });
    updateTicket(ticket.id, {
      title: draft.title,
      description: draft.description,
      notes: draft.notes,
      category: draft.category || undefined,
      acceptanceCriteria: draft.acceptanceCriteria,
    }, auditEntries);
  };

  const addCriterion = () => {
    if (!newCriterion.trim()) return;
    setDraft((d) => ({ ...d, acceptanceCriteria: [...d.acceptanceCriteria, newCriterion.trim()] }));
    setNewCriterion("");
  };

  return (
    <div className={`border-b border-zinc-100 last:border-0 ${expanded ? "bg-zinc-50/30" : ""}`}>
      {/* Collapsed row */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <select
          value={ticket.status}
          onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
          className={`text-[11px] font-medium px-2 py-0.5 rounded border-0 outline-none cursor-pointer shrink-0 ${STATUS_COLORS[ticket.status]}`}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${TYPE_COLORS[ticket.type]}`}>{ticket.type}</span>
        <span className={`text-[10px] font-medium shrink-0 ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>

        <p className="flex-1 text-[13px] font-medium text-zinc-900 truncate min-w-0">{ticket.title}</p>

        {ticket.category && (
          <span className="text-[10px] text-zinc-500 border border-zinc-200 rounded px-1.5 py-0.5 shrink-0">{ticket.category}</span>
        )}

        {ticket.stale && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-50 text-orange-500 shrink-0">stale</span>
        )}

        <div className="flex gap-1.5 shrink-0">
          <button onClick={() => setExpanded((v) => !v)}
            className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors text-zinc-500">
            {expanded ? "Close" : "Edit"}
          </button>
          <button onClick={() => removeTicket(ticket.id)}
            className="text-[11px] px-2 py-1 border border-zinc-200 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-zinc-400">
            ×
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-100 space-y-3 pt-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-medium text-zinc-500 block mb-1">Type</label>
              <select
                value={ticket.type}
                onChange={(e) => updateTicket(ticket.id, { type: e.target.value as TicketType })}
                className="text-[12px] px-2 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 w-full bg-white"
              >
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-zinc-500 block mb-1">Priority</label>
              <select
                value={ticket.priority}
                onChange={(e) => updateTicket(ticket.id, { priority: e.target.value as TicketPriority })}
                className="text-[12px] px-2 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 w-full bg-white"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-zinc-500 block mb-1">Category</label>
              <input
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                placeholder="e.g. Auth, API…"
                className="text-[12px] px-2 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-zinc-500 block mb-1">Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 w-full"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-zinc-500 block mb-1">Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="text-[12px] px-2.5 py-2 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 w-full resize-y min-h-[72px]"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-zinc-500 block mb-1.5">Acceptance criteria</label>
            <div className="space-y-1 mb-2">
              {draft.acceptanceCriteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <span className="text-zinc-300 text-[11px]">•</span>
                  <input
                    value={c}
                    onChange={(e) => setDraft((d) => ({ ...d, acceptanceCriteria: d.acceptanceCriteria.map((x, j) => j === i ? e.target.value : x) }))}
                    className="flex-1 text-[12px] px-2 py-1 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
                  />
                  <button onClick={() => setDraft((d) => ({ ...d, acceptanceCriteria: d.acceptanceCriteria.filter((_, j) => j !== i) }))}
                    className="text-zinc-300 hover:text-red-400 transition-colors text-[12px] opacity-0 group-hover:opacity-100">×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCriterion()}
                placeholder="Add criterion…"
                className="flex-1 text-[12px] px-2 py-1 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
              />
              <button onClick={addCriterion} className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50">+ Add</button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-zinc-500 block mb-1">Audit notes</label>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Notes, decisions, context…"
              className="text-[12px] px-2.5 py-2 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 w-full resize-y min-h-[56px]"
            />
          </div>

          {ticket.auditLog.length > 0 && (
            <div>
              <label className="text-[10px] font-medium text-zinc-500 block mb-1">Audit log</label>
              <div className="space-y-0.5 max-h-[96px] overflow-y-auto">
                {[...ticket.auditLog].reverse().map((entry, i) => (
                  <p key={i} className="text-[10px] text-zinc-400">
                    <span className="text-zinc-300">{new Date(entry.at).toLocaleString()}</span>
                    {" — "}{entry.field}{entry.to ? ` → ${entry.to}` : ""}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleSave}
              className="text-[12px] font-medium px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 transition-opacity">
              Save changes
            </button>
            {ticket.stale && (
              <button
                onClick={() => updateTicket(ticket.id, { stale: false }, [{ field: "stale", from: "true", to: "Manually marked as still needed" }])}
                className="text-[12px] px-3 py-1.5 border border-orange-200 text-orange-600 rounded-md hover:bg-orange-50 transition-colors"
              >
                Mark as still needed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BuildPage() {
  const { agents, tickets, generateTickets, updateTicket, runAgent } = useAgents();
  const [modalId, setModalId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const reverseDoc = agents["reverse_doc"];
  const agentsMd = agents["agents_md"];

  const handleGenerate = async () => {
    const input = agentsMd?.output;
    if (!input) { setGenError("No agents.md output found. Run the Architecture phase first."); return; }
    setGenerating(true);
    setGenError("");
    try {
      await generateTickets(input);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRunHandover = () => {
    const summary = tickets.map((t) =>
      `## ${t.title} [${t.status.toUpperCase()}]\n${t.description}\n${t.acceptanceCriteria.length > 0 ? `AC: ${t.acceptanceCriteria.join(", ")}` : ""}\n${t.notes ? `Notes: ${t.notes}` : ""}`
    ).join("\n\n");
    runAgent("reverse_doc", summary);
    setModalId("reverse_doc");
  };

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: tickets.filter((t) => t.status === s).length }), {} as Record<TicketStatus, number>);
  const visible = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  // updateTicket is used in TicketCard via context — suppress unused warning
  void updateTicket;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 mb-5">
        <Link href="/" className="hover:text-zinc-700 transition-colors">Dashboard</Link>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-800">Build</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Build</h1>
          <p className="text-[12px] text-zinc-400 mt-1">Ticket management · handover doc</p>
        </div>
        <span className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded border mt-1 shrink-0"
          style={{ color: COLOR, borderColor: COLOR }}>Phase 05</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(filter === s ? "all" : s)}
            className={`border rounded-lg p-4 text-left transition-colors ${filter === s ? "border-zinc-400" : "border-zinc-200 hover:border-zinc-300"}`}>
            <p className="text-[11px] text-zinc-400 mb-1.5">{STATUS_LABELS[s]}</p>
            <p className="text-[24px] font-semibold tracking-tight text-zinc-900">{counts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-4">
        <p className="text-[12px] font-semibold flex-1">
          Tickets {filter !== "all" && <span className="font-normal text-zinc-400">· {STATUS_LABELS[filter as TicketStatus]}</span>}
          <span className="font-normal text-zinc-400 ml-1">({visible.length})</span>
        </p>
        {filter !== "all" && (
          <button onClick={() => setFilter("all")} className="text-[11px] text-zinc-400 hover:text-zinc-700">Clear filter</button>
        )}
        {tickets.length > 0 && (
          <button onClick={() => exportCSV(tickets)}
            className="text-[12px] px-3 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors">
            ↓ Export CSV
          </button>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating || !agentsMd?.output}
          className="text-[12px] font-medium px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 disabled:opacity-30 transition-opacity"
          title={!agentsMd?.output ? "Run the Agents.md agent in Architecture first" : ""}
        >
          {generating ? "Generating…" : "Generate from agents.md"}
        </button>
      </div>

      {genError && <p className="text-[12px] text-red-500 mb-3">{genError}</p>}

      {/* Ticket list */}
      {visible.length === 0 ? (
        <div className="border border-zinc-200 rounded-xl p-8 text-center text-zinc-400 text-[12px] mb-6">
          {tickets.length === 0
            ? "No tickets yet. Run the Architecture phase to generate agents.md, then click Generate."
            : "No tickets match this filter."}
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-xl overflow-hidden mb-6">
          {visible.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
        </div>
      )}

      {/* Handover Doc Generator */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[12px] font-semibold">Handover Doc Generator</p>
        <button
          onClick={handleRunHandover}
          disabled={tickets.length === 0 || reverseDoc?.status === "running"}
          className="text-[12px] font-medium px-3 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {reverseDoc?.status === "running" ? "Generating…" : "Generate handover doc"}
        </button>
      </div>
      {reverseDoc && <AgentCard agent={reverseDoc} onOpen={setModalId} onRun={runAgent} />}

      <AgentModal agentId={modalId} onClose={() => setModalId(null)} />
    </div>
  );
}
