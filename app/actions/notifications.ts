"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface CrewAssignmentNotification {
  crewMemberId: string;
  crewMemberName: string;
  crewMemberEmail: string | null;
  crewMemberPhone: string | null;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocation: string;
  role: string;
  callTime: string | null;
  endTime: string | null;
  hourlyRate: number | null;
}

/**
 * Send notification to crew member when assigned to event
 */
export async function notifyCrewAssignment(
  notification: CrewAssignmentNotification
): Promise<{ success: boolean; error?: string }> {
  try {
    // Format dates
    const startDate = new Date(notification.eventStartDate);
    const endDate = new Date(notification.eventEndDate);
    const formattedStartDate = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedEndDate = endDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format times if available
    const callTimeStr = notification.callTime
      ? new Date(notification.callTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "TBD";
    const endTimeStr = notification.endTime
      ? new Date(notification.endTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "TBD";

    const rateStr = notification.hourlyRate
      ? `$${notification.hourlyRate.toFixed(2)}/hr`
      : "TBD";

    // Prepare email content
    const emailSubject = `Event Assignment: ${notification.eventName}`;
    
    // Create a nicely formatted HTML email body
    const emailBodyHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; border-radius: 4px; }
    .label { font-weight: bold; color: #6b7280; font-size: 0.9em; text-transform: uppercase; }
    .value { font-size: 1.1em; color: #111827; margin-top: 5px; }
    .highlight { color: #2563eb; font-weight: bold; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 0.9em; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">Event Assignment Notification</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${notification.crewMemberName}</strong>,</p>
      
      <p>You have been assigned to the following event:</p>
      
      <div class="info-box">
        <div class="label">Event Name</div>
        <div class="value highlight">${notification.eventName}</div>
      </div>
      
      <div class="info-box">
        <div class="label">Venue / Location</div>
        <div class="value">${notification.eventLocation || "TBD"}</div>
      </div>
      
      <div class="info-box">
        <div class="label">Date</div>
        <div class="value">${formattedStartDate}${formattedStartDate !== formattedEndDate ? ` - ${formattedEndDate}` : ''}</div>
      </div>
      
      <div class="info-box">
        <div class="label">Your Role</div>
        <div class="value">${notification.role}</div>
      </div>
      
      <div class="info-box">
        <div class="label">Call Time</div>
        <div class="value">${callTimeStr}</div>
      </div>
      
      <div class="info-box">
        <div class="label">End Time</div>
        <div class="value">${endTimeStr}</div>
      </div>
      
      <div class="info-box">
        <div class="label">Rate</div>
        <div class="value">${rateStr}</div>
      </div>
      
      <p style="margin-top: 20px;">Please confirm your availability and contact us if you have any questions.</p>
      
      <div class="footer">
        <p>Thank you for being part of our team!</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    // Also create a plain text version for fallback
    const emailBodyPlain = `
Hello ${notification.crewMemberName},

You have been assigned to the following event:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENT ASSIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Event Name: ${notification.eventName}
Venue/Location: ${notification.eventLocation || "TBD"}
Date: ${formattedStartDate}${formattedStartDate !== formattedEndDate ? ` - ${formattedEndDate}` : ''}
Your Role: ${notification.role}
Call Time: ${callTimeStr}
End Time: ${endTimeStr}
Rate: ${rateStr}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please confirm your availability and contact us if you have any questions.

Thank you for being part of our team!
    `.trim();
    
    // Use HTML version for email
    const emailBody = emailBodyHTML;

    // Prepare SMS content (shorter)
    const smsBody = `Event Assignment: ${notification.eventName}\nRole: ${notification.role}\nDates: ${formattedStartDate} - ${formattedEndDate}\nLocation: ${notification.eventLocation}\nCall: ${callTimeStr}`;

    // Send notification via API route
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          email: notification.crewMemberEmail,
          phone: notification.crewMemberPhone,
          emailSubject,
          emailBody,
          smsBody,
        }),
      });
    } catch (fetchError) {
      console.error("[notifyCrewAssignment] Fetch error:", fetchError);
      return {
        success: false,
        error: `Failed to connect to notification service: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
      };
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type") || '';
    if (!contentType.includes("application/json")) {
      const text = await response.text().catch(() => 'Could not read response text');
      console.error("[notifyCrewAssignment] Non-JSON response:", {
        status: response.status,
        statusText: response.statusText,
        contentType,
        url: response.url,
        preview: typeof text === 'string' ? text.substring(0, 500) : 'Could not read response',
      });
      
      // Try to parse as JSON anyway (sometimes Content-Type is wrong)
      try {
        const jsonData = JSON.parse(text);
        console.log("[notifyCrewAssignment] Response was actually JSON despite Content-Type");
        if (!response.ok) {
          return { success: false, error: jsonData.error || "Failed to send notification" };
        }
        return { success: jsonData.success || true };
      } catch {
        // Not JSON, return error
        return { 
          success: false, 
          error: `Server returned non-JSON response (status: ${response.status}, type: ${contentType}). Check server console for details.` 
        };
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("[notifyCrewAssignment] Error sending notification:", error);
      return { success: false, error: error.error || "Failed to send notification" };
    }

    const result = await response.json();
    return { success: result.success || true };
  } catch (error) {
    console.error("[notifyCrewAssignment] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send notification",
    };
  }
}

/**
 * Send notification for a specific crew assignment
 */
export async function sendCrewNotification(
  eventCrewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const tenantId = "11111111-1111-1111-1111-111111111111";

    // Get crew assignment with crew member and event details
    const { data: assignment, error: assignmentError } = await supabase
      .from("event_crew")
      .select(
        `
        id,
        role,
        call_time,
        end_time,
        hourly_rate,
        crew_member_id,
        event_id,
        crew_members:crew_member_id (
          id,
          name,
          email,
          contact
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

    if (!crewMember.email && !crewMember.contact) {
      return {
        success: false,
        error: "Crew member has no email or phone number",
      };
    }

    // Send notification
    return await notifyCrewAssignment({
      crewMemberId: crewMember.id,
      crewMemberName: crewMember.name,
      crewMemberEmail: crewMember.email,
      crewMemberPhone: crewMember.contact,
      eventName: event.name,
      eventStartDate: event.start_date,
      eventEndDate: event.end_date,
      eventLocation: event.location || "TBD",
      role: assignment.role,
      callTime: assignment.call_time,
      endTime: assignment.end_time,
      hourlyRate: assignment.hourly_rate,
    });
  } catch (error) {
    console.error("[sendCrewNotification] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send notification",
    };
  }
}
