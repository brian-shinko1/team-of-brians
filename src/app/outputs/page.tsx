"use client";

import { useState } from "react";
import { useAgents } from "@/context/AgentsContext";
import { FeedItem } from "@/components/FeedItem";
import { Phase } from "@/lib/types";

const PHASES: (Phase | "")[] = ["", "Plan", "Design", "Architecture", "Build", "Eval"];

export default function OutputsPage() {
  const { feed } = useAgents();
  const [filter, setFilter] = useState<Phase | "">("");

  const filtered = filter ? feed.filter((i) => i.phase === filter) : feed;

  const exportFeed = () => {
    const text = filtered
      .map((i) => `[${i.time}] [${i.phase}] ${i.agent}\n${i.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shinko1-outputs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Output Feed</h1>
          <p className="text-[12px] text-zinc-400 mt-1">
            All agent outputs across every phase — chronological
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Phase | "")}
            className="text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md bg-white text-zinc-700 outline-none focus:border-zinc-400"
          >
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p || "All phases"}
              </option>
            ))}
          </select>
          <button
            onClick={exportFeed}
            className="text-[12px] px-3 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-[12px] text-zinc-400">
            No outputs yet.
          </div>
        ) : (
          filtered.map((item) => <FeedItem key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
