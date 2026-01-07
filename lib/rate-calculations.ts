/**
 * Utility functions for rate calculations and conversions
 * Supports hourly, daily, weekly, and monthly rate types
 */

export type RateType = "hourly" | "daily" | "weekly" | "monthly";

// Standard conversion factors (assumes 8 hours/day, 5 days/week, 4 weeks/month)
const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;
const WEEKS_PER_MONTH = 4;
const HOURS_PER_WEEK = HOURS_PER_DAY * DAYS_PER_WEEK;
const HOURS_PER_MONTH = HOURS_PER_WEEK * WEEKS_PER_MONTH;

/**
 * Convert a rate from one type to another
 */
export function convertRate(
  amount: number,
  fromType: RateType,
  toType: RateType
): number {
  if (fromType === toType) return amount;

  // Convert to hourly first, then to target type
  let hourlyRate: number;

  switch (fromType) {
    case "hourly":
      hourlyRate = amount;
      break;
    case "daily":
      hourlyRate = amount / HOURS_PER_DAY;
      break;
    case "weekly":
      hourlyRate = amount / HOURS_PER_WEEK;
      break;
    case "monthly":
      hourlyRate = amount / HOURS_PER_MONTH;
      break;
    default:
      throw new Error(`Unknown rate type: ${fromType}`);
  }

  // Convert from hourly to target type
  switch (toType) {
    case "hourly":
      return hourlyRate;
    case "daily":
      return hourlyRate * HOURS_PER_DAY;
    case "weekly":
      return hourlyRate * HOURS_PER_WEEK;
    case "monthly":
      return hourlyRate * HOURS_PER_MONTH;
    default:
      throw new Error(`Unknown rate type: ${toType}`);
  }
}

/**
 * Calculate total cost based on rate type and duration
 * @param rate - The rate amount
 * @param rateType - The type of rate (hourly, daily, weekly, monthly)
 * @param hours - Number of hours worked (for hourly/daily rates)
 * @param days - Number of days worked (for daily/weekly rates)
 * @param weeks - Number of weeks worked (for weekly/monthly rates)
 */
export function calculateCost(
  rate: number,
  rateType: RateType,
  options: {
    hours?: number;
    days?: number;
    weeks?: number;
    startDate?: Date;
    endDate?: Date;
  }
): number {
  const { hours, days, weeks, startDate, endDate } = options;

  switch (rateType) {
    case "hourly":
      if (hours !== undefined) {
        return rate * hours;
      }
      if (startDate && endDate) {
        const msDiff = endDate.getTime() - startDate.getTime();
        const hoursDiff = msDiff / (1000 * 60 * 60);
        return rate * hoursDiff;
      }
      throw new Error("Hours or date range required for hourly rate");

    case "daily":
      if (days !== undefined) {
        return rate * days;
      }
      if (hours !== undefined) {
        // For daily rate, calculate days (minimum 1 day if any hours worked)
        const calculatedDays = Math.max(1, Math.ceil(hours / HOURS_PER_DAY));
        return rate * calculatedDays;
      }
      if (startDate && endDate) {
        const msDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
        return rate * daysDiff;
      }
      throw new Error("Days, hours, or date range required for daily rate");

    case "weekly":
      if (weeks !== undefined) {
        return rate * weeks;
      }
      if (days !== undefined) {
        const calculatedWeeks = Math.max(1, Math.ceil(days / DAYS_PER_WEEK));
        return rate * calculatedWeeks;
      }
      if (hours !== undefined) {
        const calculatedWeeks = Math.max(
          1,
          Math.ceil(hours / HOURS_PER_WEEK)
        );
        return rate * calculatedWeeks;
      }
      if (startDate && endDate) {
        const msDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
        const calculatedWeeks = Math.max(1, Math.ceil(daysDiff / DAYS_PER_WEEK));
        return rate * calculatedWeeks;
      }
      throw new Error("Weeks, days, hours, or date range required for weekly rate");

    case "monthly":
      if (weeks !== undefined) {
        const calculatedMonths = Math.max(1, Math.ceil(weeks / WEEKS_PER_MONTH));
        return rate * calculatedMonths;
      }
      if (days !== undefined) {
        const calculatedMonths = Math.max(
          1,
          Math.ceil(days / (DAYS_PER_WEEK * WEEKS_PER_MONTH))
        );
        return rate * calculatedMonths;
      }
      if (hours !== undefined) {
        const calculatedMonths = Math.max(
          1,
          Math.ceil(hours / HOURS_PER_MONTH)
        );
        return rate * calculatedMonths;
      }
      if (startDate && endDate) {
        // Calculate months based on calendar months
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth();
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth();
        const monthsDiff =
          (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
        return rate * Math.max(1, monthsDiff);
      }
      throw new Error(
        "Weeks, days, hours, or date range required for monthly rate"
      );

    default:
      throw new Error(`Unknown rate type: ${rateType}`);
  }
}

/**
 * Format rate for display
 */
export function formatRate(rate: number, rateType: RateType): string {
  return `$${rate.toFixed(2)}/${rateType === "hourly" ? "hr" : rateType === "daily" ? "day" : rateType === "weekly" ? "wk" : "mo"}`;
}

/**
 * Get rate type label for display
 */
export function getRateTypeLabel(rateType: RateType): string {
  const labels: Record<RateType, string> = {
    hourly: "Hourly",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  };
  return labels[rateType];
}


