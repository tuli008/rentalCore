"use server";

import { supabase } from "@/lib/supabase";

const tenantId = "11111111-1111-1111-1111-111111111111";

export interface AssetInfo {
  purchase_cost: number | null;
  purchase_date: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  useful_life_years: number | null;
  depreciation_method: "straight_line" | "written_down_value" | null;
  current_book_value: number | null;
  asset_tag: string | null;
}

export interface UnitAssetInfo extends AssetInfo {
  unit_id: string;
  serial_number: string;
  initial_book_value: number;
}

/**
 * Get asset information for a bulk/non-serialized item
 */
export async function getItemAssetInfo(itemId: string): Promise<AssetInfo | null> {
  try {
    const { data, error } = await supabase
      .from("inventory_items")
      .select(
        `
        purchase_cost,
        purchase_date,
        vendor_id,
        useful_life_years,
        depreciation_method,
        current_book_value,
        asset_tag,
        vendors:vendor_id (
          name
        )
      `,
      )
      .eq("id", itemId)
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      console.error("[getItemAssetInfo] Error:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      purchase_cost: data.purchase_cost,
      purchase_date: data.purchase_date,
      vendor_id: data.vendor_id,
      vendor_name: (data.vendors as any)?.name || null,
      useful_life_years: data.useful_life_years,
      depreciation_method: data.depreciation_method,
      current_book_value: data.current_book_value,
      asset_tag: data.asset_tag,
    };
  } catch (error) {
    console.error("[getItemAssetInfo] Unexpected error:", error);
    return null;
  }
}

/**
 * Get asset information for all units of a serialized item
 */
export async function getItemUnitsAssetInfo(
  itemId: string,
): Promise<UnitAssetInfo[]> {
  try {
    const { data, error } = await supabase
      .from("asset_register")
      .select(
        `
        unit_id,
        purchase_cost,
        purchase_date,
        vendor_id,
        useful_life_years,
        depreciation_method,
        initial_book_value,
        current_book_value,
        asset_tag,
        inventory_units:unit_id (
          serial_number
        ),
        vendors:vendor_id (
          name
        )
      `,
      )
      .eq("item_id", itemId)
      .eq("tenant_id", tenantId)
      .order("purchase_date", { ascending: false });

    if (error) {
      console.error("[getItemUnitsAssetInfo] Error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((asset: any) => ({
      unit_id: asset.unit_id,
      serial_number: asset.inventory_units?.serial_number || "",
      purchase_cost: asset.purchase_cost,
      purchase_date: asset.purchase_date,
      vendor_id: asset.vendor_id,
      vendor_name: asset.vendors?.name || null,
      useful_life_years: asset.useful_life_years,
      depreciation_method: asset.depreciation_method,
      initial_book_value: asset.initial_book_value,
      current_book_value: asset.current_book_value,
      asset_tag: asset.asset_tag,
    }));
  } catch (error) {
    console.error("[getItemUnitsAssetInfo] Unexpected error:", error);
    return [];
  }
}

/**
 * Calculate current depreciation for an asset
 */
export async function calculateAssetDepreciation(
  purchaseCost: number,
  purchaseDate: string,
  usefulLifeYears: number,
  depreciationMethod: "straight_line" | "written_down_value",
): Promise<{
  totalDepreciation: number;
  currentBookValue: number;
  monthsElapsed: number;
}> {
  try {
    const purchase = new Date(purchaseDate);
    const now = new Date();
    const monthsElapsed = Math.floor(
      (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );

    let totalDepreciation = 0;
    let currentBookValue = purchaseCost;

    if (depreciationMethod === "straight_line") {
      const annualDepreciation = purchaseCost / usefulLifeYears;
      const monthlyDepreciation = annualDepreciation / 12;
      totalDepreciation = monthlyDepreciation * monthsElapsed;

      if (totalDepreciation > purchaseCost) {
        totalDepreciation = purchaseCost;
      }
      currentBookValue = purchaseCost - totalDepreciation;
    } else if (depreciationMethod === "written_down_value") {
      // Using default 15% annual rate for WDV
      const annualRate = 15.0;
      const monthlyRate = annualRate / 100 / 12;
      const remainingValue =
        purchaseCost * Math.pow(1 - monthlyRate, monthsElapsed);
      totalDepreciation = purchaseCost - remainingValue;
      currentBookValue = remainingValue;
    }

    if (currentBookValue < 0) {
      currentBookValue = 0;
    }

    return {
      totalDepreciation: Math.round(totalDepreciation * 100) / 100,
      currentBookValue: Math.round(currentBookValue * 100) / 100,
      monthsElapsed,
    };
  } catch (error) {
    console.error("[calculateAssetDepreciation] Error:", error);
    return {
      totalDepreciation: 0,
      currentBookValue: 0,
      monthsElapsed: 0,
    };
  }
}

