import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password: string };
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_unlocked", "1", {
    httpOnly: false, // readable by client so settings page can check it
    path: "/",
    maxAge: 60 * 60, // 1 hour
    sameSite: "strict",
  });
  return res;
}
