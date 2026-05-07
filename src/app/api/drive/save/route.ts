import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getDriveAuth } from "../_auth";
import { Readable } from "stream";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

async function markdownToHtml(md: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md);
  return `<!DOCTYPE html><html><body>${String(result)}</body></html>`;
}

export async function POST(req: NextRequest) {
  const driveAuth = getDriveAuth(req);
  if (!driveAuth) return NextResponse.json({ error: "Not connected to Google Drive" }, { status: 401 });

  const { transcript, folderId, fileName } = await req.json() as {
    transcript: string;
    folderId: string;
    fileName?: string;
  };

  if (!transcript) return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
  if (!folderId) return NextResponse.json({ error: "Missing folderId" }, { status: 400 });

  const drive = google.drive({ version: "v3", auth: driveAuth.auth });

  // Strip .md extension — file is saved as a Google Doc (viewable + PDF-exportable in Drive)
  const baseName = (fileName ?? `transcript-${new Date().toISOString().replace(/[:.]/g, "-")}`).replace(/\.md$/, "");
  const html = await markdownToHtml(transcript);
  const stream = Readable.from([html]);

  try {
    const file = await drive.files.create({
      requestBody: {
        name: baseName,
        parents: [folderId],
        mimeType: "application/vnd.google-apps.document",
      },
      media: {
        mimeType: "text/html",
        body: stream,
      },
      fields: "id,name,webViewLink",
      supportsAllDrives: true,
    });

    const res = NextResponse.json({
      id: file.data.id,
      name: file.data.name,
      url: file.data.webViewLink,
    });
    driveAuth.setTokenCookies(res);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[drive/save]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
