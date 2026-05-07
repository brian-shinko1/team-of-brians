"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAgents } from "@/context/AgentsContext";
import { GlobalQueryPanel } from "@/components/GlobalQueryPanel";
import { ActionItemsPanel } from "@/components/ActionItemsPanel";
import { useActionItems } from "@/context/ActionItemsContext";

export function Topbar() {
  const {
    clients,
    currentClient,
    currentProject,
    switchProject,
    addClient,
    removeClient,
    addProject,
    removeProject,
    scaffoldProject,
  } = useAgents();

  const { items } = useActionItems();
  const todoCount = items.filter((i) => i.status === "todo").length;
  const [open, setOpen] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [addingProjectFor, setAddingProjectFor] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingClient(false);
        setAddingProjectFor(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAddClient = () => {
    const name = newClientName.trim();
    if (!name) return;
    const { clientId, projectId } = addClient(name);
    scaffoldProject(clientId, projectId);
    setNewClientName("");
    setAddingClient(false);
    setOpen(false);
  };

  const handleAddProject = (clientId: string) => {
    const name = newProjectName.trim();
    if (!name) return;
    const projectId = addProject(clientId, name);
    scaffoldProject(clientId, projectId);
    setNewProjectName("");
    setAddingProjectFor(null);
    setOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-[52px] bg-white border-b border-zinc-100 flex items-center px-5 gap-3.5 z-50">
      {/* Brand */}
      <Image
        src="/shinko1-logo-final.svg"
        alt="Shinko1"
        width={86}
        height={22}
        priority
        className="shrink-0"
      />

      <div className="w-px h-[18px] bg-zinc-100 shrink-0" />

      {/* Client / project switcher */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => { setOpen(!open); setAddingClient(false); setAddingProjectFor(null); }}
          className="flex items-center gap-2 text-[13px] text-zinc-700 hover:text-zinc-900 transition-colors"
        >
          <span className="font-medium">{currentClient.name}</span>
          <span className="text-zinc-300">·</span>
          <span className="text-zinc-500 font-normal">{currentProject.name}</span>
          <svg
            className={`w-3 h-3 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>

        {open && (
          <div className="absolute top-[calc(100%+8px)] left-0 w-[300px] bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-50">
            <div className="py-1.5 max-h-[400px] overflow-y-auto">
              {clients.map((client) => (
                <div key={client.id}>
                  {/* Company row */}
                  <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-1">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex-1 truncate">
                      {client.name}
                    </p>
                    {clients.length > 1 && (
                      <button
                        onClick={() => removeClient(client.id)}
                        className="text-[10px] text-zinc-300 hover:text-red-400 transition-colors px-1"
                        title="Remove company"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Projects under this company */}
                  {client.projects.map((project) => {
                    const isActive =
                      client.id === currentClient.id && project.id === currentProject.id;
                    return (
                      <div
                        key={project.id}
                        className={`flex items-center gap-2 pl-6 pr-3.5 py-1.5 cursor-pointer hover:bg-zinc-50 group transition-colors ${
                          isActive ? "bg-zinc-50" : ""
                        }`}
                        onClick={() => { switchProject(client.id, project.id); setOpen(false); }}
                      >
                        <span className={`w-1 h-1 rounded-full shrink-0 ${isActive ? "bg-zinc-800" : "bg-zinc-300"}`} />
                        <p className={`text-[13px] flex-1 truncate ${isActive ? "font-medium text-zinc-900" : "text-zinc-600"}`}>
                          {project.name}
                        </p>
                        {isActive && (
                          <svg className="w-3 h-3 text-zinc-400 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                        {!isActive && client.projects.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeProject(client.id, project.id); }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-400 hover:text-red-400 transition-all px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add project row */}
                  {addingProjectFor === client.id ? (
                    <div className="pl-6 pr-3.5 py-2 flex gap-1.5">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Project name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddProject(client.id)}
                        className="flex-1 text-[11px] px-2 py-1 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
                      />
                      <button
                        onClick={() => handleAddProject(client.id)}
                        disabled={!newProjectName.trim()}
                        className="text-[11px] px-2.5 py-1 bg-zinc-900 text-white rounded-md hover:opacity-80 disabled:opacity-40"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setAddingProjectFor(null); setNewProjectName(""); }}
                        className="text-[11px] px-2 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAddingProjectFor(client.id); setAddingClient(false); setNewProjectName(""); }}
                      className="w-full text-left pl-6 pr-3.5 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5"
                    >
                      <span className="text-[12px]">+</span> Add project
                    </button>
                  )}

                  <div className="mx-3.5 my-1.5 border-t border-zinc-100" />
                </div>
              ))}
            </div>

            {/* Add company */}
            <div className="border-t border-zinc-100">
              {addingClient ? (
                <div className="p-3 space-y-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Company name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
                    className="w-full text-[12px] px-2.5 py-1.5 border border-zinc-200 rounded-md outline-none focus:border-zinc-400"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleAddClient}
                      disabled={!newClientName.trim()}
                      className="flex-1 text-[11px] font-medium py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 disabled:opacity-40"
                    >
                      Add company
                    </button>
                    <button
                      onClick={() => { setAddingClient(false); setNewClientName(""); }}
                      className="text-[11px] px-3 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingClient(true); setAddingProjectFor(null); }}
                  className="w-full text-left text-[12px] text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors px-3.5 py-2.5 flex items-center gap-2"
                >
                  <span className="text-[14px] leading-none">+</span>
                  Add company
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          AIRIA connected
        </div>
        <Link
          href="/team"
          className="h-[30px] px-3 border border-zinc-200 rounded-md flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          title="Brians' office"
        >
          <span className="text-[13px]">⬡</span> Brians'
        </Link>
        <button
          onClick={() => setQueryOpen(true)}
          className="h-[30px] px-3 border border-zinc-200 rounded-md flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          title="Ask AI"
        >
          <span className="text-[13px]">✦</span> Ask AI
        </button>
        <button
          onClick={() => setTodoOpen(true)}
          className="h-[30px] px-3 border border-zinc-200 rounded-md flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 transition-colors relative"
          title="To-Do"
        >
          To-Do
          {todoCount > 0 && (
            <span className="w-4 h-4 text-[9px] font-bold bg-zinc-900 text-white rounded-full flex items-center justify-center">
              {todoCount}
            </span>
          )}
        </button>
        <Link
          href="/settings"
          className="w-[30px] h-[30px] border border-zinc-200 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-50 transition-colors text-[15px]"
          title="Settings"
        >
          ⚙
        </Link>
      </div>
      {queryOpen && <GlobalQueryPanel onClose={() => setQueryOpen(false)} />}
      {todoOpen && <ActionItemsPanel onClose={() => setTodoOpen(false)} />}
    </header>
  );
}
