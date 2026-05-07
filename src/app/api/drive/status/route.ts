import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const refreshToken = req.cookies.get("drive_refresh_token")?.value;
  const accessToken = req.cookies.get("drive_access_token")?.value;
  const connected = !!(refreshToken || accessToken);
  return NextResponse.json({ connected });
}
