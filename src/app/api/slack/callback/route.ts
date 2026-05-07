import { NextRequest, NextResponse } from "next/server";

const REDIRECT =
  process.env.SLACK_REDIRECT_URI ?? "http://localhost:3000/api/slack/callback";

const COOKIE_OPTS = {
  httpOnly: true,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID ?? "",
      client_secret: process.env.SLACK_CLIENT_SECRET ?? "",
      code,
      redirect_uri: REDIRECT,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    return NextResponse.redirect(
      new URL("/settings?slack=error", req.nextUrl.origin)
    );
  }

  const response = NextResponse.redirect(
    new URL("/settings?slack=connected", req.nextUrl.origin)
  );

  // Bot token
  if (data.access_token) {
    response.cookies.set("slack_access_token", data.access_token, COOKIE_OPTS);
  }
  // Bot ID for posting as the bot
  if (data.bot_user_id) {
    response.cookies.set("slack_bot_user_id", data.bot_user_id, COOKIE_OPTS);
  }

  return response;
}
