"use client";

import { useEffect, useState } from "react";
import { Agent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatOutput } from "@/lib/formatters";
import { MdView } from "@/components/MdView";

interface PipelineCardProps {
  label: string;
  steps: { id: string; name: string }[];
  agents: Record<string, Agent>;
  entryId: string; // which agent modal to open on click
  onOpen: (id: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  idle: "bg-zinc-300",
  running: "bg-amber-400 animate-pulse",
  done: "bg-emerald-400",
  error: "bg-red-400",
};

export function PipelineCard({ label, steps, agents, entryId, onOpen }: PipelineCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Show output from the last step that has one
  const previewAgent = [...steps].reverse().find((s) => agents[s.id]?.output);
  const previewContent = previewAgent ? formatOutput(previewAgent.id, agents[previewAgent.id].output) : null;

  // Overall status: running > error > done (all done) > idle
  const statuses = steps.map((s) => agents[s.id]?.status ?? "idle");
  const overallStatus = statuses.includes("running")
    ? "running"
    : statuses.includes("error")
    ? "error"
    : statuses.every((s) => s === "done")
    ? "done"
    : "idle";

  const lastRun = steps
    .map((s) => agents[s.id]?.lastRun)
    .filter(Boolean)
    .at(-1);

  return (
    <div className="border border-zinc-200 rounded-xl p-[18px] hover:border-zinc-300 hover:shadow-sm transition-all flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[13px] font-medium text-zinc-900">{label}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border border-zinc-200 shrink-0 ml-2">
          <span className={cn("w-[5px] h-[5px] rounded-full", mounted ? STATUS_DOT[overallStatus] : STATUS_DOT.idle)} />
          {mounted ? (overallStatus === "error" ? "Boss!" : overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)) : "Idle"}
        </div>
      </div>

      {/* Steps — each individually clickable */}
      <div className="flex flex-col gap-1 mb-3">
        {steps.map((step, i) => {
          const stepAgent = agents[step.id];
          const status = stepAgent?.status ?? "idle";
          return (
            <button
              key={step.id}
              onClick={() => onOpen(step.id)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-50 transition-colors text-left group"
            >
              <span className={cn("w-[5px] h-[5px] rounded-full shrink-0", mounted ? STATUS_DOT[status] : STATUS_DOT.idle)} />
              <span className="text-[12px] text-zinc-700 group-hover:text-zinc-900 flex-1">{step.name}</span>
              {i < steps.length - 1 && (
                <span className="text-[9px] text-zinc-300">→</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div className="bg-zinc-50 border border-zinc-100 rounded-md px-3 py-2.5 max-h-[200px] overflow-y-auto mb-3">
        {mounted && previewContent ? (
          <MdView content={previewContent} />
        ) : (
          <span className="text-[11px] text-zinc-400">No output yet.</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <span>{mounted && lastRun ? `Last run: ${lastRun}` : "Last run: —"}</span>
        <button
          className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
          onClick={() => onOpen(entryId)}
        >
          Open
        </button>
      </div>
    </div>
  );
}
