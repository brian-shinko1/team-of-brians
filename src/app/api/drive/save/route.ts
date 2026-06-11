import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getDriveAuth } from "../_auth";
import { Readable } from "stream";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import juice from "juice";
import fs from "fs";
import path from "path";

// ── Inline CSS (Drive ignores <style> blocks — juice converts to inline styles)

const CSS = `
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111111; line-height: 1.55; }

  h1 { font-size: 18pt; font-weight: 700; color: #0f172a; margin: 20pt 0 8pt; }
  h2 { font-size: 13pt; font-weight: 700; color: #1e293b; margin: 16pt 0 6pt; border-bottom: 1pt solid #e2e8f0; padding-bottom: 4pt; }
  h3 { font-size: 11.5pt; font-weight: 700; color: #334155; margin: 12pt 0 4pt; }
  h4 { font-size: 11pt; font-weight: 700; font-style: italic; color: #475569; margin: 10pt 0 3pt; }
  h5, h6 { font-size: 10.5pt; font-weight: 700; color: #64748b; margin: 8pt 0 2pt; }

  p  { margin: 0 0 8pt; }
  ul, ol { margin: 0 0 8pt; padding-left: 20pt; }
  li { margin-bottom: 4pt; }

  table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin: 0 0 12pt; }
  th { background-color: #f1f5f9; font-weight: 700; font-size: 9.5pt; text-align: left;
       padding: 6pt 10pt; border: 1pt solid #cbd5e1; }
  td { padding: 6pt 10pt; border: 1pt solid #e2e8f0; vertical-align: top; }

  pre { background-color: #f8fafc; border-left: 3pt solid #94a3b8; padding: 8pt 12pt;
        font-size: 9.5pt; margin: 0 0 10pt; white-space: pre-wrap; }
  code { font-family: "Courier New", Courier, monospace; font-size: 9.5pt;
         background-color: #f1f5f9; padding: 1pt 3pt; }
  pre code { background-color: transparent; padding: 0; }

  blockquote { border-left: 3pt solid #94a3b8; margin: 0 0 10pt 0;
               padding: 4pt 0 4pt 14pt; color: #475569; font-style: italic; }
  hr { border: none; border-top: 1pt solid #e2e8f0; margin: 16pt 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
`;

function getLogoBase64(): string {
  try {
    const p = path.join(process.cwd(), "public", "shinko-logo.png");
    return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
  } catch { return ""; }
}

async function markdownToInlinedHtml(md: string, title: string): Promise<string> {
  // Normalize line endings, then strip ALL thematic break patterns (---, ***, ___)
  // including when they appear as list-item content (- --- / * --- / + ---)
  const normalized = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const cleaned = normalized.replace(/^[ \t]*(?:[-*+][ \t]+)?(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm, "");

  const body = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(cleaned)
  )
    .replace(/<hr(?:\s[^>]*)?\s*\/?>/gi, "")  // remove any remaining <hr> tags
    .replace(/<li>\s*<\/li>/gi, "")            // remove empty list items
    .replace(/<[uo]l>\s*<\/[uo]l>/gi, "");    // remove empty lists

  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const logo = getLogoBase64();

  const header = `
    <table style="width:100%;border-collapse:collapse;border-bottom:2pt solid #0f172a;margin-bottom:20pt;">
      <tr>
        <td style="padding:0 0 10pt;border:none;vertical-align:bottom;">
          <p style="font-size:22pt;font-weight:700;color:#0f172a;margin:0 0 3pt;font-family:Calibri,Arial,sans-serif;">
            ${title}
          </p>
          <p style="font-size:9.5pt;color:#64748b;margin:0;font-family:Calibri,Arial,sans-serif;">
            Shinko1 &nbsp;·&nbsp; ${date}
          </p>
        </td>
        ${logo ? `
        <td style="padding:0 0 10pt;border:none;text-align:right;vertical-align:bottom;width:100pt;">
          <img src="${logo}" alt="Shinko1" width="80" style="width:80pt;height:auto;" />
        </td>` : ""}
      </tr>
    </table>
  `;

  const raw = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${title}</title><style>${CSS}</style></head>
<body>${header}${body}</body>
</html>`;

  // juice inlines all CSS rules as style="" attributes — the only thing Drive respects
  return juice(raw);
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const driveAuth = getDriveAuth(req);
  if (!driveAuth) return NextResponse.json({ error: "Not connected to Google Drive" }, { status: 401 });

  const { transcript, folderId, fileName, fileId } = await req.json() as {
    transcript: string;
    folderId?: string;
    fileName?: string;
    fileId?: string;
  };

  if (!transcript) return NextResponse.json({ error: "Missing transcript" }, { status: 400 });

  const drive = google.drive({ version: "v3", auth: driveAuth.auth });
  const baseName = (fileName ?? `document-${new Date().toISOString().slice(0, 10)}`).replace(/\.md$/, "");

  try {
    const html = await markdownToInlinedHtml(transcript, baseName);

    let file;

    if (fileId) {
      // Update existing Google Doc in-place
      file = await drive.files.update({
        fileId,
        requestBody: { name: baseName },
        media: { mimeType: "text/html", body: Readable.from([html]) },
        fields: "id,name,webViewLink",
        supportsAllDrives: true,
      });
    } else {
      // Create new Google Doc (Drive auto-converts HTML → Google Doc)
      if (!folderId) return NextResponse.json({ error: "Missing folderId" }, { status: 400 });
      file = await drive.files.create({
        requestBody: {
          name: baseName,
          parents: [folderId],
          mimeType: "application/vnd.google-apps.document",
        },
        media: { mimeType: "text/html", body: Readable.from([html]) },
        fields: "id,name,webViewLink",
        supportsAllDrives: true,
      });
    }

    const res = NextResponse.json({ id: file.data.id, name: file.data.name, url: file.data.webViewLink });
    driveAuth.setTokenCookies(res);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[drive/save]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
