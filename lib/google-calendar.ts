/**
 * Google Calendar API integration utilities
 * Handles OAuth tokens, creating/updating/deleting calendar events
 */

import "server-only";

import { decryptRefreshToken } from "./google-calendar-encryption";

interface GoogleCalendarEvent {
  summary: string;
  description: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

/**
 * Get a valid access token using a refresh token
 * Automatically decrypts the refresh token and handles token refresh
 */
export async function getGoogleAccessToken(
  encryptedRefreshToken: string,
  tokenExpiry?: string | null
): Promise<{ accessToken: string | null; newExpiry: Date | null; error?: string }> {
  try {
    // Decrypt the refresh token
    const refreshToken = await decryptRefreshToken(encryptedRefreshToken);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("[getGoogleAccessToken] Google OAuth credentials not configured");
      return { accessToken: null, newExpiry: null, error: "OAuth not configured" };
    }

    // Check if token is still valid (if expiry is provided)
    if (tokenExpiry) {
      const expiryDate = new Date(tokenExpiry);
      const now = new Date();
      // If token expires in more than 5 minutes, we could cache it
      // But for simplicity, we'll always refresh to ensure we have a valid token
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[getGoogleAccessToken] Failed to refresh token:", errorText);
      
      // Check if it's an invalid_grant error (token revoked/expired)
      if (errorText.includes("invalid_grant")) {
        return {
          accessToken: null,
          newExpiry: null,
          error: "TOKEN_INVALID", // Special error code for handling
        };
      }
      
      return { accessToken: null, newExpiry: null, error: "Failed to refresh token" };
    }

    const data = await response.json();
    
    // Calculate new expiry time
    const newExpiry = new Date();
    newExpiry.setSeconds(newExpiry.getSeconds() + (data.expires_in || 3600));

    return {
      accessToken: data.access_token,
      newExpiry,
    };
  } catch (error) {
    console.error("[getGoogleAccessToken] Error:", error);
    return {
      accessToken: null,
      newExpiry: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a calendar event in the crew member's Google Calendar
 */
export async function createGoogleCalendarEvent(
  encryptedRefreshToken: string,
  tokenExpiry: string | null | undefined,
  event: {
    title: string;
    description: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    timeZone?: string;
  }
): Promise<{ eventId: string | null; error?: string; tokenInvalid?: boolean; newExpiry?: Date | null }> {
  try {
    const tokenResult = await getGoogleAccessToken(encryptedRefreshToken, tokenExpiry);
    if (!tokenResult.accessToken) {
      return {
        eventId: null,
        error: tokenResult.error || "Failed to get access token",
        tokenInvalid: tokenResult.error === "TOKEN_INVALID",
      };
    }
    
    const accessToken = tokenResult.accessToken;

    const timeZone = event.timeZone || "UTC";
    const calendarEvent: GoogleCalendarEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startDateTime,
        timeZone,
      },
      end: {
        dateTime: event.endDateTime,
        timeZone,
      },
    };

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(calendarEvent),
    });

    if (!response.ok) {
      let error: any;
      try {
        error = await response.json();
      } catch {
        error = { error: { message: await response.text() } };
      }
      console.error("[createGoogleCalendarEvent] Failed to create event:", error);
      return { eventId: null, error: error.error?.message || "Failed to create calendar event" };
    }

    const createdEvent = await response.json();
    return { 
      eventId: createdEvent.id,
      newExpiry: tokenResult.newExpiry || null,
    };
  } catch (error) {
    console.error("[createGoogleCalendarEvent] Error:", error);
    return {
      eventId: null,
      error: error instanceof Error ? error.message : "Failed to create calendar event",
    };
  }
}

/**
 * Update an existing calendar event
 */
export async function updateGoogleCalendarEvent(
  encryptedRefreshToken: string,
  tokenExpiry: string | null | undefined,
  eventId: string,
  event: {
    title?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
  }
): Promise<{ success: boolean; error?: string; tokenInvalid?: boolean }> {
  try {
    const tokenResult = await getGoogleAccessToken(encryptedRefreshToken, tokenExpiry);
    if (!tokenResult.accessToken) {
      return {
        success: false,
        error: tokenResult.error || "Failed to get access token",
        tokenInvalid: tokenResult.error === "TOKEN_INVALID",
      };
    }
    
    const accessToken = tokenResult.accessToken;

    // First, get the existing event to merge updates
    const getResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!getResponse.ok) {
      return { success: false, error: "Event not found" };
    }

    const existingEvent = await getResponse.json();
    const timeZone = event.timeZone || existingEvent.start.timeZone || "UTC";

    // Merge updates
    const updatedEvent: Partial<GoogleCalendarEvent> = {
      summary: event.title ?? existingEvent.summary,
      description: event.description ?? existingEvent.description,
      location: event.location ?? existingEvent.location,
      start: {
        dateTime: event.startDateTime ?? existingEvent.start.dateTime,
        timeZone,
      },
      end: {
        dateTime: event.endDateTime ?? existingEvent.end.dateTime,
        timeZone,
      },
    };

    const updateResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedEvent),
      }
    );

    if (!updateResponse.ok) {
      let error: any;
      try {
        error = await updateResponse.json();
      } catch {
        error = { error: { message: await updateResponse.text() } };
      }
      console.error("[updateGoogleCalendarEvent] Failed to update event:", error);
      return { success: false, error: error.error?.message || "Failed to update calendar event" };
    }

    return { success: true };
  } catch (error) {
    console.error("[updateGoogleCalendarEvent] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update calendar event",
    };
  }
}

/**
 * Delete a calendar event
 */
export async function deleteGoogleCalendarEvent(
  encryptedRefreshToken: string,
  tokenExpiry: string | null | undefined,
  eventId: string
): Promise<{ success: boolean; error?: string; tokenInvalid?: boolean }> {
  try {
    const tokenResult = await getGoogleAccessToken(encryptedRefreshToken, tokenExpiry);
    if (!tokenResult.accessToken) {
      return {
        success: false,
        error: tokenResult.error || "Failed to get access token",
        tokenInvalid: tokenResult.error === "TOKEN_INVALID",
      };
    }
    
    const accessToken = tokenResult.accessToken;

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      // 404 is okay - event might already be deleted
      let error: any;
      try {
        error = await response.json();
      } catch {
        error = { error: { message: await response.text() } };
      }
      console.error("[deleteGoogleCalendarEvent] Failed to delete event:", error);
      return { success: false, error: error.error?.message || "Failed to delete calendar event" };
    }

    return { success: true };
  } catch (error) {
    console.error("[deleteGoogleCalendarEvent] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete calendar event",
    };
  }
}

