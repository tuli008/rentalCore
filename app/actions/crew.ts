"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

const tenantId = "11111111-1111-1111-1111-111111111111";

export interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  contact: string | null;
  role: "Own Crew" | "Freelancer";
  created_at: string;
  updated_at: string;
}

/**
 * Get all crew members
 */
export async function getCrewMembers(): Promise<CrewMember[]> {
  try {
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
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const contact = String(formData.get("contact") || "").trim() || null;
  const role = String(formData.get("role") || "").trim() as "Own Crew" | "Freelancer";

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

  try {
    const { error: insertError } = await supabase.from("crew_members").insert({
      name,
      email,
      contact,
      role,
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

  try {
    const { error: updateError } = await supabase
      .from("crew_members")
      .update({
        name,
        email,
        contact,
        role,
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
 * Delete a crew member
 */
export async function deleteCrewMember(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
}> {
  const id = String(formData.get("id") || "");

  if (!id) {
    return { error: "Crew member ID is required" };
  }

  try {
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

