"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth";

const tenantId = "11111111-1111-1111-1111-111111111111";

export type RateType = "hourly" | "daily" | "weekly" | "monthly";

export interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  contact: string | null;
  role: "Own Crew" | "Freelancer";
  technician_type: string | null; // Primary technician specialty (e.g., "Lighting Technician")
  rate_type: RateType | null; // Rate calculation basis (hourly, daily, weekly, monthly)
  base_rate: number | null; // Base rate amount (depends on rate_type)
  google_calendar_refresh_token: string | null; // OAuth refresh token for Google Calendar sync (encrypted)
  google_calendar_token_expiry: string | null; // Access token expiry timestamp
  google_calendar_connected: boolean; // Connection status flag
  on_leave: boolean;
  leave_start_date: string | null;
  leave_end_date: string | null;
  leave_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all crew members
 */
export async function getCrewMembers(): Promise<CrewMember[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("crew_members")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      // Check if table doesn't exist (common error codes: 42P01, PGRST116)
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn(
          "[getCrewMembers] Table 'crew_members' does not exist. Please run the migration first.",
        );
        return [];
      }
      console.error("[getCrewMembers] Error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[getCrewMembers] Unexpected error:", error);
    return [];
  }
}

/**
 * Create a new crew member
 */
export async function createCrewMember(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  // Require admin access
  try {
    await requireAdmin();
  } catch (error) {
    return { error: "Unauthorized: Admin access required" };
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const contact = String(formData.get("contact") || "").trim() || null;
  const role = String(formData.get("role") || "").trim() as "Own Crew" | "Freelancer";
  const technicianType = String(formData.get("technician_type") || "").trim() || null;
  const rateType = String(formData.get("rate_type") || "").trim() || null;
  const baseRateStr = String(formData.get("base_rate") || "").trim();
  const baseRate = baseRateStr ? parseFloat(baseRateStr) : null;

  if (!name) {
    return { error: "Name is required" };
  }

  if (!role || (role !== "Own Crew" && role !== "Freelancer")) {
    return { error: "Role must be either Own Crew or Freelancer" };
  }

  // Validate email format if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email format" };
  }

  // Validate rate type and base rate
  if (rateType && !["hourly", "daily", "weekly", "monthly"].includes(rateType)) {
    return { error: "Invalid rate type. Must be hourly, daily, weekly, or monthly" };
  }

  if (rateType && (!baseRate || baseRate <= 0)) {
    return { error: "Base rate is required and must be greater than 0 when rate type is provided" };
  }

  if (!rateType && baseRate) {
    return { error: "Rate type is required when base rate is provided" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error: insertError } = await supabase.from("crew_members").insert({
      name,
      email,
      contact,
      role,
      technician_type: technicianType,
      rate_type: rateType as RateType | null,
      base_rate: baseRate,
      tenant_id: tenantId,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        // Unique constraint violation
        return { error: "A crew member with this email already exists" };
      }
      console.error("[createCrewMember] Error:", {
        name,
        email,
        contact,
        role,
        error: insertError.message,
      });
      return { error: "Failed to create crew member" };
    }

    revalidatePath("/crew");
    return { success: true };
  } catch (error) {
    console.error("[createCrewMember] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Update a crew member
 */
export async function updateCrewMember(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const contact = String(formData.get("contact") || "").trim() || null;
  const role = String(formData.get("role") || "").trim() as "Own Crew" | "Freelancer";
  const technicianType = String(formData.get("technician_type") || "").trim() || null;
  const rateType = String(formData.get("rate_type") || "").trim() || null;
  const baseRateStr = String(formData.get("base_rate") || "").trim();
  const baseRate = baseRateStr ? parseFloat(baseRateStr) : null;

  if (!id) {
    return { error: "Crew member ID is required" };
  }

  if (!name) {
    return { error: "Name is required" };
  }

  if (!role || (role !== "Own Crew" && role !== "Freelancer")) {
    return { error: "Role must be either Own Crew or Freelancer" };
  }

  // Validate email format if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email format" };
  }

  // Validate rate type and base rate
  if (rateType && !["hourly", "daily", "weekly", "monthly"].includes(rateType)) {
    return { error: "Invalid rate type. Must be hourly, daily, weekly, or monthly" };
  }

  if (rateType && (!baseRate || baseRate <= 0)) {
    return { error: "Base rate is required and must be greater than 0 when rate type is provided" };
  }

  if (!rateType && baseRate) {
    return { error: "Rate type is required when base rate is provided" };
  }

  // Require admin access
  try {
    await requireAdmin();
  } catch (error) {
    return { error: "Unauthorized: Admin access required" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase
      .from("crew_members")
      .update({
        name,
        email,
        contact,
        role,
        technician_type: technicianType,
        rate_type: rateType as RateType | null,
        base_rate: baseRate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (updateError) {
      if (updateError.code === "23505") {
        return { error: "A crew member with this email already exists" };
      }
      console.error("[updateCrewMember] Error:", {
        id,
        name,
        email,
        contact,
        role,
        error: updateError.message,
      });
      return { error: "Failed to update crew member" };
    }

    revalidatePath("/crew");
    return { success: true };
  } catch (error) {
    console.error("[updateCrewMember] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Update crew member leave status
 */
export async function updateCrewLeaveStatus(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  // Require admin access
  try {
    await requireAdmin();
  } catch (error) {
    return { error: "Unauthorized: Admin access required" };
  }
  const id = String(formData.get("id") || "");
  const onLeave = formData.get("on_leave") === "true" || formData.get("on_leave") === "on";
  const leaveStartDate = String(formData.get("leave_start_date") || "").trim() || null;
  const leaveEndDate = String(formData.get("leave_end_date") || "").trim() || null;
  const leaveReason = String(formData.get("leave_reason") || "").trim() || null;

  if (!id) {
    return { error: "Crew member ID is required" };
  }

  // Validate leave dates if on leave
  if (onLeave) {
    if (!leaveStartDate || !leaveEndDate) {
      return { error: "Leave start date and end date are required when marking on leave" };
    }
    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    if (end < start) {
      return { error: "Leave end date must be after start date" };
    }
  }

  try {
    const supabase = await createServerSupabaseClient();
    const updateData: any = {
      on_leave: onLeave,
      leave_start_date: onLeave ? leaveStartDate : null,
      leave_end_date: onLeave ? leaveEndDate : null,
      leave_reason: onLeave ? leaveReason : null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("crew_members")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("[updateCrewLeaveStatus] Error:", {
        id,
        onLeave,
        error: updateError.message,
      });
      return { error: "Failed to update leave status" };
    }

    revalidatePath("/crew");
    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    console.error("[updateCrewLeaveStatus] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get calendar data for a crew member (busy dates from assignments)
 */
export async function getCrewMemberCalendarData(
  crewMemberId: string,
  excludeEventId?: string,
  includeCurrentEvent: boolean = false,
): Promise<{
  busyDates: Array<{ 
    start: string; 
    end: string; 
    eventName: string;
    callTime: string | null;
    endTime: string | null;
  }>;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const tenantId = "11111111-1111-1111-1111-111111111111";

    let query = supabase
      .from("event_crew")
      .select(`
        event_id,
        call_time,
        end_time,
        events:event_id (
          id,
          name,
          start_date,
          end_date
        )
      `)
      .eq("crew_member_id", crewMemberId)
      .eq("tenant_id", tenantId)
      .order("call_time", { ascending: true, nullsFirst: true });

    // Only exclude current event if explicitly requested (for availability checks)
    // For calendar display, we want to show all assignments including current event
    if (excludeEventId && !includeCurrentEvent) {
      query = query.neq("event_id", excludeEventId);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error("[getCrewMemberCalendarData] Error:", error);
      return { busyDates: [] };
    }

    const busyDates = (assignments || [])
      .filter((a: any) => a.events) // Must have event data
      .map((a: any) => {
        const event = a.events;
        // Use call_time/end_time if available, otherwise fall back to event dates
        const startDate = a.call_time || event.start_date;
        const endDate = a.end_time || event.end_date;
        
        return {
          start: startDate,
          end: endDate,
          eventName: event.name || "Unknown Event",
          callTime: a.call_time || null,
          endTime: a.end_time || null,
        };
      })
      .filter((dateRange) => dateRange.start && dateRange.end); // Filter out any that still don't have dates

    console.log(`[getCrewMemberCalendarData] Found ${busyDates.length} busy date ranges for crew member ${crewMemberId}:`, busyDates);

    return { busyDates };
  } catch (error) {
    console.error("[getCrewMemberCalendarData] Unexpected error:", error);
    return { busyDates: [] };
  }
}

/**
 * Delete a crew member
 */
export async function deleteCrewMember(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  // Require admin access
  try {
    await requireAdmin();
  } catch (error) {
    return { error: "Unauthorized: Admin access required" };
  }
  const id = String(formData.get("id") || "");

  if (!id) {
    return { error: "Crew member ID is required" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error: deleteError } = await supabase
      .from("crew_members")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (deleteError) {
      console.error("[deleteCrewMember] Error:", {
        id,
        error: deleteError.message,
      });
      return { error: "Failed to delete crew member" };
    }

    revalidatePath("/crew");
    return { success: true };
  } catch (error) {
    console.error("[deleteCrewMember] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Disconnect Google Calendar for a crew member
 */
export async function disconnectGoogleCalendar(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  // Require admin access
  try {
    await requireAdmin();
  } catch (error) {
    return { error: "Unauthorized: Admin access required" };
  }

  const id = String(formData.get("id") || "");

  if (!id) {
    return { error: "Crew member ID is required" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase
      .from("crew_members")
      .update({
        google_calendar_refresh_token: null,
        google_calendar_token_expiry: null,
        google_calendar_connected: false,
      })
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("[disconnectGoogleCalendar] Error:", updateError);
      return { error: "Failed to disconnect Google Calendar" };
    }

    revalidatePath("/crew");
    return { success: true };
  } catch (error) {
    console.error("[disconnectGoogleCalendar] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

