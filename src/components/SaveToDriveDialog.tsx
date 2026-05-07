"use client";

import { useState } from "react";

interface SaveToDriveDialogProps {
  content: string;
  defaultFileName: string;
  folderPath?: string;
  folderId?: string;
  onClose: () => void;
  onSaved?: (url: string) => void;
}

export function SaveToDriveDialog({
  content,
  defaultFileName,
  folderPath,
  folderId,
  onClose,
  onSaved,
}: SaveToDriveDialogProps) {
  const [fileName, setFileName] = useState(defaultFileName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedUrl, setSavedUrl] = useState("");

  const handleSave = async () => {
    if (!folderId) {
      setError("No Drive folder configured. Set up Google Drive in Settings first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/drive/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: content, folderId, fileName }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(d.error ?? "Save failed");
      }
      const data = await res.json();
      setSavedUrl(data.url ?? "");
      if (data.url) onSaved?.(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xl w-[440px] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <p className="text-[14px] font-semibold text-zinc-900">Save to Drive</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Save document as Markdown to Google Drive</p>
        </div>

        {savedUrl ? (
          <div className="px-5 py-6 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[20px]">✓</div>
            <p className="text-[13px] font-medium text-zinc-900">Saved successfully</p>
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
            <div className="px-5 py-4 flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-700 mb-1 block">File name</label>
                <input
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  className="w-full text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-700 mb-1 block">Destination</label>
                <p className="text-[12px] text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md px-2.5 py-1.5">
                  {folderPath ?? (folderId ? "Configured folder" : "⚠ No folder configured")}
                </p>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-700 mb-1 block">Preview</label>
                <p className="text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md px-2.5 py-2 max-h-[80px] overflow-hidden leading-relaxed">
                  {content.slice(0, 200)}{content.length > 200 ? "…" : ""}
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
                {saving ? "Saving…" : "Save to Drive"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
