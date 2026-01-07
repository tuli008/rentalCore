"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/google-calendar";

const tenantId = "11111111-1111-1111-1111-111111111111";

/**
 * Sync a crew assignment to Google Calendar
 * Creates or updates the calendar event if the crew member has connected their Google Calendar
 */
export async function syncCrewAssignmentToGoogleCalendar(
  eventCrewId: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get crew assignment with all needed data
    const { data: assignment, error: assignmentError } = await supabase
      .from("event_crew")
      .select(
        `
        id,
        google_event_id,
        role,
        call_time,
        end_time,
        crew_member_id,
        crew_members:crew_member_id (
          id,
          name,
          email,
          google_calendar_refresh_token
        ),
        events:event_id (
          id,
          name,
          start_date,
          end_date,
          location
        )
      `
      )
      .eq("id", eventCrewId)
      .eq("tenant_id", tenantId)
      .single();

    if (assignmentError || !assignment) {
      return { success: false, error: "Crew assignment not found" };
    }

    const crewMember = assignment.crew_members as any;
    const event = assignment.events as any;

    if (!crewMember || !event) {
      return { success: false, error: "Crew member or event not found" };
    }

    // Check if crew member has Google Calendar connected
    if (!crewMember.google_calendar_refresh_token) {
      // Not an error - just not connected
      return { success: true };
    }

    // Prepare event details
    const startDateTime = assignment.call_time || event.start_date;
    const endDateTime = assignment.end_time || event.end_date;

    // Format as ISO 8601 for Google Calendar
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    // If only date is provided (no time), use start of day for start and end of day for end
    if (!assignment.call_time) {
      startDate.setHours(9, 0, 0, 0); // Default to 9 AM
    }
    if (!assignment.end_time) {
      endDate.setHours(18, 0, 0, 0); // Default to 6 PM
    }

    const eventTitle = `${assignment.role} - ${event.name}`;
    const eventDescription = `
Event: ${event.name}
Role: ${assignment.role}
Location: ${event.location || "TBD"}

Assigned via Rental Core.
    `.trim();

    const calendarEvent = {
      title: eventTitle,
      description: eventDescription,
      location: event.location || undefined,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // If google_event_id exists, update the event; otherwise create new
    if (assignment.google_event_id) {
      const updateResult = await updateGoogleCalendarEvent(
        crewMember.google_calendar_refresh_token,
        assignment.google_event_id,
        calendarEvent
      );

      if (updateResult.success) {
        return { success: true, eventId: assignment.google_event_id };
      } else {
        // If update fails, try creating a new event
        console.warn(
          `[syncCrewAssignmentToGoogleCalendar] Update failed, creating new event: ${updateResult.error}`
        );
      }
    }

    // Create new calendar event
    const createResult = await createGoogleCalendarEvent(
      crewMember.google_calendar_refresh_token,
      calendarEvent
    );

    if (createResult.eventId) {
      // Update the event_crew record with the google_event_id
      await supabase
        .from("event_crew")
        .update({ google_event_id: createResult.eventId })
        .eq("id", eventCrewId)
        .eq("tenant_id", tenantId);

      return { success: true, eventId: createResult.eventId };
    } else {
      return { success: false, error: createResult.error || "Failed to create calendar event" };
    }
  } catch (error) {
    console.error("[syncCrewAssignmentToGoogleCalendar] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync to Google Calendar",
    };
  }
}

/**
 * Remove a crew assignment from Google Calendar
 */
export async function removeCrewAssignmentFromGoogleCalendar(
  eventCrewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get crew assignment with google_event_id
    const { data: assignment, error: assignmentError } = await supabase
      .from("event_crew")
      .select(
        `
        id,
        google_event_id,
        crew_members:crew_member_id (
          google_calendar_refresh_token
        )
      `
      )
      .eq("id", eventCrewId)
      .eq("tenant_id", tenantId)
      .single();

    if (assignmentError || !assignment) {
      return { success: false, error: "Crew assignment not found" };
    }

    if (!assignment.google_event_id) {
      // No calendar event to delete
      return { success: true };
    }

    const crewMember = assignment.crew_members as any;
    if (!crewMember?.google_calendar_refresh_token) {
      // No token, but clear the google_event_id anyway
      await supabase
        .from("event_crew")
        .update({ google_event_id: null })
        .eq("id", eventCrewId)
        .eq("tenant_id", tenantId);
      return { success: true };
    }

    // Delete the calendar event
    const deleteResult = await deleteGoogleCalendarEvent(
      crewMember.google_calendar_refresh_token,
      assignment.google_event_id
    );

    if (deleteResult.success) {
      // Clear the google_event_id
      await supabase
        .from("event_crew")
        .update({ google_event_id: null })
        .eq("id", eventCrewId)
        .eq("tenant_id", tenantId);
    }

    return deleteResult;
  } catch (error) {
    console.error("[removeCrewAssignmentFromGoogleCalendar] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove from Google Calendar",
    };
  }
}

