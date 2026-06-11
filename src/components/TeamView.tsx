"use client";

import { useState, useEffect, useRef } from "react";
import { useAgents } from "@/context/AgentsContext";
import { AgentModal } from "@/components/AgentModal";
import { MeetingCopilotModal } from "@/components/MeetingCopilotModal";
import { JarvisModal } from "@/components/JarvisModal";
import { INITIAL_AGENTS, NEXT_AGENT, PREVIOUS_AGENT, PROFILE_BYPASS } from "@/lib/agents";

// ── Isometric math ─────────────────────────────────────────────────────────────

const TW = 52;   // half tile width
const TH = 26;   // half tile height (2:1 ratio)
const WH = 28;   // wall face height
const P  = 3;    // px per "pixel" in sprites

function isoPos(col: number, row: number) {
  return { x: (col - row) * TW, y: (col + row) * TH };
}
function diamond(col: number, row: number) {
  const { x, y } = isoPos(col, row);
  return `${x},${y-TH} ${x+TW},${y} ${x},${y+TH} ${x-TW},${y}`;
}
function wallL(col: number, row: number) {
  const { x, y } = isoPos(col, row);
  return `${x-TW},${y} ${x},${y+TH} ${x},${y+TH+WH} ${x-TW},${y+WH}`;
}
function wallR(col: number, row: number) {
  const { x, y } = isoPos(col, row);
  return `${x+TW},${y} ${x},${y+TH} ${x},${y+TH+WH} ${x+TW},${y+WH}`;
}

// ── King Brian ─────────────────────────────────────────────────────────────────

const KING_COL = 3;
const KING_ROW = -1;

// ── Phase rooms ────────────────────────────────────────────────────────────────

const ROOMS = [
  { id: "Plan",         col: 0,  row: 0, w: 6, d: 4, floor: "#dff0df", wL: "#92bb92", wR: "#aad0aa", label: "#3a6b3a" },
  { id: "Design",       col: 7,  row: 0, w: 5, d: 4, floor: "#dde8f8", wL: "#7a9fd0", wR: "#9ab8e4", label: "#243f70" },
  { id: "Architecture", col: 13, row: 0, w: 5, d: 4, floor: "#faeedd", wL: "#c89840", wR: "#dcb458", label: "#704010" },
  { id: "Review",       col: 13, row: 6, w: 5, d: 4, floor: "#d0f4f9", wL: "#4db8cc", wR: "#6acfdf", label: "#0a5a6a" },
  { id: "Eval",         col: 1,  row: 6, w: 5, d: 4, floor: "#fde0e0", wL: "#c86868", wR: "#e08888", label: "#701818" },
  { id: "Build",        col: 8,  row: 6, w: 4, d: 4, floor: "#edddf8", wL: "#9060c0", wR: "#aa80d8", label: "#4a1870" },
];

// ── Agent grid positions ───────────────────────────────────────────────────────

const AGENT_POS: Record<string, [number, number]> = {
  // ── Plan: chain flows left → right across the room ─────────────────────────
  meeting_input:    [1,  2],
  summarise:        [3,  1],
  cps:              [3,  3],
  prd:              [5,  2],
  meeting_copilot:  [5, -1],  // secretary next to Director Brian
  jarvis:           [7, -1],  // Jarvis — tech advisor near Brian's office
  // ── Design: continues from prd, flows right ─────────────────────────────────
  event_storm:      [8,  1],
  principles:       [9,  3],
  domain_model:     [11, 1],
  // ── Architecture: continues right, drops down to Review ─────────────────────
  architecture:     [14, 1],
  spec:             [15, 3],
  agents_md:        [17, 2],
  // ── Review: entry from Architecture right side, chain flows left ─────────────
  security_agent:   [16, 6],
  doc_agent:        [14, 7],
  // ── Build: entry from Review, flows left toward Eval ────────────────────────
  reverse_doc:      [11, 7],
  pm_agent:         [9,  8],
  // ── Eval ─────────────────────────────────────────────────────────────────────
  eval_agent:       [3,  8],
};

// ── Colors ─────────────────────────────────────────────────────────────────────

const SHIRT: Record<string, string> = {
  Plan:         "#34d399",
  Design:       "#60a5fa",
  Architecture: "#f59e0b",
  Review:       "#22d3ee",
  Build:        "#a78bfa",
  Eval:         "#f87171",
};

const DESK_BASE: Record<string, string> = {
  Plan:         "#7aaa7a",
  Design:       "#6a8ec0",
  Architecture: "#b89040",
  Review:       "#0891b2",
  Build:        "#8860b0",
  Eval:         "#a86868",
};

// ── Darken helper ──────────────────────────────────────────────────────────────

function dk(hex: string, pct: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((n >> 16) & 255) - Math.round(255 * pct));
  const g = Math.max(0, ((n >>  8) & 255) - Math.round(255 * pct));
  const b = Math.max(0, ( n        & 255) - Math.round(255 * pct));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ── Pixel character sprite ─────────────────────────────────────────────────────
// 5-wide × 9-tall at P px/pixel, feet at y=0 in local space

type Px = [number, number, string];

interface Outfit {
  shirt: string;
  pants: string;
  shoe:  string;
  hair:  string;
  skin?: string;
  tie?:  string;
  hat?:  Px[];   // overlay pixels (drawn after base; use rows 0,1 to cover hair)
}

// ── Samurai kabuto pixel helpers ──────────────────────────────────────────────

// Shogun kabuto — elaborate wide kuwagata, gold + red crest (Director Brian only)
function shogunKabuto(): Px[] {
  const m = "#1e293b", g = "#f59e0b", r = "#dc2626";
  return [
    [0,1,m],[1,1,m],[2,1,m],[3,1,m],[4,1,m],
    [0,0,m],[1,0,m],[2,0,m],[3,0,m],[4,0,m],
    [0,-1,g],[4,-1,g],
    [0,-2,g],[4,-2,g],
    [0,-3,g],[4,-3,g],
    [2,-1,r],[2,-2,r],[2,-3,r],
  ];
}

// Standard samurai kabuto — metal bowl + neck guard + crest
function kabuto(metal: string, crest: string): Px[] {
  return [
    [0,1,metal],[1,1,metal],[2,1,metal],[3,1,metal],[4,1,metal],
    [0,0,metal],[1,0,metal],[2,0,metal],[3,0,metal],[4,0,metal],
    [1,-1,crest],[3,-1,crest],
    [1,-2,crest],[2,-2,crest],[3,-2,crest],
    [2,-3,crest],
  ];
}

// ── Phase samurai costumes — every Brian in the same phase wears matching armour

// Phase colours (armour base, kabuto metal, kabuto crest)
const PHASE_COSTUME: Record<string, [string, string, string]> = {
  Plan:         ["#3b0764", "#7c3aed", "#f59e0b"],  // deep purple armour, purple kabuto, gold crest
  Design:       ["#052e16", "#16a34a", "#fbbf24"],  // deep green armour, green kabuto, gold crest
  Architecture: ["#431407", "#c2410c", "#fbbf24"],  // deep rust armour, orange kabuto, gold crest
  Review:       ["#083344", "#0891b2", "#e0f2fe"],  // deep cyan armour, cyan kabuto, ice crest
  Build:        ["#172554", "#1d4ed8", "#f8fafc"],  // deep navy armour, blue kabuto, white crest
  Eval:         ["#1c0533", "#9333ea", "#f8fafc"],  // deep violet armour, violet kabuto, white crest
};

function costumeForPhase(phase: string): Outfit {
  const [armour, metal, crest] = PHASE_COSTUME[phase] ?? ["#1e293b", "#475569", "#f59e0b"];
  return {
    shirt: armour,
    pants: armour,
    shoe:  "#0f172a",
    hair:  "#1e293b",
    hat:   kabuto(metal, crest),
  };
}

const COSTUMES: Record<string, Outfit> = Object.fromEntries(
  INITIAL_AGENTS
    .filter(a => a.id !== "jarvis" && a.id !== "meeting_copilot")
    .map(a => [a.id, costumeForPhase(a.phase)])
);

const DEFAULT_OUTFIT: Outfit = { shirt: "#94a3b8", pants: "#334155", shoe: "#0f172a", hair: "#1e293b" };

function basePixels(outfit: Outfit): Px[] {
  const skin = outfit.skin ?? "#fcd34d";
  const { shirt, pants, shoe, hair, tie } = outfit;
  const pixels: Px[] = [
    [0,0,hair],[1,0,hair],[2,0,hair],[3,0,hair],[4,0,hair],
    [0,1,hair],[1,1,hair],[2,1,hair],[3,1,hair],[4,1,hair],
    [0,2,skin],[1,2,skin],[2,2,skin],[3,2,skin],[4,2,skin],
    [0,3,skin],[1,3,hair],[2,3,skin],[3,3,hair],[4,3,skin],
    [0,4,skin],[1,4,skin],[2,4,skin],[3,4,skin],[4,4,skin],
    [0,5,shirt],[1,5,shirt],[2,5,shirt],[3,5,shirt],[4,5,shirt],
    [0,6,shirt],[1,6,shirt],[2,6,shirt],[3,6,shirt],[4,6,shirt],
    [1,7,pants],[2,7,pants],[3,7,pants],
    [1,8,shoe],[3,8,shoe],
  ];
  if (tie) pixels.push([2,5,tie],[2,6,tie]);
  return pixels;
}

function buildSprite(outfit: Outfit): Px[] {
  return [...basePixels(outfit), ...(outfit.hat ?? [])];
}

// ── PixelKatana ────────────────────────────────────────────────────────────────
// Renders a standing katana sword instead of a character sprite

function PixelKatana({ x, y, label, status }: { x: number; y: number; label: string; status: string }) {
  const bladeColor  = "#e2e8f0";
  const edgeColor   = "#f8fafc";
  const tsubaColor  = "#f59e0b";
  const tsubaShine  = "#fbbf24";
  const handleColor = "#292524";
  const wrapColor   = "#78350f";
  const pommelColor = "#374151";

  // slightly diagonal lean: blade tilts ~8deg
  const bx = x + 2;
  const tipY   = y - 48;
  const tsubaY = y - 22;
  const hBot   = y - 2;

  return (
    <g>
      {/* shadow */}
      <ellipse cx={x} cy={y + 2} rx={8} ry={3} fill="rgba(0,0,0,0.18)" />

      {/* blade */}
      <polygon
        points={`${bx - 1},${tsubaY} ${bx + 2},${tsubaY} ${bx},${tipY}`}
        fill={bladeColor}
      />
      {/* edge highlight */}
      <line x1={bx} y1={tsubaY} x2={bx} y2={tipY + 4} stroke={edgeColor} strokeWidth={0.8} opacity={0.7} />

      {/* tsuba (guard) */}
      <ellipse cx={bx} cy={tsubaY} rx={6} ry={2.5} fill={tsubaColor} />
      <ellipse cx={bx} cy={tsubaY - 0.5} rx={6} ry={2} fill={tsubaShine} opacity={0.5} />

      {/* handle */}
      <rect x={bx - 2} y={tsubaY} width={4} height={hBot - tsubaY} rx={1} fill={handleColor} />
      {/* wrap diamonds */}
      {[2, 5, 8, 11, 14].map((i) => (
        <rect key={i} x={bx - 2} y={tsubaY + i} width={4} height={2} fill={wrapColor} opacity={0.7} />
      ))}

      {/* pommel */}
      <ellipse cx={bx} cy={hBot} rx={4} ry={2} fill={pommelColor} />

      {/* status glow on blade */}
      {status === "running" && (
        <line x1={bx} y1={tsubaY} x2={bx} y2={tipY} stroke="#fbbf24" strokeWidth={2} opacity={0.5}>
          <animate attributeName="opacity" values="0.5;0;0.5" dur="1.2s" repeatCount="indefinite" />
        </line>
      )}
      {status === "done" && (
        <line x1={bx} y1={tsubaY} x2={bx} y2={tipY} stroke="#4ade80" strokeWidth={1.5} opacity={0.4} />
      )}

      {/* label */}
      <text x={x} y={y + 14} textAnchor="middle"
        fontSize={7} fontFamily="monospace" fontWeight="700" fill="#92400e" opacity={0.85}>
        {label}
      </text>
    </g>
  );
}

function crownPixels(): Px[] {
  const gold = "#f59e0b", gem1 = "#dc2626", gem2 = "#2563eb";
  return [
    [0,-3,gold],[2,-3,gold],[4,-3,gold],
    [0,-2,gold],[1,-2,gold],[2,-2,gold],[3,-2,gold],[4,-2,gold],
    [0,-1,gold],[1,-1,gem1],[2,-1,gold],[3,-1,gem2],[4,-1,gold],
  ];
}

// bx = -2*P so column 2 sits at x=0 (centred on feet)
const BX = -2 * P;   // = -6
const BY = -9 * P;   // = -27  (feet at y=0, head top at -27, shoes at -3 to 0)

function renderPixels(pixels: Px[]) {
  return pixels.map(([pc, pr, color], i) => (
    <rect key={i} x={BX + pc * P} y={BY + pr * P} width={P} height={P} fill={color} />
  ));
}

// ── PixelChar ──────────────────────────────────────────────────────────────────

function PixelChar({ x, y, agentId, status, delay = 0 }: {
  x: number; y: number; agentId: string; status: string; delay?: number;
}) {
  const outfit = COSTUMES[agentId] ?? DEFAULT_OUTFIT;
  const pixels = buildSprite(outfit);
  const shirt  = outfit.shirt;
  const ch = 9 * P;

  return (
    <g>
      {/* ground shadow — stays fixed */}
      <ellipse cx={x} cy={y + 2} rx={9} ry={3.5} fill="rgba(0,0,0,0.14)" />

      {/* bobbing group */}
      <g>
        {/* SVG SMIL bob animation */}
        <animateTransform
          attributeName="transform" type="translate"
          values={`${x} ${y}; ${x} ${y - 2}; ${x} ${y}`}
          dur={`${2.2 + delay * 0.18}s`}
          begin={`${delay * 0.3}s`}
          repeatCount="indefinite"
        />

        {/* running pulse ring */}
        {status === "running" && (
          <circle cx={0} cy={-ch / 2} r={12} fill="none" stroke={shirt} strokeWidth={1.5} opacity={0.6}>
            <animate attributeName="r"       values="6;18;6"    dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="1.4s" repeatCount="indefinite" />
          </circle>
        )}

        {/* sprite pixels */}
        {renderPixels(pixels)}
      </g>
    </g>
  );
}

// ── PixelKing (King Brian) ─────────────────────────────────────────────────────

function PixelKing({ x, y, allStatuses }: {
  x: number; y: number; allStatuses: string[];
}) {
  const kingOutfit: Outfit = { shirt: "#7f1d1d", pants: "#1e293b", shoe: "#0f172a", hair: "#1e293b", hat: shogunKabuto() };
  const pixels = buildSprite(kingOutfit);
  const ch = 9 * P;

  const anyError   = allStatuses.some(s => s === "error");
  const anyRunning = allStatuses.some(s => s === "running");
  const anyDone    = allStatuses.some(s => s === "done");

  const bubble = anyError
    ? { text: "Fix that!", bg: "#fef2f2", stroke: "#f87171", ink: "#991b1b" }
    : anyRunning
    ? { text: "On it...",  bg: "#faf7ee", stroke: "#d4a853", ink: "#7c4a00" }
    : anyDone
    ? { text: "Excellent!", bg: "#f0fdf4", stroke: "#4ade80", ink: "#15803d" }
    : null;

  const bw = bubble ? Math.max(52, bubble.text.length * 6.5 + 18) : 0;
  const bh = 17;
  const headTopY = y - ch;   // local space: feet=0, so top of head = -ch relative
  // bubble is in world space (outside the bobbing group)
  const bubbleY = y - ch - 6;

  return (
    <g>
      {/* throne glow */}
      <ellipse cx={x} cy={y + 2} rx={14} ry={5} fill="rgba(245,158,11,0.18)" />
      <ellipse cx={x} cy={y + 2} rx={9}  ry={3.5} fill="rgba(0,0,0,0.14)" />

      {/* speech bubble — outside bob so it floats steadily */}
      {bubble && (
        <>
          <rect x={x - bw/2} y={bubbleY - bh} width={bw} height={bh} rx={3.5}
            fill={bubble.bg} stroke={bubble.stroke} strokeWidth={1.5} />
          <polygon
            points={`${x-4},${bubbleY} ${x+4},${bubbleY} ${x},${bubbleY+7}`}
            fill={bubble.bg}
          />
          <line x1={x-4} y1={bubbleY} x2={x}   y2={bubbleY+7} stroke={bubble.stroke} strokeWidth={1.5} />
          <line x1={x+4} y1={bubbleY} x2={x}   y2={bubbleY+7} stroke={bubble.stroke} strokeWidth={1.5} />
          <text x={x} y={bubbleY - bh/2 + 0.5} textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fontFamily="'Courier New', monospace" fontWeight="700" fill={bubble.ink}>
            {bubble.text}
          </text>
        </>
      )}

      {/* bobbing group — slightly more energetic bob */}
      <g>
        <animateTransform
          attributeName="transform" type="translate"
          values={`${x} ${y}; ${x} ${y - 3}; ${x} ${y}`}
          dur="1.8s"
          repeatCount="indefinite"
        />
        {renderPixels(pixels)}
      </g>

      {/* "King Brian" label */}
      <text x={x} y={y + TH + WH + 7} textAnchor="middle"
        fontSize={7.5} fontFamily="monospace" fontWeight="800"
        fill="#f59e0b" opacity={0.85}>
        👑 Shōgun Brian
      </text>
    </g>
  );
}

// ── Isometric desk ─────────────────────────────────────────────────────────────

function Desk({ col, row, phase }: { col: number; row: number; phase: string }) {
  const base = DESK_BASE[phase] ?? "#a08060";
  const { x, y } = isoPos(col, row);
  const dw = TW * 0.62, dh = TH * 0.62, dt = 14;

  const top   = `${x},${y-dh-dt} ${x+dw},${y-dt} ${x},${y+dh-dt} ${x-dw},${y-dt}`;
  const left  = `${x-dw},${y-dt} ${x},${y+dh-dt} ${x},${y+dh} ${x-dw},${y}`;
  const right = `${x+dw},${y-dt} ${x},${y+dh-dt} ${x},${y+dh} ${x+dw},${y}`;

  const mx = x, my = y - dh * 0.1 - dt;

  return (
    <g>
      <polygon points={left}  fill={dk(base, 0.28)} />
      <polygon points={right} fill={dk(base, 0.12)} />
      <polygon points={top}   fill={base} stroke="rgba(0,0,0,0.07)" strokeWidth={0.5} />
      <rect x={mx-7} y={my-14} width={14} height={11} rx={1.5}
        fill="none" stroke="#475569" strokeWidth={1.2} />
      <rect x={mx-6} y={my-13} width={12} height={9}  rx={1} fill="#0f172a" />
      <rect x={mx-5} y={my-12} width={10} height={7}  rx={0.5} fill="#1e3a5f" opacity={0.6} />
      <rect x={mx-1} y={my-3}  width={2}  height={3}  fill="#64748b" />
    </g>
  );
}

// ── Throne desk (King Brian) ───────────────────────────────────────────────────

function ThroneDeskAt({ col, row }: { col: number; row: number }) {
  const base = "#8b6914";
  const { x, y } = isoPos(col, row);
  const dw = TW * 0.78, dh = TH * 0.78, dt = 18;

  const top   = `${x},${y-dh-dt} ${x+dw},${y-dt} ${x},${y+dh-dt} ${x-dw},${y-dt}`;
  const left  = `${x-dw},${y-dt} ${x},${y+dh-dt} ${x},${y+dh} ${x-dw},${y}`;
  const right = `${x+dw},${y-dt} ${x},${y+dh-dt} ${x},${y+dh} ${x+dw},${y}`;
  const gold  = "#d4a830";

  return (
    <g>
      <polygon points={left}  fill={dk(base, 0.22)} />
      <polygon points={right} fill={dk(base, 0.08)} />
      <polygon points={top}   fill={gold} stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      {/* crown motif on desk top */}
      <circle cx={x} cy={y - dh * 0.4 - dt} r={4} fill="#f59e0b" opacity={0.8} />
    </g>
  );
}

// ── Status speech bubble ───────────────────────────────────────────────────────

function Bubble({ x, feetY, status }: { x: number; feetY: number; status: string }) {
  if (status === "idle") return null;

  const cfg: Record<string, { text: string; bg: string; stroke: string; ink: string }> = {
    running: { text: "working", bg: "#fffbeb", stroke: "#fbbf24", ink: "#92400e" },
    done:    { text: "✓ ready", bg: "#f0fdf4", stroke: "#4ade80", ink: "#15803d" },
    error:   { text: "Boss!", bg: "#fef2f2", stroke: "#f87171", ink: "#991b1b" },
  };
  const c = cfg[status];
  if (!c) return null;

  const bw = Math.max(46, c.text.length * 6 + 18), bh = 17;
  const headTopY = feetY - 9 * P;
  const by = headTopY - bh - 8;

  return (
    <g>
      <rect x={x - bw/2} y={by} width={bw} height={bh} rx={3.5}
        fill={c.bg} stroke={c.stroke} strokeWidth={1.5} />
      <polygon points={`${x-4},${by+bh} ${x+4},${by+bh} ${x},${by+bh+6}`} fill={c.bg} />
      <line x1={x-4} y1={by+bh} x2={x} y2={by+bh+6} stroke={c.stroke} strokeWidth={1.5} />
      <line x1={x+4} y1={by+bh} x2={x} y2={by+bh+6} stroke={c.stroke} strokeWidth={1.5} />
      <text x={x} y={by + bh/2 + 0.5} textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fontFamily="'Courier New', monospace" fontWeight="700" fill={c.ink}>
        {status === "running" ? (
          <>
            <tspan>·<animate attributeName="opacity" values="0;1;0" dur="1s" begin="0s"    repeatCount="indefinite" /></tspan>
            <tspan>·<animate attributeName="opacity" values="0;1;0" dur="1s" begin="0.33s" repeatCount="indefinite" /></tspan>
            <tspan>·<animate attributeName="opacity" values="0;1;0" dur="1s" begin="0.66s" repeatCount="indefinite" /></tspan>
          </>
        ) : c.text}
      </text>
    </g>
  );
}

// ── Flying paper delivery ──────────────────────────────────────────────────────

interface Delivery { id: string; fromX: number; fromY: number; toX: number; toY: number }

function DeliveryPaper({ fromX, fromY, toX, toY }: Omit<Delivery, "id">) {
  const midX = (fromX + toX) / 2;
  const midY = Math.min(fromY, toY) - 55;
  const path = `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`;

  return (
    <g>
      {/* paper sheet */}
      <rect x={-4} y={-6} width={8} height={10} rx={0.5} fill="white" stroke="#94a3b8" strokeWidth={1} />
      <line x1={-2} y1={-3} x2={2} y2={-3} stroke="#cbd5e1" strokeWidth={0.7} />
      <line x1={-2} y1={0}  x2={2} y2={0}  stroke="#cbd5e1" strokeWidth={0.7} />
      <line x1={-2} y1={3}  x2={2} y2={3}  stroke="#cbd5e1" strokeWidth={0.7} />
      {/* animate along arc */}
      <animateMotion path={path} dur="1.5s" fill="freeze" />
    </g>
  );
}

// ── Corridor tiles ─────────────────────────────────────────────────────────────

const CORRIDOR_TILES: Array<[number, number]> = [
  [6,0],[6,1],[6,2],[6,3],
  [12,0],[12,1],[12,2],[12,3],
  ...Array.from({ length: 18 }, (_,i): [number,number] => [i, 4]),
  ...Array.from({ length: 18 }, (_,i): [number,number] => [i, 5]),
  [7,6],[7,7],[7,8],[7,9],
  [0,6],[0,7],[0,8],[0,9],
  [12,6],[12,7],[12,8],[12,9],  // between Eval and Review
];

// ── Pipeline RailLine ──────────────────────────────────────────────────────────
// Cherry blossom petals drifting along an ink-brush trail between samurai

// Each petal: two overlapping ellipses rotated to form a teardrop shape
function Petal({ angle, dur, begin }: { angle: number; dur: number; begin: number }) {
  return (
    <g transform={`rotate(${angle})`}>
      <ellipse cx="0" cy="-1.2" rx="2.1" ry="4" fill="#fda4af">
        <animate attributeName="opacity"
          values="0;0.9;0.85;0"
          keyTimes="0;0.12;0.82;1"
          dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="0.6" cy="-2" rx="1.1" ry="2.4" fill="#fecdd3" opacity="0.65" />
      {/* centre vein */}
      <line x1="0" y1="0" x2="0" y2="-3.5" stroke="#f9a8d4" strokeWidth="0.4" opacity="0.5" />
    </g>
  );
}

function RailLine({ fromId, toId, isBypassed }: { fromId: string; toId: string; isBypassed: boolean }) {
  const from = isoPos(AGENT_POS[fromId][0], AGENT_POS[fromId][1]);
  const to   = isoPos(AGENT_POS[toId][0],   AGENT_POS[toId][1]);
  const fx = from.x, fy = from.y - 2;
  const tx = to.x,   ty = to.y   - 2;
  const dx = tx - fx, dy = ty - fy;
  const rawLen = Math.sqrt(dx * dx + dy * dy);
  if (rawLen < 1) return null;
  const nx = dx / rawLen, ny = dy / rawLen;

  const gap = 22;
  const sx = fx + nx * gap, sy = fy + ny * gap;
  const ex = tx - nx * gap, ey = ty - ny * gap;

  // Slight breeze curve — control point offset perpendicularly so petals
  // arc gently rather than travel in a dead straight line
  const cpx = (sx + ex) / 2 + (-ny) * 14;
  const cpy = (sy + ey) / 2 + ( nx) * 14;
  const pathD = `M ${sx},${sy} Q ${cpx},${cpy} ${ex},${ey}`;

  const numPetals = 5;
  const dur       = 2.2;
  const angles    = [0, 28, -18, 42, -8];

  return (
    <g opacity={isBypassed ? 0.07 : 1}>
      {/* Ink-brush trail */}
      <path d={pathD}
        fill="none" stroke="#1e293b" strokeWidth={0.7}
        strokeDasharray="3 8" opacity={0.15} />
      {/* Drifting petals */}
      {Array.from({ length: numPetals }, (_, i) => {
        const begin = (i / numPetals) * dur;
        return (
          <g key={i}>
            <Petal angle={angles[i]} dur={dur} begin={begin} />
            <animateMotion path={pathD}
              dur={`${dur}s`} begin={`${begin}s`}
              repeatCount="indefinite" rotate="auto-reverse" />
          </g>
        );
      })}
    </g>
  );
}

// ── TeamView ───────────────────────────────────────────────────────────────────

export function TeamView() {
  const { agents, settings } = useAgents();
  const bypass = PROFILE_BYPASS[settings.pipelineProfile ?? "standard"];
  const [modalId,    setModalId]    = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const prevStatusRef = useRef<Record<string, string>>({});

  // Detect agent status changes → spawn flying paper deliveries
  useEffect(() => {
    const newOnes: Delivery[] = [];

    INITIAL_AGENTS.forEach((a) => {
      const prev    = prevStatusRef.current[a.id] ?? "idle";
      const current = agents[a.id]?.status ?? "idle";

      if (current === "running" && prev !== "running") {
        const srcId = PREVIOUS_AGENT[a.id];
        if (srcId && AGENT_POS[srcId] && AGENT_POS[a.id]) {
          const src  = isoPos(AGENT_POS[srcId][0], AGENT_POS[srcId][1]);
          const dest = isoPos(AGENT_POS[a.id][0],  AGENT_POS[a.id][1]);
          newOnes.push({
            id:    `${a.id}-${Date.now()}`,
            fromX: src.x,  fromY: src.y  - 20,
            toX:   dest.x, toY:   dest.y - 20,
          });
        }
      }

      prevStatusRef.current[a.id] = current;
    });

    if (newOnes.length > 0) {
      setDeliveries(prev => [...prev, ...newOnes]);
      newOnes.forEach(d => {
        setTimeout(() => setDeliveries(prev => prev.filter(x => x.id !== d.id)), 1800);
      });
    }
  }, [agents]);

  // SVG layout
  // leftmost iso x: col=0,row=9 → (0-9)*52=-468, edge=-468-52=-520
  const ox   = 520 + 60;   // = 580
  const oy   = 110;        // extra top margin for King Brian above row 0

  // rightmost: col=17,row=0 → 884, +52 edge = 936 → svgW = 936+ox+60
  // bottom: deepest desk at (17,9) for Review → (17+9)*26=676, +26+WH+40 → svgH
  const svgW = 936 + ox + 60;
  const svgH = 700 + oy + 90;

  // Painter's order: sort by depth (col+row), back-to-front
  const agentObjects = INITIAL_AGENTS
    .filter(a => AGENT_POS[a.id])
    .map(a => ({
      ...a,
      col:    AGENT_POS[a.id][0],
      row:    AGENT_POS[a.id][1],
      depth:  AGENT_POS[a.id][0] + AGENT_POS[a.id][1],
      status: agents[a.id]?.status ?? "idle",
    }))
    .sort((a, b) => a.depth - b.depth);

  const allStatuses = INITIAL_AGENTS.map(a => agents[a.id]?.status ?? "idle");

  const kingPos = isoPos(KING_COL, KING_ROW);
  const KING_DEPTH = KING_COL + KING_ROW;  // = 2

  return (
    <>
      <div className="w-full overflow-auto rounded-xl border border-zinc-200 bg-[#f8f7f4]">
        <svg width={svgW} height={svgH} style={{ display: "block", minWidth: svgW }}>
          <g transform={`translate(${ox},${oy})`}>

            {/* ── Throne tile (King Brian's platform) ── */}
            <polygon
              points={diamond(KING_COL, KING_ROW)}
              fill="#fef3c7"
              stroke="#d4a830"
              strokeWidth={1.2}
            />
            {/* extra glow ring */}
            <polygon
              points={diamond(KING_COL, KING_ROW)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={2}
              opacity={0.35}
            />

            {/* ── Corridor tiles ── */}
            {CORRIDOR_TILES.map(([col, row]) => (
              <polygon key={`c-${col}-${row}`}
                points={diamond(col, row)}
                fill="#f1f0ed" stroke="rgba(0,0,0,0.04)" strokeWidth={0.5} />
            ))}

            {/* ── Room floors ── */}
            {ROOMS.flatMap(room =>
              Array.from({ length: room.d }, (_, dr) =>
                Array.from({ length: room.w }, (_, dc) => {
                  const col = room.col + dc, row = room.row + dr;
                  return (
                    <polygon key={`f-${col}-${row}`}
                      points={diamond(col, row)}
                      fill={room.floor} stroke="rgba(0,0,0,0.05)" strokeWidth={0.5} />
                  );
                })
              ).flat()
            )}

            {/* ── Pipeline rail lines ── */}
            {Object.entries(NEXT_AGENT).map(([fromId, toId]) => {
              if (!AGENT_POS[fromId] || !AGENT_POS[toId]) return null;
              return (
                <RailLine key={`rail-${fromId}-${toId}`}
                  fromId={fromId} toId={toId}
                  isBypassed={bypass.has(fromId) || bypass.has(toId)}
                />
              );
            })}

            {/* ── Profile bypass jump rails — active shortcut connections ── */}
            {bypass.size > 0 && (() => {
              const seen = new Set<string>();
              return Object.keys(AGENT_POS)
                .filter(fromId => !bypass.has(fromId) && NEXT_AGENT[fromId] && bypass.has(NEXT_AGENT[fromId]))
                .map(fromId => {
                  let dest = NEXT_AGENT[fromId];
                  while (dest && bypass.has(dest)) dest = NEXT_AGENT[dest];
                  const key = `${fromId}-${dest}`;
                  if (!dest || !AGENT_POS[dest] || seen.has(key)) return null;
                  seen.add(key);
                  return <RailLine key={`jump-${key}`} fromId={fromId} toId={dest} isBypassed={false} />;
                });
            })()}

            {/* ── SW walls (left column) ── */}
            {ROOMS.flatMap(room =>
              Array.from({ length: room.d }, (_, dr) => {
                const col = room.col, row = room.row + dr;
                return (
                  <polygon key={`wl-${col}-${row}`}
                    points={wallL(col, row)}
                    fill={room.wL} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
                );
              })
            )}

            {/* ── SE walls (bottom row) ── */}
            {ROOMS.flatMap(room =>
              Array.from({ length: room.w }, (_, dc) => {
                const col = room.col + dc, row = room.row + room.d - 1;
                return (
                  <polygon key={`wr-${col}-${row}`}
                    points={wallR(col, row)}
                    fill={room.wR} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
                );
              })
            )}

            {/* ── Room labels ── */}
            {ROOMS.map(room => {
              const { x, y } = isoPos(room.col + room.w / 2 - 0.5, room.row);
              return (
                <text key={`lbl-${room.id}`}
                  x={x} y={y - TH - 14}
                  textAnchor="middle" fontSize={8} fontWeight="800" letterSpacing="2.5"
                  fill={room.label} opacity={0.5}>
                  {room.id.toUpperCase()}
                </text>
              );
            })}

            {/* ── King Brian — rendered at his depth slot ── */}
            {(() => {
              const kFeetY = kingPos.y - 18;   // throne desk is taller
              return (
                <g
                  key="king-brian"
                  style={{ cursor: "default" }}
                >
                  <ThroneDeskAt col={KING_COL} row={KING_ROW} />
                  <PixelKing x={kingPos.x} y={kFeetY} allStatuses={allStatuses} />
                </g>
              );
            })()}

            {/* ── Agent desks + characters (painter's order) ── */}
            {agentObjects.map((agent, idx) => {
              const { x, y } = isoPos(agent.col, agent.row);
              const feetY    = y - 14;
              const nameY    = feetY + 18;
              const hasOutput = !!agents[agent.id]?.output;

              const shortName = agent.name
                .replace(" Agent", "")
                .replace(" Input", "");

              // Render King Brian inline at his depth slot
              const renderedKing = idx === 0 && KING_DEPTH <= agent.depth ? null : null;
              void renderedKing;

              const isKatana = agent.id === "jarvis" || agent.id === "meeting_copilot";
              const isBypassed = bypass.has(agent.id);

              return (
                <g key={agent.id}
                   onClick={() => setModalId(agent.id)}
                   style={{
                     cursor: "pointer",
                     opacity: isBypassed ? 0.25 : 1,
                     filter: isBypassed ? "grayscale(1)" : undefined,
                   }}>
                  {!isKatana && <Desk col={agent.col} row={agent.row} phase={agent.phase} />}
                  {isKatana
                    ? <PixelKatana x={x} y={feetY} label={shortName} status={agent.status} />
                    : <PixelChar x={x} y={feetY} agentId={agent.id} status={agent.status} delay={idx} />
                  }
                  {!isKatana && <Bubble x={x} feetY={feetY} status={agent.status} />}

                  {/* invisible hit area */}
                  <ellipse cx={x} cy={feetY - 14} rx={16} ry={22} fill="transparent" />

                  {/* name — katanas render their own label */}
                  {!isKatana && (
                    <text x={x} y={nameY}
                      textAnchor="middle" fontSize={8} fontFamily="monospace" fontWeight="700"
                      fill="#0f172a">
                      {shortName}
                    </text>
                  )}

                  {/* output dot */}
                  {hasOutput && (
                    <circle cx={x + 9} cy={feetY - 9 * P - 2} r={3} fill="#4ade80" />
                  )}
                </g>
              );
            })}

            {/* ── Flying paper deliveries ── */}
            {deliveries.map(d => (
              <DeliveryPaper key={d.id}
                fromX={d.fromX} fromY={d.fromY}
                toX={d.toX}     toY={d.toY} />
            ))}

          </g>
        </svg>
      </div>

      <JarvisModal open={modalId === "jarvis"} onClose={() => setModalId(null)} />
      {modalId === "meeting_copilot" ? (
        <MeetingCopilotModal open onClose={() => setModalId(null)} />
      ) : modalId !== "jarvis" ? (
        <AgentModal agentId={modalId} onClose={() => setModalId(null)} />
      ) : null}
    </>
  );
}
