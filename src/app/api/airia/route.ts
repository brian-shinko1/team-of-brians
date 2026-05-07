import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes — matches Vercel Pro limit

// ── Format 1: AIRIA SSE streaming ───────────────────────────────────────────
// asyncOutput:true returns standard SSE: "event: X\ndata: {JSON}\n\n"
// The model output is split across ModelStreamFragment events with Index+Content.
// We collect, sort, and concatenate them to reconstruct the full output.

function extractFromAiriaStream(text: string): string | null {
  const fragments: Array<{ index: number; content: string }> = [];

  // Split into SSE events (separated by blank lines)
  const events = text.split(/\r?\n\r?\n/);

  for (const event of events) {
    const lines = event.split(/\r?\n/);
    let dataLine = "";
    for (const line of lines) {
      if (line.startsWith("data:")) {
        dataLine = line.slice(5).trim();
        break;
      }
    }
    if (!dataLine) continue;

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(dataLine);
    } catch {
      continue;
    }

    if (msg.MessageType !== "ModelStreamFragment") continue;

    const index = typeof msg.Index === "number" ? msg.Index : fragments.length;
    const content = typeof msg.Content === "string" ? msg.Content : "";
    fragments.push({ index, content });
  }

  if (fragments.length === 0) return null;

  fragments.sort((a, b) => a.index - b.index);
  const assembled = fragments.map((f) => f.content).join("");

  // Strip ```json code fence if present
  const stripped = assembled
    .replace(/^```json\r?\n?/, "")
    .replace(/^```\r?\n?/, "")
    .replace(/\r?\n?```$/, "")
    .trim();

  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first !== -1 && last !== -1) {
    const candidate = stripped.slice(first, last + 1).trim();
    try {
      JSON.parse(candidate);
      return candidate; // Valid JSON object — return the extracted slice
    } catch {
      // Not valid JSON (e.g. markdown with {} notation) — return the full text
    }
  }

  return stripped || null;
}

// ── Format 2: AIRIA synchronous JSON ────────────────────────────────────────
// asyncOutput:false returns a JSON array of step results.
// Content lives in [0].Value, possibly inside a markdown code fence.

function extractFromAiriaJson(data: unknown): string {
  if (Array.isArray(data) && data.length > 0) {
    const items = data as Record<string, unknown>[];
    const modelItems = items.filter(
      (item) => item["$type"] === "model" || item.StepType === "AIOperation"
    );
    const candidates = modelItems.length > 0 ? modelItems : items;

    for (let i = candidates.length - 1; i >= 0; i--) {
      const value = candidates[i].Value;

      // Value is already a parsed object (modelStructured) — serialize it
      if (value !== null && typeof value === "object") {
        return JSON.stringify(value);
      }

      if (typeof value !== "string" || !value.trim()) continue;

      // Try to extract a JSON object if the value contains one
      const first = value.indexOf("{");
      const last = value.lastIndexOf("}");
      if (first !== -1 && last !== -1) {
        const candidate = value.slice(first, last + 1).trim();
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          // Not valid JSON — fall through and return value as-is
        }
      }

      // Value is plain text / markdown — return directly
      return value;
    }
  }
  const d = data as Record<string, unknown>;
  return (d.output ?? d.result ?? d.text ?? JSON.stringify(data, null, 2)) as string;
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-airia-key") || process.env.AIRIA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing AIRIA API key. Set AIRIA_API_KEY in .env.local or provide it in Settings." },
      { status: 401 }
    );
  }

  const { pipelineId, userInput, baseUrl } = (await req.json()) as {
    pipelineId: string;
    userInput: string;
    baseUrl?: string;
  };

  const base = (
    baseUrl ?? process.env.AIRIA_BASE_URL ?? "https://prodaus.api.airia.ai"
  ).replace(/\/$/, "");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 290_000);

  let res: Response;
  try {
    res = await fetch(`${base}/v2/PipelineExecution/${pipelineId}`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ userInput, asyncOutput: true }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg =
      err instanceof Error && err.name === "AbortError"
        ? "AIRIA pipeline timed out after 290s"
        : `Failed to reach AIRIA: ${err}`;
    return NextResponse.json({ error: msg }, { status: 504 });
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    return NextResponse.json(
      { error: `AIRIA error ${res.status}: ${text}` },
      { status: res.status }
    );
  }

  const rawText = await res.text();

  // Try streaming text format first (asyncOutput:true)
  const streamOutput = extractFromAiriaStream(rawText);
  if (streamOutput) {
    return NextResponse.json({ output: streamOutput });
  }

  // Fall back to JSON format (asyncOutput:false or sync response)
  try {
    const data = JSON.parse(rawText);
    return NextResponse.json({ output: extractFromAiriaJson(data) });
  } catch {
    return NextResponse.json(
      { error: `Unrecognised AIRIA response format: ${rawText.slice(0, 200)}` },
      { status: 502 }
    );
  }
}
