"use client";

import { useState, useEffect } from "react";
import { getCrewMembers, type CrewMember } from "@/app/actions/crew";
import { COMMON_TECHNICIAN_TYPES } from "@/lib/technician-types";
import type { Event } from "@/app/actions/events";

interface CrewAssignmentDrawerProps {
  event: Event;
  existingCrewIds: string[];
  onAssign: (crewMember: CrewMember) => void;
  onClose: () => void;
}

export default function CrewAssignmentDrawer({
  event,
  existingCrewIds,
  onAssign,
  onClose,
}: CrewAssignmentDrawerProps) {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [availabilityFilter, setAvailabilityFilter] = useState<boolean>(false);

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

  // Filter crew members
  const filteredCrew = crewMembers.filter((member) => {
    // Exclude already assigned crew
    if (existingCrewIds.includes(member.id)) return false;

    // Filter by role
    if (selectedRole && member.technician_type !== selectedRole) return false;

    // Filter by search query
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      if (
        !member.name.toLowerCase().includes(searchTerm) &&
        !member.email?.toLowerCase().includes(searchTerm) &&
        !member.contact?.toLowerCase().includes(searchTerm)
      ) {
        return false;
      }
    }

    // TODO: Filter by availability if availabilityFilter is true

    return true;
  });

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Assign Crew to Event</h2>
        <button
          onClick={onClose}
          className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full p-2 transition-all flex-shrink-0 ml-4 border border-gray-300 hover:border-gray-400"
          title="Close drawer"
          aria-label="Close drawer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

        {/* Search and Filters */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search crew members..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Chips */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Role</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedRole("")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    selectedRole === ""
                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                      : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  All
                </button>
                {COMMON_TECHNICIAN_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedRole(type)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedRole === type
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-gray-700">Availability only</span>
              </label>
            </div>
          </div>

          {/* Crew List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredCrew.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                {query ? "No crew members found" : "No crew members available"}
              </div>
            ) : (
              filteredCrew.map((member) => (
                <div
                  key={member.id}
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {member.technician_type || "Technician"}
                      </div>
                      {member.base_rate && member.rate_type && (
                        <div className="text-sm text-gray-700 mt-1">
                          ${member.base_rate.toFixed(2)}/
                          {member.rate_type === "hourly"
                            ? "hr"
                            : member.rate_type === "daily"
                            ? "day"
                            : member.rate_type === "weekly"
                            ? "wk"
                            : "mo"}
                        </div>
                      )}
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Available on {new Date(event.start_date).toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric" 
                          })}–{new Date(event.end_date).toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric" 
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onAssign(member)}
                      className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
    </div>
  );
}

