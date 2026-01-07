import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { encryptRefreshToken } from "@/lib/google-calendar-encryption";

const tenantId = "11111111-1111-1111-1111-111111111111";

/**
 * Handles Google OAuth callback and stores refresh token
 * GET /api/google-calendar/callback?code=xxx&state=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      console.error("[google-calendar/callback] OAuth error:", error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/crew?error=oauth_cancelled`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/crew?error=no_code`
      );
    }

    // Get crew_member_id from cookie
    const cookieStore = await cookies();
    const crewMemberId = cookieStore.get("google_calendar_crew_id")?.value || state;

    if (!crewMemberId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/crew?error=no_crew_id`
      );
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/google-calendar/callback`;

    if (!clientId || !clientSecret) {
      console.error("[google-calendar/callback] Google OAuth credentials not configured");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/crew?error=not_configured`
      );
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[google-calendar/callback] Token exchange failed:", errorText);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/crew?error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();

    if (!tokens.refresh_token) {
      console.error("[google-calendar/callback] No refresh token received");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/crew?error=no_refresh_token`
      );
    }

    // Encrypt refresh token before storing
    const encryptedRefreshToken = await encryptRefreshToken(tokens.refresh_token);

    // Calculate token expiry (access tokens typically last 1 hour, but we'll store expiry time)
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + (tokens.expires_in || 3600));

    // Store encrypted refresh token and connection status in database
    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase
      .from("crew_members")
      .update({
        google_calendar_refresh_token: encryptedRefreshToken,
        google_calendar_token_expiry: tokenExpiry.toISOString(),
        google_calendar_connected: true,
      })
      .eq("id", crewMemberId)
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("[google-calendar/callback] Failed to save token:", updateError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/crew?error=save_failed`
      );
    }

    // Clear the cookie
    cookieStore.delete("google_calendar_crew_id");

    // Redirect back to crew page with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/crew?success=calendar_connected`
    );
  } catch (error) {
    console.error("[google-calendar/callback] Unexpected error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/crew?error=unexpected_error`
    );
  }
}

