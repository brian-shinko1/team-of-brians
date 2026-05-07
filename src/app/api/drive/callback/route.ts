import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/drive/callback"
  );

  const { tokens } = await oauth2.getToken(code);

  const res = NextResponse.redirect(
    new URL("/settings?drive=connected", req.nextUrl.origin)
  );

  // Store tokens in httpOnly cookies (refresh_token survives restarts)
  if (tokens.access_token) {
    res.cookies.set("drive_access_token", tokens.access_token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days (refresh_token handles renewal)
    });
  }
  if (tokens.refresh_token) {
    res.cookies.set("drive_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return res;
}
