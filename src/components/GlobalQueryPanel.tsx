"use client";

import { useRef, useState, useEffect } from "react";
import { useAgents } from "@/context/AgentsContext";
import { MdEditor } from "@/components/MdEditor";
import { SaveToDriveDialog } from "@/components/SaveToDriveDialog";
import { INITIAL_AGENTS } from "@/lib/agents";

interface DocSlot {
  id: string;
  label: string;
  content: string;
}

interface GlobalQueryPanelProps {
  onClose: () => void;
}

export function GlobalQueryPanel({ onClose }: GlobalQueryPanelProps) {
  const { agents, settings, updateSettings, driveFolders, currentProjectId } = useAgents();

  // Fall back to env var if no pipeline configured in settings
  const effectivePipelineId = settings.queryPipelineId || process.env.NEXT_PUBLIC_PIPELINE_QUERY || null;

  const storageKey = `shinko1_query_${currentProjectId}`;

  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as { docs: DocSlot[]; instruction: string; output: string };
    } catch { return null; }
  };

  const saved = loadSaved();
  const [docs, setDocs] = useState<DocSlot[]>(saved?.docs ?? [{ id: "d1", label: "", content: "" }]);
  const [instruction, setInstruction] = useState(saved?.instruction ?? "");
  const [output, setOutput] = useState(saved?.output ?? "");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [editingPipeline, setEditingPipeline] = useState(false);
  const [saveDriveOpen, setSaveDriveOpen] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [editing, setEditing] = useState(false);

  // Persist state whenever docs, instruction, or output change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ docs, instruction, output }));
    } catch { /* non-critical */ }
  }, [docs, instruction, output, storageKey]);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addDoc = () => {
    setDocs((prev) => [...prev, { id: `d${Date.now()}`, label: "", content: "" }]);
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const patchDoc = (id: string, patch: Partial<DocSlot>) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const handleFile = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => patchDoc(id, { content: e.target?.result as string, label: file.name.replace(/\.\w+$/, "") });
    reader.readAsText(file);
  };

  const useAgentOutput = (id: string, agentId: string) => {
    const out = agents[agentId]?.output ?? "";
    const name = agents[agentId]?.name ?? agentId;
    patchDoc(id, { content: out, label: name });
  };

  const handleRun = async () => {
    if (!effectivePipelineId) { setEditingPipeline(true); return; }
    if (!instruction.trim() && docs.every((d) => !d.content.trim())) return;

    const docParts = docs
      .filter((d) => d.content.trim())
      .map((d) => `[DOCUMENT${d.label ? `: ${d.label}` : ""}]\n${d.content.trim()}`);

    const userInput = [
      ...docParts,
      instruction.trim() ? `[INSTRUCTION]\n${instruction.trim()}` : "",
    ].filter(Boolean).join("\n\n---\n\n");

    setRunning(true);
    setError("");
    setOutput("");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (settings.airiaKey) headers["x-airia-key"] = settings.airiaKey;

      const res = await fetch("/api/airia", {
        method: "POST",
        headers,
        body: JSON.stringify({
          pipelineId: effectivePipelineId,
          userInput,
          baseUrl: settings.airiaUrl,
        }),
      });

      if (!res.ok) {
        const { error: e } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(e);
      }
      const { output: result } = await res.json();
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  const handleEdit = async () => {
    if (!editInstruction.trim() || !output.trim()) return;
    setEditing(true);
    setError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (settings.airiaKey) headers["x-airia-key"] = settings.airiaKey;
      const userInput = `[EDIT WITH AI]\n\nYou are an expert editor. Edit the document below according to the instruction. Return only the edited document — no preamble, no explanation.\n\n[INSTRUCTION]\n${editInstruction.trim()}\n\n[DOCUMENT]\n${output}`;
      const res = await fetch("/api/airia", {
        method: "POST",
        headers,
        body: JSON.stringify({ pipelineId: effectivePipelineId, userInput, baseUrl: settings.airiaUrl }),
      });
      if (!res.ok) {
        const { error: e } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(e);
      }
      const { output: result } = await res.json();
      setOutput(result);
      setEditInstruction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setEditing(false);
    }
  };

  const agentOptions = INITIAL_AGENTS.filter((a) => agents[a.id]?.output);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[560px] bg-white border-l border-zinc-200 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[14px] font-semibold text-zinc-900">Ask AI</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Provide documents + instruction — get an instant response</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md border border-zinc-200 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 text-[14px]">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Pipeline ID row */}
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-zinc-400 flex-1">
              Pipeline:{" "}
              {effectivePipelineId
                ? <span className="font-mono text-zinc-600">{effectivePipelineId.slice(0, 8)}…</span>
                : <span className="text-amber-600">not configured</span>}
            </p>
            <button
              onClick={() => setEditingPipeline((v) => !v)}
              className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-500"
            >
              {editingPipeline ? "Done" : "Configure"}
            </button>
          </div>
          {editingPipeline && (
            <input
              autoFocus
              type="text"
              placeholder="AIRIA pipeline ID"
              defaultValue={settings.queryPipelineId ?? ""}
              onBlur={(e) => updateSettings({ queryPipelineId: e.target.value.trim() || null })}
              className="w-full text-[12px] font-mono px-3 py-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-400"
            />
          )}

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-zinc-700">Documents</p>
              <button onClick={addDoc} className="text-[11px] px-2 py-0.5 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-500">+ Add</button>
            </div>
            <div className="space-y-3">
              {docs.map((doc, i) => (
                <div key={doc.id} className="border border-zinc-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-b border-zinc-100">
                    <input
                      type="text"
                      placeholder={`Document ${i + 1} label (optional)`}
                      value={doc.label}
                      onChange={(e) => patchDoc(doc.id, { label: e.target.value })}
                      className="flex-1 text-[11px] bg-transparent outline-none text-zinc-600 placeholder-zinc-400"
                    />
                    {/* Pull from agent */}
                    {agentOptions.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) useAgentOutput(doc.id, e.target.value); e.target.value = ""; }}
                        className="text-[11px] text-zinc-500 bg-transparent border border-zinc-200 rounded px-1.5 py-0.5 outline-none cursor-pointer"
                      >
                        <option value="">← Use agent output</option>
                        {agentOptions.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    )}
                    {/* File upload */}
                    <input
                      ref={(el) => { fileRefs.current[doc.id] = el; }}
                      type="file"
                      accept=".txt,.md,.json"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(doc.id, f); }}
                    />
                    <button
                      onClick={() => fileRefs.current[doc.id]?.click()}
                      className="text-[11px] text-zinc-400 hover:text-zinc-700 px-1"
                      title="Upload file"
                    >↑ File</button>
                    {docs.length > 1 && (
                      <button onClick={() => removeDoc(doc.id)} className="text-[11px] text-zinc-300 hover:text-red-400 px-1">✕</button>
                    )}
                  </div>
                  <textarea
                    value={doc.content}
                    onChange={(e) => patchDoc(doc.id, { content: e.target.value })}
                    placeholder="Paste document content…"
                    className="w-full text-[12px] text-zinc-700 px-3 py-2.5 h-[120px] resize-y outline-none placeholder-zinc-300"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Instruction */}
          <div>
            <p className="text-[11px] font-medium text-zinc-700 mb-1.5">Instruction</p>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Based on this CPS document, give me a scope, time and effort breakdown for a one-day engagement…"
              className="w-full text-[12px] text-zinc-700 border border-zinc-200 rounded-lg px-3 py-2.5 h-[100px] resize-y outline-none focus:border-zinc-400 placeholder-zinc-300"
            />
          </div>

          {/* Output */}
          {(output || running || error) && (
            <div>
              <p className="text-[11px] font-medium text-zinc-700 mb-1.5">Response</p>
              <div className="bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-3.5">
                {running && <p className="text-[12px] text-zinc-400 animate-pulse">Running…</p>}
                {error && <p className="text-[12px] text-red-600">{error}</p>}
                {output && !running && <MdEditor content={output} onChange={setOutput} />}
              </div>

              {/* Edit with AI */}
              {output && !running && (
                <div className="mt-2 flex gap-2 items-center">
                  <div className="flex-1 flex items-center gap-2 border border-zinc-200 rounded-lg px-3 py-2 bg-white focus-within:border-zinc-400 transition-colors">
                    <span className="text-[10px] font-semibold text-zinc-400 shrink-0">EDIT</span>
                    <input
                      type="text"
                      value={editInstruction}
                      onChange={(e) => setEditInstruction(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                      placeholder="e.g. make this more concise · rewrite as bullet points · add a risks section · simplify the language"
                      className="flex-1 text-[12px] outline-none bg-transparent placeholder-zinc-300 text-zinc-700"
                    />
                  </div>
                  <button
                    onClick={handleEdit}
                    disabled={editing || !editInstruction.trim()}
                    className="text-[12px] font-medium px-3 py-2 bg-zinc-900 text-white rounded-lg hover:opacity-80 disabled:opacity-30 transition-opacity shrink-0"
                  >
                    {editing ? "Editing…" : "Apply"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            {output && !running && driveFolders?.projectRoot && (
              <button
                onClick={() => setSaveDriveOpen(true)}
                className="text-[11px] font-medium px-2.5 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-600 transition-colors"
              >
                ↑ Save to Drive
              </button>
            )}
            {output && !running && (
              <button
                onClick={() => { setOutput(""); setError(""); }}
                className="text-[11px] text-zinc-400 hover:text-zinc-600"
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            className="text-[12px] font-medium px-4 py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {running ? "Running…" : "▶ Run"}
          </button>
        </div>
      </div>

      {saveDriveOpen && driveFolders?.projectRoot && (
        <SaveToDriveDialog
          content={output}
          defaultFileName={`Ask AI — ${new Date().toISOString().slice(0, 10)}`}
          folderId={driveFolders.projectRoot}
          onClose={() => setSaveDriveOpen(false)}
          onSaved={() => setSaveDriveOpen(false)}
        />
      )}
    </>
  );
}
