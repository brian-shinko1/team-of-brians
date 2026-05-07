"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgents } from "@/context/AgentsContext";
import { buildProjectContext } from "@/lib/formatters";

type Tab = "pre" | "live" | "gap";

const TABS: { id: Tab; label: string }[] = [
  { id: "pre",  label: "Pre-meeting" },
  { id: "live", label: "Live" },
  { id: "gap",  label: "Gap report" },
];

const ATTENDEE_ROLES = [
  "Director / Executive",
  "Tech Lead",
  "Product Owner",
  "Project Manager",
  "Department Lead",
  "Business Analyst",
  "End User / Operator",
  "Legal / Compliance",
  "Finance",
  "Other",
];

interface MeetingCopilotModalProps {
  open: boolean;
  onClose: () => void;
}

export function MeetingCopilotModal({ open, onClose }: MeetingCopilotModalProps) {
  const { agents, settings, updateAgent, runAgent, currentProject } = useAgents();
  const agent = agents["meeting_copilot"];

  // Compressed project context — constant size regardless of how many sessions
  const existingContext = buildProjectContext(agents, currentProject.sessionLog);

  const sessionCount = currentProject.sessionLog?.length ?? 0;
  const contextBadges = [
    agents.cps?.output && "CPS",
    agents.prd?.output && "PRD",
    sessionCount > 0   && `${sessionCount} session${sessionCount > 1 ? "s" : ""}`,
  ].filter(Boolean) as string[];

  const [tab, setTab] = useState<Tab>("pre");
  const [context, setContext]         = useState("");
  const [attendees, setAttendees]     = useState<string[]>([]);
  const [checklist, setChecklist]     = useState(agent?.output || "");
  const [transcript, setTranscript]   = useState("");
  const [gapReport, setGapReport]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError]             = useState("");
  const audioInputRef = useRef<HTMLInputElement>(null);


  const pipelineId = agent?.pipelineId || settings.queryPipelineId;

  function toggleAttendee(role: string) {
    setAttendees((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function callAiria(input: string): Promise<string> {
    if (!pipelineId) throw new Error("No pipeline ID configured for Meeting Co-Pilot.");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.airiaKey) headers["x-airia-key"] = settings.airiaKey;

    const res = await fetch("/api/airia", {
      method: "POST",
      headers,
      body: JSON.stringify({ pipelineId, userInput: input }),
    });
    if (!res.ok) {
      const { error: e } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(e || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return typeof data === "string" ? data : data.output ?? JSON.stringify(data);
  }

  async function handleGenerateChecklist() {
    if (!context.trim()) return;
    setLoading(true);
    setError("");
    try {
      const parts = [`[MODE: PRE_MEETING]`];
      if (existingContext) parts.push(`[EXISTING PROJECT CONTEXT]\n${existingContext}`);
      parts.push(`[MEETING CONTEXT]\n${context}`);
      if (attendees.length > 0) parts.push(`[ATTENDEES FROM CLIENT SIDE]\n${attendees.join(", ")}`);
      const input = parts.join("\n\n");
      const result = await callAiria(input);
      setChecklist(result);
      setTab("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generating checklist");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateChecklist() {
    if (!transcript.trim()) return;
    setLoading(true);
    setError("");
    try {
      const input = `[MODE: LIVE_UPDATE]\n\n[CURRENT CHECKLIST]\n${checklist || "(none yet)"}\n\n[TRANSCRIPT CHUNK]\n${transcript}`;
      const result = await callAiria(input);
      setChecklist(result);
      setTranscript("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error updating checklist");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateGapReport() {
    setLoading(true);
    setError("");
    try {
      const attendeeSection = attendees.length > 0
        ? `\n\n[ATTENDEES]\n${attendees.join(", ")}`
        : "";
      const input = `[MODE: GAP_REPORT]\n\n[MEETING CONTEXT]\n${context || "(not provided)"}${attendeeSection}\n\n[FINAL CHECKLIST]\n${checklist || "(not provided)"}`;
      const result = await callAiria(input);
      setGapReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generating gap report");
    } finally {
      setLoading(false);
    }
  }

function handleSendToSummarise() {
    if (!gapReport.trim()) return;
    // Session continuity: prepend previous summary so Summarise produces a delta
    const prevSummary = agents.summarise?.output;
    const output = prevSummary
      ? `[PREVIOUS SESSION SUMMARY]\n${prevSummary}\n\n---\n\n[NEW SESSION NOTES]\n${gapReport}`
      : gapReport;
    // Set Co-Pilot output then immediately fire the Summarise pipeline
    updateAgent("meeting_copilot", { output, status: "done", lastRun: "just now" });
    runAgent("summarise", output);
    onClose();
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!audioInputRef.current) return;
    audioInputRef.current.value = "";
    if (!file) return;

    setTranscribing(true);
    setError("");
    try {
      const form = new FormData();
      form.append("audio", file);

      const headers: Record<string, string> = {};
      if (settings.xaiKey) headers["x-xai-key"] = settings.xaiKey;

      const res = await fetch("/api/stt", { method: "POST", headers, body: form });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setTranscript((prev) => prev ? `${prev}\n\n${data.transcript}` : data.transcript);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  }

  function handleSaveChecklist() {
    if (!checklist.trim()) return;
    updateAgent("meeting_copilot", { output: checklist, status: "done", lastRun: "just now" });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !transcribing && !loading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100">
          <DialogTitle className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
            <span className="text-[13px] font-bold px-2 py-0.5 rounded text-white" style={{ background: "#5C4EE5" }}>
              Plan
            </span>
            Meeting Co-Pilot
          </DialogTitle>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Pre-meeting prep · live transcript updates · end-of-meeting gap report
          </p>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 px-6 pt-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-2.5 mr-5 text-[12px] font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-zinc-800 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* ── Pre-meeting ── */}
          {tab === "pre" && (
            <div className="space-y-4">
              {contextBadges.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <span className="text-[10px] text-zinc-400 shrink-0">Project context loaded:</span>
                  {contextBadges.map((b) => (
                    <span key={b} className="text-[10px] font-medium px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-zinc-600">{b}</span>
                  ))}
                </div>
              )}
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">
                  Meeting context
                </label>
                <Textarea
                  rows={5}
                  placeholder="Paste the agenda, client background, previous meeting notes, known issues, or any context you have going into this meeting…"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="text-[12px] resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-2">
                  Who&apos;s attending from the client side?
                  <span className="ml-1.5 text-zinc-400 font-normal">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ATTENDEE_ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => toggleAttendee(role)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        attendees.includes(role)
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerateChecklist}
                disabled={loading || !context.trim()}
                className="h-8 text-[12px]"
              >
                {loading ? "Generating…" : "Generate checklist →"}
              </Button>

              {checklist && (
                <div>
                  <p className="text-[11px] font-medium text-zinc-500 mb-1.5">
                    Generated checklist
                    <span className="ml-2 text-zinc-300 font-normal">(switch to Live tab to update during the meeting)</span>
                  </p>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[12px] text-zinc-700 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {checklist}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Live ── */}
          {tab === "live" && (
            <div className="space-y-4">
              {checklist ? (
                <div>
                  <p className="text-[11px] font-medium text-zinc-500 mb-1.5">Current checklist</p>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[12px] text-zinc-700 whitespace-pre-wrap max-h-[180px] overflow-y-auto">
                    {checklist}
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-zinc-400 bg-zinc-50 rounded-lg p-3 border border-zinc-200">
                  No checklist yet — go to <strong>Pre-meeting</strong> first, or paste a transcript below to start.
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-zinc-500">
                    Paste transcript chunk
                  </label>
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={transcribing}
                    className="text-[11px] px-2 py-0.5 rounded border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 disabled:opacity-50 transition-colors"
                  >
                    {transcribing ? "Transcribing…" : "Transcribe audio"}
                  </button>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg,.mp4"
                    className="hidden"
                    onChange={handleAudioUpload}
                  />
                </div>
                <Textarea
                  rows={6}
                  placeholder="Paste the latest section of the transcript — or upload an audio file to transcribe it automatically…"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="text-[12px] resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleUpdateChecklist}
                  disabled={loading || !transcript.trim()}
                  className="h-8 text-[12px]"
                >
                  {loading ? "Updating…" : "Update checklist"}
                </Button>
                {checklist && (
                  <Button
                    variant="outline"
                    onClick={handleSaveChecklist}
                    className="h-8 text-[12px]"
                  >
                    Save as output
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── Gap report ── */}
          {tab === "gap" && (
            <div className="space-y-4">
              <p className="text-[12px] text-zinc-500">
                Generates an end-of-meeting gap report from your context and checklist.
                The report becomes the Co-Pilot&apos;s output and feeds the Summarisation agent.
              </p>

              {!gapReport && (
                <div className="space-y-3">
                  {(context || attendees.length > 0) && (
                    <div className="text-[11px] text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 space-y-1">
                      {context && <p>Context: {context.slice(0, 100)}{context.length > 100 ? "…" : ""}</p>}
                      {attendees.length > 0 && <p>Attendees: {attendees.join(", ")}</p>}
                    </div>
                  )}
                  <Button
                    onClick={handleGenerateGapReport}
                    disabled={loading}
                    className="h-8 text-[12px]"
                  >
                    {loading ? "Generating…" : "Generate gap report"}
                  </Button>
                </div>
              )}

              {gapReport && (
                <div className="space-y-3">
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[12px] text-zinc-700 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {gapReport}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSendToSummarise} className="h-8 text-[12px]">
                      Run Summarise →
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGenerateGapReport}
                      disabled={loading}
                      className="h-8 text-[12px]"
                    >
                      {loading ? "Regenerating…" : "Regenerate"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
