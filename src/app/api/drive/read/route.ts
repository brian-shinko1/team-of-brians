import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getDriveAuth } from "../_auth";

export async function GET(req: NextRequest) {
  const driveAuth = getDriveAuth(req);
  if (!driveAuth) return NextResponse.json({ error: "Not connected to Google Drive" }, { status: 401 });

  const folderId = req.nextUrl.searchParams.get("folderId");
  if (!folderId) return NextResponse.json({ error: "Missing folderId" }, { status: 400 });

  const drive = google.drive({ version: "v3", auth: driveAuth.auth });

  // List readable files in the folder
  const list = await drive.files.list({
    q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name,mimeType)",
    orderBy: "createdTime",
    pageSize: 20,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const files = list.data.files ?? [];
  if (files.length === 0) return NextResponse.json({ context: "" });

  // Download plain text files; export Google Docs as plain text
  const contents: string[] = [];

  for (const file of files) {
    try {
      let text = "";

      if (file.mimeType === "application/vnd.google-apps.document") {
        const res = await drive.files.export(
          { fileId: file.id!, mimeType: "text/plain" },
          { responseType: "text" }
        );
        text = res.data as string;
      } else if (
        file.mimeType === "text/plain" ||
        file.mimeType === "text/markdown" ||
        file.mimeType?.startsWith("text/")
      ) {
        const res = await drive.files.get(
          { fileId: file.id!, alt: "media" },
          { responseType: "text" }
        );
        text = res.data as string;
      } else {
        // unsupported type — skip
        continue;
      }

      if (text.trim()) {
        contents.push(`--- ${file.name} ---\n${text.trim()}`);
      }
    } catch {
      // skip files that fail to download
      continue;
    }
  }

  const res = NextResponse.json({ context: contents.join("\n\n") });
  driveAuth.setTokenCookies(res);
  return res;
}
