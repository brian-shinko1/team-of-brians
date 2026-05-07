"use client";

import { useAgents } from "@/context/AgentsContext";

export function ApprovalBanner() {
  const { pendingApproval, approvePending, dismissPending, agents } = useAgents();

  if (!pendingApproval) return null;

  const agent = agents[pendingApproval.agentId];
  if (!agent) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-zinc-900 text-white px-5 py-3.5 rounded-xl shadow-xl border border-zinc-700 max-w-[560px] w-[calc(100vw-48px)]">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold leading-snug">
          {pendingApproval.reason ? (
            pendingApproval.reason
          ) : (
            <>Ready to run <span className="text-zinc-300">{agent.name}</span></>
          )}
        </p>
        <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
          {pendingApproval.reason ? agent.name : `${agent.desc} — review the previous output before continuing`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={dismissPending}
          className="text-[11px] px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 transition-colors"
        >
          Skip
        </button>
        <button
          onClick={approvePending}
          className="text-[11px] font-medium px-3.5 py-1.5 rounded-lg bg-white text-zinc-900 hover:bg-zinc-100 transition-colors"
        >
          Review & Run
        </button>
      </div>
    </div>
  );
}
