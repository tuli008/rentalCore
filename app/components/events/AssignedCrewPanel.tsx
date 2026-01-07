"use client";

import { useState } from "react";
import type { Event, EventCrew } from "@/app/actions/events";
import { deleteEventCrew } from "@/app/actions/events";
import { sendCrewNotification } from "@/app/actions/notifications";
import { useRouter } from "next/navigation";
import InlineCalendar from "./InlineCalendar";

interface AssignedCrewPanelProps {
  event: Event;
  crew: EventCrew[];
  onEdit?: (assignment: EventCrew) => void;
}

export default function AssignedCrewPanel({ event, crew, onEdit }: AssignedCrewPanelProps) {
  const router = useRouter();
  const [expandedCalendars, setExpandedCalendars] = useState<Set<string>>(new Set());
  const [sendingNotificationId, setSendingNotificationId] = useState<string | null>(null);

  // Group crew by role
  const crewByRole = new Map<string, EventCrew[]>();
  crew.forEach((member) => {
    const role = member.role || "Other";
    if (!crewByRole.has(role)) {
      crewByRole.set(role, []);
    }
    crewByRole.get(role)!.push(member);
  });

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return "—";
    const date = new Date(dateTimeString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleNotify = async (assignmentId: string) => {
    setSendingNotificationId(assignmentId);
    try {
      const result = await sendCrewNotification(assignmentId);
      if (result.success) {
        alert("Notification sent successfully!");
      } else {
        alert(result.error || "Failed to send notification");
      }
    } catch (error) {
      alert("Failed to send notification");
    } finally {
      setSendingNotificationId(null);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!confirm("Remove this crew member from the event?")) return;

    const formData = new FormData();
    formData.append("id", assignmentId);
    formData.append("event_id", event.id);

    const result = await deleteEventCrew(formData);
    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  };

  const toggleCalendar = (assignmentId: string) => {
    setExpandedCalendars((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assignmentId)) {
        newSet.delete(assignmentId);
      } else {
        newSet.add(assignmentId);
      }
      return newSet;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Assigned Crew</h2>
        <p className="text-xs text-gray-500 mt-1">Final assignments for this event</p>
      </div>

      {/* Assigned Crew List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {crew.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No crew members assigned yet.</p>
            <p className="text-xs mt-1">Use the left panel to assign crew members.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(crewByRole.entries()).map(([role, members]) => (
              <div key={role}>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {role} ({members.length} assigned)
                  </h3>
                </div>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {member.crew_member_name || "Unknown"}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {new Date(event.start_date).toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric" 
                            })}–{new Date(event.end_date).toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric" 
                            })}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Call time: {formatDateTime(member.call_time)}
                          </div>
                          {member.rate && member.rate_type && (
                            <div className="text-sm text-gray-600 mt-1">
                              Rate: ${member.rate.toFixed(2)}/
                              {member.rate_type === "hourly"
                                ? "hr"
                                : member.rate_type === "daily"
                                ? "day"
                                : member.rate_type === "weekly"
                                ? "wk"
                                : "mo"}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => onEdit && onEdit(member)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleNotify(member.id)}
                            disabled={sendingNotificationId === member.id}
                            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            {sendingNotificationId === member.id ? "Sending..." : "Notify"}
                          </button>
                          <button
                            onClick={() => handleRemove(member.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Calendar */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => toggleCalendar(member.id)}
                          className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${expandedCalendars.has(member.id) ? "rotate-90" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Show availability timeline
                        </button>
                        {expandedCalendars.has(member.id) && (
                          <div className="mt-2">
                            <InlineCalendar
                              crewMemberId={member.crew_member_id}
                              eventStartDate={event.start_date}
                              eventEndDate={event.end_date}
                              eventId={event.id}
                              eventName={event.name}
                              currentAssignment={{
                                callTime: member.call_time,
                                endTime: member.end_time,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

