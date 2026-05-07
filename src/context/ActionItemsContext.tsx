"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ActionItem, ActionItemPriority } from "@/lib/types";

const ITEMS_KEY = "shinko1_action_items";
const DIGEST_KEY = "shinko1_last_digest_date";
const DIGEST_HOUR = 9;

function loadItems(): ActionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

interface ActionItemsCtx {
  items: ActionItem[];
  addItem: (item: { title: string; notes?: string; priority: ActionItemPriority }) => void;
  updateItem: (id: string, patch: Partial<ActionItem>) => void;
  removeItem: (id: string) => void;
  importItems: (raw: { title: string; notes?: string; priority?: string }[]) => void;
  sendDigestNow: () => Promise<void>;
}

const ActionItemsContext = createContext<ActionItemsCtx | null>(null);

export function ActionItemsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const itemsRef = useRef(items);

  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    setItems(loadItems());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  }, [items, mounted]);

  const sendDigest = useCallback(async (todoItems: ActionItem[]) => {
    if (todoItems.length === 0) return;
    const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const lines = todoItems.map((i) => `• ${i.title} \`${i.priority}\``).join("\n");
    const text = `📋 *Daily To-Do — ${date}*\n${lines}`;
    try {
      const res = await fetch("/api/slack/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem(DIGEST_KEY, todayString());
      } else {
        console.error("[Slack]", data.error);
      }
    } catch (e) { console.error("[Slack]", e); }
  }, []);

  // Check every minute whether it's time to send the 9am digest
  useEffect(() => {
    if (!mounted) return;
    const check = () => {
      const now = new Date();
      const lastDigest = localStorage.getItem(DIGEST_KEY);
      if (now.getHours() >= DIGEST_HOUR && lastDigest !== todayString()) {
        const todo = itemsRef.current.filter((i) => i.status === "todo");
        sendDigest(todo);
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [mounted, sendDigest]);

  const addItem = useCallback((raw: { title: string; notes?: string; priority: ActionItemPriority }) => {
    const item: ActionItem = {
      id: `ai-${Date.now()}`,
      title: raw.title,
      notes: raw.notes,
      priority: raw.priority,
      status: "todo",
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [item, ...prev]);
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<ActionItem>) => {
    setItems((prev) => prev.map((i) =>
      i.id === id
        ? { ...i, ...patch, ...(patch.status === "done" && !i.completedAt ? { completedAt: new Date().toISOString() } : {}) }
        : i
    ));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const sendDigestNow = useCallback(async () => {
    const todo = itemsRef.current.filter((i) => i.status === "todo");
    await sendDigest(todo);
  }, [sendDigest]);

  const importItems = useCallback((raw: { title: string; notes?: string; priority?: string }[]) => {
    const validPriorities = ["Low", "Medium", "High", "Critical"];
    const newItems: ActionItem[] = raw.map((r) => ({
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: r.title,
      notes: r.notes,
      priority: (validPriorities.includes(r.priority ?? "") ? r.priority : "Medium") as ActionItemPriority,
      status: "todo",
      createdAt: new Date().toISOString(),
    }));
    setItems((prev) => [...newItems, ...prev]);
  }, []);

  return (
    <ActionItemsContext.Provider value={{ items, addItem, updateItem, removeItem, importItems, sendDigestNow }}>
      {children}
    </ActionItemsContext.Provider>
  );
}

export function useActionItems() {
  const ctx = useContext(ActionItemsContext);
  if (!ctx) throw new Error("useActionItems must be used within ActionItemsProvider");
  return ctx;
}
