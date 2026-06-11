"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Agent, BuildItem, Client, ClientSettings, DriveFolders, EngagementRecord, FeedItem, Project, Ticket, TicketAuditEntry, TicketType, TicketPriority } from "@/lib/types";
import { DEMO_CLIENTS, ENGAGEMENT_RECORD_AGENTS, INITIAL_AGENTS, makeClient, makeProject, NEXT_AGENT, PREVIOUS_AGENT, FALLBACK_AGENT, HITL_AGENTS, CONTEXT_AGENTS, FROZEN_AGENTS, PROFILE_BYPASS, compressEventStorm, serializeEngagementRecord } from "@/lib/agents";
import { formatOutput, extractSessionHeadline, extractEngagementFromAgent } from "@/lib/formatters";

const STORAGE_KEY = "shinko1_clients";
const SELECTION_KEY = "shinko1_selection";

// Structural fields that should always reflect INITIAL_AGENTS, not stale localStorage
const AGENT_STRUCTURAL = Object.fromEntries(
  INITIAL_AGENTS.map((a) => [a.id, { phase: a.phase, phaseColor: a.phaseColor, desc: a.desc, name: a.name }])
);

// Default pipeline IDs from env vars — applied as fallback when stored value is null
const AGENT_PIPELINE_DEFAULTS = Object.fromEntries(
  INITIAL_AGENTS.map((a) => [a.id, a.pipelineId])
);

function dedupById<T extends { id: string }>(items: T[], prefix: string): T[] {
  const seen = new Set<string>();
  return items.map((item) => {
    if (!seen.has(item.id)) { seen.add(item.id); return item; }
    const nums = [...seen].map((id) => parseInt(id.replace(`${prefix}-`, ""), 10)).filter((n) => !isNaN(n) && n > 0);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : seen.size + 1;
    const newId = `${prefix}-${String(next).padStart(3, "0")}`;
    seen.add(newId);
    return { ...item, id: newId };
  });
}

function loadClients(): Client[] {
  if (typeof window === "undefined") return DEMO_CLIENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEMO_CLIENTS;
    const clients: Client[] = JSON.parse(raw);
    // Patch structural fields + fill env-var pipeline IDs where project has none set
    return clients.map((c) => ({
      ...c,
      projects: c.projects.map((p) => {
        const patched: Record<string, Agent> = Object.fromEntries(
          Object.entries(p.agents).map(([id, agent]) => [
            id,
            {
              ...agent,
              ...(AGENT_STRUCTURAL[id] ?? {}),
              // Apply env-var default only when user hasn't set a pipeline ID
              pipelineId: agent.pipelineId ?? AGENT_PIPELINE_DEFAULTS[id] ?? null,
              // Can't be running after a page load — reset to idle
              status: agent.status === "running" ? "idle" : agent.status,
            },
          ])
        );
        // Add any new agents from INITIAL_AGENTS not yet in stored data
        for (const a of INITIAL_AGENTS) {
          if (!patched[a.id]) patched[a.id] = { ...a };
        }
        const er = p.engagementRecord;
        return {
          ...p,
          agents: patched,
          settings: {
            ...p.settings,
            pipelineProfile: p.settings.pipelineProfile ?? "standard",
          },
          engagementRecord: er ? {
            ...er,
            openQuestions: dedupById(er.openQuestions ?? [], "OQ"),
            decisions: dedupById(er.decisions ?? [], "D"),
          } : er,
        };
      }),
    }));
  } catch {
    return DEMO_CLIENTS;
  }
}

function loadSelection(): { clientId: string; projectId: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface AgentsCtx {
  // clients (companies)
  clients: Client[];
  currentClientId: string;
  currentClient: Client;
  switchClient: (clientId: string) => void;
  addClient: (name: string, firstProjectName?: string) => { clientId: string; projectId: string };
  removeClient: (id: string) => void;
  updateClientMeta: (id: string, patch: { name?: string }) => void;

  // projects (within a client)
  currentProjectId: string;
  currentProject: Project;
  switchProject: (clientId: string, projectId: string) => void;
  addProject: (clientId: string, name: string) => string;
  removeProject: (clientId: string, projectId: string) => void;
  updateProjectMeta: (projectId: string, patch: { name?: string }) => void;

  // drive scaffold
  scaffoldProject: (clientId: string, projectId: string, nameOverrides?: { clientName?: string; projectName?: string }) => Promise<void>;

  // per-project agent operations
  agents: Record<string, Agent>;
  feed: FeedItem[];
  settings: ClientSettings;
  driveFolders: DriveFolders | undefined;
  updateAgent: (agentId: string, patch: Partial<Agent>) => void;
  updateSettings: (patch: Partial<ClientSettings>) => void;
  runAgent: (agentId: string, input?: string, contextAlreadyInjected?: boolean) => Promise<void>;
  cancelAgent: (agentId: string) => void;
  runSTT: (audioFile: File | Blob) => Promise<void>;
  pendingApproval: { agentId: string; input: string; reason?: string } | null;
  approvePending: () => void;
  dismissPending: () => void;
  pendingModal: { agentId: string; prefilledInput: string } | null;
  openModal: (agentId: string, prefilledInput?: string) => void;
  closeModal: () => void;

  // build items
  buildItems: BuildItem[];
  addBuildItem: (item: Omit<BuildItem, "id" | "createdAt" | "updatedAt">) => void;
  updateBuildItem: (id: string, patch: Partial<BuildItem>) => void;
  removeBuildItem: (id: string) => void;

  // tickets
  tickets: Ticket[];
  addTickets: (raw: Partial<Ticket>[]) => void;
  updateTicket: (id: string, patch: Partial<Ticket>, auditEntries?: { field: string; from: string; to: string }[]) => void;
  removeTicket: (id: string) => void;
  generateTickets: (input: string) => Promise<void>;
  sessionNotes: string;
  savedSessionNotes: { content: string; savedAt: string }[];
  stagedPrinciplesInput: string;
  updateSessionNotes: (notes: string) => void;
  saveSessionNotes: () => void;
  clearSessionNotes: () => void;

  // engagement record
  engagementRecord: EngagementRecord;
  updateEngagementRecord: (patch: Partial<EngagementRecord>) => void;
  resolvedSinceLastCps: number;
}

const AgentsContext = createContext<AgentsCtx | null>(null);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [clients, setClients] = useState<Client[]>(DEMO_CLIENTS);
  const [currentClientId, setCurrentClientId] = useState<string>(DEMO_CLIENTS[0].id);
  const [currentProjectId, setCurrentProjectId] = useState<string>(DEMO_CLIENTS[0].projects[0].id);

  // Load from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    const loaded = loadClients();
    const sel = loadSelection();
    setClients(loaded);
    const clientId = sel?.clientId ?? loaded[0].id;
    const client = loaded.find((c) => c.id === clientId) ?? loaded[0];
    setCurrentClientId(client.id);
    setCurrentProjectId(sel?.projectId ?? client.projects[0].id);
    setMounted(true);
  }, []);

  // Persist clients whenever they change — only after mount to avoid clobbering localStorage
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  }, [clients, mounted]);

  // Persist current selection
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(SELECTION_KEY, JSON.stringify({ clientId: currentClientId, projectId: currentProjectId }));
  }, [currentClientId, currentProjectId, mounted]);


  const currentClient = clients.find((c) => c.id === currentClientId) ?? clients[0];
  const currentProject =
    currentClient.projects.find((p) => p.id === currentProjectId) ??
    currentClient.projects[0];

  // ── Client management ───────────────────────────────────────────────────

  const switchClient = useCallback((clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    setCurrentClientId(clientId);
    setCurrentProjectId(client.projects[0].id);
  }, [clients]);

  const addClient = useCallback((name: string, firstProjectName = "Project 1"): { clientId: string; projectId: string } => {
    const id = `client-${Date.now()}`;
    const client = makeClient(id, name, firstProjectName);
    setClients((prev) => [...prev, client]);
    setCurrentClientId(id);
    setCurrentProjectId(client.projects[0].id);
    return { clientId: id, projectId: client.projects[0].id };
  }, []);

  const removeClient = useCallback((id: string) => {
    setClients((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (currentClientId === id && next.length > 0) {
        setCurrentClientId(next[0].id);
        setCurrentProjectId(next[0].projects[0].id);
      }
      return next;
    });
  }, [currentClientId]);

  const updateClientMeta = useCallback((id: string, patch: { name?: string }) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  // ── Project management ──────────────────────────────────────────────────

  const switchProject = useCallback((clientId: string, projectId: string) => {
    setCurrentClientId(clientId);
    setCurrentProjectId(projectId);
  }, []);

  const addProject = useCallback((clientId: string, name: string): string => {
    const id = `${clientId}-p${Date.now()}`;
    const project = makeProject(id, name);
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, projects: [...c.projects, project] } : c))
    );
    setCurrentClientId(clientId);
    setCurrentProjectId(id);
    return id;
  }, []);

  const removeProject = useCallback((clientId: string, projectId: string) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        const next = c.projects.filter((p) => p.id !== projectId);
        if (next.length === 0) return c; // don't remove the last project
        return { ...c, projects: next };
      })
    );
    if (currentProjectId === projectId) {
      const client = clients.find((c) => c.id === clientId);
      const next = client?.projects.filter((p) => p.id !== projectId);
      if (next && next.length > 0) setCurrentProjectId(next[0].id);
    }
  }, [currentProjectId, clients]);

  const updateProjectMeta = useCallback((projectId: string, patch: { name?: string }) => {
    setClients((prev) =>
      prev.map((c) => ({
        ...c,
        projects: c.projects.map((p) => (p.id === projectId ? { ...p, ...patch } : p)),
      }))
    );
  }, []);

  const scaffoldProject = useCallback(async (clientId: string, projectId: string, nameOverrides?: { clientName?: string; projectName?: string }) => {
    const client = clients.find((c) => c.id === clientId);
    const project = client?.projects.find((p) => p.id === projectId);
    if (!client || !project) return;

    const res = await fetch("/api/drive/scaffold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: nameOverrides?.clientName ?? client.name,
        projectName: nameOverrides?.projectName ?? project.name,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    const driveFolders: DriveFolders = await res.json();
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              projects: c.projects.map((p) =>
                p.id === projectId ? { ...p, driveFolders } : p
              ),
            }
          : c
      )
    );
  }, [clients]);

  // ── Per-project mutations ───────────────────────────────────────────────

  const patchProject = useCallback((patch: (p: Project) => Project) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === currentClientId
          ? {
              ...c,
              projects: c.projects.map((p) =>
                p.id === currentProjectId ? patch(p) : p
              ),
            }
          : c
      )
    );
  }, [currentClientId, currentProjectId]);

  const updateAgent = useCallback(
    (agentId: string, agentPatch: Partial<Agent>) => {
      patchProject((p) => {
        const updated = {
          ...p,
          agents: { ...p.agents, [agentId]: { ...p.agents[agentId], ...agentPatch } },
        };
        // Session log: when summarise completes, append a headline entry
        if (agentId === "summarise" && agentPatch.status === "done" && agentPatch.output) {
          const headline = extractSessionHeadline(agentPatch.output);
          if (headline) {
            const entry = { date: new Date().toISOString().slice(0, 10), headline };
            updated.sessionLog = [...(p.sessionLog ?? []), entry];
          }
        }

        // Reset resolved-OQ nudge counter when CPS completes
        if (agentId === "cps" && agentPatch.status === "done") {
          updated.resolvedSinceLastCps = 0;
        }

        // Engagement record: auto-fill from summarise, cps, prd outputs
        if (["summarise", "cps", "prd"].includes(agentId) && agentPatch.status === "done" && agentPatch.output) {
          const currentER: EngagementRecord = updated.engagementRecord ?? {
            clientBackground: "", industry: "", regulatoryContext: "",
            projectBrief: "", targetGoLive: "", scopeOut: [],
            stakeholders: [], decisions: [], openQuestions: [], updatedAt: "",
          };
          const extracted = extractEngagementFromAgent(agentId, agentPatch.output, currentER);
          if (extracted) {
            updated.engagementRecord = {
              ...currentER,
              ...extracted,
              updatedAt: new Date().toISOString(),
            };
          }
        }

        return updated;
      });
    },
    [patchProject]
  );

  const addFeedItem = useCallback(
    (item: FeedItem) => {
      patchProject((p) => ({ ...p, feed: [item, ...p.feed] }));
    },
    [patchProject]
  );

  const updateSessionNotes = useCallback(
    (notes: string) => patchProject((p) => ({ ...p, sessionNotes: notes })),
    [patchProject]
  );

  const saveSessionNotes = useCallback(
    () => patchProject((p) => {
      if (!p.sessionNotes?.trim()) return p;
      const content = p.sessionNotes.trim();
      return {
        ...p,
        savedSessionNotes: [
          { content, savedAt: new Date().toISOString() },
          ...(p.savedSessionNotes ?? []),
        ],
        sessionNotes: "",
        stagedPrinciplesInput: content,
      };
    }),
    [patchProject]
  );

  const clearSessionNotes = useCallback(
    () => patchProject((p) => ({ ...p, sessionNotes: "" })),
    [patchProject]
  );

  const updateEngagementRecord = useCallback(
    (patch: Partial<EngagementRecord>) => {
      patchProject((p) => {
        let newlyResolved = 0;
        if (patch.openQuestions && p.engagementRecord?.openQuestions) {
          const prevResolved = new Set(
            p.engagementRecord.openQuestions
              .filter((q) => q.status === "resolved")
              .map((q) => q.id)
          );
          newlyResolved = patch.openQuestions.filter(
            (q) => q.status === "resolved" && !prevResolved.has(q.id)
          ).length;
        }
        return {
          ...p,
          resolvedSinceLastCps: (p.resolvedSinceLastCps ?? 0) + newlyResolved,
          engagementRecord: {
            clientBackground: "",
            industry: "",
            regulatoryContext: "",
            projectBrief: "",
            targetGoLive: "",
            scopeOut: [],
            stakeholders: [],
            decisions: [],
            openQuestions: [],
            ...(p.engagementRecord ?? {}),
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        };
      });
    },
    [patchProject]
  );

  const updateSettings = useCallback(
    (patch: Partial<ClientSettings>) => {
      patchProject((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
    },
    [patchProject]
  );

  // ── Build item mutations ─────────────────────────────────────────────────

  const addBuildItem = useCallback(
    (item: Omit<BuildItem, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newItem: BuildItem = {
        ...item,
        id: `bi-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      patchProject((p) => ({ ...p, buildItems: [...(p.buildItems ?? []), newItem] }));
    },
    [patchProject]
  );

  const updateBuildItem = useCallback(
    (id: string, patch: Partial<BuildItem>) => {
      patchProject((p) => ({
        ...p,
        buildItems: (p.buildItems ?? []).map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
        ),
      }));
    },
    [patchProject]
  );

  const removeBuildItem = useCallback(
    (id: string) => {
      patchProject((p) => ({
        ...p,
        buildItems: (p.buildItems ?? []).filter((item) => item.id !== id),
      }));
    },
    [patchProject]
  );

  // ── Ticket mutations ─────────────────────────────────────────────────────

  const addTickets = useCallback((raw: Partial<Ticket>[]) => {
    const now = new Date().toISOString();
    const newTickets: Ticket[] = raw.map((t) => ({
      id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: t.title ?? "Untitled",
      description: t.description ?? "",
      type: (t.type as TicketType) ?? "Task",
      priority: (t.priority as TicketPriority) ?? "Medium",
      status: "todo" as const,
      category: t.category,
      acceptanceCriteria: t.acceptanceCriteria ?? [],
      notes: "",
      auditLog: [{ at: now, field: "created", from: "", to: "Generated by PM Agent" }],
      createdAt: now,
      updatedAt: now,
    }));
    patchProject((p) => ({ ...p, tickets: [...(p.tickets ?? []), ...newTickets] }));
  }, [patchProject]);

  const updateTicket = useCallback((id: string, patch: Partial<Ticket>, auditEntries: { field: string; from: string; to: string }[] = []) => {
    const now = new Date().toISOString();
    patchProject((p) => ({
      ...p,
      tickets: (p.tickets ?? []).map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              updatedAt: now,
              auditLog: auditEntries.length > 0
                ? [...t.auditLog, ...auditEntries.map((e) => ({ ...e, at: now }))]
                : t.auditLog,
            }
          : t
      ),
    }));
  }, [patchProject]);

  const removeTicket = useCallback((id: string) => {
    patchProject((p) => ({ ...p, tickets: (p.tickets ?? []).filter((t) => t.id !== id) }));
  }, [patchProject]);

  const generateTickets = useCallback(async (input: string) => {
    const pipelineId = currentProject.agents["pm_agent"]?.pipelineId ?? null;
    const raw = await callAIRIA(pipelineId, input, currentProject.settings);
    let parsed: Partial<Ticket>[] = [];
    try {
      const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
      const match = jsonStr.match(/\[[\s\S]*\]/);
      parsed = JSON.parse(match ? match[0] : jsonStr);
    } catch {
      throw new Error("PM Agent did not return valid JSON. Check the pipeline output.");
    }

    const now = new Date().toISOString();

    patchProject((p) => {
      const existing = p.tickets ?? [];
      const normalize = (s: string) => s.toLowerCase().trim();

      // Update existing tickets — preserve status, notes, auditLog
      const merged = existing.map((ticket) => {
        const incoming = parsed.find((t) => normalize(t.title ?? "") === normalize(ticket.title));
        if (incoming) {
          const auditEntries: TicketAuditEntry[] = [];
          if (incoming.description && incoming.description !== ticket.description)
            auditEntries.push({ at: now, field: "description", from: "previous", to: "updated by re-generation" });
          if (incoming.acceptanceCriteria && JSON.stringify(incoming.acceptanceCriteria) !== JSON.stringify(ticket.acceptanceCriteria))
            auditEntries.push({ at: now, field: "acceptanceCriteria", from: "previous", to: "updated by re-generation" });
          return {
            ...ticket,
            description: incoming.description ?? ticket.description,
            type: (incoming.type as TicketType) ?? ticket.type,
            priority: (incoming.priority as TicketPriority) ?? ticket.priority,
            category: incoming.category ?? ticket.category,
            acceptanceCriteria: incoming.acceptanceCriteria ?? ticket.acceptanceCriteria,
            stale: false,
            updatedAt: auditEntries.length > 0 ? now : ticket.updatedAt,
            auditLog: auditEntries.length > 0 ? [...ticket.auditLog, ...auditEntries] : ticket.auditLog,
          };
        }
        // Not in new generation — flag as stale, don't delete
        if (ticket.stale) return ticket; // already stale, don't re-log
        return {
          ...ticket,
          stale: true,
          auditLog: [...ticket.auditLog, { at: now, field: "stale", from: "false", to: "Not found in latest generation — review if still needed" }],
        };
      });

      // Add tickets that are genuinely new
      const newTickets: Ticket[] = parsed
        .filter((t) => !existing.some((e) => normalize(e.title) === normalize(t.title ?? "")))
        .map((t) => ({
          id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: t.title ?? "Untitled",
          description: t.description ?? "",
          type: (t.type as TicketType) ?? "Task",
          priority: (t.priority as TicketPriority) ?? "Medium",
          status: "todo" as const,
          category: t.category,
          acceptanceCriteria: t.acceptanceCriteria ?? [],
          notes: "",
          auditLog: [{ at: now, field: "created", from: "", to: "Generated by PM Agent" }],
          stale: false,
          createdAt: now,
          updatedAt: now,
        }));

      return { ...p, tickets: [...merged, ...newTickets] };
    });
  }, [currentProject, patchProject]);


  const [pendingApproval, setPendingApproval] = useState<{ agentId: string; input: string; reason?: string } | null>(null);
  const [pendingModal, setPendingModal] = useState<{ agentId: string; prefilledInput: string } | null>(null);

  const approvePending = useCallback(() => {
    if (!pendingApproval) return;
    const { agentId, input } = pendingApproval;
    setPendingApproval(null);
    setPendingModal({ agentId, prefilledInput: input });
  }, [pendingApproval]);

  const dismissPending = useCallback(() => setPendingApproval(null), []);
  const openModal = useCallback((agentId: string, prefilledInput = "") => {
    setPendingModal({ agentId, prefilledInput });
  }, []);
  const closeModal = useCallback(() => setPendingModal(null), []);

  const runAgentRef = useRef<((agentId: string, input?: string, contextAlreadyInjected?: boolean) => Promise<void>) | undefined>(undefined);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const cancelAgent = useCallback((agentId: string) => {
    abortControllers.current.get(agentId)?.abort();
    abortControllers.current.delete(agentId);
    updateAgent(agentId, { status: "idle" });
  }, [updateAgent]);

  const runAgent = useCallback(
    async (agentId: string, input = "", _contextAlreadyInjected = false) => {
      const agent = currentProject.agents[agentId];
      if (!agent) return;

      updateAgent(agentId, { status: "running", output: "Running…" });

      try {
        // meeting_input: store the raw input directly, then auto-chain to summarise
        if (agentId === "meeting_input") {
          updateAgent(agentId, { status: "done", output: input, lastRun: "just now" });
          addFeedItem({
            id: `f-${Date.now()}`,
            time: "just now",
            agent: agent.name,
            phase: agent.phase,
            phaseColor: agent.phaseColor,
            content: input.split("\n")[0].slice(0, 120),
          });
          if (currentProject.settings.autoChain) {
            // summarise is not a HITL gate — auto-run
            await runAgentRef.current?.("summarise", input, false);
          }
          return;
        }

        // Inject CONTEXT_AGENTS outputs for manual runs (auto-chain builds this itself)
        let finalInput = input;
        if (!_contextAlreadyInjected) {
          // Determine effective input source so we don't inject it as context too (duplicate)
          const primarySrc = PREVIOUS_AGENT[agentId];
          const effectiveSrc = primarySrc && currentProject.agents[primarySrc]?.output
            ? primarySrc
            : FALLBACK_AGENT[agentId];
          const contextIds = (CONTEXT_AGENTS[agentId] ?? []).filter((id) => id !== effectiveSrc);
          const contextParts = contextIds
            .map((ctxId) => {
              const ctxOutput = currentProject.agents[ctxId]?.output;
              const ctxName = currentProject.agents[ctxId]?.name ?? ctxId;
              return ctxOutput ? `[${ctxName.toUpperCase()} — shared context]\n${ctxOutput}` : null;
            })
            .filter(Boolean) as string[];


          if (contextParts.length > 0) {
            finalInput = [...contextParts, input].join("\n\n---\n\n");
          }
        }

        // Inject engagement record for relevant agents (always, regardless of auto-chain)
        if (ENGAGEMENT_RECORD_AGENTS.has(agentId)) {
          const er = currentProject.engagementRecord;
          if (er && (er.clientBackground || er.projectBrief || er.stakeholders.length > 0 || er.decisions.length > 0)) {
            finalInput = `${serializeEngagementRecord(er)}\n\n---\n\n${finalInput}`;
          }
        }

        const controller = new AbortController();
        abortControllers.current.set(agentId, controller);
        const result = await callAIRIA(agent.pipelineId, finalInput, currentProject.settings, controller.signal);
        abortControllers.current.delete(agentId);
        if (!result) throw new Error("Empty response from AIRIA pipeline — check the pipeline output.");
        updateAgent(agentId, { status: "done", output: result, lastRun: "just now" });
        if (agentId === "principles") {
          clearSessionNotes();
          patchProject((p) => ({ ...p, stagedPrinciplesInput: "" }));
        }
        addFeedItem({
          id: `f-${Date.now()}`,
          time: "just now",
          agent: agent.name,
          phase: agent.phase,
          phaseColor: agent.phaseColor,
          content: result.split("\n")[0],
        });

        // Auto-chain to next agent
        if (currentProject.settings.autoChain) {
          // Walk NEXT_AGENT until we find an agent not bypassed by the current profile
          const bypass = PROFILE_BYPASS[currentProject.settings.pipelineProfile ?? "standard"];
          let nextId = NEXT_AGENT[agentId];
          while (nextId && bypass.has(nextId)) nextId = NEXT_AGENT[nextId];
          if (nextId) {
            try {
              // If the next agent is frozen (one-shot) and already has output, skip it
              const isFrozenSkip = FROZEN_AGENTS.has(nextId) && !!currentProject.agents[nextId]?.output;
              const targetId = isFrozenSkip ? (NEXT_AGENT[nextId] ?? nextId) : nextId;

              // Build context-enriched input for the target agent
              // Exclude the agent whose output is used as direct input — it would be a duplicate
              const directSourceId = isFrozenSkip ? targetId : agentId;
              const contextIds = (CONTEXT_AGENTS[targetId] ?? []).filter((id) => id !== directSourceId);
              const contextParts = contextIds
                .map((ctxId) => {
                  const ctxOutput = currentProject.agents[ctxId]?.output;
                  const ctxName = currentProject.agents[ctxId]?.name ?? ctxId;
                  return ctxOutput ? `[${ctxName.toUpperCase()} — shared context]\n${ctxOutput}` : null;
                })
                .filter(Boolean) as string[];

              // On a frozen skip, use the target's own previous output as the base
              // (re-run mode: agent updates itself relative to new context)
              const directInput = isFrozenSkip
                ? (currentProject.agents[targetId]?.output || result)
                : result;
              const directLabel = isFrozenSkip
                ? `[${(currentProject.agents[targetId]?.name ?? targetId).toUpperCase()} — previous output]\n${directInput}`
                : `[${agent.name.toUpperCase()} — direct input]\n${directInput}`;

              const chainInput = contextParts.length > 0
                ? [...contextParts, directLabel].join("\n\n---\n\n")
                : directInput;

              const reason = isFrozenSkip
                ? `${agent.name} was updated — re-run ${currentProject.agents[targetId]?.name ?? targetId} to reflect new requirements`
                : undefined;

              if (HITL_AGENTS.has(targetId) || isFrozenSkip) {
                setPendingApproval({ agentId: targetId, input: chainInput, reason });
              } else {
                await runAgentRef.current?.(targetId, chainInput, true);
              }
            } catch {
              // Auto-chain failure — don't let it corrupt the current agent's "done" status
            }
          }
        }
      } catch (err) {
        abortControllers.current.delete(agentId);
        if (err instanceof Error && err.name === "AbortError") {
          // Cancelled by user — status already set to "idle" by cancelAgent
          return;
        }
        const msg = err instanceof Error ? err.message : "Unknown error";
        updateAgent(agentId, { status: "error", output: `Error: ${msg}` });
      }
    },
    [currentProject, updateAgent, addFeedItem]
  );
  runAgentRef.current = runAgent;

  const runSTT = useCallback(
    async (audioFile: File | Blob) => {
      const agent = currentProject.agents["stt"];
      if (!agent) return;

      updateAgent("stt", { status: "running", output: "Transcribing…" });

      try {
        const form = new FormData();
        form.append("audio", audioFile);

        const headers: Record<string, string> = {};
        if (currentProject.settings.xaiKey) {
          headers["x-xai-key"] = currentProject.settings.xaiKey;
        }

        const res = await fetch("/api/stt", { method: "POST", headers, body: form });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(error);
        }
        const { transcript } = await res.json();

        updateAgent("stt", { status: "done", output: transcript, lastRun: "just now" });
        addFeedItem({
          id: `f-${Date.now()}`,
          time: "just now",
          agent: agent.name,
          phase: agent.phase,
          phaseColor: agent.phaseColor,
          content: transcript.split("\n")[0].slice(0, 120),
        });

        if (currentProject.settings.autoChain) {
          await runAgentRef.current?.("summarise", transcript);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        updateAgent("stt", { status: "error", output: `Error: ${msg}` });
      }
    },
    [currentProject, updateAgent, addFeedItem]
  );

  return (
    <AgentsContext.Provider
      value={{
        clients,
        currentClientId,
        currentClient,
        switchClient,
        addClient,
        removeClient,
        updateClientMeta,
        currentProjectId,
        currentProject,
        switchProject,
        addProject,
        removeProject,
        updateProjectMeta,
        scaffoldProject,
        agents: currentProject.agents,
        feed: currentProject.feed,
        settings: currentProject.settings,
        driveFolders: currentProject.driveFolders,
        updateAgent,
        updateSettings,
        runAgent,
        cancelAgent,
        runSTT,
        pendingApproval,
        approvePending,
        dismissPending,
        pendingModal,
        openModal,
        closeModal,
        buildItems: currentProject.buildItems ?? [],
        addBuildItem,
        updateBuildItem,
        removeBuildItem,
        tickets: currentProject.tickets ?? [],
        addTickets,
        updateTicket,
        removeTicket,
        generateTickets,
        sessionNotes: currentProject.sessionNotes ?? "",
        savedSessionNotes: currentProject.savedSessionNotes ?? [],
        stagedPrinciplesInput: currentProject.stagedPrinciplesInput ?? "",
        updateSessionNotes,
        saveSessionNotes,
        clearSessionNotes,
        engagementRecord: currentProject.engagementRecord ?? {
          clientBackground: "",
          industry: "",
          regulatoryContext: "",
          projectBrief: "",
          targetGoLive: "",
          scopeOut: [],
          stakeholders: [],
          decisions: [],
          openQuestions: [],
          updatedAt: "",
        },
        updateEngagementRecord,
        resolvedSinceLastCps: currentProject.resolvedSinceLastCps ?? 0,
      }}
    >
      {children}
    </AgentsContext.Provider>
  );
}

export function useAgents() {
  const ctx = useContext(AgentsContext);
  if (!ctx) throw new Error("useAgents must be inside AgentsProvider");
  return ctx;
}

async function callAIRIA(
  pipelineId: string | null,
  input: string,
  settings: ClientSettings,
  signal?: AbortSignal
): Promise<string> {
  if (pipelineId) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.airiaKey) headers["x-airia-key"] = settings.airiaKey;

    const res = await fetch("/api/airia", {
      method: "POST",
      headers,
      body: JSON.stringify({
        pipelineId,
        userInput: input,
        baseUrl: settings.airiaUrl,
      }),
      signal,
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(error);
    }
    const { output } = await res.json();
    return output;
  }

  // Demo mode
  await new Promise((r) => setTimeout(r, 1600 + Math.random() * 1200));
  const preview = input
    ? `"${input.slice(0, 60)}${input.length > 60 ? "…" : ""}"`
    : "(no input)";
  return `[Demo — ${pipelineId ?? "no pipeline"}]\n\nInput received: ${preview}\n\nTo connect a live AIRIA agent, add your API key and pipeline ID in Settings.`;
}
