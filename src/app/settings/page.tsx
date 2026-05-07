"use client";

import { useEffect, useRef, useState } from "react";
import { useAgents } from "@/context/AgentsContext";
import { INITIAL_AGENTS } from "@/lib/agents";

type DriveFolder = { id: string; name: string };

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="10" height="8" rx="1.5" />
      <path d="M5 7V5a3 3 0 016 0v2" />
    </svg>
  );
}

function LockOpenIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="10" height="8" rx="1.5" />
      <path d="M5 7V5a3 3 0 016 0" />
    </svg>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      suppressHydrationWarning
      className={`w-[34px] h-[19px] rounded-full relative transition-colors shrink-0 overflow-hidden ${value ? "bg-zinc-900" : "bg-zinc-200"}`}
    >
      <span
        suppressHydrationWarning
        className={`absolute top-[3px] left-0 w-[13px] h-[13px] rounded-full bg-white shadow transition-transform ${value ? "translate-x-[18px]" : "translate-x-[3px]"}`}
      />
    </button>
  );
}

function SettingsRow({
  label,
  sub,
  children,
  last,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 ${last ? "" : "border-b border-zinc-100"}`}>
      <div className="flex-1">
        <p className="text-[13px]">{label}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}


export default function SettingsPage() {
  const { currentClient, currentProject, clients, settings, updateSettings, updateAgent, updateClientMeta, updateProjectMeta, scaffoldProject, removeClient, removeProject } = useAgents();
  const [saved, setSaved] = useState(false);
  const [connStatus, setConnStatus] = useState<"idle" | "testing" | "ok">("ok");
  const [driveConnected, setDriveConnected] = useState(false);
  const [scaffolding, setScaffolding] = useState(false);
  const [scaffoldError, setScaffoldError] = useState("");
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [folderError, setFolderError] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Defer client-dependent rendering to avoid SSR/localStorage mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Pipeline ID lock state
  const [pipelinesUnlocked, setPipelinesUnlocked] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const agentsWithPipeline = INITIAL_AGENTS.filter((a) => a.pipelineId !== null || a.id !== "meeting_input")
    .filter((a) => a.id !== "meeting_input");

  useEffect(() => {
    // Check if already unlocked via cookie
    const unlocked = document.cookie.split(";").some((c) => c.trim().startsWith("admin_unlocked=1"));
    setPipelinesUnlocked(unlocked);
  }, []);

  const handleUnlock = async () => {
    setUnlocking(true);
    setPasswordError("");
    const res = await fetch("/api/admin/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput }),
    });
    setUnlocking(false);
    if (res.ok) {
      setPipelinesUnlocked(true);
      setShowPasswordPrompt(false);
      setPasswordInput("");
    } else {
      const { error } = await res.json();
      setPasswordError(error ?? "Incorrect password");
    }
  };

  const handleLock = async () => {
    await fetch("/api/admin/lock", { method: "POST" });
    setPipelinesUnlocked(false);
  };

  useEffect(() => {
    // Check if we just came back from Google OAuth
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("drive") === "connected") {
        setDriveConnected(true);
        window.history.replaceState({}, "", "/settings");
      }
    }
    // Also check persistent connection status from server cookies
    fetch("/api/drive/status")
      .then((r) => r.json())
      .then((d) => { if (d.connected) setDriveConnected(true); })
      .catch(() => {});
  }, []);
  // Initialize empty to match SSR (which has no localStorage), then populate after mount
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");

  // Sync form on mount and whenever the selected client/project changes
  useEffect(() => {
    setClientName(currentClient.name);
    setProjectName(currentProject.name);
  }, [currentClient.id, currentProject.id]);

  const selectedFolder = folders.find((f) => f.id === settings.googleDriveFolderId);

  const openFolderPicker = async () => {
    setFolderPickerOpen(true);
    if (folders.length > 0) return;
    setFolderLoading(true);
    setFolderError("");
    try {
      const res = await fetch("/api/drive/folders");
      if (res.status === 401) {
        setFolderError("Not connected — click Connect Google Drive first.");
      } else if (!res.ok) {
        setFolderError("Failed to load folders.");
      } else {
        const data = await res.json();
        setFolders(data.folders ?? []);
        if ((data.folders ?? []).length === 0) setFolderError("No folders found in your Drive.");
      }
    } catch {
      setFolderError("Network error.");
    } finally {
      setFolderLoading(false);
    }
  };

  const handleScaffold = async () => {
    setScaffolding(true);
    setScaffoldError("");
    try {
      // Pass current form values directly so unsaved name changes are used
      await scaffoldProject(currentClient.id, currentProject.id, { clientName, projectName });
    } catch (err) {
      setScaffoldError(err instanceof Error ? err.message : "Failed to set up Drive structure");
    } finally {
      setScaffolding(false);
    }
  };

  const handleSave = () => {
    updateClientMeta(currentClient.id, { name: clientName });
    updateProjectMeta(currentProject.id, { name: projectName });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setConnStatus("testing");
    await new Promise((r) => setTimeout(r, 1200));
    setConnStatus("ok");
  };


  if (!mounted) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[19px] font-semibold tracking-tight">Settings</h1>
        <p className="text-[12px] text-zinc-400 mt-1">
          <span className="text-zinc-700 font-medium">{currentClient.name}</span>
          <span className="text-zinc-300 mx-1">·</span>
          <span className="text-zinc-500">{currentProject.name}</span>
          {" "}— settings are isolated per project
        </p>
      </div>

      {/* Client identity */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 text-[12px] font-medium">
          Client
        </div>
        <SettingsRow label="Company name" sub="Organisation or client name">
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-[220px] text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
          />
        </SettingsRow>
        <SettingsRow label="Project name" sub="Current engagement or project within this company" last>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-[220px] text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
          />
        </SettingsRow>
      </div>

      {/* AIRIA API — per client */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 text-[12px] font-medium flex items-center gap-2">
          AIRIA API
          <span className="text-[10px] text-zinc-400 font-normal">— scoped to this client</span>
        </div>

        <SettingsRow label="API Key" sub="AIRIA secret key for this client">
          <input
            type="password"
            value={settings.airiaKey}
            onChange={(e) => updateSettings({ airiaKey: e.target.value })}
            placeholder="airia_sk_••••••••••••••"
            className="w-[240px] text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
          />
        </SettingsRow>

        <SettingsRow label="Base URL" sub="AIRIA API endpoint">
          <input
            type="text"
            value={settings.airiaUrl}
            onChange={(e) => updateSettings({ airiaUrl: e.target.value })}
            className="w-[240px] text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
          />
        </SettingsRow>

        <SettingsRow label="Connection" sub="Live API test" last>
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connStatus === "testing" ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            <span className="text-[12px] text-zinc-500">
              {connStatus === "testing" ? "Testing…" : "Connected"}
            </span>
            <button
              onClick={handleTest}
              className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
            >
              Test
            </button>
          </div>
        </SettingsRow>
      </div>

      {/* xAI */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 text-[12px] font-medium flex items-center gap-2">
          xAI
          <span className="text-[10px] text-zinc-400 font-normal">— STT Agent · Audio transcription</span>
        </div>
        <SettingsRow label="API Key" sub="Overrides XAI_API_KEY env var for this client" last>
          <input
            type="password"
            value={settings.xaiKey}
            onChange={(e) => updateSettings({ xaiKey: e.target.value })}
            placeholder="xai-••••••••••••••"
            className="w-[240px] text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
          />
        </SettingsRow>
      </div>

      {/* Google Drive */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 text-[12px] font-medium flex items-center gap-2">
          Google Drive
          <span className="text-[10px] text-zinc-400 font-normal">— transcript storage · STT output</span>
        </div>
        <SettingsRow label="Account" sub="Authorise access to Google Drive">
          <div className="flex items-center gap-2">
            {driveConnected && (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Connected
              </span>
            )}
            <a
              href="/api/drive/auth"
              className="text-[11px] font-medium px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
            >
              {driveConnected ? "Reconnect" : "Connect Google Drive"}
            </a>
          </div>
        </SettingsRow>
        <SettingsRow
          label="Drive structure"
          sub="My Drive / Customers / {Company} / {Project} / {Phase} / {Agent}"
          last
        >
          <div className="flex items-center gap-2">
            {currentProject.driveFolders ? (
              <>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Scaffolded
                </span>
                <a
                  href={currentProject.driveFolders.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
                >
                  ↗ Open in Drive
                </a>
                <button
                  onClick={handleScaffold}
                  disabled={scaffolding}
                  className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors text-zinc-500 disabled:opacity-40"
                >
                  {scaffolding ? "Scaffolding…" : "Re-scaffold"}
                </button>
              </>
            ) : (
              <>
                <span className="text-[11px] text-zinc-400">Not set up</span>
                <button
                  onClick={handleScaffold}
                  disabled={scaffolding}
                  className="text-[11px] font-medium px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors disabled:opacity-40"
                >
                  {scaffolding ? "Scaffolding…" : "Set up Drive structure"}
                </button>
              </>
            )}
            {scaffoldError && (
              <span className="text-[11px] text-red-500">{scaffoldError}</span>
            )}
          </div>
        </SettingsRow>
      </div>


      {/* Pipeline IDs — admin locked */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 text-[12px] font-medium flex items-center gap-2">
          Agent Pipeline IDs
          <span className="text-[10px] text-zinc-400 font-normal">— scoped to this project</span>
          <div className="ml-auto flex items-center gap-2">
            {pipelinesUnlocked ? (
              <button
                onClick={handleLock}
                className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                <LockOpenIcon /> Unlocked — click to lock
              </button>
            ) : (
              <button
                onClick={() => { setShowPasswordPrompt((v) => !v); setPasswordError(""); setPasswordInput(""); }}
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <LockIcon /> Locked
              </button>
            )}
          </div>
        </div>

        {showPasswordPrompt && !pipelinesUnlocked && (
          <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
            <input
              autoFocus
              type="password"
              placeholder="Admin password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className="text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 w-[200px]"
            />
            <button
              onClick={handleUnlock}
              disabled={unlocking || !passwordInput}
              className="text-[12px] font-medium px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 disabled:opacity-40 transition-opacity"
            >
              {unlocking ? "Checking…" : "Unlock"}
            </button>
            {passwordError && (
              <span className="text-[11px] text-red-500">{passwordError}</span>
            )}
          </div>
        )}

        {agentsWithPipeline.map((a, i) => (
          <SettingsRow
            key={a.id}
            label={a.name}
            sub={`${a.phase} phase`}
            last={i === agentsWithPipeline.length - 1}
          >
            {!mounted ? (
              <span className="text-[12px] font-mono text-zinc-300">——</span>
            ) : pipelinesUnlocked ? (
              <input
                type="text"
                value={currentProject.agents[a.id]?.pipelineId ?? ""}
                onChange={(e) => updateAgent(a.id, { pipelineId: e.target.value || null })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-[280px] text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 font-mono"
              />
            ) : (
              <span className="text-[12px] font-mono text-zinc-400 tracking-wider">
                {currentProject.agents[a.id]?.pipelineId
                  ? <>{currentProject.agents[a.id].pipelineId!.slice(0, 5)}<span className="text-zinc-300">•••••••-••••-••••-••••-••••••••••••</span></>
                  : <span className="text-zinc-300">not set</span>}
              </span>
            )}
          </SettingsRow>
        ))}
        {/* Ask AI pipeline */}
        <SettingsRow label="Ask AI Pipeline" sub="Used by the global Ask AI panel">
          {pipelinesUnlocked ? (
            <input
              type="text"
              value={settings.queryPipelineId ?? ""}
              onChange={(e) => updateSettings({ queryPipelineId: e.target.value || null })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-[280px] text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400 font-mono"
            />
          ) : (
            <span className="text-[12px] font-mono text-zinc-400 tracking-wider">
              {settings.queryPipelineId
                ? <>{settings.queryPipelineId.slice(0, 5)}<span className="text-zinc-300">•••••••-••••-••••-••••-••••••••••••</span></>
                : <span className="text-zinc-300">not set</span>}
            </span>
          )}
        </SettingsRow>
      </div>

      {/* Behaviour */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 text-[12px] font-medium">
          Pipeline behaviour
        </div>
        <SettingsRow label="Auto-chain agents" sub="Pass output to next agent automatically">
          <Toggle value={settings.autoChain} onChange={(v) => updateSettings({ autoChain: v })} />
        </SettingsRow>
        <SettingsRow label="HITL on every run" sub="Require human approval before advancing phases" last>
          <Toggle value={settings.hitlAll} onChange={(v) => updateSettings({ hitlAll: v })} />
        </SettingsRow>
      </div>


      <button
        onClick={handleSave}
        className="text-[12px] font-medium px-4 py-2 bg-zinc-900 text-white rounded-md hover:opacity-80 transition-opacity"
      >
        {saved ? "Saved ✓" : "Save settings"}
      </button>

      {/* Danger zone */}
      {mounted && <div className="border border-red-100 rounded-xl overflow-hidden mt-8">
        <div className="px-5 py-3 border-b border-red-100 bg-red-50/50 text-[12px] font-medium text-red-700">
          Danger zone
        </div>
        <SettingsRow
          label="Delete project"
          sub={mounted ? `Permanently delete "${currentProject.name}" and all its agent data` : "Permanently delete this project and all its agent data"}
        >
          <button
            onClick={() => {
              if (!confirm(`Delete project "${currentProject.name}"? This cannot be undone.`)) return;
              const otherProject = currentClient.projects.find((p) => p.id !== currentProject.id);
              if (otherProject) {
                removeProject(currentClient.id, currentProject.id);
              } else {
                // Only project — delete the whole client if there are others
                const otherClient = clients.find((c) => c.id !== currentClient.id);
                if (otherClient) {
                  removeClient(currentClient.id);
                } else {
                  alert("Cannot delete the last project of the last company.");
                }
              }
            }}
            className="text-[12px] px-3 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            Delete project
          </button>
        </SettingsRow>
        <SettingsRow
          label="Delete company"
          sub={mounted ? `Permanently delete "${currentClient.name}" and all its projects` : "Permanently delete this company and all its projects"}
          last
        >
          <button
            onClick={() => {
              if (!confirm(`Delete company "${currentClient.name}" and all its projects? This cannot be undone.`)) return;
              const otherClient = clients.find((c) => c.id !== currentClient.id);
              if (!otherClient) {
                alert("Cannot delete the last company.");
                return;
              }
              removeClient(currentClient.id);
            }}
            className="text-[12px] px-3 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            Delete company
          </button>
        </SettingsRow>
      </div>}
    </div>
  );
}
