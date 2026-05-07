import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

const REDIRECT =
  process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/drive/callback";

const COOKIE_OPTS = {
  httpOnly: true,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;

/**
 * Builds an OAuth2 client from request cookies and returns it alongside
 * a `setTokenCookies` helper that writes any refreshed tokens onto a response.
 * Returns null if no tokens are present at all.
 */
export function getDriveAuth(req: NextRequest): {
  auth: InstanceType<typeof google.auth.OAuth2>;
  setTokenCookies: (res: NextResponse) => void;
} | null {
  const accessToken = req.cookies.get("drive_access_token")?.value;
  const refreshToken = req.cookies.get("drive_refresh_token")?.value;

  if (!accessToken && !refreshToken) return null;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT
  );
  oauth2.setCredentials({
    access_token: accessToken ?? "",
    refresh_token: refreshToken,
  });

  // Capture any tokens Google issues during an automatic refresh
  let refreshedAccess: string | null = null;
  let refreshedRefresh: string | null = null;
  oauth2.on("tokens", (tokens) => {
    if (tokens.access_token) refreshedAccess = tokens.access_token;
    if (tokens.refresh_token) refreshedRefresh = tokens.refresh_token;
  });

  function setTokenCookies(res: NextResponse) {
    if (refreshedAccess) res.cookies.set("drive_access_token", refreshedAccess, COOKIE_OPTS);
    if (refreshedRefresh) res.cookies.set("drive_refresh_token", refreshedRefresh, COOKIE_OPTS);
  }

  return { auth: oauth2, setTokenCookies };
}
