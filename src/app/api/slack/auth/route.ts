import { NextResponse } from "next/server";

const REDIRECT =
  process.env.SLACK_REDIRECT_URI ?? "http://localhost:3000/api/slack/callback";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID ?? "",
    scope: "chat:write",
    redirect_uri: REDIRECT,
  });
  return NextResponse.redirect(
    `https://slack.com/oauth/v2/authorize?${params}`
  );
}
