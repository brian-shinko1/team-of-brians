import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getDriveAuth } from "../_auth";
import { Readable } from "stream";

export async function POST(req: NextRequest) {
  const driveAuth = getDriveAuth(req);
  if (!driveAuth) return NextResponse.json({ error: "Not connected to Google Drive" }, { status: 401 });

  const { content, folderId, fileId } = (await req.json()) as {
    content: string;
    folderId?: string;
    fileId?: string;
  };

  if (!content) return NextResponse.json({ error: "Missing content" }, { status: 400 });

  const drive = google.drive({ version: "v3", auth: driveAuth.auth });
  const fileName = "engagement-record";

  try {
    let file;

    if (fileId) {
      // Update existing file in-place
      file = await drive.files.update({
        fileId,
        requestBody: { name: fileName },
        media: { mimeType: "text/plain", body: Readable.from([content]) },
        fields: "id,name,webViewLink",
        supportsAllDrives: true,
      });
    } else {
      if (!folderId) return NextResponse.json({ error: "Missing folderId" }, { status: 400 });
      file = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
          mimeType: "text/plain",
        },
        media: { mimeType: "text/plain", body: Readable.from([content]) },
        fields: "id,name,webViewLink",
        supportsAllDrives: true,
      });
    }

    const res = NextResponse.json({
      id: file.data.id,
      name: file.data.name,
      url: file.data.webViewLink,
    });
    driveAuth.setTokenCookies(res);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[drive/engagement]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
