export type AgentStatus = "idle" | "running" | "done" | "error";

export type Phase = "Plan" | "Design" | "Architecture" | "Review" | "Build" | "Eval";

export type TicketStatus = "todo" | "wip" | "done" | "backlogged";
export type TicketType = "Story" | "Task" | "Bug";
export type TicketPriority = "Low" | "Medium" | "High" | "Critical";

export interface TicketAuditEntry {
  at: string;
  field: string;
  from: string;
  to: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  category?: string;
  acceptanceCriteria: string[];
  notes: string;
  auditLog: TicketAuditEntry[];
  stale?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  desc: string;
  phase: Phase;
  phaseColor: string;
  pipelineId: string | null;
  output: string;
  status: AgentStatus;
  lastRun: string | null;
  lastInput?: string;
  driveUrl?: string;
  driveFileId?: string;
}

export interface FeedItem {
  id: string;
  time: string;
  agent: string;
  phase: Phase;
  phaseColor: string;
  content: string;
}

export type PipelineProfile = "quick" | "standard" | "full";

export interface ClientSettings {
  airiaKey: string;
  airiaUrl: string;
  xaiKey: string;
  googleDriveFolderId: string;
  autoChain: boolean;
  hitlAll: boolean;
  queryPipelineId: string | null;
  pipelineProfile: PipelineProfile;
}

export interface DriveFolders {
  projectRoot: string;       // {Project Name} folder
  projectUrl: string;        // webViewLink to open in Drive
  phases: Record<string, string>;     // "Plan" -> folderId
  subfolders: Record<string, string>; // agentId -> folderId
}

export interface BuildItem {
  id: string;
  title: string;
  description: string;
  status: "todo" | "wip" | "done" | "backlogged";
  category?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionLogEntry {
  date: string;    // ISO date string
  headline: string; // one-line summary of what happened this session
}

export interface Project {
  id: string;
  name: string;
  agents: Record<string, Agent>;
  feed: FeedItem[];
  settings: ClientSettings;
  driveFolders?: DriveFolders;
  buildItems?: BuildItem[];
  tickets?: Ticket[];
  sessionNotes?: string;
  savedSessionNotes?: { content: string; savedAt: string }[];
  stagedPrinciplesInput?: string;
  sessionLog?: SessionLogEntry[];
  engagementRecord?: EngagementRecord;
  resolvedSinceLastCps?: number;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string; // company / organisation name
  projects: Project[];
  createdAt: string;
}

export type ActionItemPriority = "Low" | "Medium" | "High" | "Critical";
export type ActionItemStatus = "todo" | "done";

export interface ActionItem {
  id: string;
  title: string;
  notes?: string;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  createdAt: string;
  completedAt?: string;
}

export interface GlobalSettings {
  _placeholder: true;
}

// ── Engagement Record ─────────────────────────────────────────────────────────

export interface Stakeholder {
  id: string;
  name: string;
  organisation: string;
  role: string;
  contact: string;
}

export interface EngagementDecision {
  id: string;
  decision: string;
  rationale?: string;
  source: string;
  date: string;
}

export type OpenQuestionPriority = "blocking" | "high" | "medium" | "low";
export type OpenQuestionStatus = "open" | "in_progress" | "resolved";

export interface OpenQuestion {
  id: string;
  question: string;
  owner: string;
  status: OpenQuestionStatus;
  resolution: string | null;
  blocks: string;
  priority: OpenQuestionPriority;
}

export interface EngagementRecord {
  clientBackground: string;
  industry: string;
  regulatoryContext: string;
  projectBrief: string;
  targetGoLive: string;
  scopeOut: string[];
  stakeholders: Stakeholder[];
  decisions: EngagementDecision[];
  openQuestions: OpenQuestion[];
  updatedAt: string;
}
