"use client";

import { useState, useEffect } from "react";
import { getCrewMembers, type CrewMember } from "@/app/actions/crew";
import { COMMON_TECHNICIAN_TYPES } from "@/lib/technician-types";
import type { Event } from "@/app/actions/events";

interface CrewPoolPanelProps {
  event: Event;
  existingCrewIds: string[];
  onAssign: (crewMember: CrewMember) => void;
}

export default function CrewPoolPanel({
  event,
  existingCrewIds,
  onAssign,
}: CrewPoolPanelProps) {
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

  // Get availability status for a crew member
  const getAvailabilityStatus = (member: CrewMember): { status: "available" | "busy" | "partial"; message: string } => {
    // TODO: Check actual availability from calendar
    // For now, return available
    return {
      status: "available",
      message: `Available (${new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${new Date(event.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
    };
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Crew Pool</h2>
        <p className="text-xs text-gray-500 mt-1">Search and assign crew members</p>
      </div>

      {/* Search and Filters */}
      <div className="flex-shrink-0 px-6 py-4 space-y-4 border-b border-gray-200 bg-gray-50">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search crew members..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Role Filters */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Role</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRole("")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                selectedRole === ""
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              All Roles
            </button>
            {COMMON_TECHNICIAN_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedRole(type)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  selectedRole === type
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Availability Filter */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium text-gray-700">Available for {new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{new Date(event.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} only</span>
          </label>
        </div>
      </div>

      {/* Crew List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredCrew.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {query ? "No crew members found" : "No crew members available"}
          </div>
        ) : (
          filteredCrew.map((member) => {
            const availability = getAvailabilityStatus(member);
            return (
              <div
                key={member.id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{member.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
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
                      {availability.status === "available" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          🟢 {availability.message}
                        </span>
                      )}
                      {availability.status === "busy" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          🔴 {availability.message}
                        </span>
                      )}
                      {availability.status === "partial" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          🟡 {availability.message}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onAssign(member)}
                    className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    {availability.status === "partial" ? "Assign Partial" : availability.status === "busy" ? "View Conflict" : "Assign"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

