"use client";

import { useState } from "react";
import Link from "next/link";
import { useAgents } from "@/context/AgentsContext";
import { AgentModal } from "@/components/AgentModal";
import { FeedItem } from "@/components/FeedItem";
import { PHASE_COLORS } from "@/lib/agents";

const PHASES = [
  { key: "Plan", href: "/plan", agents: 5 },
  { key: "Design", href: "/design", agents: 3 },
  { key: "Architecture", href: "/architecture", agents: 3 },
  { key: "Build", href: "/build", agents: 1 },
  { key: "Eval", href: "/eval", agents: 1 },
] as const;

const PHASE_ORDER = ["Plan", "Design", "Architecture", "Build", "Eval"] as const;

function deriveActiveStage(agents: Record<string, import("@/lib/types").Agent>): string {
  const agentList = Object.values(agents);
  // Find the last phase that has at least one done agent
  let lastDonePhaseIdx = -1;
  for (let i = PHASE_ORDER.length - 1; i >= 0; i--) {
    if (agentList.some((a) => a.phase === PHASE_ORDER[i] && a.status === "done")) {
      lastDonePhaseIdx = i;
      break;
    }
  }
  if (lastDonePhaseIdx === -1) return "N/A";
  const current = PHASE_ORDER[lastDonePhaseIdx];
  const next = PHASE_ORDER[lastDonePhaseIdx + 1];
  return next ? `${current} → ${next}` : current;
}

export default function OverviewPage() {
  const { feed, agents, runAgent } = useAgents();
  const [modalId, setModalId] = useState<string | null>(null);

  const agentList = Object.values(agents);
  const doneCount = agentList.filter((a) => a.status === "done").length;
  const errorCount = agentList.filter((a) => a.status === "error").length;
  const ranCount = doneCount + errorCount;
  const successRate = ranCount > 0 ? `${Math.round((doneCount / ranCount) * 100)}%` : "N/A";
  const successSub = ranCount > 0 ? `${ranCount} agent${ranCount !== 1 ? "s" : ""} run` : "no runs yet";
  const activeStage = deriveActiveStage(agents);

  const handleRunPipeline = () => {
    ["stt", "summarise", "cps", "prd", "eval_agent"].forEach((id, i) => {
      setTimeout(() => runAgent(id), i * 700);
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Agent Dashboard</h1>
          <p className="text-[12px] text-zinc-400 mt-1">
            Shinko1 Solution Development — all phases and agents
          </p>
        </div>
        <button
          onClick={handleRunPipeline}
          className="text-[12px] font-medium px-3.5 py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 transition-opacity"
        >
          ▶ Run Pipeline
        </button>
      </div>

      {/* Phase cards */}
      <div className="grid grid-cols-5 gap-2.5 mb-6">
        {PHASES.map((p) => (
          <Link
            key={p.key}
            href={p.href}
            className="border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 hover:shadow-sm transition-all relative overflow-hidden group"
          >
            <div
              className="absolute top-0 left-0 w-[3px] h-full"
              style={{ background: PHASE_COLORS[p.key] }}
            />
            <p
              className="text-[9px] font-bold tracking-[0.1em] uppercase mb-2.5"
              style={{ color: PHASE_COLORS[p.key] }}
            >
              {p.key}
            </p>
            <p className="text-[26px] font-semibold tracking-tight leading-none mb-1">
              {p.agents}
            </p>
            <p className="text-[11px] text-zinc-400">
              {p.agents === 1 ? "agent" : "agents"}
            </p>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-7">
        {[
          { label: "Total runs", value: feed.length > 0 ? String(feed.length) : "N/A", sub: feed.length > 0 ? "all time" : "no runs yet" },
          { label: "Avg. response time", value: "N/A", sub: "not tracked" },
          { label: "Success rate", value: successRate, sub: successSub },
          { label: "Active stage", value: activeStage, sub: activeStage === "N/A" ? "no agents run yet" : "current progress", small: true },
        ].map((s) => (
          <div key={s.label} className="border border-zinc-200 rounded-lg p-[18px]">
            <p className="text-[11px] text-zinc-400 mb-2">{s.label}</p>
            <p
              className={
                s.small
                  ? "text-[14px] font-semibold tracking-tight pt-1.5"
                  : "text-[26px] font-semibold tracking-tight leading-none"
              }
            >
              {s.value}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent feed */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[12px] font-semibold">Recent outputs</p>
        <Link href="/outputs" className="text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors">
          View all →
        </Link>
      </div>
      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
          <span className="text-[12px] font-medium">Live feed</span>
          <span className="text-[11px] text-zinc-400">chronological</span>
        </div>
        {feed.slice(0, 4).map((item) => (
          <FeedItem key={item.id} item={item} />
        ))}
      </div>

      <AgentModal agentId={modalId} onClose={() => setModalId(null)} />
    </div>
  );
}
