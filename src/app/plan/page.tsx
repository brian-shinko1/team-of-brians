"use client";

import { useState } from "react";
import Link from "next/link";
import { useAgents } from "@/context/AgentsContext";
import { PHASE_COLORS } from "@/lib/agents";
import { AgentCard } from "@/components/AgentCard";
import { AgentModal } from "@/components/AgentModal";
import { MeetingCopilotModal } from "@/components/MeetingCopilotModal";
import { JarvisModal } from "@/components/JarvisModal";
import { PipelineCard } from "@/components/PipelineCard";
import { PipelineStrip } from "@/components/PipelineStrip";
import { EngagementRecordPanel } from "@/components/EngagementRecordPanel";

const COLOR = PHASE_COLORS.Plan;

const CAPTURE_STEPS = [
  { id: "meeting_input",   name: "Meeting Input" },
  { id: "meeting_copilot", name: "Co-Pilot" },
  { id: "summarise",       name: "Summary" },
];

export default function PlanPage() {
  const { agents, runAgent } = useAgents();
  const [modalId, setModalId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 mb-5">
        <Link href="/" className="hover:text-zinc-700 transition-colors">Dashboard</Link>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-800">Plan</span>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Plan</h1>
          <p className="text-[12px] text-zinc-400 mt-1">
            Co-Pilot · Summary · CPS · PRD — any input becomes structured planning intelligence
          </p>
        </div>
        <span className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded border mt-1 shrink-0"
          style={{ color: COLOR, borderColor: COLOR }}>Phase 01</span>
      </div>
      <PipelineStrip steps={[
        { num: "Step 1", name: "Meeting Input", sub: "Any form of input" },
        { num: "Step 2", name: "Co-Pilot + Summary", sub: "Checklist · gap report · AI summarisation" },
        { num: "Step 3", name: "CPS", sub: "Context · Problem · Solution" },
        { num: "Step 4", name: "PRD", sub: "Living product requirements" },
        { num: "Output", name: "Plan Docs", sub: "Feeds Design phase" },
      ]} />
      <EngagementRecordPanel />
      <p className="text-[12px] font-semibold mb-2.5">Agents</p>
      <div className="grid grid-cols-3 gap-2.5 items-start">
        <PipelineCard
          label="Capture Pipeline"
          steps={CAPTURE_STEPS}
          agents={agents}
          entryId="meeting_copilot"
          onOpen={setModalId}
        />
        {["cps", "prd", "jarvis"].map((id) => {
          const agent = agents[id];
          if (!agent) return null;
          return <AgentCard key={id} agent={agent} onOpen={setModalId} onRun={runAgent} />;
        })}
      </div>
      <JarvisModal open={modalId === "jarvis"} onClose={() => setModalId(null)} />
      {modalId === "meeting_copilot" ? (
        <MeetingCopilotModal open onClose={() => setModalId(null)} />
      ) : modalId !== "jarvis" ? (
        <AgentModal agentId={modalId} onClose={() => setModalId(null)} />
      ) : null}
    </div>
  );
}
