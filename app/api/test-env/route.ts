import { NextResponse } from "next/server";

/**
 * Temporary test route to verify environment variables are loaded
 * DELETE THIS FILE after debugging
 */
export async function GET() {
  return NextResponse.json({
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    googleClientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : "NOT SET",
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasGoogleRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "NOT SET",
    hasGoogleEncryptionKey: !!process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY,
    hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || "NOT SET",
  }, { status: 200 });
}

