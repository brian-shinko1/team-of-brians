"use client";

import { useState, useEffect, useRef } from "react";
import { MdView } from "@/components/MdView";

interface MdEditorProps {
  content: string;
  onChange: (v: string) => void;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function MdEditor({ content, onChange }: MdEditorProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState(content);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showFindReplace, setShowFindReplace] = useState(false);
  const findRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(content); }, [content]);

  useEffect(() => {
    if (showFindReplace) findRef.current?.focus();
  }, [showFindReplace]);

  const matchCount = findText.trim()
    ? (draft.match(new RegExp(escapeRegex(findText), "gi")) ?? []).length
    : 0;

  const handleReplaceAll = () => {
    if (!findText.trim()) return;
    const updated = draft.replace(new RegExp(escapeRegex(findText), "gi"), replaceText);
    setDraft(updated);
    onChange(updated);
    setFindText(replaceText);
  };

  const handleSave = () => {
    onChange(draft);
    setMode("view");
  };

  const handleCancel = () => {
    setDraft(content);
    setMode("view");
  };

  const handleMouseUp = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length > 1) {
      setFindText(sel);
      setShowFindReplace(true);
    }
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <button
          onClick={() => {
            setShowFindReplace((v) => {
              if (!v) setTimeout(() => findRef.current?.focus(), 0);
              return !v;
            });
          }}
          className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
            showFindReplace
              ? "bg-zinc-900 text-white border-zinc-900"
              : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
          }`}
        >
          Find &amp; Replace
        </button>

        {mode === "view" ? (
          <button
            onClick={() => { setMode("edit"); setTimeout(() => textareaRef.current?.focus(), 0); }}
            className="text-[11px] px-2.5 py-1 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            Edit
          </button>
        ) : (
          <>
            <button
              onClick={handleSave}
              className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-900 text-white hover:opacity-80 transition-opacity"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-[11px] px-2.5 py-1 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Find & Replace bar */}
      {showFindReplace && (
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
          <input
            ref={findRef}
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="Find…"
            className="text-[11px] px-2 py-1 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 min-w-0 w-[130px] shrink"
          />
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReplaceAll()}
            placeholder="Replace with…"
            className="text-[11px] px-2 py-1 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 min-w-0 w-[130px] shrink"
          />
          <span className="text-[10px] text-zinc-400 shrink-0">
            {findText.trim() ? `${matchCount} match${matchCount !== 1 ? "es" : ""}` : ""}
          </span>
          <button
            onClick={handleReplaceAll}
            disabled={!findText.trim() || matchCount === 0}
            className="text-[11px] px-2.5 py-1 bg-zinc-900 text-white rounded-md hover:opacity-80 disabled:opacity-30 transition-opacity shrink-0"
          >
            Replace all
          </button>
          <button
            onClick={() => { setShowFindReplace(false); setFindText(""); setReplaceText(""); }}
            className="text-[11px] text-zinc-400 hover:text-zinc-700 px-1 ml-auto"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content */}
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="text-[12px] font-mono leading-relaxed w-full min-h-[400px] resize-y p-3 border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 bg-zinc-50"
          spellCheck={false}
        />
      ) : (
        <div onMouseUp={handleMouseUp} className="select-text cursor-text">
          <MdView content={draft} />
        </div>
      )}
    </div>
  );
}
