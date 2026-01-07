"use client";

import { useState } from "react";
import type { Event, EventCrew } from "@/app/actions/events";
import type { CrewMember } from "@/app/actions/crew";

interface TimelineSchedulerProps {
  event: Event;
  crew: EventCrew[];
  onAssignClick?: (crewMember?: CrewMember) => void;
  onCellClick?: (crewMemberId: string, date: Date, assignment?: { assignmentId: string; startTime: Date | null; endTime: Date | null; isFullDay: boolean }) => void;
}

interface DayCellPopupProps {
  date: Date;
  existingAssignment?: {
    startTime: Date | null;
    endTime: Date | null;
    isFullDay: boolean;
    assignmentId?: string;
  };
  onSave: (mode: "full_day" | "custom", startTime?: string, endTime?: string) => void;
  onRemove: () => void;
  onCopyToNext: () => void;
  onApplyToAll: () => void;
  onClose: () => void;
}

function DayCellPopup({
  date,
  existingAssignment,
  onSave,
  onRemove,
  onCopyToNext,
  onApplyToAll,
  onClose,
}: DayCellPopupProps) {
  const [mode, setMode] = useState<"full_day" | "custom">(
    existingAssignment?.isFullDay ? "full_day" : "custom"
  );
  const [startTime, setStartTime] = useState(() => {
    if (existingAssignment?.startTime) {
      const d = existingAssignment.startTime;
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return "10:00";
  });
  const [endTime, setEndTime] = useState(() => {
    if (existingAssignment?.endTime) {
      const d = existingAssignment.endTime;
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return "14:00";
  });

  const handleSave = () => {
    if (mode === "full_day") {
      onSave("full_day");
    } else {
      onSave("custom", startTime, endTime);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h3>
          {existingAssignment && (
            <p className="text-xs text-gray-500">Edit assignment</p>
          )}
        </div>

        <div className="space-y-4">
          {/* Assignment Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Assignment Type:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("full_day")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === "full_day"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Full Day
              </button>
              <button
                onClick={() => setMode("custom")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === "custom"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Custom Time
              </button>
            </div>
          </div>

          {/* Time Inputs */}
          {mode === "custom" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Time:</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-gray-400 mt-5">–</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shortcuts */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
            {existingAssignment ? (
              <>
                <button
                  onClick={onCopyToNext}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Copy to Next Day
                </button>
                <button
                  onClick={onApplyToAll}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Apply to All Days
                </button>
                <button
                  onClick={onRemove}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                >
                  Remove
                </button>
              </>
            ) : mode === "custom" && (
              <>
                <button
                  onClick={() => {
                    onSave("custom", startTime, endTime);
                    onCopyToNext();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Copy to Next
                </button>
                <button
                  onClick={() => {
                    onSave("custom", startTime, endTime);
                    onApplyToAll();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Apply to All
                </button>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              {existingAssignment ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TimelineScheduler({ event, crew, onAssignClick, onCellClick }: TimelineSchedulerProps) {
  const [hoveredCell, setHoveredCell] = useState<{ crewId: string; date: Date } | null>(null);
  const [activePopup, setActivePopup] = useState<{ crewId: string; date: Date } | null>(null);

  // Generate dates for the event
  const eventStart = new Date(event.start_date);
  const eventEnd = new Date(event.end_date);
  const days: Date[] = [];
  
  for (let d = new Date(eventStart); d <= eventEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  // Get assignments grouped by crew member
  const crewMembers = new Map<string, {
    id: string;
    name: string;
    role: string;
    assignments: Map<string, { 
      startTime: Date | null; 
      endTime: Date | null; 
      isFullDay: boolean;
      assignmentId: string;
      hasConflict?: boolean;
      conflictEvent?: string;
    }>;
  }>();

  crew.forEach((assignment) => {
    if (!crewMembers.has(assignment.crew_member_id)) {
      crewMembers.set(assignment.crew_member_id, {
        id: assignment.crew_member_id,
        name: assignment.crew_member_name || "Unknown",
        role: assignment.role,
        assignments: new Map(),
      });
    }

    const member = crewMembers.get(assignment.crew_member_id)!;
    const callTime = assignment.call_time ? new Date(assignment.call_time) : null;
    const endTime = assignment.end_time ? new Date(assignment.end_time) : null;

    // Determine if it's a full day assignment
    const isFullDay = callTime && endTime 
      ? callTime.getHours() === 9 && callTime.getMinutes() === 0 && 
        endTime.getHours() === 18 && endTime.getMinutes() === 0
      : false;

    // Check if assignment spans multiple days
    if (callTime && endTime) {
      const startDate = new Date(callTime);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endTime);
      endDate.setHours(0, 0, 0, 0);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        member.assignments.set(dateKey, { 
          startTime: callTime, 
          endTime, 
          isFullDay,
          assignmentId: assignment.id,
        });
      }
    }
  });

  // Format time for display
  const formatTime = (date: Date | null): string => {
    if (!date) return "";
    return date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  };

  // Get cell content and styling
  const getCellContent = (
    assignment: { isFullDay: boolean; startTime: Date | null; endTime: Date | null; hasConflict?: boolean; conflictEvent?: string } | undefined,
    isHovered: boolean
  ) => {
    if (!assignment) {
      return {
        content: isHovered ? "+ Assign" : "—",
        className: `px-2 py-2 rounded-md border-2 border-dashed border-gray-300 bg-white text-gray-400 text-xs text-center cursor-pointer transition-all ${
          isHovered ? "border-blue-400 bg-blue-50 text-blue-600 shadow-sm" : "hover:border-gray-400 hover:bg-gray-50"
        }`,
      };
    }

    if (assignment.hasConflict) {
      return {
        content: (
          <span className="flex items-center justify-center gap-1">
            {assignment.startTime && assignment.endTime 
              ? `${formatTime(assignment.startTime)} – ${formatTime(assignment.endTime)}`
              : "FULL DAY"
            }
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </span>
        ),
        className: "px-2 py-2 rounded-md border-2 border-red-300 bg-red-50 text-red-900 text-xs font-medium text-center cursor-pointer hover:border-red-400 hover:shadow-sm transition-all",
        tooltip: assignment.conflictEvent || "Conflicts with another event",
      };
    }

    if (assignment.isFullDay) {
      return {
        content: "FULL DAY",
        className: "px-2 py-2 rounded-full border border-green-300 bg-green-100 text-green-900 text-xs font-semibold text-center cursor-pointer hover:bg-green-200 hover:shadow-sm transition-all",
      };
    }

    return {
      content: `${formatTime(assignment.startTime)} – ${formatTime(assignment.endTime)}`,
      className: "px-2 py-2 rounded-md border border-blue-300 bg-blue-100 text-blue-900 text-xs font-medium text-center cursor-pointer hover:bg-blue-200 hover:shadow-sm transition-all",
    };
  };

  const handleCellClick = (crewId: string, date: Date, assignment?: { assignmentId: string }) => {
    setActivePopup({ crewId, date });
  };

  const handleSaveAssignment = (crewId: string, date: Date, mode: "full_day" | "custom", startTime?: string, endTime?: string) => {
    // This will be handled by the parent component
    // For now, close the popup
    setActivePopup(null);
    // TODO: Implement save logic
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="space-y-6">
        {Array.from(crewMembers.values()).map((member) => (
          <div key={member.id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
            {/* Crew Member Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-gray-900">{member.name}</div>
                <div className="text-sm text-gray-500">{member.role}</div>
              </div>
            </div>

            {/* Timeline Strip */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {days.map((day) => {
                const dateKey = day.toISOString().split('T')[0];
                const assignment = member.assignments.get(dateKey);
                const isToday = day.toDateString() === new Date().toDateString();
                const isHovered = hoveredCell?.crewId === member.id && hoveredCell?.date.toDateString() === day.toDateString();
                const isPopupOpen = activePopup?.crewId === member.id && activePopup?.date.toDateString() === day.toDateString();
                
                const cellContent = getCellContent(assignment, isHovered);

                return (
                  <div
                    key={dateKey}
                    className="flex-shrink-0 w-32"
                  >
                    <div className={`text-xs font-medium mb-1.5 ${isToday ? "text-blue-600" : "text-gray-600"}`}>
                      {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div
                      className={cellContent.className}
                      onMouseEnter={() => setHoveredCell({ crewId: member.id, date: day })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => handleCellClick(member.id, day, assignment)}
                      title={cellContent.tooltip || undefined}
                    >
                      {cellContent.content}
                    </div>

                    {/* Popup */}
                    {isPopupOpen && (
                      <DayCellPopup
                        date={day}
                        existingAssignment={assignment}
                        onSave={(mode, startTime, endTime) => {
                          handleSaveAssignment(member.id, day, mode, startTime, endTime);
                        }}
                        onRemove={() => {
                          setActivePopup(null);
                          // TODO: Implement remove logic
                        }}
                        onCopyToNext={() => {
                          // TODO: Implement copy to next day
                          setActivePopup(null);
                        }}
                        onApplyToAll={() => {
                          // TODO: Implement apply to all days
                          setActivePopup(null);
                        }}
                        onClose={() => setActivePopup(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {crewMembers.size === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No crew members assigned yet.</p>
            <p className="text-xs mt-1">Use the right panel to assign crew members.</p>
          </div>
        )}
      </div>
    </div>
  );
}
