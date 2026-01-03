"use server";

import { supabase } from "@/lib/supabase";

const tenantId = "11111111-1111-1111-1111-111111111111";

export interface BookedDateRange {
  start_date: string;
  end_date: string;
  quote_name: string;
  quantity: number;
}

/**
 * Fetches all booked date ranges for a specific item from accepted quotes
 */
export async function getItemBookedDates(
  itemId: string,
): Promise<BookedDateRange[]> {
  try {
    // Fetch all accepted quotes that contain this item
    const { data: quoteItems, error } = await supabase
      .from("quote_items")
      .select(
        `
        quantity,
        quotes:quote_id (
          id,
          name,
          start_date,
          end_date,
          status
        )
      `,
      )
      .eq("item_id", itemId)
      .eq("quotes.status", "accepted")
      .eq("quotes.tenant_id", tenantId);

    if (error) {
      console.error("[getItemBookedDates] Error fetching booked dates:", {
        item_id: itemId,
        error: error.message,
      });
      return [];
    }

    if (!quoteItems || quoteItems.length === 0) {
      return [];
    }

    // Transform the data to a simpler format
    const bookedRanges: BookedDateRange[] = quoteItems
      .filter((qi: any) => qi.quotes && qi.quotes.status === "accepted")
      .map((qi: any) => ({
        start_date: qi.quotes.start_date,
        end_date: qi.quotes.end_date,
        quote_name: qi.quotes.name,
        quantity: qi.quantity,
      }));

    return bookedRanges;
  } catch (error) {
    console.error("[getItemBookedDates] Unexpected error:", error);
    return [];
  }
}

