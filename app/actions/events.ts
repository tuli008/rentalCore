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
      event: eventResult.data,
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

  if (!name || !startDate || !endDate) {
    return { error: "Name, start date, and end date are required" };
  }

  if (new Date(endDate) < new Date(startDate)) {
    return { error: "End date must be after start date" };
  }

  try {
    const { data, error: insertError } = await supabase
      .from("events")
      .insert({
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        location,
        quote_id: quoteId,
        status: "draft",
        tenant_id: tenantId,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[createEvent] Error:", insertError);
      return { error: "Failed to create event" };
    }

    revalidatePath("/events");
    return { success: true, eventId: data.id };
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

