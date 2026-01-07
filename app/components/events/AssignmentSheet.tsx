"use client";

import { useState, useEffect } from "react";
import type { Event, EventCrew } from "@/app/actions/events";
import type { CrewMember } from "@/app/actions/crew";

interface AssignmentSheetProps {
  crewMember: CrewMember;
  event: Event;
  existingAssignment?: EventCrew | null;
  onSave: (assignments: DayAssignment[]) => void;
  onCancel: () => void;
}

interface DayAssignment {
  date: Date;
  mode: "none" | "full_day" | "custom";
  startTime: string;
  endTime: string;
}

export default function AssignmentSheet({ crewMember, event, existingAssignment, onSave, onCancel }: AssignmentSheetProps) {
  const eventStart = new Date(event.start_date);
  const eventEnd = new Date(event.end_date);
  const days: Date[] = [];
  
  for (let d = new Date(eventStart); d <= eventEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  // Initialize assignments from existing assignment if editing
  const initializeAssignments = (): DayAssignment[] => {
    if (existingAssignment) {
      return days.map(day => {
        const dateStr = day.toISOString().split('T')[0];
        
        // Check if this day has assignment times
        if (existingAssignment.call_time && existingAssignment.end_time) {
          const callTime = new Date(existingAssignment.call_time);
          const endTime = new Date(existingAssignment.end_time);
          const dayStr = callTime.toISOString().split('T')[0];
          
          // Check if this day matches
          if (dayStr === dateStr) {
            // Check if it's full day (9 AM - 6 PM)
            if (callTime.getHours() === 9 && callTime.getMinutes() === 0 && 
                endTime.getHours() === 18 && endTime.getMinutes() === 0) {
              return {
                date: new Date(day),
                mode: "full_day",
                startTime: "09:00",
                endTime: "18:00",
              };
            } else {
              // Custom time
              return {
                date: new Date(day),
                mode: "custom",
                startTime: `${String(callTime.getHours()).padStart(2, '0')}:${String(callTime.getMinutes()).padStart(2, '0')}`,
                endTime: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
              };
            }
          }
        }
        
        // Default to none for days without assignment
        return {
          date: new Date(day),
          mode: "none",
          startTime: "09:00",
          endTime: "18:00",
        };
      });
    }
    
    // New assignment - all days set to none
    return days.map(day => ({
      date: new Date(day),
      mode: "none",
      startTime: "09:00",
      endTime: "18:00",
    }));
  };

  const [assignments, setAssignments] = useState<DayAssignment[]>(initializeAssignments());
  
  // Update assignments when existingAssignment changes
  useEffect(() => {
    setAssignments(initializeAssignments());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAssignment?.id]);

  const updateAssignment = (index: number, updates: Partial<DayAssignment>) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], ...updates };
    setAssignments(newAssignments);
  };

  const copyToAllDays = (sourceIndex: number) => {
    const source = assignments[sourceIndex];
    setAssignments(assignments.map((a, i) => 
      i === sourceIndex ? a : { ...source, date: a.date }
    ));
  };

  const handleSave = () => {
    onSave(assignments);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
      <div className="bg-white h-full w-full max-w-2xl shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {existingAssignment ? "Edit Assignment" : "Assign Crew Member"}: {crewMember.name} • {crewMember.technician_type || "Technician"}
              </h2>
              {crewMember.base_rate && crewMember.rate_type && (
                <p className="text-sm text-gray-500 mt-1">
                  Rate: ${crewMember.base_rate.toFixed(2)}/{crewMember.rate_type === "hourly" ? "hr" : crewMember.rate_type === "daily" ? "day" : crewMember.rate_type === "weekly" ? "wk" : "mo"}
                </p>
              )}
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Mode</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Time</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {assignment.date.toLocaleDateString("en-US", { 
                        weekday: "short",
                        month: "short", 
                        day: "numeric" 
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={assignment.mode}
                        onChange={(e) => {
                          const mode = e.target.value as "none" | "full_day" | "custom";
                          updateAssignment(index, { mode });
                        }}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">None</option>
                        <option value="full_day">Full Day</option>
                        <option value="custom">Custom Time</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {assignment.mode === "custom" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={assignment.startTime}
                            onChange={(e) => updateAssignment(index, { startTime: e.target.value })}
                            className="text-sm border border-gray-300 rounded px-2 py-1 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-gray-400">–</span>
                          <input
                            type="time"
                            value={assignment.endTime}
                            onChange={(e) => updateAssignment(index, { endTime: e.target.value })}
                            className="text-sm border border-gray-300 rounded px-2 py-1 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : assignment.mode === "full_day" ? (
                        <span className="text-sm text-gray-500">9:00 AM – 6:00 PM</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {assignment.mode !== "none" && (
                        <button
                          onClick={() => copyToAllDays(index)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Copy to All
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Conflict Warnings */}
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-yellow-800">
                <strong>Note:</strong> The system will check for scheduling conflicts when you save.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Auto-assign available hours (placeholder)
                  const autoAssignments = assignments.map(a => ({
                    ...a,
                    mode: "full_day" as const,
                  }));
                  setAssignments(autoAssignments);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Auto-Assign Available Hours
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

