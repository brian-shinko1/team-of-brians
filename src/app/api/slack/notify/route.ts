import { NextRequest, NextResponse } from "next/server";

async function postMessage(accessToken: string, channel: string, text: string) {
  return fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ channel, text }),
  });
}

export async function POST(req: NextRequest) {
  const accessToken = process.env.SLACK_BOT_TOKEN;
  const defaultChannel = process.env.SLACK_CHANNEL ?? "#to-do";

  if (!accessToken) {
    return NextResponse.json({ error: "SLACK_BOT_TOKEN not set" }, { status: 401 });
  }

  const { text, channel } = await req.json();
  const res = await postMessage(accessToken, channel || defaultChannel, text);
  const data = await res.json();

  if (!data.ok) {
    return NextResponse.json({ error: data.error ?? "Slack error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
