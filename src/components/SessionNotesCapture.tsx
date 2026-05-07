"use client";

import { useState } from "react";
import { useAgents } from "@/context/AgentsContext";

export function SessionNotesCapture() {
  const { sessionNotes, savedSessionNotes, updateSessionNotes, saveSessionNotes, clearSessionNotes } = useAgents();
  const [showArchive, setShowArchive] = useState(false);

  return (
    <div className="border border-zinc-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[13px] font-medium text-zinc-900">Session Notes</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Capture principles, rules, and ubiquitous language as they emerge — flushed into Principles agent on next run
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-3 shrink-0">
          {savedSessionNotes.length > 0 && (
            <button
              onClick={() => setShowArchive((v) => !v)}
              className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors text-zinc-400"
            >
              Archive ({savedSessionNotes.length})
            </button>
          )}
          {sessionNotes.trim() && (
            <>
              <button
                onClick={clearSessionNotes}
                className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors text-zinc-400"
              >
                Clear
              </button>
              <button
                onClick={saveSessionNotes}
                className="text-[11px] px-2.5 py-1 bg-zinc-900 text-white rounded-md hover:opacity-80 transition-opacity"
              >
                Save & Clear
              </button>
            </>
          )}
        </div>
      </div>

      <textarea
        value={sessionNotes}
        onChange={(e) => updateSessionNotes(e.target.value)}
        placeholder={`Jot down decisions as they happen…\n\n- Principle: All responses must be grounded in verified data\n- Rule: No platform selected without written AU data residency confirmation\n- Language: "Hallucination" means any response not traceable to a source`}
        className="w-full text-[12px] text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 resize-y min-h-[120px] outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
      />

      {/* Archive */}
      {showArchive && savedSessionNotes.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[11px] font-medium text-zinc-500">Saved sessions</p>
          {savedSessionNotes.map((entry, i) => (
            <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-zinc-400 mb-1">
                {new Date(entry.savedAt).toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-600 whitespace-pre-wrap">{entry.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
