"use client";

import { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgents } from "@/context/AgentsContext";
import { formatOutput } from "@/lib/formatters";
import { PREVIOUS_AGENT, FALLBACK_AGENT, SECONDARY_AGENT, CONTEXT_AGENTS } from "@/lib/agents";
import { MdEditor } from "@/components/MdEditor";
import { DocEditorPanel } from "@/components/DocEditorPanel";
import { SaveToDriveDialog } from "@/components/SaveToDriveDialog";

interface AgentModalProps {
  agentId: string | null;
  onClose: () => void;
  prefilledInput?: string;
}

// ── Meeting Input tabs ────────────────────────────────────────────────────────

type MeetingTab = "paste" | "file" | "recording" | "email" | "message";

const MEETING_TABS: { id: MeetingTab; label: string }[] = [
  { id: "paste",     label: "Paste text" },
  { id: "file",      label: "Upload file" },
  { id: "recording", label: "Recording" },
  { id: "email",     label: "Email" },
  { id: "message",   label: "Message" },
];

function EmailInput({ onReady }: { onReady: (value: string) => void }) {
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const emit = (f: string, s: string, b: string) => {
    const parts = [
      f.trim() && `From: ${f.trim()}`,
      s.trim() && `Subject: ${s.trim()}`,
      b.trim(),
    ].filter(Boolean);
    onReady(parts.length ? `[Email]\n${parts.join("\n")}` : "");
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={from}
        onChange={(e) => { setFrom(e.target.value); emit(e.target.value, subject, body); }}
        placeholder="From (optional)"
        className="text-[12px] border border-zinc-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <input
        type="text"
        value={subject}
        onChange={(e) => { setSubject(e.target.value); emit(from, e.target.value, body); }}
        placeholder="Subject (optional)"
        className="text-[12px] border border-zinc-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <Textarea
        value={body}
        onChange={(e) => { setBody(e.target.value); emit(from, subject, e.target.value); }}
        placeholder="Paste email body…"
        className="text-[12px] h-[100px] resize-none border-zinc-200 focus-visible:ring-zinc-900 rounded-lg"
      />
    </div>
  );
}

function MessageInput({ onReady }: { onReady: (value: string) => void }) {
  const [source, setSource] = useState("");
  const [body, setBody] = useState("");

  const emit = (s: string, b: string) => {
    const header = s.trim() ? `[Message thread — ${s.trim()}]` : "[Message thread]";
    onReady(b.trim() ? `${header}\n${b.trim()}` : "");
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={source}
        onChange={(e) => { setSource(e.target.value); emit(e.target.value, body); }}
        placeholder="Source — e.g. Slack, WhatsApp, Teams (optional)"
        className="text-[12px] border border-zinc-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <Textarea
        value={body}
        onChange={(e) => { setBody(e.target.value); emit(source, e.target.value); }}
        placeholder="Paste message thread…"
        className="text-[12px] h-[120px] resize-none border-zinc-200 focus-visible:ring-zinc-900 rounded-lg"
      />
    </div>
  );
}

function MeetingInput({ onReady }: { onReady: (value: string) => void }) {
  const { settings } = useAgents();
  const [tab, setTab] = useState<MeetingTab>("paste");
  const [pasteText, setPasteText] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docText, setDocText] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState("");
  const docRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const handleDocFile = (file: File) => {
    setDocFile(file);
    setDocText(null);
    const readable = /\.(txt|md)$/i.test(file.name);
    if (readable) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDocText(text);
        onReady(text);
      };
      reader.readAsText(file);
    } else {
      const placeholder = `[File: ${file.name} — ${(file.size / 1024).toFixed(0)} KB]\n\nPDF and DOCX extraction coming soon. Paste the text manually in the Paste tab.`;
      setDocText(placeholder);
      onReady(placeholder);
    }
  };

  const handleTranscribe = async (file: File) => {
    setTranscribing(true);
    setTranscribeError("");
    setTranscript(null);
    try {
      const form = new FormData();
      form.append("audio", file);
      const headers: Record<string, string> = {};
      if (settings.xaiKey) headers["x-xai-key"] = settings.xaiKey;
      const res = await fetch("/api/stt", { method: "POST", headers, body: form });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(error);
      }
      const { transcript: text } = await res.json();
      setTranscript(text);
      onReady(text);
    } catch (err) {
      setTranscribeError(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 mb-3 border border-zinc-200 rounded-lg overflow-hidden w-full">
        {MEETING_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-[11px] font-medium px-2 py-1.5 transition-colors ${
              tab === t.id ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Paste */}
      {tab === "paste" && (
        <Textarea
          value={pasteText}
          onChange={(e) => { setPasteText(e.target.value); onReady(e.target.value); }}
          placeholder="Paste a transcript, meeting notes, or any text input…"
          className="text-[12px] h-[120px] resize-none border-zinc-200 focus-visible:ring-zinc-900 rounded-lg"
        />
      )}

      {/* File upload */}
      {tab === "file" && (
        <div
          className="border-2 border-dashed border-zinc-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
          onClick={() => docRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleDocFile(f); }}
        >
          <input ref={docRef} type="file" accept=".txt,.md,.pdf,.docx" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocFile(f); }} />
          {docFile ? (
            <>
              <span className="text-[20px]">📄</span>
              <p className="text-[12px] font-medium text-zinc-800">{docFile.name}</p>
              <p className="text-[11px] text-zinc-400">{(docFile.size / 1024).toFixed(0)} KB{docText ? " · ready" : " · reading…"} · click to change</p>
            </>
          ) : (
            <>
              <span className="text-[20px]">📄</span>
              <p className="text-[12px] text-zinc-500">Drop a file or click to browse</p>
              <p className="text-[11px] text-zinc-400">.txt · .md · .pdf · .docx</p>
            </>
          )}
        </div>
      )}

      {/* Email */}
      {tab === "email" && (
        <EmailInput onReady={onReady} />
      )}

      {/* Message */}
      {tab === "message" && (
        <MessageInput onReady={onReady} />
      )}

      {/* Recording */}
      {tab === "recording" && (
        <div className="flex flex-col gap-3">
          <input ref={audioRef} type="file" accept="audio/*,video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }} />
          <div
            className="border-2 border-dashed border-zinc-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
            onClick={() => audioRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setAudioFile(f); }}
          >
            {audioFile ? (
              <>
                <span className="text-[20px]">🎙</span>
                <p className="text-[12px] font-medium text-zinc-800">{audioFile.name}</p>
                <p className="text-[11px] text-zinc-400">{(audioFile.size / 1024 / 1024).toFixed(1)} MB · click to change</p>
              </>
            ) : (
              <>
                <span className="text-[20px]">🎙</span>
                <p className="text-[12px] text-zinc-500">Drop a recording or click to browse</p>
                <p className="text-[11px] text-zinc-400">mp3 · mp4 · wav · m4a · webm</p>
              </>
            )}
          </div>
          {audioFile && !transcript && (
            <button
              onClick={() => handleTranscribe(audioFile)}
              disabled={transcribing}
              className="text-[12px] font-medium px-4 py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 disabled:opacity-40 transition-opacity w-full"
            >
              {transcribing ? "Transcribing…" : "Transcribe"}
            </button>
          )}
          {transcribeError && <p className="text-[11px] text-red-600">{transcribeError}</p>}
          {transcript && (
            <div className="bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Transcript ready</p>
              <p className="text-[12px] text-zinc-700 leading-relaxed line-clamp-4">{transcript}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function AgentModal({ agentId, onClose, prefilledInput }: AgentModalProps) {
  const { agents, runAgent, runSTT, updateAgent, driveFolders, settings, stagedPrinciplesInput } = useAgents();
  const [input, setInput] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [principlesAudio, setPrinciplesAudio] = useState<File | null>(null);
  const [principlesTranscribing, setPrinciplesTranscribing] = useState(false);
  const [eventStormImages, setEventStormImages] = useState<{ name: string; dataUrl: string }[]>([]);
  const agent = agentId ? agents[agentId] : null;
  const [showDocEditor, setShowDocEditor] = useState(() => !!agent?.output);
  const [saveDriveOpen, setSaveDriveOpen] = useState(false);
  const [includeExisting, setIncludeExisting] = useState(false);
  const [existingContext, setExistingContext] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const principlesAudioRef = useRef<HTMLInputElement>(null);

  const isSTT = agentId === "stt";
  const isMeetingInput = agentId === "meeting_input";
  const isEventStorm = agentId === "event_storm";
  const isPrinciples = agentId === "principles";

  // Reset state whenever the modal opens for a different agent
  useEffect(() => {
    // Auto-fill input from previous agent's output for all agents except
    // the capture pipeline (meeting_input, stt) and event_storm
    const captureOrEventStorm = !agentId || agentId === "meeting_input" || agentId === "stt" || agentId === "event_storm";
    let defaultInput = prefilledInput ?? "";
    if (!defaultInput && !captureOrEventStorm) {
      // For principles: just show the staged session notes — previous output is injected silently by runAgent
      if (agentId === "principles") {
        defaultInput = stagedPrinciplesInput?.trim() ?? "";
      // Restore last typed input if available
      } else if (agent?.lastInput) {
        defaultInput = agent.lastInput;
      } else if (agent?.output) {
        // Re-run: agent already has output → use own previous output as base
        defaultInput = agent.output;
      } else if (PREVIOUS_AGENT[agentId]) {
        // First run: pull from upstream agent
        const prevId = PREVIOUS_AGENT[agentId];
        const fallbackId = FALLBACK_AGENT[agentId];
        const prevAgent = agents[prevId];
        const fallbackAgent = fallbackId ? agents[fallbackId] : null;
        const source = prevAgent?.output ? prevAgent : fallbackAgent?.output ? fallbackAgent : null;
        if (source) defaultInput = source.output;
      }
    }
    setInput(defaultInput);
    setAudioFile(null);
    setPrinciplesAudio(null);
    setEventStormImages([]);
    setIncludeExisting(false);
    setExistingContext("");
    setShowDocEditor(!!agent?.output);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const handleImageFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setEventStormImages((prev) => [...prev, { name: file.name, dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleToggleExisting = async (checked: boolean) => {
    setIncludeExisting(checked);
    if (checked && !existingContext && agent && agentId) {
      const subfolderId = driveFolders?.subfolders[agentId];
      if (subfolderId) {
        setLoadingExisting(true);
        try {
          const res = await fetch(`/api/drive/read?folderId=${subfolderId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.context) {
              setExistingContext(data.context);
              setLoadingExisting(false);
              return;
            }
          }
        } catch {
          // fall through to in-memory fallback
        }
        setLoadingExisting(false);
      }
      // Fallback: use in-memory output
      if (agent.output) setExistingContext(agent.output);
    }
  };

  const buildFinalInput = (baseInput: string) => {
    if (!includeExisting || !existingContext) return baseInput;
    return `[EXISTING PHASE CONTEXT — use to update/increment]\n${existingContext}\n\n---\n\n[NEW INPUT]\n${baseInput}`;
  };

  const handleRun = async () => {
    if (!agentId) return;

    // Persist the current input so it's restored next time the modal opens
    if (!isSTT && !isMeetingInput) {
      updateAgent(agentId, { lastInput: input });
    }

    if (isSTT) {
      if (!audioFile) return;
      await runSTT(audioFile);
    } else if (isMeetingInput) {
      const finalInput = buildFinalInput(input);
      await runAgent("meeting_input", finalInput);
      // Always run summarise on explicit click regardless of autoChain
      if (!settings.autoChain) {
        await runAgent("summarise", finalInput);
      }
    } else if (isEventStorm && eventStormImages.length > 0) {
      const imageParts = eventStormImages.map((img, i) => `[Image ${i + 1}: ${img.name}]\n${img.dataUrl}`).join("\n\n");
      const combined = [input.trim(), imageParts].filter(Boolean).join("\n\n");
      await runAgent(agentId, buildFinalInput(combined));
    } else if (isPrinciples && principlesAudio) {
      setPrinciplesTranscribing(true);
      try {
        const form = new FormData();
        form.append("audio", principlesAudio);
        const headers: Record<string, string> = {};
        if (settings.xaiKey) headers["x-xai-key"] = settings.xaiKey;
        const res = await fetch("/api/stt", { method: "POST", headers, body: form });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(error);
        }
        const { transcript } = await res.json();
        const combined = [input.trim(), `[Event Storming Session Recording]\n${transcript}`].filter(Boolean).join("\n\n");
        await runAgent(agentId, buildFinalInput(combined));
      } finally {
        setPrinciplesTranscribing(false);
      }
    } else {
      await runAgent(agentId, buildFinalInput(input));
    }
  };

  // Check if required context agents (CONTEXT_AGENTS) have output — block run if missing
  const missingContext = agentId
    ? (CONTEXT_AGENTS[agentId] ?? []).filter((ctxId) => !agents[ctxId]?.output)
    : [];
  const canRun = isSTT ? !!audioFile : isMeetingInput ? !!input.trim() : missingContext.length === 0;

  const summariseAgent = agents["summarise"];
  const runLabel = () => {
    if (principlesTranscribing) return "Transcribing…";
    if (isMeetingInput && summariseAgent?.status === "running") return "Summarising…";
    if (agent?.status === "running") return isSTT ? "Transcribing…" : "Running…";
    if (isMeetingInput) return "▶ Summarise";
    return "▶ Run Agent";
  };

  const outputAgent = isMeetingInput ? summariseAgent : agent;
  const outputAgentId = isMeetingInput ? "summarise" : agentId;
  const formattedOutput = outputAgentId && outputAgent?.output ? formatOutput(outputAgentId, outputAgent.output) : "";

  const driveFileName = outputAgent ? `${outputAgent.name}-${new Date().toISOString().slice(0, 10)}.md` : "";
  const driveFolderId = outputAgentId && outputAgent
    ? (driveFolders?.subfolders[outputAgentId] ?? driveFolders?.phases[outputAgent.phase] ?? undefined)
    : undefined;

  return (
    <>
      <Dialog open={!!agentId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="w-[95vw] max-h-[90vh] !flex flex-col overflow-hidden bg-white border border-zinc-200 shadow-xl rounded-xl p-0 gap-0"
          style={{ maxWidth: "1700px" }}
        >
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
            <DialogTitle className="text-[15px] font-semibold text-zinc-900">
              {agent?.name ?? "Agent"}
            </DialogTitle>
            <p className="text-[11px] text-zinc-400 mt-0.5">{agent?.desc}</p>

            {agentId && !isMeetingInput && !isSTT && (() => {
              const prevId = PREVIOUS_AGENT[agentId];
              const fallbackId = FALLBACK_AGENT[agentId];
              const contextIds = CONTEXT_AGENTS[agentId] ?? [];
              const secondaryId = SECONDARY_AGENT[agentId];
              if (!prevId && contextIds.length === 0) return null;

              return (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                  {prevId && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Input</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${agents[prevId]?.output ? "bg-zinc-100 text-zinc-700" : "bg-zinc-50 text-zinc-400"}`}>
                        {agents[prevId]?.name ?? prevId}
                      </span>
                      {fallbackId && (
                        <>
                          <span className="text-[10px] text-zinc-300">or</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${agents[fallbackId]?.output ? "bg-zinc-100 text-zinc-700" : "bg-zinc-50 text-zinc-400"}`}>
                            {agents[fallbackId]?.name ?? fallbackId}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {contextIds.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Context</span>
                      {contextIds.map((ctxId) => (
                        <span key={ctxId} className={`text-[11px] px-2 py-0.5 rounded-full border ${agents[ctxId]?.output ? "border-zinc-200 bg-zinc-50 text-zinc-600" : "border-dashed border-zinc-200 text-zinc-400"}`}>
                          {agents[ctxId]?.name ?? ctxId}
                        </span>
                      ))}
                    </div>
                  )}
                  {secondaryId && !contextIds.includes(secondaryId) && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Optional</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${agents[secondaryId]?.output ? "bg-zinc-50 text-zinc-500" : "text-zinc-300"}`}>
                        {agents[secondaryId]?.name ?? secondaryId}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
            <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-4 px-6 py-5 overflow-y-auto">
              <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-zinc-700">Input</label>
                    <div className="flex items-center gap-1.5">
                      {agentId && SECONDARY_AGENT[agentId] && (() => {
                        const secAgent = agents[SECONDARY_AGENT[agentId]];
                        const hasOutput = !!secAgent?.output;
                        return (
                          <button
                            onClick={() => hasOutput && setInput((prev) => prev.trim() ? `${prev.trim()}\n\n---\n\n${secAgent.output}` : secAgent.output)}
                            disabled={!hasOutput}
                            className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ← Use {secAgent?.name} output
                          </button>
                        );
                      })()}
                      {agentId && PREVIOUS_AGENT[agentId] && !CONTEXT_AGENTS[agentId]?.includes(PREVIOUS_AGENT[agentId]) && (() => {
                        const prevId = PREVIOUS_AGENT[agentId];
                        const fallbackId = FALLBACK_AGENT[agentId];
                        const prevAgent = agents[prevId];
                        const fallbackAgent = fallbackId ? agents[fallbackId] : null;
                        const source = prevAgent?.output ? prevAgent : fallbackAgent?.output ? fallbackAgent : null;
                        const sourceName = prevAgent?.name ?? (fallbackId ? agents[fallbackId]?.name : undefined) ?? prevId;
                        return (
                          <button
                            onClick={() => source && setInput((prev) => prev.trim() ? `${prev.trim()}\n\n---\n\n${source.output}` : source.output)}
                            disabled={!source}
                            className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ← Use {sourceName} output
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {isMeetingInput ? (
                    <MeetingInput onReady={(value) => setInput(value)} />
                  ) : isSTT ? (
                    <div
                      className="border-2 border-dashed border-zinc-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) setAudioFile(file);
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setAudioFile(file);
                        }}
                      />
                      {audioFile ? (
                        <>
                          <span className="text-[20px]">🎙</span>
                          <p className="text-[12px] font-medium text-zinc-800">{audioFile.name}</p>
                          <p className="text-[11px] text-zinc-400">
                            {(audioFile.size / 1024 / 1024).toFixed(1)} MB · click to change
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="text-[20px]">🎙</span>
                          <p className="text-[12px] text-zinc-500">Drop an audio file or click to browse</p>
                          <p className="text-[11px] text-zinc-400">mp3 · mp4 · wav · m4a · webm · ogg</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                          isEventStorm ? "Optional notes or context for the event storm…"
                          : isPrinciples ? "Optional additional context…"
                          : "Paste input, or let the pipeline auto-fill this field…"
                        }
                        className="text-[12px] h-[280px] resize-y border-zinc-200 focus-visible:ring-zinc-900 rounded-lg"
                      />
                      {isPrinciples && (
                        <div className="mt-2">
                          <p className="text-[11px] font-medium text-zinc-600 mb-1.5">Event storming session recording <span className="text-zinc-400 font-normal">(optional — will be transcribed)</span></p>
                          <input
                            ref={principlesAudioRef}
                            type="file"
                            accept="audio/*,video/*"
                            className="hidden"
                            onChange={(e) => setPrinciplesAudio(e.target.files?.[0] ?? null)}
                          />
                          <div
                            className="border-2 border-dashed border-zinc-200 rounded-lg p-4 flex flex-col items-center gap-1.5 cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
                            onClick={() => principlesAudioRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); setPrinciplesAudio(e.dataTransfer.files[0] ?? null); }}
                          >
                            {principlesAudio ? (
                              <>
                                <span className="text-[18px]">🎙</span>
                                <p className="text-[12px] font-medium text-zinc-800">{principlesAudio.name}</p>
                                <p className="text-[11px] text-zinc-400">{(principlesAudio.size / 1024 / 1024).toFixed(1)} MB · click to change</p>
                              </>
                            ) : (
                              <>
                                <span className="text-[18px]">🎙</span>
                                <p className="text-[12px] text-zinc-500">Drop session recording or click to upload</p>
                                <p className="text-[11px] text-zinc-400">mp3 · mp4 · wav · m4a · webm</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      {isEventStorm && (
                        <div className="mt-2">
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleImageFiles(e.target.files)}
                          />
                          <div
                            className="border-2 border-dashed border-zinc-200 rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
                            onClick={() => imageInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); handleImageFiles(e.dataTransfer.files); }}
                          >
                            <p className="text-[12px] text-zinc-500">Drop event storm images or click to upload</p>
                            <p className="text-[11px] text-zinc-400">PNG · JPG · WEBP · multiple allowed</p>
                          </div>
                          {eventStormImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {eventStormImages.map((img, i) => (
                                <div key={i} className="relative group">
                                  <img src={img.dataUrl} alt={img.name} className="h-16 w-16 object-cover rounded-md border border-zinc-200" />
                                  <button
                                    onClick={() => setEventStormImages((prev) => prev.filter((_, j) => j !== i))}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-800 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >×</button>
                                  <p className="text-[9px] text-zinc-400 truncate max-w-[64px] mt-0.5">{img.name}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
              </div>

              {!isMeetingInput && !isSTT && driveFolders?.phases[agent?.phase ?? ""] && (
                <div className="border border-zinc-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-zinc-700">Include existing phase output</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Pulls latest from the {agent?.name} Drive folder — for versioning & incrementation</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={includeExisting}
                      onClick={() => handleToggleExisting(!includeExisting)}
                      disabled={loadingExisting}
                      className={`relative w-8 h-4.5 rounded-full transition-colors shrink-0 ${includeExisting ? "bg-zinc-900" : "bg-zinc-200"} disabled:opacity-40`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${includeExisting ? "translate-x-3.5" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {loadingExisting && (
                    <p className="text-[11px] text-zinc-400 mt-2">Pulling from Drive…</p>
                  )}
                  {includeExisting && existingContext && !loadingExisting && (
                    <div className="mt-2">
                      <textarea
                        value={existingContext}
                        onChange={(e) => setExistingContext(e.target.value)}
                        className="w-full text-[11px] text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-md px-2.5 py-2 resize-y h-[140px] outline-none focus:border-zinc-300"
                      />
                    </div>
                  )}
                  {includeExisting && !existingContext && !loadingExisting && (
                    <p className="text-[11px] text-zinc-400 mt-2">No existing output found for {agent?.name}.</p>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-zinc-700">{isMeetingInput ? "Summary" : "Output"}</label>
                  {outputAgent?.output && (
                    <button
                      onClick={() => setShowDocEditor((v) => !v)}
                      className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors text-zinc-500"
                    >
                      {showDocEditor ? "Close editor" : "Edit with AI"}
                    </button>
                  )}
                </div>
                <div className="bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-3.5 overflow-x-hidden">
                  {outputAgent?.output ? (
                    <MdEditor
                      content={formattedOutput}
                      onChange={(v) => outputAgentId && updateAgent(outputAgentId, { output: v })}
                    />
                  ) : (
                    <p className="text-[12px] text-zinc-400 min-h-[80px] flex items-center">No output yet.</p>
                  )}
                </div>
              </div>
            </div>

            {outputAgentId && outputAgent?.output && (
              <div className={showDocEditor ? "" : "hidden"}>
                <DocEditorPanel
                  document={formattedOutput}
                  onAccept={(newContent) => updateAgent(outputAgentId, { output: newContent })}
                  onClose={() => setShowDocEditor(false)}
                />
              </div>
            )}
          </div>

          {missingContext.length > 0 && (
            <div className="px-6 py-2.5 border-t border-amber-100 bg-amber-50 shrink-0">
              <p className="text-[11px] text-amber-700">
                <span className="font-semibold">Required context missing:</span>{" "}
                {missingContext.map((id) => agents[id]?.name ?? id).join(", ")} must be run first.
              </p>
            </div>
          )}
          <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2 shrink-0">
            {outputAgent?.output && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDriveOpen(true)}
                className="text-[12px] border-zinc-200 mr-auto"
              >
                ↑ Save to Drive
              </Button>
            )}
            {outputAgent && !outputAgent.output && (
              outputAgent.driveUrl ? (
                <a
                  href={outputAgent.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium h-7 px-2.5 inline-flex items-center rounded-[min(var(--radius-md),12px)] border border-zinc-200 bg-background hover:bg-muted transition-colors mr-auto whitespace-nowrap shrink-0"
                >
                  ↗ View in Drive
                </a>
              ) : null
            )}
            {outputAgent?.driveUrl && outputAgent.output && (
              <a
                href={outputAgent.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-medium h-7 px-2.5 inline-flex items-center rounded-[min(var(--radius-md),12px)] border border-zinc-200 bg-background hover:bg-muted transition-colors whitespace-nowrap shrink-0"
              >
                ↗ View in Drive
              </a>
            )}
            {(agent?.pipelineId !== null || isMeetingInput || isSTT) && (
              <Button
                size="sm"
                onClick={handleRun}
                disabled={agent?.status === "running" || principlesTranscribing || (isMeetingInput && summariseAgent?.status === "running") || !canRun}
                className="text-[12px] bg-zinc-900 hover:bg-zinc-800"
              >
                {runLabel()}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {saveDriveOpen && outputAgentId && outputAgent && (
        <SaveToDriveDialog
          content={formattedOutput}
          defaultFileName={driveFileName}
          folderId={driveFolderId}
          onClose={() => setSaveDriveOpen(false)}
          onSaved={(url) => { updateAgent(outputAgentId, { driveUrl: url }); setSaveDriveOpen(false); }}
        />
      )}
    </>
  );
}
