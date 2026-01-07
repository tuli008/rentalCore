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
          google_calendar_refresh_token,
          google_calendar_token_expiry,
          google_calendar_connected
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

    if (assignmentError) {
      console.error("[syncCrewAssignmentToGoogleCalendar] Database error:", {
        error: assignmentError,
        eventCrewId,
        tenantId,
      });
      return { success: false, error: `Crew assignment not found: ${assignmentError.message}` };
    }

    if (!assignment) {
      console.error("[syncCrewAssignmentToGoogleCalendar] Assignment not found:", {
        eventCrewId,
        tenantId,
      });
      return { success: false, error: "Crew assignment not found" };
    }

    const crewMember = assignment.crew_members as any;
    const event = assignment.events as any;

    if (!crewMember || !event) {
      return { success: false, error: "Crew member or event not found" };
    }

    // Check if crew member has Google Calendar connected
    if (!crewMember.google_calendar_refresh_token || !crewMember.google_calendar_connected) {
      // Not an error - just not connected
      return { success: true };
    }

    // Determine the date range for the assignment
    const eventStartDate = new Date(event.start_date);
    const eventEndDate = new Date(event.end_date);
    
    // Get the time component from call_time/end_time if provided, otherwise use defaults
    let startHour = 9;
    let startMinute = 0;
    let endHour = 18;
    let endMinute = 0;
    
    if (assignment.call_time) {
      const callTime = new Date(assignment.call_time);
      startHour = callTime.getHours();
      startMinute = callTime.getMinutes();
    }
    
    if (assignment.end_time) {
      const endTime = new Date(assignment.end_time);
      endHour = endTime.getHours();
      endMinute = endTime.getMinutes();
    }

    // Generate dates for each day in the event range
    const eventDates: Date[] = [];
    for (let d = new Date(eventStartDate); d <= eventEndDate; d.setDate(d.getDate() + 1)) {
      eventDates.push(new Date(d));
    }

    const eventTitle = `${assignment.role} - ${event.name}`;
    const eventDescription = `
Event: ${event.name}
Role: ${assignment.role}
Location: ${event.location || "TBD"}

Assigned via Rental Core.
    `.trim();

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // If google_event_id exists, delete old events first
    if (assignment.google_event_id) {
      // Parse comma-separated event IDs or single ID
      const eventIds = assignment.google_event_id.split(',').map(id => id.trim()).filter(id => id);
      
      for (const eventId of eventIds) {
        const deleteResult = await deleteGoogleCalendarEvent(
          crewMember.google_calendar_refresh_token,
          crewMember.google_calendar_token_expiry,
          eventId
        );
        
        if (deleteResult.tokenInvalid) {
          // Token is invalid - mark as disconnected
          await supabase
            .from("crew_members")
            .update({ google_calendar_connected: false })
            .eq("id", crewMember.id)
            .eq("tenant_id", tenantId);
          
          return { success: false, error: "Google Calendar connection expired. Please reconnect." };
        }
      }
    }

    // Create a separate calendar event for each day
    const createdEventIds: string[] = [];
    
    for (const day of eventDates) {
      const dayStart = new Date(day);
      dayStart.setHours(startHour, startMinute, 0, 0);
      
      const dayEnd = new Date(day);
      dayEnd.setHours(endHour, endMinute, 0, 0);

      const calendarEvent = {
        title: eventTitle,
        description: eventDescription,
        location: event.location || undefined,
        startDateTime: dayStart.toISOString(),
        endDateTime: dayEnd.toISOString(),
        timeZone,
      };

      const createResult = await createGoogleCalendarEvent(
        crewMember.google_calendar_refresh_token,
        crewMember.google_calendar_token_expiry,
        calendarEvent
      );

      if (createResult.tokenInvalid) {
        // Token is invalid - mark as disconnected
        await supabase
          .from("crew_members")
          .update({ google_calendar_connected: false })
          .eq("id", crewMember.id)
          .eq("tenant_id", tenantId);
        
        // Delete any events we already created
        for (const eventId of createdEventIds) {
          await deleteGoogleCalendarEvent(
            crewMember.google_calendar_refresh_token,
            crewMember.google_calendar_token_expiry,
            eventId
          );
        }
        
        return { success: false, error: "Google Calendar connection expired. Please reconnect." };
      }

      if (createResult.eventId) {
        createdEventIds.push(createResult.eventId);
      } else {
        console.error(`[syncCrewAssignmentToGoogleCalendar] Failed to create event for ${day.toISOString()}: ${createResult.error}`);
        // Continue creating other events even if one fails
      }
    }

    if (createdEventIds.length > 0) {
      // Store all event IDs as comma-separated string
      const eventIdsString = createdEventIds.join(',');
      
      await supabase
        .from("event_crew")
        .update({ google_event_id: eventIdsString })
        .eq("id", eventCrewId)
        .eq("tenant_id", tenantId);

      return { success: true, eventId: createdEventIds[0] }; // Return first ID for backwards compatibility
    } else {
      return { success: false, error: "Failed to create any calendar events" };
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
          google_calendar_refresh_token,
          google_calendar_token_expiry
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

    // Parse comma-separated event IDs or single ID
    const eventIds = assignment.google_event_id.split(',').map(id => id.trim()).filter(id => id);
    let allDeleted = true;
    let lastError: string | undefined;

    // Delete all calendar events
    for (const eventId of eventIds) {
      const deleteResult = await deleteGoogleCalendarEvent(
        crewMember.google_calendar_refresh_token,
        crewMember.google_calendar_token_expiry,
        eventId
      );

      if (!deleteResult.success) {
        allDeleted = false;
        lastError = deleteResult.error;
        console.warn(`[removeCrewAssignmentFromGoogleCalendar] Failed to delete event ${eventId}: ${deleteResult.error}`);
      }
    }

    // Clear the google_event_id if all deletions succeeded or if token is invalid
    if (allDeleted || eventIds.length === 0) {
      await supabase
        .from("event_crew")
        .update({ google_event_id: null })
        .eq("id", eventCrewId)
        .eq("tenant_id", tenantId);
    }

    return { 
      success: allDeleted, 
      error: lastError 
    };
  } catch (error) {
    console.error("[removeCrewAssignmentFromGoogleCalendar] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove from Google Calendar",
    };
  }
}

