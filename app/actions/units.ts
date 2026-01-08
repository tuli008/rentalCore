"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const tenantId = "11111111-1111-1111-1111-111111111111";

export interface UnitInfo {
  id: string;
  item_id: string;
  item_name: string;
  serial_number: string;
  barcode: string;
  status: "available" | "out" | "maintenance";
  location_name: string;
  group_name: string;
}

/**
 * Lookup a unit by barcode
 */
export async function lookupUnitByBarcode(barcode: string): Promise<{
  success: boolean;
  unit?: UnitInfo;
  error?: string;
}> {
  if (!barcode || !barcode.trim()) {
    return { success: false, error: "Barcode is required" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data: unit, error } = await supabase
      .from("inventory_units")
      .select(
        `
        id,
        item_id,
        serial_number,
        barcode,
        status,
        inventory_items:item_id (
          name,
          inventory_groups:group_id (
            name
          )
        ),
        locations:location_id (
          name
        )
      `
      )
      .eq("barcode", barcode.trim())
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Unit not found" };
      }
      console.error("[lookupUnitByBarcode] Error:", error);
      return { success: false, error: "Failed to lookup unit" };
    }

    if (!unit) {
      return { success: false, error: "Unit not found" };
    }

    const unitInfo: UnitInfo = {
      id: unit.id,
      item_id: unit.item_id,
      item_name: (unit.inventory_items as any)?.name || "Unknown",
      serial_number: unit.serial_number,
      barcode: unit.barcode,
      status: unit.status,
      location_name: (unit.locations as any)?.name || "Unknown",
      group_name: (unit.inventory_items as any)?.inventory_groups?.name || "Unknown",
    };

    return { success: true, unit: unitInfo };
  } catch (error) {
    console.error("[lookupUnitByBarcode] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    };
  }
}

/**
 * Update unit status (supports lookup by barcode or unit ID)
 */
export async function updateUnitStatusByBarcode(
  barcode: string,
  newStatus: "available" | "out" | "maintenance"
): Promise<{ success: boolean; error?: string }> {
  if (!barcode || !barcode.trim()) {
    return { success: false, error: "Barcode is required" };
  }

  if (!["available", "out", "maintenance"].includes(newStatus)) {
    return { success: false, error: "Invalid status" };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("inventory_units")
      .update({ status: newStatus })
      .eq("barcode", barcode.trim())
      .eq("tenant_id", tenantId);

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Unit not found" };
      }
      console.error("[updateUnitStatusByBarcode] Error:", error);
      return { success: false, error: "Failed to update unit status" };
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[updateUnitStatusByBarcode] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    };
  }
}

export async function updateUnitStatus(formData: FormData) {
  const unitId = String(formData.get("unit_id"));
  const newStatus = String(formData.get("status"));

  if (!unitId || !newStatus) return;

  if (!["available", "out", "maintenance"].includes(newStatus)) return;

  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("inventory_units")
      .update({ status: newStatus })
      .eq("id", unitId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("[updateUnitStatus] Error updating unit status:", {
        action: "updateUnitStatus",
        unit_id: unitId,
        error: error.message,
      });
      return;
    }

    revalidatePath("/");
  } catch (error) {
    console.error("[updateUnitStatus] Unexpected error:", error);
  }
}
