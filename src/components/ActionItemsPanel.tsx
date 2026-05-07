"use client";

import { useRef, useState, useEffect } from "react";
import { useActionItems } from "@/context/ActionItemsContext";
import { ActionItem, ActionItemPriority } from "@/lib/types";

const PRIORITIES: ActionItemPriority[] = ["Low", "Medium", "High", "Critical"];

const PRIORITY_STYLES: Record<ActionItemPriority, string> = {
  Low: "text-zinc-400 bg-zinc-50 border-zinc-200",
  Medium: "text-amber-600 bg-amber-50 border-amber-200",
  High: "text-orange-600 bg-orange-50 border-orange-200",
  Critical: "text-red-600 bg-red-50 border-red-200",
};

interface Props {
  onClose: () => void;
}

export function ActionItemsPanel({ onClose }: Props) {
  const { items, addItem, updateItem, removeItem, sendDigestNow } = useActionItems();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<ActionItemPriority>("Medium");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPriority, setEditPriority] = useState<ActionItemPriority>("Medium");
  const [showDone, setShowDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    await addItem({ title: title.trim(), notes: notes.trim() || undefined, priority });
    setTitle("");
    setNotes("");
    setPriority("Medium");
    setAdding(false);
  };

  const startEdit = (item: ActionItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditNotes(item.notes ?? "");
    setEditPriority(item.priority);
  };

  const saveEdit = () => {
    if (!editingId || !editTitle.trim()) return;
    updateItem(editingId, {
      title: editTitle.trim(),
      notes: editNotes.trim() || undefined,
      priority: editPriority,
    });
    setEditingId(null);
  };

  const todo = items.filter((i) => i.status === "todo");
  const done = items.filter((i) => i.status === "done");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/10" />
      <div
        ref={panelRef}
        className="relative w-[400px] bg-white border-l border-zinc-200 flex flex-col h-full shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold">To-Do</p>
            {todo.length > 0 && (
              <span className="text-[10px] font-medium bg-zinc-900 text-white rounded-full px-1.5 py-0.5">
                {todo.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => { setSending(true); await sendDigestNow(); setSending(false); setSent(true); setTimeout(() => setSent(false), 2000); }}
              disabled={sending || todo.length === 0}
              className="h-[28px] px-3 text-[11px] font-medium border border-zinc-200 rounded-md hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              {sent ? "Sent ✓" : sending ? "Sending…" : "Send to Slack"}
            </button>
            <button
              onClick={() => setAdding(true)}
              className="h-[28px] px-3 text-[11px] font-medium bg-zinc-900 text-white rounded-md hover:opacity-80 transition-opacity"
            >
              + Add
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors text-[18px] leading-none">×</button>
          </div>
        </div>

        {/* Add form */}
        {adding && (
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50 flex flex-col gap-2">
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAdd()}
              placeholder="Action item…"
              className="text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 bg-white"
            />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 bg-white"
            />
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`text-[10px] font-medium px-2 py-1 rounded border transition-colors ${
                      priority === p ? PRIORITY_STYLES[p] : "text-zinc-400 bg-white border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAdd}
                disabled={!title.trim()}
                className="text-[11px] font-medium px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                Save
              </button>
              <button
                onClick={() => { setAdding(false); setTitle(""); setNotes(""); }}
                className="text-[11px] px-2.5 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-1.5">
          {todo.length === 0 && !adding && (
            <p className="text-[12px] text-zinc-400 text-center mt-8">No open action items</p>
          )}

          {todo.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              editTitle={editTitle}
              editNotes={editNotes}
              editPriority={editPriority}
              onEditTitle={setEditTitle}
              onEditNotes={setEditNotes}
              onEditPriority={setEditPriority}
              onStartEdit={() => startEdit(item)}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingId(null)}
              onComplete={() => updateItem(item.id, { status: "done" })}
              onRemove={() => removeItem(item.id)}
            />
          ))}

          {done.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowDone(!showDone)}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-1"
              >
                <span className={`transition-transform ${showDone ? "rotate-90" : ""}`}>▶</span>
                {done.length} completed
              </button>
              {showDone && (
                <div className="mt-2 flex flex-col gap-1.5 opacity-50">
                  {done.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      isEditing={false}
                      editTitle=""
                      editNotes=""
                      editPriority="Medium"
                      onEditTitle={() => {}}
                      onEditNotes={() => {}}
                      onEditPriority={() => {}}
                      onStartEdit={() => {}}
                      onSaveEdit={() => {}}
                      onCancelEdit={() => {}}
                      onComplete={() => updateItem(item.id, { status: "todo" })}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemRow({
  item, isEditing,
  editTitle, editNotes, editPriority,
  onEditTitle, onEditNotes, onEditPriority,
  onStartEdit, onSaveEdit, onCancelEdit,
  onComplete, onRemove,
}: {
  item: ActionItem;
  isEditing: boolean;
  editTitle: string;
  editNotes: string;
  editPriority: ActionItemPriority;
  onEditTitle: (v: string) => void;
  onEditNotes: (v: string) => void;
  onEditPriority: (v: ActionItemPriority) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onComplete: () => void;
  onRemove: () => void;
}) {
  if (isEditing) {
    return (
      <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50 flex flex-col gap-2">
        <input
          autoFocus
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
          className="text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 bg-white"
        />
        <input
          type="text"
          value={editNotes}
          onChange={(e) => onEditNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 bg-white"
        />
        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-1">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => onEditPriority(p)}
                className={`text-[10px] font-medium px-2 py-1 rounded border transition-colors ${
                  editPriority === p ? PRIORITY_STYLES[p] : "text-zinc-400 bg-white border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button onClick={onSaveEdit} className="text-[11px] font-medium px-2.5 py-1 bg-zinc-900 text-white rounded-md hover:opacity-80">Save</button>
          <button onClick={onCancelEdit} className="text-[11px] px-2 py-1 border border-zinc-200 rounded-md hover:bg-zinc-100">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
      <button
        onClick={onComplete}
        className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
          item.status === "done"
            ? "bg-zinc-900 border-zinc-900"
            : "border-zinc-300 hover:border-zinc-500"
        }`}
      >
        {item.status === "done" && (
          <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" className="w-full h-full p-0.5">
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] leading-snug ${item.status === "done" ? "line-through text-zinc-400" : "text-zinc-800"}`}>
          {item.title}
        </p>
        {item.notes && <p className="text-[11px] text-zinc-400 mt-0.5">{item.notes}</p>}
        <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[item.priority]}`}>
          {item.priority}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.status === "todo" && (
          <button onClick={onStartEdit} className="text-[10px] text-zinc-400 hover:text-zinc-700 px-1.5 py-0.5 rounded hover:bg-zinc-100">
            Edit
          </button>
        )}
        <button onClick={onRemove} className="text-[10px] text-zinc-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50">
          ✕
        </button>
      </div>
    </div>
  );
}
