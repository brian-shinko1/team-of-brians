"use client";

import { useEffect, useState } from "react";
import { Agent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatOutput } from "@/lib/formatters";
import { MdView } from "@/components/MdView";

interface AgentCardProps {
  agent: Agent;
  onOpen: (id: string) => void;
  onRun: (id: string) => void;
  onCancel: (id: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "Idle",
  running: "Running",
  done: "Done",
  error: "Error",
};

const STATUS_DOT: Record<string, string> = {
  idle: "bg-zinc-300",
  running: "bg-amber-400 animate-pulse",
  done: "bg-emerald-400",
  error: "bg-red-400",
};

export function AgentCard({ agent, onOpen, onRun, onCancel }: AgentCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      className="border border-zinc-200 rounded-xl p-[18px] cursor-pointer hover:border-zinc-300 hover:shadow-sm transition-all flex flex-col"
      onClick={() => onOpen(agent.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[13px] font-medium text-zinc-900">{agent.name}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{agent.desc}</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border border-zinc-200 shrink-0 ml-2"
          )}
        >
          <span className={cn("w-[5px] h-[5px] rounded-full", mounted ? STATUS_DOT[agent.status] : STATUS_DOT.idle)} />
          {mounted ? STATUS_LABEL[agent.status] : "Idle"}
        </div>
      </div>

      {/* Preview — stop propagation so scrolling doesn't open the modal */}
      <div className="bg-zinc-50 border border-zinc-100 rounded-md px-3 py-2.5 max-h-[260px] overflow-y-auto mb-3" onClick={(e) => e.stopPropagation()}>
        {mounted && agent.output ? (
          <MdView content={formatOutput(agent.id, agent.output)} />
        ) : (
          <span className="text-[11px] text-zinc-400">No output yet.</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span>{mounted && agent.lastRun ? `Last run: ${agent.lastRun}` : "Last run: —"}</span>
          {mounted && agent.driveUrl ? (
            <a
              href={agent.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              ↗ Drive
            </a>
          ) : (
            <span className="text-[11px] text-zinc-300">↗ Drive</span>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(agent.id);
            }}
          >
            View
          </button>
          {agent.pipelineId !== null && agent.id !== "summarise" && (
            agent.status === "running" ? (
              <button
                className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-red-600 text-white hover:opacity-80 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(agent.id);
                }}
              >
                Stop
              </button>
            ) : (
              <button
                className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-zinc-900 text-white hover:opacity-80 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onRun(agent.id);
                }}
              >
                ▶ Run
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
