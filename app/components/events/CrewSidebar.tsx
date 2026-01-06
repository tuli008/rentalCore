"use client";

import { useState, useEffect, useRef } from "react";
import { getCrewMembers, type CrewMember } from "@/app/actions/crew";
import { checkCrewAvailability, type CrewAvailability } from "@/app/actions/events";
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

const COMMON_ROLES = COMMON_TECHNICIAN_TYPES;

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
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [callTime, setCallTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [availability, setAvailability] = useState<CrewAvailability | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Filter crew members by query
  const filteredCrew = crewMembers.filter((member) => {
    if (!query.trim()) return true;
    const searchTerm = query.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchTerm) ||
      member.email?.toLowerCase().includes(searchTerm) ||
      member.contact?.toLowerCase().includes(searchTerm)
    );
  });

  // Check availability when crew member and times are selected
  useEffect(() => {
    if (selectedCrew && eventId) {
      setIsCheckingAvailability(true);
      checkCrewAvailability(
        selectedCrew.id,
        eventId,
        callTime || null,
        endTime || null,
      )
        .then((avail) => {
          setAvailability(avail);
        })
        .catch((error) => {
          console.error("Error checking availability:", error);
          setAvailability({
            available: false,
            status: "unavailable",
            unavailable: { reason: "Error checking availability" },
          });
        })
        .finally(() => {
          setIsCheckingAvailability(false);
        });
    } else {
      setAvailability(null);
    }
  }, [selectedCrew, eventId, callTime, endTime]);

  const handleCrewClick = (member: CrewMember) => {
    setSelectedCrew(member);
    setQuery("");
  };

  const handleAdd = () => {
    if (selectedCrew && selectedRole) {
      onCrewSelect(
        selectedCrew,
        selectedRole,
        callTime || null,
        endTime || null,
        hourlyRate || null,
      );
      // Reset form
      setSelectedCrew(null);
      setSelectedRole("");
      setCallTime("");
      setEndTime("");
      setHourlyRate("");
      setAvailability(null);
    }
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
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {filteredCrew
                .filter((member) => !existingCrewIds.includes(member.id))
                .map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleCrewClick(member)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedCrew?.id === member.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    } ${member.on_leave ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">{member.name}</div>
                      {member.on_leave && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                          ❌ On Leave
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {member.email || member.contact || "No contact"}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {member.role}
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
                  </button>
                ))}
            </div>
          )}

          {/* Assignment Form */}
          {selectedCrew && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected Crew Member
                </label>
                <div className="p-2 bg-gray-50 rounded border">
                  <div className="font-medium text-gray-900">{selectedCrew.name}</div>
                  <div className="text-sm text-gray-500">
                    {selectedCrew.email || selectedCrew.contact || "No contact"}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedRole === role
                          ? "bg-blue-100 border-blue-500 text-blue-700"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Call Time
                  </label>
                  <input
                    type="datetime-local"
                    value={callTime || formatDateTimeForInput(eventStartDate)}
                    onChange={(e) => setCallTime(e.target.value)}
                    min={formatDateTimeForInput(eventStartDate, "00:00")}
                    max={formatDateTimeForInput(eventEndDate, "23:59")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime || formatDateTimeForInput(eventEndDate)}
                    onChange={(e) => setEndTime(e.target.value)}
                    min={callTime || formatDateTimeForInput(eventStartDate, "00:00")}
                    max={formatDateTimeForInput(eventEndDate, "23:59")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Availability Status */}
              {isCheckingAvailability ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Checking availability...
                </div>
              ) : availability ? (
                <div
                  className={`p-3 rounded-lg border ${
                    availability.status === "available"
                      ? "bg-green-50 border-green-200"
                      : availability.status === "conflict"
                        ? "bg-red-50 border-red-200"
                        : availability.status === "partial"
                          ? "bg-yellow-50 border-yellow-200"
                          : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {availability.status === "available" ? (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-medium">✅ Available</span>
                    </div>
                  ) : availability.status === "conflict" && availability.conflict ? (
                    <div className="text-sm text-red-700">
                      <div className="font-medium flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Conflict</span>
                      </div>
                      <div className="text-xs mt-1">
                        Already assigned to: <span className="font-medium">{availability.conflict.event_name}</span>
                      </div>
                      <div className="text-xs mt-1">
                        {new Date(availability.conflict.call_time).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })} - {new Date(availability.conflict.end_time).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ) : availability.status === "partial" && availability.partial ? (
                    <div className="text-sm text-yellow-700">
                      <div className="font-medium flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Partial Availability</span>
                      </div>
                      {availability.partial.available_after && (
                        <div className="text-xs mt-1">
                          {availability.partial.reason || `Available after ${new Date(availability.partial.available_after).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`}
                        </div>
                      )}
                      {availability.partial.available_until && (
                        <div className="text-xs mt-1">
                          {availability.partial.reason || `Must finish by ${new Date(availability.partial.available_until).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`}
                        </div>
                      )}
                    </div>
                  ) : availability.status === "unavailable" ? (
                    <div className="text-sm text-gray-700">
                      <div className="font-medium flex items-center gap-1">
                        <span>❌</span>
                        <span>Unavailable</span>
                      </div>
                      {availability.unavailable?.reason && (
                        <div className="text-xs mt-1">{availability.unavailable.reason}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-700">Not available</div>
                  )}
                </div>
              ) : null}

              <button
                onClick={handleAdd}
                disabled={
                  !selectedRole ||
                  (availability !== null &&
                    availability.status !== "available" &&
                    availability.status !== "partial")
                }
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Event
              </button>
              {availability?.status === "partial" && (
                <p className="text-xs text-yellow-600 mt-1">
                  Note: Partial availability - crew member may have tight schedule
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

