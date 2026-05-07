"use client";

import { useState } from "react";
import Link from "next/link";
import { Phase } from "@/lib/types";
import { PHASE_COLORS } from "@/lib/agents";
import { useAgents } from "@/context/AgentsContext";
import { AgentCard } from "@/components/AgentCard";
import { AgentModal } from "@/components/AgentModal";
import { PipelineStrip } from "@/components/PipelineStrip";
import { SessionNotesCapture } from "@/components/SessionNotesCapture";

interface PhaseStep {
  num: string;
  name: string;
  sub: string;
}

interface PhasePageProps {
  phase: Phase;
  phaseNum: string;
  subtitle: string;
  steps: PhaseStep[];
  agentIds: string[];
  cols?: 2 | 3;
  showSessionNotes?: boolean;
}

export function PhasePage({
  phase,
  phaseNum,
  subtitle,
  steps,
  agentIds,
  cols = 3,
  showSessionNotes = false,
}: PhasePageProps) {
  const { agents, runAgent, cancelAgent } = useAgents();
  const [modalId, setModalId] = useState<string | null>(null);
  const color = PHASE_COLORS[phase];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 mb-5">
        <Link href="/" className="hover:text-zinc-700 transition-colors">
          Dashboard
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-800">{phase}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">{phase}</h1>
          <p className="text-[12px] text-zinc-400 mt-1">{subtitle}</p>
        </div>
        <span
          className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded border mt-1 shrink-0"
          style={{ color, borderColor: color }}
        >
          Phase {phaseNum}
        </span>
      </div>

      {/* Pipeline */}
      <PipelineStrip steps={steps} />

      {/* Session Notes — Design phase only */}
      {showSessionNotes && <SessionNotesCapture />}

      {/* Agents */}
      <p className="text-[12px] font-semibold mb-2.5">Agents</p>
      <div
        className={`grid gap-2.5 items-start ${
          cols === 2 ? "grid-cols-2" : "grid-cols-3"
        }`}
      >
        {agentIds.map((id) => {
          const agent = agents[id];
          if (!agent) return null;
          return (
            <AgentCard
              key={id}
              agent={agent}
              onOpen={setModalId}
              onRun={runAgent}
              onCancel={cancelAgent}
            />
          );
        })}
      </div>

      <AgentModal agentId={modalId} onClose={() => setModalId(null)} />
    </div>
  );
}
