"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAgents } from "@/context/AgentsContext";
import { PROFILE_ACTIVE_PHASES } from "@/lib/agents";

const phases = [
  { href: "/plan", label: "Plan", num: "01", color: "#5C4EE5" },
  { href: "/design", label: "Design", num: "02", color: "#0F6E56" },
  { href: "/architecture", label: "Architecture", num: "03", color: "#9B3D1E" },
  { href: "/review", label: "Review", num: "04", color: "#0891B2" },
  { href: "/build", label: "Build", num: "05", color: "#1A56DB" },
  { href: "/eval", label: "Eval", num: "06", color: "#6B21A8" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { settings } = useAgents();
  const activePhases = PROFILE_ACTIVE_PHASES[settings.pipelineProfile ?? "standard"];

  return (
    <aside className="fixed top-[52px] left-0 bottom-0 w-[216px] bg-white border-r border-zinc-100 px-2.5 py-3.5 overflow-y-auto z-40 flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase px-2 mb-1">
        Overview
      </p>

      <NavItem href="/" active={pathname === "/" || pathname === "/overview"}>
        <GridIcon />
        All Agents
        <span className="ml-auto text-[10px] text-zinc-400">12</span>
      </NavItem>

      <NavItem href="/outputs" active={pathname === "/outputs"}>
        <LinesIcon />
        Output Feed
      </NavItem>

      <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase px-2 mt-4 mb-1">
        Phases
      </p>

      {phases.map((p) => {
        const isActive = activePhases.has(p.label);
        return (
          <NavItem key={p.href} href={p.href} active={pathname === p.href}>
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-opacity"
              style={{ background: isActive ? p.color : "#d4d4d8" }}
            />
            <span className={isActive ? "" : "text-zinc-400"}>{p.label}</span>
            {isActive ? (
              <span
                className="ml-auto text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border"
                style={{ color: p.color, borderColor: p.color }}
              >
                {p.num}
              </span>
            ) : (
              <span className="ml-auto text-[9px] text-zinc-300 font-medium">skip</span>
            )}
          </NavItem>
        );
      })}

      <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase px-2 mt-6 mb-1">
        System
      </p>

      <NavItem href="/settings" active={pathname === "/settings"}>
        <GearIcon />
        Settings
      </NavItem>
    </aside>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors select-none",
        active
          ? "bg-zinc-100 text-zinc-900 font-medium"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
      )}
    >
      {children}
    </Link>
  );
}

function GridIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="1" y="1" width="6" height="6" rx="1.2" />
      <rect x="9" y="1" width="6" height="6" rx="1.2" />
      <rect x="1" y="9" width="6" height="6" rx="1.2" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" />
    </svg>
  );
}

function LinesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 4h12M2 8h9M2 12h7" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1" />
    </svg>
  );
}
