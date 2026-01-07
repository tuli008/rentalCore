"use client";

import { useState, useEffect, useRef } from "react";
import { getCrewMembers, type CrewMember } from "@/app/actions/crew";
import { COMMON_TECHNICIAN_TYPES } from "@/lib/technician-types";

interface CrewSidebarProps {
  eventId: string;
  eventStartDate: string;
  eventEndDate: string;
  onCrewSelect: (crewMember: CrewMember, role: string, callTime: string | null, endTime: string | null, rate: string | null, rateType: string | null) => void;
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<"hourly" | "daily">("daily");
  const [dateAssignmentType, setDateAssignmentType] = useState<"hourly" | "daily">("hourly");
  const [dateStartTime, setDateStartTime] = useState("09:00");
  const [dateEndTime, setDateEndTime] = useState("18:00");
  const [isAssigning, setIsAssigning] = useState(false);
  const [pinnedCalendarId, setPinnedCalendarId] = useState<string | null>(null); // Pin calendar open
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
    busyDates: Array<{ 
      start: string; 
      end: string; 
      eventName: string;
      callTime: string | null;
      endTime: string | null;
    }>;
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
    
    // Use crew member's base rate and rate_type if available, otherwise null
    const rate = member.base_rate?.toString() || null;
    const rateType = member.rate_type || null;
    
    // Default times based on assignment mode
    let defaultCallTime: string | null;
    let defaultEndTime: string | null;
    
    if (assignmentMode === "hourly") {
      // For hourly, use event start date with default 9 AM start
      // End time will need to be set by user or default to a few hours later
      defaultCallTime = formatDateTimeForInput(eventStartDate, "09:00");
      // Default to 4 hours later for hourly assignments
      const endDate = new Date(eventStartDate);
      endDate.setHours(13, 0, 0); // 1 PM (4 hours later)
      defaultEndTime = formatDateTimeForInput(endDate.toISOString(), "13:00");
    } else {
      // For daily, use full event start/end dates
      defaultCallTime = formatDateTimeForInput(eventStartDate, "09:00");
      defaultEndTime = formatDateTimeForInput(eventEndDate, "18:00");
    }

    onCrewSelect(
      member,
      role,
      defaultCallTime,
      defaultEndTime,
      rate, // Use crew member's base rate
      rateType, // Use crew member's rate type
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

          {/* Assignment Mode Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Mode:
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setAssignmentMode("hourly")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  assignmentMode === "hourly"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Hourly
              </button>
              <button
                onClick={() => setAssignmentMode("daily")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  assignmentMode === "daily"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Daily
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {assignmentMode === "hourly" 
                ? "Assign for specific time slots within a day"
                : "Assign for full day(s)"}
            </p>
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
                          // Clear any pending timeout immediately
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = null;
                          }
                          // Reset hover state
                          isHoveringCalendarRef.current = false;
                          // Show calendar immediately
                          setHoveredCrewId(member.id);
                          const rect = e.currentTarget.getBoundingClientRect();
                          // Position tooltip to the left of the card, overlapping slightly for easier mouse movement
                          const calendarWidth = 320;
                          const overlap = 12; // Increased overlap for easier transition
                          setTooltipPosition({
                            x: Math.max(8, rect.left - calendarWidth + overlap), // Ensure it doesn't go off screen left
                            y: Math.max(8, rect.top), // Ensure it doesn't go off screen top
                          });
                        }
                      }}
                      onMouseLeave={(e) => {
                        // Desktop only
                        if (variant === "desktop") {
                          // Don't close if calendar is pinned
                          if (pinnedCalendarId === member.id) {
                            return;
                          }
                          // Clear any existing timeout first
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                          }
                          // Don't close immediately - wait a bit to see if mouse moves to calendar
                          // The bridge area and calendar onMouseEnter will clear this timeout
                          hoverTimeoutRef.current = setTimeout(() => {
                            // Double-check that we're still not hovering over calendar and not pinned
                            if (!isHoveringCalendarRef.current && pinnedCalendarId !== member.id) {
                              setHoveredCrewId(null);
                              setTooltipPosition(null);
                            }
                          }, 1000); // Increased delay to 1000ms (1 second) for much better stability
                        }
                      }}
                      onClick={(e) => {
                        // Desktop: Pin calendar on click
                        if (variant === "desktop") {
                          e.stopPropagation();
                          if (pinnedCalendarId === member.id) {
                            // Unpin
                            setPinnedCalendarId(null);
                            setHoveredCrewId(null);
                            setTooltipPosition(null);
                          } else {
                            // Pin this calendar
                            setPinnedCalendarId(member.id);
                            setHoveredCrewId(member.id);
                            if (!tooltipPosition) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const calendarWidth = 320;
                              const overlap = 12;
                              setTooltipPosition({
                                x: Math.max(8, rect.left - calendarWidth + overlap),
                                y: Math.max(8, rect.top),
                              });
                            }
                          }
                          return;
                        }
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
              <>
                {/* Invisible bridge area to help mouse transition from card to calendar */}
                {variant === "desktop" && tooltipPosition && (
                  <div
                    className="fixed"
                    style={{
                      zIndex: 9998,
                      left: `${Math.max(0, tooltipPosition.x + 312)}px`, // Right edge of calendar
                      top: `${Math.max(8, Math.min(tooltipPosition.y, window.innerHeight - 420))}px`,
                      width: '50px', // Much wider bridge for easier transition
                      height: '400px',
                      pointerEvents: 'auto',
                      cursor: 'default',
                    }}
                    onMouseEnter={() => {
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      isHoveringCalendarRef.current = true;
                    }}
                    onMouseLeave={() => {
                      isHoveringCalendarRef.current = false;
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                      }
                      hoverTimeoutRef.current = setTimeout(() => {
                        if (!isHoveringCalendarRef.current) {
                          setHoveredCrewId(null);
                          setTooltipPosition(null);
                        }
                      }, 1000); // Match card leave delay
                    }}
                  />
                )}
                <div
                  className={`fixed bg-white rounded-lg shadow-xl border border-gray-200 p-4 ${
                    variant === "mobile" ? "w-[calc(100vw-32px)] max-w-sm mx-4" : "w-80"
                  }`}
                  style={{
                    zIndex: variant === "mobile" ? 10000 : 9999,
                    left: variant === "mobile" ? "50%" : `${tooltipPosition.x}px`,
                    top: variant === "mobile" 
                      ? `${Math.min(tooltipPosition.y, window.innerHeight - 400)}px` 
                      : `${Math.max(8, Math.min(tooltipPosition.y, window.innerHeight - 420))}px`,
                    transform: variant === "mobile" ? "translateX(-50%)" : "none",
                    maxHeight: variant === "mobile" ? "calc(100vh - 200px)" : "400px",
                    overflowY: variant === "mobile" ? "auto" : "auto",
                    pointerEvents: 'auto',
                  }}
                  onMouseEnter={() => {
                    // Desktop only
                    if (variant === "desktop") {
                      // Clear any pending timeout to close immediately
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      // Mark that we're hovering over calendar
                      isHoveringCalendarRef.current = true;
                    }
                  }}
                  onMouseLeave={() => {
                    // Desktop only
                    if (variant === "desktop") {
                      // Don't close if calendar is pinned
                      if (pinnedCalendarId === hoveredCrewId) {
                        isHoveringCalendarRef.current = false;
                        return;
                      }
                      // Mark that we left the calendar
                      isHoveringCalendarRef.current = false;
                      // Clear any existing timeout first
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                      }
                      // Close when leaving the calendar container, but with longer delay
                      hoverTimeoutRef.current = setTimeout(() => {
                        // Double-check we're still not hovering and not pinned
                        if (!isHoveringCalendarRef.current && pinnedCalendarId !== hoveredCrewId) {
                          setHoveredCrewId(null);
                          setTooltipPosition(null);
                        }
                      }, 1200); // Increased delay to 1200ms (1.2 seconds) for maximum stability
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
                    onDateClick={(date) => {
                      setSelectedDate(date);
                    }}
                  />
                ) : (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    Loading calendar...
                  </div>
                )}
              </div>
              </>
            );
          })()}

        </div>
      </div>

      {/* Time Slots Modal */}
      {selectedDate && (() => {
        const member = crewMembers.find((m) => m.id === hoveredCrewId);
        if (!member) return null;
        const memberCalendarData = crewCalendarData.get(hoveredCrewId || "");
        if (!memberCalendarData) return null;

        const timeSlots = getTimeSlotsForDate(selectedDate, memberCalendarData.busyDates);
        const availableSlots = getAvailableTimeSlots(timeSlots);
        
        // Helper to convert time string to datetime
        const timeToDateTime = (date: Date, timeStr: string): string => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const dt = new Date(date);
          dt.setHours(hours, minutes, 0, 0);
          return dt.toISOString().slice(0, 16);
        };
        
        const handleAssign = async () => {
          if (dateAssignmentType === "daily") {
            // Full day assignment
            const callTime = timeToDateTime(selectedDate, "09:00");
            const endTimeDT = timeToDateTime(selectedDate, "18:00");
            
            const role = member.technician_type || selectedTechnicianType || "Technician";
            const rate = member.base_rate?.toString() || null;
            const rateType = member.rate_type || null;
            
            setIsAssigning(true);
            onCrewSelect(member, role, callTime, endTimeDT, rate, rateType);
            setSelectedDate(null);
            setIsAssigning(false);
          } else {
            // Hourly assignment
            const callTime = timeToDateTime(selectedDate, dateStartTime);
            const endTimeDT = timeToDateTime(selectedDate, dateEndTime);
            
            if (dateStartTime >= dateEndTime) {
              alert("Start time must be before end time");
              setIsAssigning(false);
              return;
            }
            
            const role = member.technician_type || selectedTechnicianType || "Technician";
            const rate = member.base_rate?.toString() || null;
            const rateType = member.rate_type || null;
            
            setIsAssigning(true);
            onCrewSelect(member, role, callTime, endTimeDT, rate, rateType);
            setSelectedDate(null);
            setIsAssigning(false);
          }
        };
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center p-4" onClick={() => setSelectedDate(null)}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Assign {member.name} - {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Blocked Time Slots */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Assignments:</h4>
                {timeSlots.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {timeSlots.map((slot, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                        <div>
                          <div className="text-sm font-medium text-red-900">{slot.eventName}</div>
                          <div className="text-xs text-red-700">{slot.startTime} - {slot.endTime}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 p-3 bg-green-50 border border-green-200 rounded">
                    ✅ Available all day
                  </div>
                )}
              </div>

              {/* Available Time Slots (for reference) */}
              {timeSlots.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Available Time Slots:</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                    {availableSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        className="p-2 bg-green-50 border border-green-200 rounded text-sm text-center hover:bg-green-100 transition-colors"
                        onClick={() => {
                          const [start, startPeriod] = slot.start.split(' ');
                          const [end, endPeriod] = slot.end.split(' ');
                          const parseTime = (time: string, period: string) => {
                            const [h, m] = time.split(':');
                            let hour = parseInt(h);
                            if (period === 'PM' && hour !== 12) hour += 12;
                            if (period === 'AM' && hour === 12) hour = 0;
                            return `${hour.toString().padStart(2, '0')}:${m || '00'}`;
                          };
                          setDateStartTime(parseTime(start, startPeriod));
                          setDateEndTime(parseTime(end, endPeriod));
                          setDateAssignmentType("hourly");
                        }}
                      >
                        {slot.start} - {slot.end}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Type:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDateAssignmentType("hourly")}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      dateAssignmentType === "hourly"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Hourly (Time Range)
                  </button>
                  <button
                    onClick={() => setDateAssignmentType("daily")}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      dateAssignmentType === "daily"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Daily (Full Day)
                  </button>
                </div>
              </div>

              {/* Time Selection (only for hourly) */}
              {dateAssignmentType === "hourly" && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time:
                    </label>
                    <input
                      type="time"
                      value={dateStartTime}
                      onChange={(e) => setDateStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time:
                    </label>
                    <input
                      type="time"
                      value={dateEndTime}
                      onChange={(e) => setDateEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    Selected: {dateStartTime} - {dateEndTime}
                  </div>
                </div>
              )}

              {/* Assign Button */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setSelectedDate(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={isAssigning}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAssigning ? "Assigning..." : `Assign ${dateAssignmentType === "daily" ? "Full Day" : "Time Slot"}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  // Helper function to get time slots for a date
  function getTimeSlotsForDate(
    date: Date,
    busyDates: Array<{ start: string; end: string; eventName: string; callTime: string | null; endTime: string | null }>
  ): Array<{ eventName: string; startTime: string; endTime: string }> {
    const normalizeDate = (date: Date): Date => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };

    const normalizedDate = normalizeDate(date);
    const slots: Array<{ eventName: string; startTime: string; endTime: string }> = [];

    busyDates.forEach((range) => {
      const start = normalizeDate(new Date(range.start));
      const end = normalizeDate(new Date(range.end));
      if (normalizedDate >= start && normalizedDate <= end) {
        const callTime = range.callTime ? new Date(range.callTime) : new Date(range.start);
        const endTime = range.endTime ? new Date(range.endTime) : new Date(range.end);
        
        const formatTime = (d: Date) => {
          return d.toLocaleTimeString("en-US", { 
            hour: "numeric", 
            minute: "2-digit",
            hour12: true 
          });
        };
        
        slots.push({
          eventName: range.eventName,
          startTime: formatTime(callTime),
          endTime: formatTime(endTime),
        });
      }
    });

    return slots.sort((a, b) => {
      const timeA = a.startTime.split(" ")[0].split(":");
      const timeB = b.startTime.split(" ")[0].split(":");
      const hourA = parseInt(timeA[0]) + (a.startTime.includes("PM") && parseInt(timeA[0]) !== 12 ? 12 : 0);
      const hourB = parseInt(timeB[0]) + (b.startTime.includes("PM") && parseInt(timeB[0]) !== 12 ? 12 : 0);
      return hourA - hourB;
    });
  }

  // Helper function to get available time slots
  function getAvailableTimeSlots(
    busySlots: Array<{ startTime: string; endTime: string }>
  ): Array<{ start: string; end: string }> {
    if (busySlots.length === 0) {
      return [{ start: "9:00 AM", end: "6:00 PM" }];
    }

    const availableSlots: Array<{ start: string; end: string }> = [];
    const dayStart = "9:00 AM";
    const dayEnd = "6:00 PM";

    // Convert time strings to minutes for easier comparison
    const timeToMinutes = (timeStr: string): number => {
      const [time, period] = timeStr.split(" ");
      const [hours, minutes] = time.split(":").map(Number);
      let total = hours * 60 + minutes;
      if (period === "PM" && hours !== 12) total += 12 * 60;
      if (period === "AM" && hours === 12) total -= 12 * 60;
      return total;
    };

    const minutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`;
    };

    let currentTime = timeToMinutes(dayStart);

    busySlots.forEach((slot) => {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);

      if (currentTime < slotStart) {
        availableSlots.push({
          start: minutesToTime(currentTime),
          end: minutesToTime(slotStart),
        });
      }

      currentTime = Math.max(currentTime, slotEnd);
    });

    if (currentTime < timeToMinutes(dayEnd)) {
      availableSlots.push({
        start: minutesToTime(currentTime),
        end: dayEnd,
      });
    }

    return availableSlots;
  }
}

// Crew Availability Calendar Component
interface CrewAvailabilityCalendarProps {
  busyDates: Array<{ 
    start: string; 
    end: string; 
    eventName: string;
    callTime: string | null;
    endTime: string | null;
  }>;
  unavailableDates: Array<{ start: string; end: string; reason: string }>;
  eventStartDate: string;
  eventEndDate: string;
  onDateClick?: (date: Date) => void;
}

function CrewAvailabilityCalendar({
  busyDates,
  unavailableDates,
  eventStartDate,
  eventEndDate,
  onDateClick,
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

  // Get events for a specific date with time ranges
  const getEventsForDate = (date: Date): Array<{ name: string; startTime: string; endTime: string }> => {
    const normalizedDate = normalizeDate(date);
    const events: Array<{ name: string; startTime: string; endTime: string }> = [];
    
    busyDates.forEach((range) => {
      const start = normalizeDate(new Date(range.start));
      const end = normalizeDate(new Date(range.end));
      if (normalizedDate >= start && normalizedDate <= end) {
        const callTime = range.callTime ? new Date(range.callTime) : new Date(range.start);
        const endTime = range.endTime ? new Date(range.endTime) : new Date(range.end);
        
        // Format time
        const formatTime = (d: Date) => {
          return d.toLocaleTimeString("en-US", { 
            hour: "numeric", 
            minute: "2-digit",
            hour12: true 
          });
        };
        
        events.push({
          name: range.eventName,
          startTime: formatTime(callTime),
          endTime: formatTime(endTime),
        });
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
                onClick={() => {
                  if (onDateClick) {
                    onDateClick(date);
                  }
                }}
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
                  {eventsForDate.map((event, idx) => (
                    <div key={idx} className="whitespace-normal break-words">
                      • {event.name} ({event.startTime} - {event.endTime})
                    </div>
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

