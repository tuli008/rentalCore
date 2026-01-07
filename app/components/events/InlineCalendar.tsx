"use client";

import { useState, useEffect } from "react";
import { getCrewMemberCalendarData } from "@/app/actions/crew";

interface InlineCalendarProps {
  crewMemberId: string;
  eventStartDate: string;
  eventEndDate: string;
  eventId?: string;
  eventName?: string;
  currentAssignment?: {
    callTime: string | null;
    endTime: string | null;
  };
}

export default function InlineCalendar({
  crewMemberId,
  eventStartDate,
  eventEndDate,
  eventId,
  eventName,
  currentAssignment,
}: InlineCalendarProps) {
  const [busyDates, setBusyDates] = useState<Array<{ 
    start: string; 
    end: string; 
    eventName: string;
    callTime: string | null;
    endTime: string | null;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCalendar = async () => {
      setIsLoading(true);
      try {
        // Exclude current event from results since we'll add it separately with currentAssignment
        const data = await getCrewMemberCalendarData(crewMemberId, eventId || undefined, false);
        let busyDatesData = data.busyDates || [];
        
        // Add current assignment if provided (this ensures we show it even if call_time is null)
        // If call_time is null, use event dates with default times (9 AM - 6 PM)
        if (currentAssignment) {
          if (currentAssignment.callTime && currentAssignment.endTime) {
            // Has specific times
            busyDatesData = [
              ...busyDatesData,
              {
                start: currentAssignment.callTime,
                end: currentAssignment.endTime,
                eventName: eventName || "Current Event",
                callTime: currentAssignment.callTime,
                endTime: currentAssignment.endTime,
              },
            ];
          } else {
            // No specific times - use event date range with default full day times
            const eventStart = new Date(eventStartDate);
            eventStart.setHours(9, 0, 0, 0);
            const eventEnd = new Date(eventEndDate);
            eventEnd.setHours(18, 0, 0, 0);
            
            busyDatesData = [
              ...busyDatesData,
              {
                start: eventStart.toISOString(),
                end: eventEnd.toISOString(),
                eventName: eventName || "Current Event",
                callTime: null, // Will trigger default 9 AM - 6 PM
                endTime: null,
              },
            ];
          }
        }
        
        setBusyDates(busyDatesData);
        // Debug: Log busy dates to console
        console.log('Busy dates for crew member:', busyDatesData);
      } catch (error) {
        console.error("Error loading calendar:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCalendar();
  }, [crewMemberId, currentAssignment?.callTime, currentAssignment?.endTime]);

  // Generate dates for the event
  const eventStart = new Date(eventStartDate);
  const eventEnd = new Date(eventEndDate);
  const days: Date[] = [];
  
  for (let d = new Date(eventStart); d <= eventEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  // Generate time slots for a day (8 AM to 8 PM, hourly)
  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 8); // 8, 9, 10, ..., 20 (8 AM to 8 PM)

  // Check if a specific time slot on a date is busy
  const getTimeSlotStatus = (date: Date, hour: number): "free" | "busy" | "partial" => {
    const dateStr = date.toISOString().split('T')[0];
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    for (const busyRange of busyDates) {
      const busyStart = new Date(busyRange.callTime || busyRange.start);
      const busyEnd = new Date(busyRange.endTime || busyRange.end);

      // Check if this hour overlaps with the busy range
      if (slotStart < busyEnd && slotEnd > busyStart) {
        // Check if it's fully blocked or partially blocked
        if (slotStart >= busyStart && slotEnd <= busyEnd) {
          return "busy"; // Fully within busy period
        }
        return "partial"; // Partially overlaps
      }
    }

    return "free";
  };

  // Get busy time ranges for a specific date
  const getBusyTimeRangesForDate = (date: Date): Array<{ start: number; end: number; eventName: string; originalStart?: number; originalEnd?: number }> => {
    const dateStr = date.toISOString().split('T')[0];
    const ranges: Array<{ start: number; end: number; eventName: string; originalStart?: number; originalEnd?: number }> = [];

    for (const busyRange of busyDates) {
      // Use call_time/end_time if available, otherwise fall back to start/end dates
      const useSpecificTimes = busyRange.callTime && busyRange.endTime;
      
      let busyStart: Date;
      let busyEnd: Date;
      
      if (useSpecificTimes && busyRange.callTime && busyRange.endTime) {
        busyStart = new Date(busyRange.callTime);
        busyEnd = new Date(busyRange.endTime);
      } else {
        busyStart = new Date(busyRange.start);
        busyEnd = new Date(busyRange.end);
        // If no specific times, set to 9 AM - 6 PM for full day
        busyStart.setHours(9, 0, 0, 0);
        busyEnd.setHours(18, 0, 0, 0);
      }
      
      const busyStartStr = busyStart.toISOString().split('T')[0];
      const busyEndStr = busyEnd.toISOString().split('T')[0];

      // Check if this busy range overlaps with the date
      // For multi-day ranges, use the actual call_time/end_time for each day
      if (dateStr >= busyStartStr && dateStr <= busyEndStr) {
        let rangeStart: number;
        let rangeEnd: number;

        // Get the actual hours from call_time/end_time (these represent the assignment time for each day)
        // If call_time/end_time are not set, default to full day (9 AM - 6 PM)
        const hasSpecificTimes = busyRange.callTime && busyRange.endTime;
        const startHour = hasSpecificTimes ? (busyStart.getHours() + (busyStart.getMinutes() / 60)) : 9; // Default 9 AM
        const endHour = hasSpecificTimes ? (busyEnd.getHours() + (busyEnd.getMinutes() / 60)) : 18; // Default 6 PM

        if (busyStartStr === dateStr && busyEndStr === dateStr) {
          // Same day - use actual times (e.g., 9 AM - 6 PM for full day)
          rangeStart = startHour;
          rangeEnd = endHour;
        } else if (busyStartStr === dateStr) {
          // Starts on this day - use actual start time, end at the assignment end time
          rangeStart = startHour;
          rangeEnd = endHour; // Use actual end time from assignment
        } else if (busyEndStr === dateStr) {
          // Ends on this day - use assignment start time, actual end time
          rangeStart = startHour; // Use actual start time from assignment
          rangeEnd = endHour;
        } else {
          // Middle day of multi-day range - use the assignment times (e.g., 9 AM - 6 PM)
          rangeStart = startHour;
          rangeEnd = endHour;
        }

        // Only add if the range is valid
        if (rangeEnd > rangeStart) {
          // Clamp to display range (8 AM - 8 PM) for visualization
          const clampedStart = Math.max(8, Math.min(20, rangeStart));
          const clampedEnd = Math.max(8, Math.min(20, rangeEnd));
          
          // Only add if there's overlap with display hours (8 AM - 8 PM)
          if (clampedEnd > clampedStart) {
            ranges.push({
              start: clampedStart,
              end: clampedEnd,
              eventName: busyRange.eventName,
              // Store original times for label display
              originalStart: rangeStart,
              originalEnd: rangeEnd,
            });
          }
        } else if (rangeStart === rangeEnd && rangeStart >= 8 && rangeStart <= 20) {
          // Handle same start/end time - show as a 30-minute block
          ranges.push({
            start: rangeStart,
            end: rangeStart + 0.5, // 30 minutes
            eventName: busyRange.eventName,
            originalStart: rangeStart,
            originalEnd: rangeEnd,
          });
        }
      }
    }

    return ranges;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md p-3">
      <div className="space-y-4">
        {days.map((day) => {
          const dateStr = day.toISOString().split('T')[0];
          const busyRanges = getBusyTimeRangesForDate(day);
          const hasBusyTime = busyRanges.length > 0;
          
          return (
            <div key={dateStr} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
              <div className="text-xs font-medium text-gray-700 mb-2">
                {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              
              <div className="space-y-2">
                {/* Time bar visualization - Full day 8 AM to 8 PM */}
                <div className="relative h-8 bg-green-200 rounded overflow-hidden">
                  {/* Show green background for free time, red for busy */}
                  {busyRanges.length === 0 ? (
                    <div className="absolute inset-0 bg-green-400"></div>
                  ) : (
                    <>
                      {/* Green background (available time) */}
                      <div className="absolute inset-0 bg-green-400"></div>
                      {/* Red bars (busy time) */}
                      {busyRanges.map((range, idx) => {
                        const startPercent = Math.max(0, ((range.start - 8) / 12) * 100);
                        const endPercent = Math.min(100, ((range.end - 8) / 12) * 100);
                        const widthPercent = Math.max(1, endPercent - startPercent); // Minimum 1% width for visibility
                        
                        // Only show bar if there's actual width
                        if (widthPercent <= 0) return null;
                        
                        return (
                          <div
                            key={idx}
                            className="absolute h-full bg-red-500"
                            style={{
                              left: `${startPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                            title={`${range.eventName}: ${String(Math.floor(range.start)).padStart(2, '0')}:${String(Math.floor((range.start % 1) * 60)).padStart(2, '0')} - ${String(Math.floor(range.end)).padStart(2, '0')}:${String(Math.floor((range.end % 1) * 60)).padStart(2, '0')}`}
                          />
                        );
                      })}
                    </>
                  )}
                  {/* Time labels at the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 text-[10px] text-gray-700">
                    <span>8 AM</span>
                    <span>8 PM</span>
                  </div>
                </div>
                
                {/* Time range labels */}
                {busyRanges.length > 0 && (
                  <div className="text-xs text-gray-600 space-y-1">
                    {busyRanges.map((range, idx) => {
                      // Use original times if available, otherwise use clamped times
                      const displayStart = (range as any).originalStart ?? range.start;
                      const displayEnd = (range as any).originalEnd ?? range.end;
                      
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                          <span>
                            Blocked: {String(Math.floor(displayStart)).padStart(2, '0')}:{String(Math.floor((displayStart % 1) * 60)).padStart(2, '0')} – {String(Math.floor(displayEnd)).padStart(2, '0')}:{String(Math.floor((displayEnd % 1) * 60)).padStart(2, '0')} ({range.eventName})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {busyRanges.length === 0 && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-xs text-gray-600">All day available (8 AM - 8 PM)</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
