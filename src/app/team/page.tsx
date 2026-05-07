"use client";

import Link from "next/link";
import { TeamView } from "@/components/TeamView";

export default function TeamPage() {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 mb-5">
        <Link href="/" className="hover:text-zinc-700 transition-colors">Dashboard</Link>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-800">Brians'</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Brians&apos;</h1>
          <p className="text-[12px] text-zinc-400 mt-1">
            Isometric office view · click any agent to open · green dot = has output
          </p>
        </div>
      </div>

      <TeamView />
    </div>
  );
}
