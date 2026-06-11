"use client";

import { useState } from "react";
import { useAgents } from "@/context/AgentsContext";
import { AgentCard } from "@/components/AgentCard";
import { AgentModal } from "@/components/AgentModal";
import Link from "next/link";

export default function EvalPage() {
  const { agents, runAgent } = useAgents();
  const [modalId, setModalId] = useState<string | null>(null);
  const [failRate, setFailRate] = useState(20);

  const evalAgent = agents["eval_agent"];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 mb-5">
        <Link href="/" className="hover:text-zinc-700 transition-colors">Dashboard</Link>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-800">Eval</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Eval</h1>
          <p className="text-[12px] text-zinc-400 mt-1">
            LangSmith · client-defined thresholds · human-in-the-loop review queue
          </p>
        </div>
        <span className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded border mt-1 shrink-0"
          style={{ color: "#6B21A8", borderColor: "#6B21A8" }}>
          Phase 06
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        {[
          { label: "Success rate", value: "96%", sub: "Client threshold: 80%", green: true },
          { label: "Total executions", value: "100", sub: "last 7 days" },
          { label: "Failures", value: "4", sub: "within tolerance" },
          { label: "Threshold status", value: "Passing ✓", sub: "Meets client criteria", green: true, small: true },
        ].map((s) => (
          <div key={s.label} className="border border-zinc-200 rounded-lg p-[18px]">
            <p className="text-[11px] text-zinc-400 mb-2">{s.label}</p>
            <p className={`${s.small ? "text-[14px] pt-1.5" : "text-[26px] leading-none"} font-semibold tracking-tight ${s.green ? "text-emerald-500" : ""}`}>
              {s.value}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Client thresholds */}
      <p className="text-[12px] font-semibold mb-2.5">Client threshold configuration</p>
      <div className="border border-zinc-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 text-[12px] font-medium">
          Evaluation parameters
        </div>

        <SettingsRow label="Acceptable failure rate" sub="Maximum % of executions that can fail">
          <div className="flex items-center gap-2.5">
            <input
              type="range" min={0} max={30} value={failRate}
              onChange={(e) => setFailRate(Number(e.target.value))}
              className="w-[110px] accent-zinc-900"
            />
            <span className="text-[12px] w-7">{failRate}%</span>
          </div>
        </SettingsRow>

        <SettingsRow label="Human-in-the-loop" sub="Flag outputs for human review before delivery">
          <Toggle defaultOn />
        </SettingsRow>

        <SettingsRow label="Audit trail" sub="Log all agent inputs and outputs" last>
          <Toggle defaultOn />
        </SettingsRow>
      </div>

      {/* Agent + HITL queue */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[12px] font-semibold mb-2.5">Eval Agent</p>
          {evalAgent && (
            <AgentCard
              agent={evalAgent}
              onOpen={setModalId}
              onRun={runAgent}
            />
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[12px] font-semibold">HITL review queue</p>
            <span className="text-[20px] font-semibold text-amber-400">4</span>
          </div>
          <p className="text-[11px] text-zinc-400 mb-3">Awaiting human approval before delivery</p>
          {["Execution #97", "Execution #89", "Execution #84", "Execution #71"].map((ex) => (
            <div key={ex} className="flex items-center justify-between px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[12px] mb-2">
              <span>{ex}</span>
              <button className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md bg-white hover:bg-zinc-50 transition-colors">
                Review
              </button>
            </div>
          ))}
        </div>
      </div>

      <AgentModal agentId={modalId} onClose={() => setModalId(null)} />
    </div>
  );
}

function SettingsRow({
  label,
  sub,
  children,
  last,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 ${last ? "" : "border-b border-zinc-100"}`}>
      <div className="flex-1">
        <p className="text-[13px]">{label}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className={`w-[34px] h-[19px] rounded-full relative transition-colors ${on ? "bg-zinc-900" : "bg-zinc-200"}`}
    >
      <span
        className={`absolute top-[3px] w-[13px] h-[13px] rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-[3px]"}`}
      />
    </button>
  );
}
