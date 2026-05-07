import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("slack_access_token")?.value;
  return NextResponse.json({ connected: !!token });
}
