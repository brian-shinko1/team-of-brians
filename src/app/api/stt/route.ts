import { NextRequest, NextResponse } from "next/server";
import { fetch as undiciFetch, Agent } from "undici";

// xAI can take >5 min for long recordings — bypass Next.js's patched fetch with undici directly
const xaiAgent = new Agent({ headersTimeout: 30 * 60 * 1000, bodyTimeout: 30 * 60 * 1000 });

export async function POST(req: NextRequest) {
  console.log("[STT] request received");

  const apiKey =
    req.headers.get("x-xai-key") ||
    process.env.XAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing xAI API key. Set XAI_API_KEY in .env.local or provide it in Settings." },
      { status: 401 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
    console.log("[STT] formData parsed");
  } catch (e) {
    console.error("[STT] formData parse error:", e);
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  console.log("[STT] audio field:", audio instanceof Blob ? `Blob ${audio.size} bytes` : audio);
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio field" }, { status: 400 });
  }

  try {
    // Build multipart body manually — avoids undici/FormData boundary mismatch
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    const boundary = `----xAIBoundary${Date.now()}`;
    const crlf = "\r\n";
    const mimeType = audio.type || "audio/mpeg";

    const bodyBuffer = Buffer.concat([
      Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="format"${crlf}${crlf}` +
        `true${crlf}` +
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="language"${crlf}${crlf}` +
        `en${crlf}` +
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="file"; filename="audio.m4a"${crlf}` +
        `Content-Type: ${mimeType}${crlf}${crlf}`
      ),
      audioBuffer,
      Buffer.from(`${crlf}--${boundary}--${crlf}`),
    ]);

    console.log("[STT] sending to xAI...");
    const res = await undiciFetch("https://api.x.ai/v1/stt", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
      dispatcher: xaiAgent,
    });

    const rawText = await res.text();
    console.log("[STT] status:", res.status, "body:", rawText.slice(0, 500));

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { errMsg = JSON.parse(rawText)?.error?.message ?? JSON.parse(rawText)?.error ?? errMsg; } catch {}
      throw new Error(errMsg);
    }

    const data = JSON.parse(rawText);
    const transcript = data.text ?? data.transcript ?? JSON.stringify(data);
    return NextResponse.json({ transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error ? (err as NodeJS.ErrnoException & { cause?: unknown }).cause : undefined;
    console.error("[STT] xAI error:", message, cause ? JSON.stringify(cause) : "");
    return NextResponse.json({ error: `xAI STT error: ${message}` }, { status: 500 });
  }
}
