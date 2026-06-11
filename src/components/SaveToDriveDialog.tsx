"use client";

import { useState } from "react";
import { LIVING_DOC_AGENTS } from "@/lib/agents";

interface SaveToDriveDialogProps {
  content: string;
  defaultFileName: string;
  folderPath?: string;
  folderId?: string;
  fileId?: string;       // existing Drive file ID — present after first save
  agentId?: string;      // used to determine default save mode
  onClose: () => void;
  onSaved?: (url: string, id: string) => void;
}

export function SaveToDriveDialog({
  content,
  defaultFileName,
  folderPath,
  folderId,
  fileId,
  agentId,
  onClose,
  onSaved,
}: SaveToDriveDialogProps) {
  const isLivingDoc = agentId ? LIVING_DOC_AGENTS.has(agentId) : false;
  const hasExisting = !!fileId;

  // Default mode: living docs update in place (if a file already exists), others always create new
  const [forceNew, setForceNew] = useState(!isLivingDoc || !hasExisting);

  const willUpdate = hasExisting && !forceNew;

  const [fileName, setFileName] = useState(defaultFileName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedUrl, setSavedUrl] = useState("");

  const handleSave = async () => {
    if (!willUpdate && !folderId) {
      setError("No Drive folder configured. Set up Google Drive in Settings first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, string> = {
        transcript: content,
        fileName,
        ...(willUpdate ? { fileId: fileId! } : { folderId: folderId! }),
      };

      const res = await fetch("/api/drive/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(d.error ?? "Save failed");
      }
      const data = await res.json();
      setSavedUrl(data.url ?? "");
      if (data.url) onSaved?.(data.url, data.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xl w-[460px] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100">
          <p className="text-[14px] font-semibold text-zinc-900">Save to Drive</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Save document as a formatted Google Doc</p>
        </div>

        {savedUrl ? (
          <div className="px-5 py-6 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[20px]">✓</div>
            <p className="text-[13px] font-medium text-zinc-900">
              {willUpdate ? "Document updated" : "New version saved"}
            </p>
            <a href={savedUrl} target="_blank" rel="noopener noreferrer"
              className="text-[12px] text-blue-600 hover:underline">
              ↗ Open in Drive
            </a>
            <button onClick={onClose}
              className="text-[12px] px-4 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors mt-1">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 flex flex-col gap-4">

              {/* Save mode selector — only shown when a file already exists */}
              {hasExisting && (
                <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-[12px]">
                  <button
                    onClick={() => setForceNew(false)}
                    className={`flex-1 px-3 py-2 flex flex-col items-center gap-0.5 transition-colors ${
                      !forceNew
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-500 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="font-medium">Update living doc</span>
                    <span className={`text-[10px] ${!forceNew ? "text-zinc-400" : "text-zinc-400"}`}>
                      Overwrites · keeps one stable link
                    </span>
                  </button>
                  <button
                    onClick={() => setForceNew(true)}
                    className={`flex-1 px-3 py-2 flex flex-col items-center gap-0.5 border-l border-zinc-200 transition-colors ${
                      forceNew
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-500 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="font-medium">New version</span>
                    <span className="text-[10px] text-zinc-400">
                      Creates a separate file
                    </span>
                  </button>
                </div>
              )}

              {/* First-time info badge */}
              {!hasExisting && (
                <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] ${
                  isLivingDoc
                    ? "bg-violet-50 border border-violet-100 text-violet-700"
                    : "bg-zinc-50 border border-zinc-100 text-zinc-500"
                }`}>
                  <span className="mt-px">{isLivingDoc ? "♻" : "📄"}</span>
                  <span>
                    {isLivingDoc
                      ? "This is a living doc. Future saves will update this file in place — keeping one stable Drive link."
                      : "Each save creates a new versioned file in Drive."}
                  </span>
                </div>
              )}

              {/* File name */}
              <div>
                <label className="text-[11px] font-medium text-zinc-700 mb-1 block">File name</label>
                <input
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  className="w-full text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
                />
              </div>

              {/* Destination */}
              <div>
                <label className="text-[11px] font-medium text-zinc-700 mb-1 block">Destination</label>
                <p className="text-[12px] text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md px-2.5 py-1.5">
                  {willUpdate
                    ? "Updating existing file in Drive"
                    : folderPath ?? (folderId ? "Configured folder" : "⚠ No folder configured")}
                </p>
              </div>

              {/* Preview */}
              <div>
                <label className="text-[11px] font-medium text-zinc-700 mb-1 block">Preview</label>
                <p className="text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md px-2.5 py-2 max-h-[72px] overflow-hidden leading-relaxed">
                  {content.slice(0, 220)}{content.length > 220 ? "…" : ""}
                </p>
              </div>

              {error && <p className="text-[11px] text-red-600">{error}</p>}
            </div>

            <div className="px-5 py-3 border-t border-zinc-100 flex justify-end gap-2">
              <button onClick={onClose}
                className="text-[12px] px-3 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !fileName.trim()}
                className="text-[12px] font-medium px-4 py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 disabled:opacity-30 transition-opacity">
                {saving ? "Saving…" : willUpdate ? "Update doc" : "Save new version"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
