"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const tenantId = "11111111-1111-1111-1111-111111111111";

export interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  status: "prepping" | "planned" | "in_transit" | "on_venue" | "closed";
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

export type RateType = "hourly" | "daily" | "weekly" | "monthly";

export interface EventCrew {
  id: string;
  event_id: string;
  crew_member_id: string;
  role: string;
  call_time: string | null;
  end_time: string | null;
  rate: number | null; // Rate amount (renamed from hourly_rate)
  rate_type: RateType | null; // Rate calculation basis
  notes: string | null;
  crew_member_name?: string; // Joined from crew_members
  crew_member_email?: string;
  crew_member_contact?: string;
}

// Role requirements are derived from quote labor items (no separate table)
export interface RoleRequirement {
  role_name: string;
  quantity_required: number;
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
 * Automatically syncs event statuses with their quote statuses
 */
export async function getEvents(): Promise<Event[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("events")
      .select("id, name, description, start_date, end_date, location, status, quote_id, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("[getEvents] Error:", error);
      return [];
    }

    let events = data || [];
    console.log(`[getEvents] Fetched ${events.length} events from database`);

    // Deduplicate events by ID first (safety measure in case of any query issues)
    const seenIds = new Set<string>();
    const beforeIdDedup = events.length;
    events = events.filter((event) => {
      if (seenIds.has(event.id)) {
        console.warn(`[getEvents] Duplicate event ID found: ${event.id} - ${event.name}`);
        return false;
      }
      seenIds.add(event.id);
      return true;
    });
    console.log(`[getEvents] After ID deduplication: ${events.length} events (removed ${beforeIdDedup - events.length} by ID)`);
    
    // Also deduplicate by name + dates (might be same event created multiple times)
    const seenByNameAndDate = new Map<string, string>(); // key -> event ID to keep
    const duplicateByNameAndDate: string[] = [];
    const beforeNameDateDedup = events.length;
    events = events.filter((event) => {
      const key = `${event.name}|${event.start_date}|${event.end_date}`;
      const existingId = seenByNameAndDate.get(key);
      if (existingId) {
        duplicateByNameAndDate.push(`${event.id} (${event.name}) matches ${existingId}`);
        console.warn(`[getEvents] Duplicate event by name+dates found: ${event.id} (${event.name} ${event.start_date}-${event.end_date}) matches existing ${existingId}`);
        return false; // Keep the first one, remove duplicates
      }
      seenByNameAndDate.set(key, event.id);
      return true;
    });
    
    if (duplicateByNameAndDate.length > 0) {
      console.warn(`[getEvents] Found ${duplicateByNameAndDate.length} duplicate event(s) by name+dates:`, duplicateByNameAndDate);
    }
    console.log(`[getEvents] Final count after all deduplication: ${events.length} events (removed ${beforeNameDateDedup - events.length} by name+dates)`);

    // Sync event statuses with quote statuses
    // Get all events with quotes
    const eventsWithQuotes = events.filter((e) => e.quote_id);
    if (eventsWithQuotes.length > 0) {
      const quoteIds = eventsWithQuotes.map((e) => e.quote_id).filter((id): id is string => id !== null);
      
      // Get quote statuses
      const { data: quotes } = await supabase
        .from("quotes")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .in("id", quoteIds);

      if (quotes) {
        const quoteStatusMap = new Map<string, string>();
        quotes.forEach((quote) => {
          quoteStatusMap.set(quote.id, quote.status);
        });

        // Update events that need syncing
        const updates: Array<{ id: string; status: string }> = [];
        eventsWithQuotes.forEach((event) => {
          if (!event.quote_id) return;
          const quoteStatus = quoteStatusMap.get(event.quote_id);
          if (!quoteStatus) return;

          const correctStatus = quoteStatus === "accepted" ? "planned" : "prepping";
          if (event.status !== correctStatus) {
            updates.push({ id: event.id, status: correctStatus });
          }
        });

        // Batch update events that need syncing
        if (updates.length > 0) {
          // Update in background (don't wait for it)
          Promise.all(
            updates.map((update) =>
              supabase
                .from("events")
                .update({ status: update.status, updated_at: new Date().toISOString() })
                .eq("id", update.id)
                .eq("tenant_id", tenantId)
            )
          ).catch((err) => {
            console.error("[getEvents] Error syncing event statuses:", err);
          });

          // Update the returned events with correct statuses
          updates.forEach((update) => {
            const event = events.find((e) => e.id === update.id);
            if (event) {
              event.status = update.status as Event["status"];
            }
          });
        }
      }
    }

    return events;
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
    const supabase = await createServerSupabaseClient();
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

    // Fetch all quote items (only inventory items, not labor)
    const { data: quoteItems, error: quoteItemsError } = await supabase
      .from("quote_items")
      .select("item_id, quantity, unit_price_snapshot, item_type")
      .eq("quote_id", quoteId)
      .eq("item_type", "inventory") // Only copy inventory items, not labor
      .not("item_id", "is", null); // Ensure item_id is not null

    if (quoteItemsError) {
      console.error("[copyQuoteItemsToEvent] Error fetching quote items:", quoteItemsError);
      return false;
    }

    if (!quoteItems || quoteItems.length === 0) {
      console.log("[copyQuoteItemsToEvent] No inventory items to copy");
      return true; // Not an error, just no items
    }

    // Insert all inventory quote items into event_inventory
    const eventInventoryItems = quoteItems
      .filter((item) => item.item_id) // Safety check
      .map((item) => ({
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
    const supabase = await createServerSupabaseClient();
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
 * Check crew availability by technician type for a date range
 * Returns the count of available crew members for the given technician type
 */
export async function checkCrewAvailabilityByType(
  technicianType: string,
  startDate: string,
  endDate: string,
  excludeEventId?: string,
): Promise<{
  available: number;
  total: number;
  unavailable: number;
}> {
  console.log(`[checkCrewAvailabilityByType] CALLED with: technicianType="${technicianType}", startDate="${startDate}", endDate="${endDate}"`);
  
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get all crew members with the matching technician type
    const { data: allCrew, error: crewError } = await supabase
      .from("crew_members")
      .select("id, on_leave, leave_start_date, leave_end_date, technician_type")
      .eq("tenant_id", tenantId)
      .eq("technician_type", technicianType); // Only count crew members with this technician type

    if (crewError || !allCrew) {
      console.error("[checkCrewAvailabilityByType] Error fetching crew:", crewError);
      return { available: 0, total: 0, unavailable: 0 };
    }

    const totalCrew = allCrew.length;
    console.log(`[checkCrewAvailabilityByType] Found ${totalCrew} crew members with type "${technicianType}"`);
    
    // Parse dates - handle both date-only strings and full timestamps
    const eventStart = new Date(startDate);
    eventStart.setHours(0, 0, 0, 0); // Normalize to start of day
    const eventEnd = new Date(endDate);
    eventEnd.setHours(23, 59, 59, 999); // Normalize to end of day

    // Get all crew assignments that overlap with this date range
    // We check ALL assignments (any role) because a crew member assigned to any role
    // on these dates is unavailable for this role too
    let overlappingAssignmentsQuery = supabase
      .from("event_crew")
      .select("crew_member_id, role, events:event_id!inner(start_date, end_date)")
      .eq("tenant_id", tenantId);

    if (excludeEventId) {
      overlappingAssignmentsQuery = overlappingAssignmentsQuery.neq("event_id", excludeEventId);
    }

    const { data: assignments, error: assignmentsError } = await overlappingAssignmentsQuery;

    if (assignmentsError) {
      console.error("[checkCrewAvailabilityByType] Error fetching assignments:", assignmentsError);
    }
    
    console.log(`[checkCrewAvailabilityByType] Found ${assignments?.length || 0} assignments for date range ${startDate} to ${endDate}`);

    // Build set of unavailable crew member IDs
    const unavailableCrewIds = new Set<string>();

    // Check leave status
    for (const crew of allCrew) {
      if (crew.on_leave && crew.leave_start_date && crew.leave_end_date) {
        const leaveStart = new Date(crew.leave_start_date);
        const leaveEnd = new Date(crew.leave_end_date);
        leaveEnd.setHours(23, 59, 59, 999);

        if (eventStart <= leaveEnd && eventEnd >= leaveStart) {
          unavailableCrewIds.add(crew.id);
        }
      }
    }

    // Check overlapping assignments (any role - crew member is busy if assigned to any event)
    if (assignments) {
      for (const assignment of assignments) {
        const event = assignment.events as any;
        if (!event || !event.start_date || !event.end_date) {
          console.log(`[checkCrewAvailabilityByType] Skipping assignment - missing event data:`, assignment);
          continue;
        }

        const otherStart = new Date(event.start_date);
        otherStart.setHours(0, 0, 0, 0); // Normalize to start of day
        const otherEnd = new Date(event.end_date);
        otherEnd.setHours(23, 59, 59, 999); // Normalize to end of day

        // Check if dates overlap: two date ranges overlap if 
        // eventStart <= otherEnd AND eventEnd >= otherStart
        const overlaps = eventStart <= otherEnd && eventEnd >= otherStart;
        console.log(`[checkCrewAvailabilityByType] Checking assignment: crew=${assignment.crew_member_id}, event=${event.start_date} to ${event.end_date}, requested=${startDate} to ${endDate}, overlaps=${overlaps}`);
        
        if (overlaps) {
          unavailableCrewIds.add(assignment.crew_member_id);
          console.log(`[checkCrewAvailabilityByType] Marked crew ${assignment.crew_member_id} as unavailable due to overlap`);
        }
      }
    }

    const available = totalCrew - unavailableCrewIds.size;
    const unavailable = unavailableCrewIds.size;

    console.log(`[checkCrewAvailabilityByType] Results for "${technicianType}": total=${totalCrew}, available=${available}, unavailable=${unavailable}`);

    return { available, total: totalCrew, unavailable };
  } catch (error) {
    console.error("[checkCrewAvailabilityByType] Unexpected error:", error);
    return { available: 0, total: 0, unavailable: 0 };
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
  roleRequirements: RoleRequirement[];
}> {
  try {
    const supabase = await createServerSupabaseClient();
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
      return { event: null, inventory: [], crew: [], tasks: [], roleRequirements: [] };
    }

    const event = eventResult.data;

    // Derive role requirements from quote labor items
    let roleRequirements: RoleRequirement[] = [];
    if (event.quote_id) {
      const { getQuoteWithItems } = await import("@/lib/quotes");
      const quote = await getQuoteWithItems(event.quote_id);
      if (quote) {
        // Group labor items by technician type and sum days
        const laborItems = quote.items.filter(
          (item) => item.item_type === "labor" && item.labor_technician_type
        );
        
        const roleMap = new Map<string, number>();
        for (const item of laborItems) {
          const roleName = item.labor_technician_type!;
          const days = item.labor_days || 0;
          const existingDays = roleMap.get(roleName) || 0;
          roleMap.set(roleName, existingDays + days);
        }
        
        // Convert to role requirements (quantity = ceiling of total days)
        roleRequirements = Array.from(roleMap.entries()).map(
          ([roleName, totalDays]) => ({
            role_name: roleName,
            quantity_required: Math.ceil(totalDays),
          })
        );
      }
    }

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
          roleRequirements,
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
      roleRequirements,
    };
  } catch (error) {
    console.error("[getEventWithDetails] Unexpected error:", error);
    return { event: null, inventory: [], crew: [], tasks: [], roleRequirements: [] };
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

  const supabase = await createServerSupabaseClient();

  // Determine event status based on quote status
  let eventStatus = statusParam;
  if (!eventStatus && quoteId) {
    // Check quote status to determine event status
    const { data: quoteData } = await supabase
      .from("quotes")
      .select("status")
      .eq("id", quoteId)
      .eq("tenant_id", tenantId)
      .single();
    
    if (quoteData) {
      eventStatus = quoteData.status === "accepted" ? "planned" : "prepping";
    } else {
      eventStatus = "prepping";
    }
  } else if (!eventStatus) {
    eventStatus = "prepping"; // Default for events without quotes
  }

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
    } else {
      // If quote_id is provided, check if event already exists for this quote
      const { data: existingEvent } = await supabase
        .from("events")
        .select("id")
        .eq("quote_id", quoteId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (existingEvent) {
        console.log(`[createEvent] Event ${existingEvent.id} already exists for quote ${quoteId}`);
        return { success: true, eventId: existingEvent.id };
      }
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
    const supabase = await createServerSupabaseClient();
    const updateData: any = {
      name,
      description,
      start_date: startDate,
      end_date: endDate,
      location,
      updated_at: new Date().toISOString(),
    };

    if (status && ["prepping", "planned", "in_transit", "on_venue", "closed"].includes(status)) {
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
    const supabase = await createServerSupabaseClient();
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
  const rateStr = String(formData.get("rate") || "").trim() || null;
  const rateType = String(formData.get("rate_type") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const rate = rateStr ? parseFloat(rateStr) : null;

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
    const supabase = await createServerSupabaseClient();
    
    // Get crew member and event details for notification (before insert)
    const [crewMemberResult, eventResult] = await Promise.all([
      supabase
        .from("crew_members")
        .select("name, email, contact, rate_type, base_rate")
        .eq("id", crewMemberId)
        .eq("tenant_id", tenantId)
        .single(),
      supabase
        .from("events")
        .select("name, start_date, end_date, location")
        .eq("id", eventId)
        .eq("tenant_id", tenantId)
        .single(),
    ]);

    const crewMember = crewMemberResult.data;
    const event = eventResult.data;

    // Use provided rate/rate_type, or fall back to crew member's base rate/rate_type
    const finalRate = rate ?? crewMember?.base_rate ?? null;
    const finalRateType = (rateType as RateType) ?? crewMember?.rate_type ?? null;

    // Validate rate and rate_type are both present or both null
    if ((finalRate && !finalRateType) || (finalRateType && !finalRate)) {
      return { error: "Rate and rate type must both be provided or both be empty" };
    }

    const { error: insertError } = await supabase.from("event_crew").insert({
      event_id: eventId,
      crew_member_id: crewMemberId,
      role,
      call_time: callTime,
      end_time: endTime,
      rate: finalRate,
      rate_type: finalRateType,
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

    // Send notification to crew member (non-blocking)
    if (crewMember && event && (crewMember.email || crewMember.contact)) {
      const { notifyCrewAssignment } = await import("./notifications");
      notifyCrewAssignment({
        crewMemberId,
        crewMemberName: crewMember.name,
        crewMemberEmail: crewMember.email,
        crewMemberPhone: crewMember.contact,
        eventName: event.name,
        eventStartDate: event.start_date,
        eventEndDate: event.end_date,
        eventLocation: event.location || "TBD",
        role,
        callTime,
        endTime,
        rate: finalRate,
        rateType: finalRateType,
      }).catch((error) => {
        // Log but don't fail the assignment if notification fails
        console.error("[addEventCrew] Failed to send notification:", error);
      });
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
  const rateStr = String(formData.get("rate") || "").trim() || null;
  const rateType = String(formData.get("rate_type") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const rate = rateStr ? parseFloat(rateStr) : null;

  if (!id || !role) {
    return { error: "ID and role are required" };
  }

  const supabase = await createServerSupabaseClient();

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

  // Validate rate and rate_type are both present or both null
  if ((rate && !rateType) || (rateType && !rate)) {
    return { error: "Rate and rate type must both be provided or both be empty" };
  }

  // Validate rate_type if provided
  if (rateType && !["hourly", "daily", "weekly", "monthly"].includes(rateType)) {
    return { error: "Invalid rate type. Must be hourly, daily, weekly, or monthly" };
  }

  try {
    const updateData: any = {
      role,
      call_time: callTime,
      end_time: endTime,
      rate: rate,
      rate_type: rateType as RateType | null,
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
    
    // Auto-sync to Google Calendar if crew member has connected calendar
    try {
      const { syncCrewAssignmentToGoogleCalendar } = await import("./google-calendar");
      await syncCrewAssignmentToGoogleCalendar(id);
    } catch (calendarError) {
      // Log but don't fail the update
      console.warn("[updateEventCrew] Calendar sync error:", calendarError);
    }

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
    // Remove from Google Calendar first if synced
    const { removeCrewAssignmentFromGoogleCalendar } = await import("./google-calendar");
    try {
      await removeCrewAssignmentFromGoogleCalendar(id);
    } catch (calendarError) {
      // Log but don't fail - calendar cleanup is optional
      console.warn("[deleteEventCrew] Error removing from Google Calendar:", calendarError);
    }

    const supabase = await createServerSupabaseClient();
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
    const supabase = await createServerSupabaseClient();
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
    eventFormData.append("status", "planned");

    const result = await createEvent(eventFormData);
    return result;
  } catch (error) {
    console.error("[createEventForAcceptedQuote] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Sync event status with quote status
 * Updates event status to "planned" if quote is accepted, "prepping" if quote is draft
 */
export async function syncEventStatusWithQuote(eventId: string): Promise<{
  success?: boolean;
  updated?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    // Get event with quote_id
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, quote_id, status")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (eventError || !event) {
      return { error: "Event not found" };
    }

    if (!event.quote_id) {
      return { success: true, updated: false }; // No quote to sync with
    }

    // Get quote status
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("status")
      .eq("id", event.quote_id)
      .eq("tenant_id", tenantId)
      .single();

    if (quoteError || !quote) {
      return { error: "Quote not found" };
    }

    // Determine correct event status based on quote status
    const correctStatus = quote.status === "accepted" ? "planned" : "prepping";

    // Only update if status is different
    if (event.status === correctStatus) {
      return { success: true, updated: false };
    }

    // Update event status
    const { error: updateError } = await supabase
      .from("events")
      .update({ status: correctStatus, updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("[syncEventStatusWithQuote] Error:", updateError);
      return { error: "Failed to update event status" };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    return { success: true, updated: true };
  } catch (error) {
    console.error("[syncEventStatusWithQuote] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Sync all event statuses with their quotes
 * Useful for fixing events that got out of sync
 */
export async function syncAllEventStatuses(): Promise<{
  success?: boolean;
  updated?: number;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    // Get all events with quotes
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, quote_id, status")
      .eq("tenant_id", tenantId)
      .not("quote_id", "is", null);

    if (eventsError) {
      console.error("[syncAllEventStatuses] Error:", eventsError);
      return { error: "Failed to fetch events" };
    }

    if (!events || events.length === 0) {
      return { success: true, updated: 0 };
    }

    // Get all quote statuses
    const quoteIds = events.map((e) => e.quote_id).filter((id): id is string => id !== null);
    const { data: quotes, error: quotesError } = await supabase
      .from("quotes")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .in("id", quoteIds);

    if (quotesError) {
      console.error("[syncAllEventStatuses] Error:", quotesError);
      return { error: "Failed to fetch quotes" };
    }

    // Create a map of quote_id -> status
    const quoteStatusMap = new Map<string, string>();
    quotes?.forEach((quote) => {
      quoteStatusMap.set(quote.id, quote.status);
    });

    // Update events that need updating
    let updatedCount = 0;
    const updates: Array<{ id: string; status: string }> = [];

    events.forEach((event) => {
      if (!event.quote_id) return;

      const quoteStatus = quoteStatusMap.get(event.quote_id);
      if (!quoteStatus) return;

      const correctStatus = quoteStatus === "accepted" ? "planned" : "prepping";
      if (event.status !== correctStatus) {
        updates.push({ id: event.id, status: correctStatus });
      }
    });

    // Batch update events
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("events")
          .update({ status: update.status, updated_at: new Date().toISOString() })
          .eq("id", update.id)
          .eq("tenant_id", tenantId);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    revalidatePath("/events");
    return { success: true, updated: updatedCount };
  } catch (error) {
    console.error("[syncAllEventStatuses] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Create events for all quotes that don't have events yet
 * Useful for syncing existing quotes with the calendar
 */
export async function syncQuotesToEvents(): Promise<{
  success?: boolean;
  created?: number;
  skipped?: number;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get all quotes
    const { data: quotes, error: quotesError } = await supabase
      .from("quotes")
      .select("id, name, start_date, end_date, status")
      .eq("tenant_id", tenantId);

    if (quotesError) {
      console.error("[syncQuotesToEvents] Error fetching quotes:", quotesError);
      return { error: "Failed to fetch quotes" };
    }

    if (!quotes || quotes.length === 0) {
      return { success: true, created: 0, skipped: 0 };
    }

    // Get all events with quote_ids
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("quote_id")
      .eq("tenant_id", tenantId)
      .not("quote_id", "is", null);

    if (eventsError) {
      console.error("[syncQuotesToEvents] Error fetching events:", eventsError);
      return { error: "Failed to fetch events" };
    }

    // Create a set of quote_ids that already have events
    const quoteIdsWithEvents = new Set<string>();
    events?.forEach((event) => {
      if (event.quote_id) {
        quoteIdsWithEvents.add(event.quote_id);
      }
    });

    // Find quotes without events
    const quotesWithoutEvents = quotes.filter((quote) => !quoteIdsWithEvents.has(quote.id));
    
    if (quotesWithoutEvents.length === 0) {
      console.log("[syncQuotesToEvents] All quotes already have events");
      return { success: true, created: 0, skipped: quotes.length };
    }

    console.log(`[syncQuotesToEvents] Found ${quotesWithoutEvents.length} quotes without events`);

    // Create events for quotes without events
    let createdCount = 0;
    let skippedCount = 0;

    for (const quote of quotesWithoutEvents) {
      try {
        // Determine event status based on quote status
        const eventStatus = quote.status === "accepted" ? "planned" : "prepping";

        const eventFormData = new FormData();
        eventFormData.append("name", quote.name);
        eventFormData.append("description", `Event created from quote: ${quote.name}`);
        eventFormData.append("start_date", quote.start_date);
        eventFormData.append("end_date", quote.end_date);
        eventFormData.append("quote_id", quote.id);
        eventFormData.append("status", eventStatus);

        const eventResult = await createEvent(eventFormData);
        if (eventResult.error) {
          console.error(`[syncQuotesToEvents] Error creating event for quote ${quote.id}:`, eventResult.error);
          skippedCount++;
        } else {
          console.log(`[syncQuotesToEvents] Created event ${eventResult.eventId} for quote ${quote.id}`);
          createdCount++;
        }
      } catch (error) {
        console.error(`[syncQuotesToEvents] Unexpected error creating event for quote ${quote.id}:`, error);
        skippedCount++;
      }
    }

    revalidatePath("/events");
    revalidatePath("/quotes");

    console.log(`[syncQuotesToEvents] Created ${createdCount} events, skipped ${skippedCount}`);
    return { success: true, created: createdCount, skipped: skippedCount };
  } catch (error) {
    console.error("[syncQuotesToEvents] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get events for calendar view (minimal data only)
 * Automatically syncs event statuses with their quote statuses
 */
export async function getEventsForCalendar(
  startDate: string,
  endDate: string,
): Promise<Array<{
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  location: string | null;
}>> {
  try {
    const supabase = await createServerSupabaseClient();
    // Query for events that overlap with the date range
    // An event overlaps if: start_date <= endDate AND end_date >= startDate
    const { data, error } = await supabase
      .from("events")
      .select("id, name, start_date, end_date, status, location, quote_id")
      .eq("tenant_id", tenantId)
      .lte("start_date", endDate) // Event starts on or before endDate
      .gte("end_date", startDate) // Event ends on or after startDate
      .order("start_date", { ascending: true });

    if (error) {
      console.error("[getEventsForCalendar] Error:", error);
      return [];
    }

    let events = data || [];

    // Deduplicate events by ID (safety measure in case of any query issues)
    const seenIds = new Set<string>();
    events = events.filter((event) => {
      if (seenIds.has(event.id)) {
        console.warn(`[getEventsForCalendar] Duplicate event ID found: ${event.id} - ${event.name}`);
        return false;
      }
      seenIds.add(event.id);
      return true;
    });

    // Further deduplicate by name and dates, in case different IDs have same logical event
    const seenEvents = new Set<string>();
    events = events.filter((event) => {
      const eventKey = `${event.name}-${event.start_date}-${event.end_date}`;
      if (seenEvents.has(eventKey)) {
        console.warn(`[getEventsForCalendar] Duplicate event (name+dates) found: ${event.name} (${event.start_date} to ${event.end_date})`);
        return false;
      }
      seenEvents.add(eventKey);
      return true;
    });

    // Sync event statuses with quote statuses (same logic as getEvents)
    const eventsWithQuotes = events.filter((e) => e.quote_id);
    if (eventsWithQuotes.length > 0) {
      const quoteIds = eventsWithQuotes.map((e) => e.quote_id).filter((id): id is string => id !== null);
      
      // Get quote statuses
      const { data: quotes } = await supabase
        .from("quotes")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .in("id", quoteIds);

      if (quotes) {
        const quoteStatusMap = new Map<string, string>();
        quotes.forEach((quote) => {
          quoteStatusMap.set(quote.id, quote.status);
        });

        // Update events that need syncing
        const updates: Array<{ id: string; status: string }> = [];
        eventsWithQuotes.forEach((event) => {
          if (!event.quote_id) return;
          const quoteStatus = quoteStatusMap.get(event.quote_id);
          if (!quoteStatus) return;

          const correctStatus = quoteStatus === "accepted" ? "planned" : "prepping";
          if (event.status !== correctStatus) {
            updates.push({ id: event.id, status: correctStatus });
          }
        });

        // Batch update events that need syncing
        if (updates.length > 0) {
          // Update in background (don't wait for it)
          Promise.all(
            updates.map((update) =>
              supabase
                .from("events")
                .update({ status: update.status, updated_at: new Date().toISOString() })
                .eq("id", update.id)
                .eq("tenant_id", tenantId)
            )
          ).catch((err) => {
            console.error("[getEventsForCalendar] Error syncing event statuses:", err);
          });

          // Update the returned events with correct statuses
          updates.forEach((update) => {
            const event = events.find((e) => e.id === update.id);
            if (event) {
              event.status = update.status;
            }
          });
        }
      }
    }

    const result = events.map((event) => ({
      id: event.id,
      title: event.name,
      startDate: event.start_date,
      endDate: event.end_date,
      status: event.status,
      location: event.location,
    }));

    return result;
  } catch (error) {
    console.error("[getEventsForCalendar] Unexpected error:", error);
    return [];
  }
}

// Role requirements are now derived from quote labor items (no separate table)
// They are computed on-the-fly in getEventWithDetails() from the quote's labor items
