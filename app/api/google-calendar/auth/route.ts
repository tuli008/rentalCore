import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Initiates Google OAuth flow for Google Calendar
 * GET /api/google-calendar/auth?crew_member_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[google-calendar/auth] Route hit");
    const searchParams = request.nextUrl.searchParams;
    const crewMemberId = searchParams.get("crew_member_id");
    
    console.log("[google-calendar/auth] crew_member_id:", crewMemberId);

    if (!crewMemberId) {
      console.error("[google-calendar/auth] No crew_member_id provided");
      return NextResponse.json({ error: "crew_member_id is required" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/google-calendar/callback`;
    
    console.log("[google-calendar/auth] clientId exists:", !!clientId);
    console.log("[google-calendar/auth] redirectUri:", redirectUri);

    if (!clientId) {
      console.error("[google-calendar/auth] GOOGLE_CLIENT_ID not configured");
      // Redirect to crew page with error message
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${baseUrl}/crew?error=not_configured&message=${encodeURIComponent("Google Calendar integration is not configured. Please set GOOGLE_CLIENT_ID in environment variables.")}`
      );
    }

    // Store crew_member_id in a cookie so we can retrieve it in the callback
    const cookieStore = await cookies();
    cookieStore.set("google_calendar_crew_id", crewMemberId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    // Build OAuth URL with proper scopes
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    // Use calendar.events scope (more restrictive, better security)
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
    authUrl.searchParams.set("access_type", "offline"); // Required for refresh token
    authUrl.searchParams.set("prompt", "consent"); // Force consent to get refresh token (needed for refresh token)
    authUrl.searchParams.set("state", crewMemberId); // Additional security

    console.log("[google-calendar/auth] Redirecting to Google OAuth:", authUrl.toString().substring(0, 100) + "...");
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("[google-calendar/auth] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}

