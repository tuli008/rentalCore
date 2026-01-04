"use client";

import { useState } from "react";
import type { Event, EventCrew } from "@/app/actions/events";

interface EventCrewTabProps {
  event: Event;
  crew: EventCrew[];
}

export default function EventCrewTab({ event, crew }: EventCrewTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Crew Members</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAddForm ? "Cancel" : "Add Crew Member"}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              Add crew member form will be implemented here
            </p>
          </div>
        )}

        {crew.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No crew members assigned yet.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add crew member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Contact
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Call Time
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    End Time
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {crew.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {member.crew_member_name || "Unknown"}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {member.crew_member_contact || member.crew_member_email || "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDateTime(member.call_time)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDateTime(member.end_time)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">
                      {member.hourly_rate
                        ? `$${member.hourly_rate.toFixed(2)}/hr`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

