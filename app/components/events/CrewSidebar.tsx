"use client";

import { useState, useEffect, useRef } from "react";
import { getCrewMembers, type CrewMember } from "@/app/actions/crew";
import { COMMON_TECHNICIAN_TYPES } from "@/lib/technician-types";

interface CrewSidebarProps {
  eventId: string;
  eventStartDate: string;
  eventEndDate: string;
  onCrewSelect: (crewMember: CrewMember, role: string, callTime: string | null, endTime: string | null, hourlyRate: string | null) => void;
  existingCrewIds: string[];
  variant?: "desktop" | "mobile";
  onClose?: () => void;
}

export default function CrewSidebar({
  eventId,
  eventStartDate,
  eventEndDate,
  onCrewSelect,
  existingCrewIds,
  variant = "desktop",
  onClose,
}: CrewSidebarProps) {
  const [query, setQuery] = useState("");
  const [selectedTechnicianType, setSelectedTechnicianType] = useState<string>("");
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredCrewId, setHoveredCrewId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const isHoveringCalendarRef = useRef(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  const [crewCalendarData, setCrewCalendarData] = useState<Map<string, {
    busyDates: Array<{ start: string; end: string; eventName: string }>;
    unavailableDates: Array<{ start: string; end: string; reason: string }>;
  }>>(new Map());
  const [isLoadingCalendar, setIsLoadingCalendar] = useState<Map<string, boolean>>(new Map());
  const [loadedCrewIds, setLoadedCrewIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const crewCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Load crew members
  useEffect(() => {
    const loadCrewMembers = async () => {
      setIsLoading(true);
      try {
        const members = await getCrewMembers();
        setCrewMembers(members);
      } catch (error) {
        console.error("Error loading crew members:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCrewMembers();
  }, []);

  // Filter crew members by query and technician type
  const filteredCrew = crewMembers.filter((member) => {
    // Filter by technician type if selected
    if (selectedTechnicianType && member.technician_type !== selectedTechnicianType) {
      return false;
    }
    // Filter by query
    if (!query.trim()) return true;
    const searchTerm = query.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchTerm) ||
      member.email?.toLowerCase().includes(searchTerm) ||
      member.contact?.toLowerCase().includes(searchTerm)
    );
  });

  // Load crew calendar data when hovering over a crew member
  useEffect(() => {
    const loadCrewCalendar = async (crewMemberId: string, member: CrewMember) => {
      // Set loading state
      setIsLoadingCalendar((prev) => {
        const newMap = new Map(prev);
        newMap.set(crewMemberId, true);
        return newMap;
      });

      try {
        const { getCrewMemberCalendarData } = await import("@/app/actions/crew");
        // Include current event in calendar display so we can see if crew member is already assigned
        const calendarData = await getCrewMemberCalendarData(crewMemberId, eventId, true);
        
        // Get unavailable dates (leave)
        const unavailableDates: Array<{ start: string; end: string; reason: string }> = [];
        if (member.on_leave && member.leave_start_date && member.leave_end_date) {
          unavailableDates.push({
            start: member.leave_start_date,
            end: member.leave_end_date,
            reason: member.leave_reason || "On Leave",
          });
        }

        const calendarDataToStore = {
          busyDates: calendarData.busyDates || [],
          unavailableDates,
        };
        
        console.log(`[CrewSidebar] Loaded calendar for ${member.name}:`, {
          busyDates: calendarDataToStore.busyDates,
          unavailableDates: calendarDataToStore.unavailableDates,
        });
        
        setCrewCalendarData((prev) => {
          const newMap = new Map(prev);
          newMap.set(crewMemberId, calendarDataToStore);
          return newMap;
        });

        // Mark as loaded
        setLoadedCrewIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(crewMemberId);
          return newSet;
        });
      } catch (error) {
        console.error("Error loading crew calendar:", error);
      } finally {
        setIsLoadingCalendar((prev) => {
          const newMap = new Map(prev);
          newMap.set(crewMemberId, false);
          return newMap;
        });
      }
    };

    if (hoveredCrewId && !loadedCrewIds.has(hoveredCrewId)) {
      const member = crewMembers.find((m) => m.id === hoveredCrewId);
      if (member) {
        loadCrewCalendar(hoveredCrewId, member);
      }
    }
  }, [hoveredCrewId, crewMembers, eventId, loadedCrewIds]);

  const handleAddCrew = async (member: CrewMember) => {
    // Use technician_type as role if available, otherwise use the selected type
    const role = member.technician_type || selectedTechnicianType || "Technician";
    
    // Default times to event start/end
    const defaultCallTime = formatDateTimeForInput(eventStartDate, "09:00");
    const defaultEndTime = formatDateTimeForInput(eventEndDate, "18:00");

    onCrewSelect(
      member,
      role,
      defaultCallTime,
      defaultEndTime,
      null, // No hourly rate by default
    );
  };

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateTimeForInput = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const time = timeString || "09:00";
    return `${year}-${month}-${day}T${time}`;
  };

  const baseClasses = variant === "mobile"
    ? "fixed inset-0 z-[950] lg:hidden"
    : "hidden lg:block fixed right-0 top-0 h-screen w-96 bg-white border-l border-gray-200 shadow-lg overflow-y-auto z-40";

  return (
    <div className={baseClasses}>
      {variant === "mobile" && (
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      )}
      <div
        className={
          variant === "mobile"
            ? "absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 max-h-[90vh] overflow-y-auto"
            : "h-full"
        }
      >
        {variant === "mobile" && (
          <div className="h-1 w-12 bg-gray-300 rounded-full mx-auto mt-2 mb-4" />
        )}
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Add Crew</h2>
            {variant === "mobile" && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Technician Type Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Technician Type
            </label>
            <select
              value={selectedTechnicianType}
              onChange={(e) => setSelectedTechnicianType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Types</option>
              {COMMON_TECHNICIAN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search crew members..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Crew List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredCrew.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {query ? "No crew members found" : "No crew members available"}
            </div>
          ) : (
            <div className="space-y-2 mb-6" style={{ overflow: 'visible' }}>
              {filteredCrew
                .filter((member) => !existingCrewIds.includes(member.id))
                .map((member) => {
                  const isHovered = hoveredCrewId === member.id;
                  const memberCalendarData = crewCalendarData.get(member.id);
                  const isLoadingMemberCalendar = isLoadingCalendar.get(member.id) || false;

                  return (
                    <div
                      key={member.id}
                      className="relative"
                      onMouseEnter={(e) => {
                        // Desktop: Show on hover
                        if (variant === "desktop") {
                          // Clear any pending timeout
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = null;
                          }
                          isHoveringCalendarRef.current = false;
                          setHoveredCrewId(member.id);
                          const rect = e.currentTarget.getBoundingClientRect();
                          // Position tooltip to the left of the card, with minimal gap
                          // w-80 = 320px, use 4px gap instead of 8px to reduce mouse travel distance
                          setTooltipPosition({
                            x: rect.left - 324, // 320px (tooltip width) + 4px (smaller gap)
                            y: rect.top,
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        // Desktop only
                        if (variant === "desktop") {
                          // Don't close immediately - wait a bit to see if mouse moves to calendar
                          // The calendar's onMouseEnter will clear this timeout
                          hoverTimeoutRef.current = setTimeout(() => {
                            if (!isHoveringCalendarRef.current) {
                              setHoveredCrewId(null);
                              setTooltipPosition(null);
                            }
                          }, 300); // 300ms delay to allow moving to calendar
                        }
                      }}
                      onClick={(e) => {
                        // Mobile: Toggle calendar on click/tap
                        if (variant === "mobile") {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          if (hoveredCrewId === member.id) {
                            // Toggle off if already showing
                            setHoveredCrewId(null);
                            setTooltipPosition(null);
                          } else {
                            // Show calendar
                            setHoveredCrewId(member.id);
                            // Center the calendar on mobile
                            setTooltipPosition({
                              x: window.innerWidth / 2 - 160, // Center 320px wide calendar
                              y: rect.top + rect.height + 10, // Below the crew member card
                            });
                          }
                        }
                      }}
                    >
                      <div
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          isHovered
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        } ${member.on_leave ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-gray-900">{member.name}</div>
                              {member.on_leave && (
                                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium whitespace-nowrap">
                                  ❌ On Leave
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.email || member.contact || "No contact"}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {member.technician_type && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                  {member.technician_type}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {member.role}
                              </span>
                            </div>
                            {member.on_leave && member.leave_start_date && member.leave_end_date && (
                              <div className="text-xs text-red-600 mt-1">
                                {new Date(member.leave_start_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })} - {new Date(member.leave_end_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddCrew(member);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap ml-2"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Calendar Tooltip - Fixed position overlay */}
          {hoveredCrewId && tooltipPosition && (() => {
            const member = crewMembers.find((m) => m.id === hoveredCrewId);
            if (!member) return null;
            const memberCalendarData = crewCalendarData.get(hoveredCrewId);
            const isLoadingMemberCalendar = isLoadingCalendar.get(hoveredCrewId) || false;

            return (
              <div
                className={`fixed bg-white rounded-lg shadow-xl border border-gray-200 p-4 ${
                  variant === "mobile" ? "w-[calc(100vw-32px)] max-w-sm mx-4" : "w-80"
                }`}
                style={{
                  zIndex: variant === "mobile" ? 10000 : 9999,
                  left: variant === "mobile" ? "50%" : `${tooltipPosition.x}px`,
                  top: variant === "mobile" ? `${Math.min(tooltipPosition.y, window.innerHeight - 400)}px` : `${tooltipPosition.y}px`,
                  transform: variant === "mobile" ? "translateX(-50%)" : "none",
                  maxHeight: variant === "mobile" ? "calc(100vh - 200px)" : "none",
                  overflowY: variant === "mobile" ? "auto" : "visible",
                  pointerEvents: 'auto',
                }}
                onMouseEnter={() => {
                  // Desktop only
                  if (variant === "desktop") {
                    // Clear any pending timeout to close
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    isHoveringCalendarRef.current = true;
                  }
                }}
                onMouseLeave={() => {
                  // Desktop only
                  if (variant === "desktop") {
                    isHoveringCalendarRef.current = false;
                    // Close when leaving the calendar container, but with delay
                    hoverTimeoutRef.current = setTimeout(() => {
                      if (!isHoveringCalendarRef.current) {
                        setHoveredCrewId(null);
                        setTooltipPosition(null);
                      }
                    }, 300); // Longer delay to allow easier movement
                  }
                }}
                onClick={(e) => {
                  // Prevent closing when clicking inside calendar on mobile
                  if (variant === "mobile") {
                    e.stopPropagation();
                  }
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-900">
                    {member.name} - Availability
                  </div>
                  {variant === "mobile" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHoveredCrewId(null);
                        setTooltipPosition(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {isLoadingMemberCalendar ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : memberCalendarData ? (
                  <CrewAvailabilityCalendar
                    busyDates={memberCalendarData.busyDates}
                    unavailableDates={memberCalendarData.unavailableDates}
                    eventStartDate={eventStartDate}
                    eventEndDate={eventEndDate}
                  />
                ) : (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    Loading calendar...
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

// Crew Availability Calendar Component
interface CrewAvailabilityCalendarProps {
  busyDates: Array<{ start: string; end: string; eventName: string }>;
  unavailableDates: Array<{ start: string; end: string; reason: string }>;
  eventStartDate: string;
  eventEndDate: string;
}

function CrewAvailabilityCalendar({
  busyDates,
  unavailableDates,
  eventStartDate,
  eventEndDate,
}: CrewAvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  
  // Get first day of month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Helper to normalize date to start of day for comparison
  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  // Check if a date is busy
  const isBusy = (date: Date): boolean => {
    const normalizedDate = normalizeDate(date);
    return busyDates.some((range) => {
      const start = normalizeDate(new Date(range.start));
      const end = normalizeDate(new Date(range.end));
      // Check if date falls within the range (inclusive)
      return normalizedDate >= start && normalizedDate <= end;
    });
  };

  // Check if a date is unavailable
  const isUnavailable = (date: Date): boolean => {
    const normalizedDate = normalizeDate(date);
    return unavailableDates.some((range) => {
      const start = normalizeDate(new Date(range.start));
      const end = normalizeDate(new Date(range.end));
      // Check if date falls within the range (inclusive)
      return normalizedDate >= start && normalizedDate <= end;
    });
  };

  // Check if date is in event range
  const isEventDate = (date: Date): boolean => {
    const normalizedDate = normalizeDate(date);
    const eventStart = normalizeDate(new Date(eventStartDate));
    const eventEnd = normalizeDate(new Date(eventEndDate));
    return normalizedDate >= eventStart && normalizedDate <= eventEnd;
  };

  // Get date status
  const getDateStatus = (day: number): "available" | "busy" | "unavailable" | "event" => {
    // Create date at start of day in local timezone
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    
    // Check in priority order
    if (isUnavailable(date)) return "unavailable";
    if (isEventDate(date)) return "event";
    if (isBusy(date)) return "busy";
    return "available";
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): string[] => {
    const normalizedDate = normalizeDate(date);
    const events: string[] = [];
    
    busyDates.forEach((range) => {
      const start = normalizeDate(new Date(range.start));
      const end = normalizeDate(new Date(range.end));
      if (normalizedDate >= start && normalizedDate <= end) {
        events.push(range.eventName);
      }
    });
    
    return events;
  };

  // Get unavailable reason for a specific date
  const getUnavailableReasonForDate = (date: Date): string | null => {
    const normalizedDate = normalizeDate(date);
    
    for (const range of unavailableDates) {
      const start = normalizeDate(new Date(range.start));
      const end = normalizeDate(new Date(range.end));
      if (normalizedDate >= start && normalizedDate <= end) {
        return range.reason;
      }
    }
    
    return null;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPreviousMonth}
          className="p-1 hover:bg-gray-200 rounded"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-700">{monthName}</span>
        <button
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-200 rounded"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day) => (
          <div key={day} className="text-xs text-center text-gray-500 font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const status = getDateStatus(day);
          const isToday =
            day === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();

          let bgColor = "bg-white";
          let borderColor = "border-gray-200";
          let textColor = "text-gray-700";

          switch (status) {
            case "available":
              bgColor = "bg-green-50";
              borderColor = "border-green-300";
              textColor = "text-green-700";
              break;
            case "busy":
              bgColor = "bg-red-50";
              borderColor = "border-red-300";
              textColor = "text-red-700";
              break;
            case "unavailable":
              bgColor = "bg-gray-200";
              borderColor = "border-gray-400";
              textColor = "text-gray-600";
              break;
            case "event":
              bgColor = "bg-blue-50";
              borderColor = "border-blue-400";
              textColor = "text-blue-700";
              break;
          }

          if (isToday) {
            borderColor = "border-blue-600";
          }

          const date = new Date(year, month, day);
          date.setHours(0, 0, 0, 0);
          const isHovered = hoveredDate && normalizeDate(hoveredDate).getTime() === date.getTime();
          const eventsForDate = status === "busy" ? getEventsForDate(date) : [];
          const unavailableReason = status === "unavailable" ? getUnavailableReasonForDate(date) : null;

          return (
            <div
              key={day}
              className="relative"
              onMouseEnter={() => setHoveredDate(date)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <div
                className={`aspect-square flex items-center justify-center text-xs font-medium border rounded cursor-pointer transition-all ${
                  isHovered ? "ring-2 ring-blue-500 scale-110 z-10" : ""
                } ${bgColor} ${borderColor} ${textColor} ${
                  isToday ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {day}
              </div>
              
              {/* Tooltip for busy dates */}
              {isHovered && status === "busy" && eventsForDate.length > 0 && (
                <div 
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-20 min-w-[150px]"
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    // Keep tooltip visible
                  }}
                  onMouseLeave={() => setHoveredDate(null)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="font-semibold mb-1">Busy - Assigned to:</div>
                  {eventsForDate.map((eventName, idx) => (
                    <div key={idx} className="whitespace-normal break-words">• {eventName}</div>
                  ))}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
              
              {/* Tooltip for unavailable dates */}
              {isHovered && status === "unavailable" && unavailableReason && (
                <div 
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-normal z-20 max-w-[200px]"
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    // Keep tooltip visible
                  }}
                  onMouseLeave={() => setHoveredDate(null)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="font-semibold">Unavailable</div>
                  <div className="whitespace-normal break-words">{unavailableReason}</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-300 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-50 border border-green-300 rounded"></div>
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-50 border border-red-300 rounded"></div>
          <span className="text-gray-600">Busy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-200 border border-gray-400 rounded"></div>
          <span className="text-gray-600">Unavailable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-50 border border-blue-400 rounded"></div>
          <span className="text-gray-600">Event</span>
        </div>
      </div>
    </div>
  );
}

