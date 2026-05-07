import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getDriveAuth } from "../_auth";

export async function GET(req: NextRequest) {
  const driveAuth = getDriveAuth(req);
  if (!driveAuth) return NextResponse.json({ error: "Not connected to Google Drive" }, { status: 401 });

  const drive = google.drive({ version: "v3", auth: driveAuth.auth });

  const data = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id,name)",
    orderBy: "name",
    pageSize: 100,
  });

  const res = NextResponse.json({ folders: data.data.files ?? [] });
  driveAuth.setTokenCookies(res);
  return res;
}
