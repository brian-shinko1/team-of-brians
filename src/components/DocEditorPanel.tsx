"use client";

import { useState } from "react";
import { useAgents } from "@/context/AgentsContext";
import { MdView } from "@/components/MdView";

interface DocEditorPanelProps {
  document: string;
  onAccept: (newContent: string) => void;
  onClose: () => void;
}

export function DocEditorPanel({ document, onAccept, onClose }: DocEditorPanelProps) {
  const { settings } = useAgents();
  const [query, setQuery] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [editedSuggestion, setEditedSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pipelineId = process.env.NEXT_PUBLIC_PIPELINE_HELP;

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSuggestion("");

    try {
      const input = `DOCUMENT:\n${document}\n\n---\n\nEDIT REQUEST: ${query}`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (settings.airiaKey) headers["x-airia-key"] = settings.airiaKey;

      const res = await fetch("/api/airia", {
        method: "POST",
        headers,
        body: JSON.stringify({
          pipelineId: pipelineId ?? "",
          userInput: input,
          baseUrl: settings.airiaUrl,
        }),
      });

      if (!res.ok) {
        const { error: err } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err);
      }
      const { output } = await res.json();
      setSuggestion(output);
      setEditedSuggestion(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-zinc-200 w-[780px] shrink-0 bg-zinc-50/50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[13px] font-semibold text-zinc-900">Edit with AI</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Powered by Document Editor agent</p>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-[18px] leading-none px-1">×</button>
      </div>

      <div className="flex flex-col gap-3 p-4 flex-1 min-h-0 overflow-y-auto">
        {/* Query input */}
        <div>
          <label className="text-[11px] font-medium text-zinc-700 mb-1.5 block">What would you like to change?</label>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Add a risks section, rewrite the problem statement, make it more concise…"
            className="w-full text-[12px] px-2.5 py-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 bg-white resize-none min-h-[80px]"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !query.trim()}
            className="mt-2 text-[12px] font-medium px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 disabled:opacity-30 transition-opacity w-full"
          >
            {loading ? "Generating…" : "Apply edit"}
          </button>
        </div>

        {error && (
          <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Suggestion */}
        {suggestion && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-zinc-700">Review &amp; edit before applying</label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { onAccept(editedSuggestion); onClose(); }}
                  className="text-[11px] font-medium px-2.5 py-1 bg-emerald-600 text-white rounded-md hover:opacity-80 transition-opacity"
                >
                  Apply
                </button>
                <button
                  onClick={() => { setSuggestion(""); setEditedSuggestion(""); }}
                  className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-100 transition-colors text-zinc-500"
                >
                  Discard
                </button>
              </div>
            </div>
            <div className="flex gap-3 min-h-0">
              <textarea
                value={editedSuggestion}
                onChange={(e) => setEditedSuggestion(e.target.value)}
                className="flex-1 text-[12px] font-mono px-2.5 py-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 bg-white resize-y min-h-[300px]"
                spellCheck={false}
              />
              <div className="flex-1 bg-white border border-zinc-100 rounded-lg px-3 py-2.5 overflow-y-auto min-h-[300px]">
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Preview</p>
                <MdView content={editedSuggestion} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
