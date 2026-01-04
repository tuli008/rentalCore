"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

const tenantId = "11111111-1111-1111-1111-111111111111";

export interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  status: "draft" | "confirmed" | "in_progress" | "completed" | "cancelled";
  quote_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventInventory {
  id: string;
  event_id: string;
  item_id: string;
  quantity: number;
  unit_price_snapshot: number;
  notes: string | null;
  item_name?: string; // Joined from inventory_items
}

export interface EventCrew {
  id: string;
  event_id: string;
  crew_member_id: string;
  role: string;
  call_time: string | null;
  end_time: string | null;
  hourly_rate: number | null;
  notes: string | null;
  crew_member_name?: string; // Joined from crew_members
  crew_member_email?: string;
  crew_member_contact?: string;
}

export interface EventTask {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  assigned_to_crew_id: string | null;
  due_time: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  updated_at: string;
}

export interface CrewAvailability {
  available: boolean;
  status: "available" | "conflict" | "partial" | "unavailable";
  conflict?: {
    event_id: string;
    event_name: string;
    call_time: string;
    end_time: string;
  };
  partial?: {
    available_after?: string;
    available_until?: string;
    reason?: string;
  };
  unavailable?: {
    reason?: string;
  };
}

/**
 * Get all events
 */
export async function getEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("[getEvents] Error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[getEvents] Unexpected error:", error);
    return [];
  }
}

/**
 * Copy quote items to event inventory
 */
async function copyQuoteItemsToEvent(eventId: string, quoteId: string): Promise<boolean> {
  try {
    // Check if items already exist
    const { data: existingItems } = await supabase
      .from("event_inventory")
      .select("id")
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .limit(1);

    if (existingItems && existingItems.length > 0) {
      // Items already exist, don't copy again
      return true;
    }

    // Fetch all quote items
    const { data: quoteItems, error: quoteItemsError } = await supabase
      .from("quote_items")
      .select("item_id, quantity, unit_price_snapshot")
      .eq("quote_id", quoteId);

    if (quoteItemsError) {
      console.error("[copyQuoteItemsToEvent] Error fetching quote items:", quoteItemsError);
      return false;
    }

    if (!quoteItems || quoteItems.length === 0) {
      console.log("[copyQuoteItemsToEvent] No quote items to copy");
      return true; // Not an error, just no items
    }

    // Insert all quote items into event_inventory
    const eventInventoryItems = quoteItems.map((item) => ({
      event_id: eventId,
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price_snapshot: item.unit_price_snapshot,
      tenant_id: tenantId,
      notes: null,
    }));

    const { error: inventoryError } = await supabase
      .from("event_inventory")
      .insert(eventInventoryItems);

    if (inventoryError) {
      console.error("[copyQuoteItemsToEvent] Error copying items to event inventory:", inventoryError);
      return false;
    }

    console.log(`[copyQuoteItemsToEvent] Successfully copied ${quoteItems.length} items to event ${eventId}`);
    return true;
  } catch (error) {
    console.error("[copyQuoteItemsToEvent] Unexpected error:", error);
    return false;
  }
}

/**
 * Check crew member availability for an event
 */
export async function checkCrewAvailability(
  crewMemberId: string,
  eventId: string,
  callTime: string | null,
  endTime: string | null,
): Promise<CrewAvailability> {
  try {
    // Get the event dates
    const { data: event } = await supabase
      .from("events")
      .select("start_date, end_date")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (!event) {
      return { available: false, status: "unavailable", unavailable: { reason: "Event not found" } };
    }

    const eventStart = new Date(event.start_date);
    const eventEnd = new Date(event.end_date);
    eventEnd.setHours(23, 59, 59, 999); // End of day

    // Use provided call/end times or default to event dates
    const requestedCallTime = callTime ? new Date(callTime) : eventStart;
    const requestedEndTime = endTime ? new Date(endTime) : eventEnd;

    // Check if crew member is on leave
    const { data: crewMember } = await supabase
      .from("crew_members")
      .select("on_leave, leave_start_date, leave_end_date, leave_reason")
      .eq("id", crewMemberId)
      .eq("tenant_id", tenantId)
      .single();

    if (crewMember?.on_leave && crewMember.leave_start_date && crewMember.leave_end_date) {
      const leaveStart = new Date(crewMember.leave_start_date);
      const leaveEnd = new Date(crewMember.leave_end_date);
      leaveEnd.setHours(23, 59, 59, 999);

      // Check if event dates overlap with leave period
      if (eventStart <= leaveEnd && eventEnd >= leaveStart) {
        const leaveReason = crewMember.leave_reason
          ? `: ${crewMember.leave_reason}`
          : "";
        return {
          available: false,
          status: "unavailable",
          unavailable: {
            reason: `On leave from ${leaveStart.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })} to ${leaveEnd.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}${leaveReason}`,
          },
        };
      }
    }

    // Check for conflicts with other events
    const { data: conflictingAssignments } = await supabase
      .from("event_crew")
      .select(
        `
        event_id,
        call_time,
        end_time,
        events:event_id (
          name,
          start_date,
          end_date
        )
      `,
      )
      .eq("crew_member_id", crewMemberId)
      .eq("tenant_id", tenantId)
      .neq("event_id", eventId);

    if (conflictingAssignments && conflictingAssignments.length > 0) {
      for (const assignment of conflictingAssignments) {
        const otherEvent = assignment.events as any;
        if (!otherEvent) continue;

        const otherStart = new Date(otherEvent.start_date);
        const otherEnd = new Date(otherEvent.end_date);
        otherEnd.setHours(23, 59, 59, 999);

        // Get assignment times
        const assignmentCall = assignment.call_time
          ? new Date(assignment.call_time)
          : otherStart;
        const assignmentEnd = assignment.end_time
          ? new Date(assignment.end_time)
          : otherEnd;

        // Check for direct conflict (times overlap)
        if (requestedCallTime < assignmentEnd && requestedEndTime > assignmentCall) {
          return {
            available: false,
            status: "conflict",
            conflict: {
              event_id: assignment.event_id,
              event_name: otherEvent.name,
              call_time: assignment.call_time || otherEvent.start_date,
              end_time: assignment.end_time || otherEvent.end_date,
            },
          };
        }

        // Check for partial availability scenarios
        // Scenario 1: Crew member finishes another event before this event's call time
        // But there's a gap, so they're available after the other event ends
        if (assignmentEnd < requestedCallTime) {
          // Available after assignment ends
          const hoursAfter = Math.floor(
            (requestedCallTime.getTime() - assignmentEnd.getTime()) / (1000 * 60 * 60),
          );
          if (hoursAfter < 2) {
            // Less than 2 hours gap - might be tight but technically available
            return {
              available: true,
              status: "partial",
              partial: {
                available_after: assignmentEnd.toISOString(),
                reason: `Available after ${assignmentEnd.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })} (finishing "${otherEvent.name}")`,
              },
            };
          }
        }

        // Scenario 2: Crew member starts another event after this event ends
        // But they need to leave early to make it
        if (assignmentCall > requestedEndTime) {
          const hoursBefore = Math.floor(
            (assignmentCall.getTime() - requestedEndTime.getTime()) / (1000 * 60 * 60),
          );
          if (hoursBefore < 2) {
            // Less than 2 hours gap - might be tight
            return {
              available: true,
              status: "partial",
              partial: {
                available_until: assignmentCall.toISOString(),
                reason: `Must finish by ${assignmentCall.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })} (starting "${otherEvent.name}")`,
              },
            };
          }
        }
      }
    }

    // Check if crew member is on leave (for now, we'll add a simple check)
    // In the future, this could check a crew_availability or leave_requests table
    // For MVP, we'll return available if no conflicts found

    return { available: true, status: "available" };
  } catch (error) {
    console.error("[checkCrewAvailability] Unexpected error:", error);
    return {
      available: false,
      status: "unavailable",
      unavailable: { reason: "Error checking availability" },
    };
  }
}

/**
 * Get event with all related data
 */
export async function getEventWithDetails(eventId: string): Promise<{
  event: Event | null;
  inventory: EventInventory[];
  crew: EventCrew[];
  tasks: EventTask[];
}> {
  try {
    const [eventResult, inventoryResult, crewResult, tasksResult] =
      await Promise.all([
        supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .eq("tenant_id", tenantId)
          .single(),
        supabase
          .from("event_inventory")
          .select(
            `
            *,
            inventory_items:item_id (
              name
            )
          `,
          )
          .eq("event_id", eventId)
          .eq("tenant_id", tenantId),
        supabase
          .from("event_crew")
          .select(
            `
            *,
            crew_members:crew_member_id (
              name,
              email,
              contact
            )
          `,
          )
          .eq("event_id", eventId)
          .eq("tenant_id", tenantId),
        supabase
          .from("event_tasks")
          .select("*")
          .eq("event_id", eventId)
          .eq("tenant_id", tenantId)
          .order("due_time", { ascending: true, nullsFirst: false }),
      ]);

    if (eventResult.error) {
      console.error("[getEventWithDetails] Error fetching event:", eventResult.error);
      return { event: null, inventory: [], crew: [], tasks: [] };
    }

    const event = eventResult.data;

    // If event has quote_id but no inventory items, copy from quote
    if (event.quote_id && (!inventoryResult.data || inventoryResult.data.length === 0)) {
      console.log(`[getEventWithDetails] Event ${eventId} has quote_id ${event.quote_id} but no inventory, copying items...`);
      const copied = await copyQuoteItemsToEvent(eventId, event.quote_id);
      
      if (copied) {
        // Re-fetch inventory after copying
        const { data: updatedInventory } = await supabase
          .from("event_inventory")
          .select(
            `
            *,
            inventory_items:item_id (
              name
            )
          `,
          )
          .eq("event_id", eventId)
          .eq("tenant_id", tenantId);

        const inventory = (updatedInventory || []).map((item: any) => ({
          ...item,
          item_name: item.inventory_items?.name,
        }));

        const crew = (crewResult.data || []).map((member: any) => ({
          ...member,
          crew_member_name: member.crew_members?.name,
          crew_member_email: member.crew_members?.email,
          crew_member_contact: member.crew_members?.contact,
        }));

        return {
          event,
          inventory,
          crew,
          tasks: tasksResult.data || [],
        };
      }
    }

    const inventory = (inventoryResult.data || []).map((item: any) => ({
      ...item,
      item_name: item.inventory_items?.name,
    }));

    const crew = (crewResult.data || []).map((member: any) => ({
      ...member,
      crew_member_name: member.crew_members?.name,
      crew_member_email: member.crew_members?.email,
      crew_member_contact: member.crew_members?.contact,
    }));

    return {
      event,
      inventory,
      crew,
      tasks: tasksResult.data || [],
    };
  } catch (error) {
    console.error("[getEventWithDetails] Unexpected error:", error);
    return { event: null, inventory: [], crew: [], tasks: [] };
  }
}

/**
 * Create a new event
 */
export async function createEvent(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
  eventId?: string;
}> {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const startDate = String(formData.get("start_date") || "");
  const endDate = String(formData.get("end_date") || "");
  const location = String(formData.get("location") || "").trim() || null;
  const quoteId = String(formData.get("quote_id") || "").trim() || null;
  const statusParam = String(formData.get("status") || "").trim();

  if (!name || !startDate || !endDate) {
    return { error: "Name, start date, and end date are required" };
  }

  if (new Date(endDate) < new Date(startDate)) {
    return { error: "End date must be after start date" };
  }

  // Use status from form if provided, otherwise use "confirmed" for quotes or "draft"
  const eventStatus = statusParam || (quoteId ? "confirmed" : "draft");

  try {
    let finalQuoteId = quoteId;

    // If no quote_id is provided, automatically create a draft quote
    if (!quoteId) {
      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          name,
          start_date: startDate,
          end_date: endDate,
          status: "draft",
          tenant_id: tenantId,
        })
        .select("id")
        .single();

      if (quoteError) {
        console.error("[createEvent] Error creating draft quote:", quoteError);
        return { error: "Failed to create draft quote for event" };
      }

      finalQuoteId = quoteData.id;
      console.log(`[createEvent] Created draft quote ${finalQuoteId} for event`);
    }

    const { data, error: insertError } = await supabase
      .from("events")
      .insert({
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        location,
        quote_id: finalQuoteId,
        status: eventStatus,
        tenant_id: tenantId,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[createEvent] Error:", insertError);
      // If we created a quote but event creation failed, we could delete the quote here
      // For now, we'll leave it as orphaned (user can clean up manually if needed)
      return { error: "Failed to create event" };
    }

    const eventId = data.id;

    // If event is created from a quote, copy all quote items to event_inventory
    if (finalQuoteId) {
      const copied = await copyQuoteItemsToEvent(eventId, finalQuoteId);
      if (!copied) {
        console.error("[createEvent] Failed to copy quote items, but event was created");
      }
    }

    revalidatePath("/events");
    revalidatePath("/quotes"); // Revalidate quotes page to show the new draft quote
    return { success: true, eventId };
  } catch (error) {
    console.error("[createEvent] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Update an event
 */
export async function updateEvent(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const startDate = String(formData.get("start_date") || "");
  const endDate = String(formData.get("end_date") || "");
  const location = String(formData.get("location") || "").trim() || null;
  const status = String(formData.get("status") || "").trim();

  if (!id || !name || !startDate || !endDate) {
    return { error: "ID, name, start date, and end date are required" };
  }

  if (new Date(endDate) < new Date(startDate)) {
    return { error: "End date must be after start date" };
  }

  try {
    const updateData: any = {
      name,
      description,
      start_date: startDate,
      end_date: endDate,
      location,
      updated_at: new Date().toISOString(),
    };

    if (status && ["draft", "confirmed", "in_progress", "completed", "cancelled"].includes(status)) {
      updateData.status = status;
    }

    const { error: updateError } = await supabase
      .from("events")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("[updateEvent] Error:", updateError);
      return { error: "Failed to update event" };
    }

    revalidatePath("/events");
    revalidatePath(`/events/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[updateEvent] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  const id = String(formData.get("id") || "");

  if (!id) {
    return { error: "Event ID is required" };
  }

  try {
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (deleteError) {
      console.error("[deleteEvent] Error:", deleteError);
      return { error: "Failed to delete event" };
    }

    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    console.error("[deleteEvent] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Add crew member to event
 */
export async function addEventCrew(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
  availability?: CrewAvailability;
}> {
  const eventId = String(formData.get("event_id") || "");
  const crewMemberId = String(formData.get("crew_member_id") || "");
  const role = String(formData.get("role") || "").trim();
  const callTime = String(formData.get("call_time") || "").trim() || null;
  const endTime = String(formData.get("end_time") || "").trim() || null;
  const hourlyRate = String(formData.get("hourly_rate") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!eventId || !crewMemberId || !role) {
    return { error: "Event ID, crew member ID, and role are required" };
  }

  // Check availability
  const availability = await checkCrewAvailability(
    crewMemberId,
    eventId,
    callTime,
    endTime,
  );

  if (availability.status === "conflict" || availability.status === "unavailable") {
    return {
      error: availability.conflict
        ? `Conflict: Already assigned to "${availability.conflict.event_name}"`
        : availability.unavailable?.reason || "Crew member is not available",
      availability,
    };
  }

  try {
    const { error: insertError } = await supabase.from("event_crew").insert({
      event_id: eventId,
      crew_member_id: crewMemberId,
      role,
      call_time: callTime,
      end_time: endTime,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      notes,
      tenant_id: tenantId,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return { error: "This crew member is already assigned to this event" };
      }
      console.error("[addEventCrew] Error:", insertError);
      return { error: "Failed to add crew member" };
    }

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("[addEventCrew] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Update crew member assignment
 */
export async function updateEventCrew(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  const id = String(formData.get("id") || "");
  const role = String(formData.get("role") || "").trim();
  const callTime = String(formData.get("call_time") || "").trim() || null;
  const endTime = String(formData.get("end_time") || "").trim() || null;
  const hourlyRate = String(formData.get("hourly_rate") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!id || !role) {
    return { error: "ID and role are required" };
  }

  // Get event_id and crew_member_id for availability check
  const { data: existing } = await supabase
    .from("event_crew")
    .select("event_id, crew_member_id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!existing) {
    return { error: "Crew assignment not found" };
  }

  // Check availability if times changed
  if (callTime || endTime) {
    const availability = await checkCrewAvailability(
      existing.crew_member_id,
      existing.event_id,
      callTime,
      endTime,
    );

    if (availability.status === "conflict" || availability.status === "unavailable") {
      return {
        error: availability.conflict
          ? `Conflict: Already assigned to "${availability.conflict.event_name}"`
          : availability.unavailable?.reason || "Crew member is not available for these times",
      };
    }
  }

  try {
    const updateData: any = {
      role,
      call_time: callTime,
      end_time: endTime,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      notes,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("event_crew")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("[updateEventCrew] Error:", updateError);
      return { error: "Failed to update crew assignment" };
    }

    revalidatePath(`/events/${existing.event_id}`);
    return { success: true };
  } catch (error) {
    console.error("[updateEventCrew] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Delete crew member from event
 */
export async function deleteEventCrew(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  const id = String(formData.get("id") || "");
  const eventId = String(formData.get("event_id") || "");

  if (!id) {
    return { error: "Crew assignment ID is required" };
  }

  try {
    const { error: deleteError } = await supabase
      .from("event_crew")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (deleteError) {
      console.error("[deleteEventCrew] Error:", deleteError);
      return { error: "Failed to remove crew member" };
    }

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("[deleteEventCrew] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Create event for an already accepted quote
 * Checks if event already exists before creating
 */
export async function createEventForAcceptedQuote(quoteId: string): Promise<{
  success?: boolean;
  error?: string;
  eventId?: string;
}> {
  try {
    // Check if quote exists and is accepted
    const { getQuoteWithItems } = await import("@/lib/quotes");
    const quote = await getQuoteWithItems(quoteId);

    if (!quote) {
      return { error: "Quote not found" };
    }

    if (quote.status !== "accepted") {
      return { error: "Only accepted quotes can be converted to events" };
    }

    // Check if event already exists for this quote
    const { data: existingEvent } = await supabase
      .from("events")
      .select("id")
      .eq("quote_id", quoteId)
      .eq("tenant_id", tenantId)
      .single();

    if (existingEvent) {
      return { success: true, eventId: existingEvent.id };
    }

    // Create event (this will automatically copy quote items to event_inventory)
    const eventFormData = new FormData();
    eventFormData.append("name", quote.name);
    eventFormData.append("description", `Event created from quote: ${quote.name}`);
    eventFormData.append("start_date", quote.start_date);
    eventFormData.append("end_date", quote.end_date);
    eventFormData.append("quote_id", quoteId);
    eventFormData.append("status", "confirmed");

    const result = await createEvent(eventFormData);
    return result;
  } catch (error) {
    console.error("[createEventForAcceptedQuote] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
