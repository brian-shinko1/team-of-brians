<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Shinko1 Dashboard — Agent Context

Next.js 16 + React 19 + Tailwind 4 + shadcn/ui. State in React Context backed by `localStorage`. No database.

## What this is

Admin dashboard for orchestrating AI agents across a 6-phase solution delivery lifecycle (Plan → Design → Architecture → Review → Build → Eval). Each agent calls an AIRIA pipeline and stores output in state. Agents chain automatically, with HITL gates at every phase boundary.


## Key Files

| File | Purpose |
|------|---------|
| `src/lib/agents.ts` | All agent definitions + every chain/gate map + pipeline profiles — **start here** |
| `src/lib/types.ts` | TypeScript interfaces (Agent, Project, Client, Ticket, EngagementRecord, etc.) |
| `src/context/AgentsContext.tsx` | Global state + `runAgent()` orchestration + auto-chain + bypass logic |
| `src/components/AgentModal.tsx` | Input/output UI; auto-fill; `buildFinalInput()`; Drive save |
| `src/components/AgentCard.tsx` | Card with status dot, output preview, Run/View buttons |
| `src/components/TeamView.tsx` | Isometric SVG pipeline visualisation with animated rails + zoom |
| `src/components/PhasePage.tsx` | Shared layout for all phase pages |
| `src/components/MeetingCopilotModal.tsx` | 3-tab interactive tool (checklist · transcript · gap report) |
| `src/components/JarvisModal.tsx` | Inline Q&A modal backed by `queryPipelineId` |
| `src/components/EngagementRecordPanel.tsx` | Structured project brief (stakeholders, decisions, open questions) |
| `src/components/SessionNotesCapture.tsx` | Session notes editor with save/stage for Principles |
| `src/components/DocEditorPanel.tsx` | Rich markdown editor panel for living documents |
| `src/components/SaveToDriveDialog.tsx` | Drive save flow (new doc or living-doc update) |
| `src/lib/formatters.ts` | JSON→Markdown converters; `formatOutput(agentId, raw)` dispatcher |
| `src/app/api/airia/route.ts` | Proxies pipeline call to AIRIA with API key |
| `src/app/api/stt/route.ts` | xAI Grok audio transcription |
| `src/app/api/drive/` | Google Drive OAuth + read/save/scaffold/folders/engagement |
| `src/app/api/slack/` | Slack OAuth + notify |
| `src/app/api/admin/` | Admin lock/unlock |

Phase pages: `plan/`, `capture/`, `define/`, `design/`, `model/`, `architecture/`, `review/`, `build/`, `eval/`. Special pages: `team/`, `outputs/`, `settings/`.


## Agent Pipeline

```
meeting_input ─┐
               ├→ summarise → cps → prd ─────────────────────────────────────────────────────────────────────→ [quick: security_agent]
stt ───────────┘                         └→ event_storm → principles → domain_model → architecture → spec → agents_md → security_agent → doc_agent → reverse_doc → eval_agent
```

`meeting_copilot` is a standalone Plan tool — it is never in the auto-chain (HITL only, opened manually).

### All agents

| id | Name | Phase | Notes |
|----|------|-------|-------|
| `meeting_input` | Meeting Input | Plan | Capture — paste / file / recording |
| `meeting_copilot` | Meeting Co-Pilot | Plan | Standalone HITL tool — not in auto-chain |
| `stt` | STT Agent | Plan | xAI Grok audio transcription |
| `jarvis` | Jarvis | Plan | Domain Q&A — backed by `queryPipelineId` |
| `summarise` | Summarisation Agent | Plan | |
| `cps` | CPS Agent | Plan | Context · Problem · Solution |
| `prd` | PRD Agent | Plan | Living document |
| `event_storm` | Event Storming Agent | Design | Runs once — frozen context |
| `principles` | Principles Agent | Design | Living document |
| `domain_model` | Domain Model Agent | Design | Living document |
| `architecture` | Architecture Agent | Architecture | Living document |
| `spec` | Spec Agent | Architecture | |
| `agents_md` | Agents.md Agent | Architecture | |
| `security_agent` | Security Agent | Review | Always active — never bypassed |
| `doc_agent` | Doc Agent | Review | Definition doc for client sign-off |
| `pm_agent` | PM Agent | Build | Generates tickets from agents_md |
| `reverse_doc` | Reverse Doc Agent | Build | |
| `eval_agent` | Evaluation Agent | Eval | |


## Chain Maps (all in `src/lib/agents.ts`)

```ts
// Who runs next (auto-chain)
NEXT_AGENT = {
  meeting_input:  "summarise",
  stt:            "summarise",
  summarise:      "cps",
  cps:            "prd",
  prd:            "event_storm",
  event_storm:    "principles",
  principles:     "domain_model",
  domain_model:   "architecture",
  architecture:   "spec",
  spec:           "agents_md",
  agents_md:      "security_agent",
  security_agent: "doc_agent",
  doc_agent:      "reverse_doc",
  reverse_doc:    "eval_agent",
}

// Default input source (first run auto-fill)
PREVIOUS_AGENT = {
  summarise:      "meeting_input",
  cps:            "summarise",
  prd:            "cps",
  // principles has no PREVIOUS_AGENT — input comes from session notes
  domain_model:   "principles",
  architecture:   "domain_model",
  spec:           "architecture",
  agents_md:      "spec",
  security_agent: "agents_md",
  doc_agent:      "security_agent",
  pm_agent:       "prd",
  reverse_doc:    "doc_agent",
  eval_agent:     "reverse_doc",
}

// Secondary "Use X output" button in modal
SECONDARY_AGENT = { event_storm:"prd", domain_model:"prd" }

// Fallback if primary source has no output
// security_agent falls back to prd in Quick mode (agents_md was bypassed)
FALLBACK_AGENT = { security_agent:"prd", summarise:"meeting_input" }

// Silently injected as frozen context alongside input (via AgentsContext.runAgent)
CONTEXT_AGENTS = {
  domain_model:   ["event_storm", "prd"],
  architecture:   ["event_storm", "principles"],
  spec:           ["domain_model", "principles"],
  agents_md:      ["architecture", "domain_model", "principles"],
  security_agent: ["cps", "prd"],
  doc_agent:      ["agents_md", "prd"],
  pm_agent:       ["spec", "agents_md"],
}

// Require human approval before auto-chaining into these
HITL_AGENTS = Set{
  "meeting_copilot",  // standalone — must be opened manually, never auto-run
  "cps",              // review summary before generating CPS
  "prd",              // sign-off on CPS before generating PRD
  "event_storm",      // Plan → Design phase boundary
  "principles",       // session-notes agent — runs deliberately, not automatically
  "architecture",     // Design → Architecture phase boundary
  "security_agent",   // Architecture → Review phase boundary
  "reverse_doc",      // Review sign-off gate → Build phase boundary
  "eval_agent",       // Build → Eval phase boundary
}

// Runs once — skipped in auto-chain if output already exists
FROZEN_AGENTS = Set{ "event_storm" }

// Engagement record prepended to input on every run
ENGAGEMENT_RECORD_AGENTS = Set{ "summarise", "cps", "prd", "event_storm" }

// Drive file updated in-place (one living doc per project, not versioned)
LIVING_DOC_AGENTS = Set{ "cps", "prd", "architecture", "domain_model", "principles" }
```


## Pipeline Profiles

Profiles control which agents are bypassed by auto-chain. Security is never bypassed.

```ts
PROFILE_BYPASS = {
  quick:    Set{ "event_storm","principles","domain_model","architecture","spec","agents_md" },
  standard: Set{},   // full pipeline
  full:     Set{},   // full pipeline with maximum oversight
}
```

- **Quick** — Plan → Review → Build → Eval. Design & Architecture phases skipped. `security_agent` receives `prd` via `FALLBACK_AGENT` and `CONTEXT_AGENTS`.
- **Standard** — all 6 phases.
- **Full** — all 6 phases; intended for enterprise / high-stakes delivery.

Profile is stored in `project.settings.pipelineProfile`. `TeamView` dims bypassed agents and draws jump rails for the active shortcuts.


## Auto-fill Logic (AgentModal.tsx `useEffect` on `agentId`)

- `meeting_input`, `stt`, `event_storm` → no auto-fill (capture agents or one-shot)
- All others:
  - **Re-run** (agent already has `output`) → fill from **own previous output**
  - **First run** (no output) → fill from `PREVIOUS_AGENT` source (or `FALLBACK_AGENT`)

"Use X output" buttons **append** to the field (separated by `---`), not replace.


## Input Assembly (`buildFinalInput` in AgentModal.tsx)

```
baseInput
  + [EXISTING PHASE CONTEXT] (if includeExisting toggled — pulls from Drive or in-memory output)
```

- `principles` with recording → transcript appended to input before `buildFinalInput`
- `event_storm` with images → image dataURLs appended to input
- `CONTEXT_AGENTS` outputs are prepended by `runAgent()` in AgentsContext, **not** in the modal
- `ENGAGEMENT_RECORD_AGENTS` receive the serialized engagement record prepended automatically


## Drive Document Formatting (`src/app/api/drive/save/route.ts`)

HTML is built via `unified` → `remark-parse` → `remark-gfm` → `remark-rehype` → `rehype-stringify`, then all CSS is inlined with `juice` before upload. This is necessary because Google Drive ignores `<style>` blocks and only respects inline `style=""` attributes.

- Upload MIME type: `text/html`
- Request body MIME type: `application/vnd.google-apps.document` → Drive auto-converts to Google Doc
- Living doc agents use `drive.files.update` with `fileId` to overwrite in-place
- Logo (`public/shinko-logo.png`) is embedded as a base64 data URI in the document header


## State Shape

```ts
// localStorage key: "shinko1_clients"
Client[] = [{
  id, name,          // name = company / organisation name
  createdAt: string,
  projects: Project[]
}]

// localStorage key: "shinko1_selection"
{ clientId: string, projectId: string }
```

```ts
Project = {
  id, name, createdAt,
  agents: Record<agentId, Agent>,   // all agents
  feed: FeedItem[],
  settings: ClientSettings,
  driveFolders?: DriveFolders,
  tickets?: Ticket[],
  buildItems?: BuildItem[],
  sessionNotes?: string,            // current unsaved session notes
  savedSessionNotes?: { content: string; savedAt: string }[],
  stagedPrinciplesInput?: string,   // session notes staged for next Principles run
  sessionLog?: SessionLogEntry[],
  engagementRecord?: EngagementRecord,
}

Agent = {
  id, name, desc, phase, phaseColor,
  pipelineId: string | null,
  output: string,
  status: "idle" | "running" | "done" | "error",
  lastRun: string | null,
  lastInput?: string,
  driveUrl?: string,
  driveFileId?: string,    // stored for living-doc in-place updates
}

ClientSettings = {
  airiaKey, airiaUrl, xaiKey,
  googleDriveFolderId,
  autoChain: boolean,
  hitlAll: boolean,
  queryPipelineId: string | null,   // Jarvis / GlobalQueryPanel pipeline
  pipelineProfile: "quick" | "standard" | "full",
}

EngagementRecord = {
  clientBackground, industry, regulatoryContext, projectBrief, targetGoLive,
  scopeOut: string[],
  stakeholders: Stakeholder[],
  decisions: EngagementDecision[],
  openQuestions: OpenQuestion[],
  updatedAt: string,
}
```


## Key Patterns

**Adding a new agent:** Add to `INITIAL_AGENTS`, wire into `NEXT_AGENT` + `PREVIOUS_AGENT`, add env var `NEXT_PUBLIC_PIPELINE_X`.

**Adding context to an agent:** Add agentId entry to `CONTEXT_AGENTS`.

**Adding a secondary "Use output" button:** Add to `SECONDARY_AGENT`.

**HITL gate:** Add agentId to `HITL_AGENTS` — auto-chain pauses and shows the approval banner.

**Living document:** Add agentId to `LIVING_DOC_AGENTS` — Drive save overwrites the existing file instead of creating a new versioned one.

**Bypass profile:** Add agentId to `PROFILE_BYPASS.quick` (and/or other profiles) to skip it in auto-chain for that profile. Always add a `FALLBACK_AGENT` entry for any downstream agent that might receive `undefined` as input.

**Input for special agents:**
- `meeting_input` — paste / file / recording tabs; passes transcript directly to `summarise`, no AIRIA call
- `stt` — audio file only → `/api/stt` (xAI Grok) → transcript stored as output
- `meeting_copilot` — standalone 3-tab tool, never in auto-chain; opened from Plan page manually
- `event_storm` — text + optional whiteboard images
- `principles` — session notes staged from `SessionNotesCapture` + optional live recording (transcribed + appended)
- `jarvis` — freeform Q&A; backed by `queryPipelineId`, not a pipeline agent

**Drive scaffold:** `/api/drive/scaffold` creates a folder tree per project (phase folders + per-agent subfolders). `driveUrl` on Agent is set after first save. `includeExisting` toggle in modal reads the agent's Drive subfolder for prior context.

**Slack:** `/api/slack/` handles OAuth and notifications. Connected via project settings.


## Design Principles (Shinko1 lifecycle)

- Event storm runs **once** — its output is frozen context for all downstream agents
- `principles`, `domain_model`, `architecture`, `cps`, `prd` are **living documents** — re-run with own previous output + new deltas
- Every phase boundary is a HITL gate
- PRD is the requirements anchor — domain model and principles both consume it
- Security agent always runs — it is never bypassed regardless of profile
- Engagement record is persistent project context injected into early-chain agents
- No hallucinations, full audit trail, ubiquitous language from event storm preserved throughout
