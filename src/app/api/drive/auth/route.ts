import { NextResponse } from "next/server";
import { google } from "googleapis";

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/drive/callback"
  );
}

export async function GET() {
  const url = oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive"],
  });
  return NextResponse.redirect(url);
}
