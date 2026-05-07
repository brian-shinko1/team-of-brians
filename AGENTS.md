<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Shinko1 Dashboard — Agent Context

Next.js 16 + React 19 + Tailwind 4 + shadcn/ui. State in React Context backed by `localStorage`. No database.

## What this is

Admin dashboard for orchestrating AI agents across a 5-phase solution delivery lifecycle (Plan → Design → Architecture → Build → Eval). Each agent calls an AIRIA pipeline and stores output in state. Agents chain automatically.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/agents.ts` | All agent definitions + every chain/gate map — **start here** |
| `src/lib/types.ts` | TypeScript interfaces (Agent, Project, Client, Ticket, etc.) |
| `src/context/AgentsContext.tsx` | Global state + `runAgent()` orchestration + auto-chain logic |
| `src/components/AgentModal.tsx` | Input/output UI; auto-fill logic; `buildFinalInput()`; Drive save |
| `src/components/AgentCard.tsx` | Card with status dot, output preview, Run/View buttons |
| `src/lib/formatters.ts` | JSON→Markdown converters; `formatOutput(agentId, raw)` dispatcher |
| `src/app/api/airia/route.ts` | Proxies pipeline call to AIRIA with API key |
| `src/app/api/stt/route.ts` | xAI Grok audio transcription |
| `src/app/api/drive/` | Google Drive OAuth + read/save/scaffold/folders |
| `src/app/api/jira/` | Jira issue create/update |

Phase pages (`plan/`, `design/`, `architecture/`, `build/`, `eval/`) all use `PhasePage.tsx`.

---

## Agent Pipeline

```
meeting_input ─┐
               ├→ summarise → cps → prd → event_storm → principles → domain_model → architecture → spec → agents_md → reverse_doc → eval_agent
stt ───────────┘
```

### All agents

| id | Name | Phase |
|----|------|-------|
| `meeting_input` | Meeting Input | Plan |
| `stt` | STT Agent | Plan |
| `summarise` | Summarisation Agent | Plan |
| `cps` | CPS Agent | Plan |
| `prd` | PRD Agent | Plan |
| `event_storm` | Event Storming Agent | Design |
| `principles` | Principles Agent | Design |
| `domain_model` | Domain Model Agent | Design |
| `architecture` | Architecture Agent | Architecture |
| `spec` | Spec Agent | Architecture |
| `agents_md` | Agents.md Agent | Architecture |
| `pm_agent` | PM Agent | Build |
| `reverse_doc` | Reverse Doc Agent | Build |
| `eval_agent` | Evaluation Agent | Eval |

---

## Chain Maps (all in `src/lib/agents.ts`)

```ts
// Who runs next (auto-chain)
NEXT_AGENT = { meeting_input:"summarise", stt:"summarise", summarise:"cps", cps:"prd",
  prd:"event_storm", event_storm:"principles", principles:"domain_model",
  domain_model:"architecture", architecture:"spec", spec:"agents_md",
  agents_md:"reverse_doc", reverse_doc:"eval_agent" }

// Default input source (first run auto-fill)
PREVIOUS_AGENT = { summarise:"stt", cps:"summarise", prd:"cps", principles:"event_storm",
  domain_model:"principles", architecture:"domain_model", spec:"architecture",
  agents_md:"spec", reverse_doc:"agents_md", eval_agent:"reverse_doc" }

// Secondary "Use X output" button in modal
SECONDARY_AGENT = { principles:"prd", domain_model:"prd" }

// Fallback if primary source has no output
FALLBACK_AGENT = { summarise:"meeting_input" }

// Silently injected as frozen context alongside input (via AgentsContext.runAgent)
CONTEXT_AGENTS = {
  principles:   ["event_storm"],
  domain_model: ["event_storm", "prd"],
  architecture: ["event_storm"],
  spec:         ["domain_model", "principles"],
  agents_md:    ["architecture", "domain_model"],
}

// Require human approval before auto-chaining into these
HITL_AGENTS = Set{ "cps","prd","event_storm","architecture","reverse_doc","eval_agent" }
```

---

## Auto-fill Logic (AgentModal.tsx `useEffect` on `agentId`)

- `meeting_input`, `stt`, `event_storm` → no auto-fill (capture agents or one-shot)
- All others:
  - **Re-run** (agent already has `output`) → fill from **own previous output**
  - **First run** (no own output) → fill from `PREVIOUS_AGENT` source (or `FALLBACK_AGENT`)

"Use X output" buttons **append** to the field (separated by `---`), not replace.

---

## Input Assembly (`buildFinalInput` in AgentModal.tsx)

```
baseInput
  + [EXISTING PHASE CONTEXT] (if includeExisting toggled — pulls from Drive or in-memory output)
```

For `principles` with audio recording: transcript is appended to `input` before `buildFinalInput`.
For `event_storm` with images: image dataURLs are appended to `input`.

`CONTEXT_AGENTS` outputs are prepended by `runAgent()` in AgentsContext, **not** in the modal.

---

## State Shape

```ts
// localStorage key: "shinko1_clients"
Client[] = [{
  id, name,  // name = company name
  projects: [{
    id, name,
    agents: Record<agentId, Agent>,  // all 14 agents
    feed: FeedItem[],
    settings: ClientSettings,
    driveFolders?: DriveFolders,
    tickets?: Ticket[],
  }]
}]

// localStorage key: "shinko1_selection"
{ clientId: string, projectId: string }
```

```ts
Agent = { id, name, desc, phase, phaseColor, pipelineId: string|null,
          output: string, status: "idle"|"running"|"done"|"error",
          lastRun: string|null, driveUrl?: string }

ClientSettings = { airiaKey, airiaUrl, xaiKey, googleDriveFolderId,
                   autoChain: boolean, hitlAll: boolean,
                   jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey, jiraPipelineId }
```

---

## Key Patterns

**Adding a new agent:** Add to `INITIAL_AGENTS`, wire into `NEXT_AGENT` + `PREVIOUS_AGENT`, add env var `NEXT_PUBLIC_PIPELINE_X`.

**Adding context to an agent:** Add agentId to `CONTEXT_AGENTS[targetId]`.

**Adding a secondary "Use output" button:** Add to `SECONDARY_AGENT`.

**HITL gate:** Add agentId to `HITL_AGENTS` — auto-chain will pause and show approval banner.

**Input for special agents:**
- `meeting_input` — paste/file/recording tabs; auto-chains to `summarise` (not via AIRIA)
- `stt` — audio file only → `/api/stt` → transcript stored as output
- `event_storm` — text + optional whiteboard images
- `principles` — text + optional session recording (transcribed + appended)

**Drive:** Each project can be scaffolded into a Drive folder tree (phase folders + per-agent subfolders). `driveUrl` on Agent is set after save. `includeExisting` toggle in modal reads the agent's Drive subfolder for prior context.

---

## Design Principles (Shinko1 lifecycle)

- Event storm runs **once** — its output is frozen context for downstream agents
- Principles, domain model, architecture are **living documents** — re-run with own previous output + new deltas
- Every phase boundary is a HITL gate
- PRD is the requirements anchor — domain model and principles both consume it
- No hallucinations, full audit trail, ubiquitous language from event storm preserved throughout
