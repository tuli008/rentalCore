"use client";

import { useState } from "react";
import type { Event, EventInventory, EventCrew, EventTask } from "@/app/actions/events";

interface EventSummaryTabProps {
  event: Event;
  inventory: EventInventory[];
  crew: EventCrew[];
  tasks: EventTask[];
  updateEvent: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

export default function EventSummaryTab({
  event,
  inventory,
  crew,
  tasks,
  updateEvent,
}: EventSummaryTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: event.name,
    description: event.description || "",
    start_date: event.start_date,
    end_date: event.end_date,
    location: event.location || "",
    status: event.status,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const form = new FormData();
    form.append("id", event.id);
    form.append("name", formData.name);
    form.append("description", formData.description);
    form.append("start_date", formData.start_date);
    form.append("end_date", formData.end_date);
    form.append("location", formData.location);
    form.append("status", formData.status);

    const result = await updateEvent(form);

    if (result.error) {
      alert(result.error);
      setIsSaving(false);
    } else {
      setIsEditing(false);
      setIsSaving(false);
      window.location.reload(); // Refresh to show updated data
    }
  };

  const totalInventoryValue = inventory.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_snapshot,
    0,
  );

  const totalCrewCost = crew.reduce((sum, member) => {
    // This is a placeholder - actual cost would come from timesheets
    return sum;
  }, 0);

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;

  return (
    <div className="space-y-6">
      {/* Event Details Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold !text-gray-900">Event Details</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as Event["status"],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="prepping">Prepping</option>
                <option value="planned">Planned</option>
                <option value="in_transit">In Transit</option>
                <option value="on_venue">On Venue</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: event.name,
                    description: event.description || "",
                    start_date: event.start_date,
                    end_date: event.end_date,
                    location: event.location || "",
                    status: event.status,
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {event.description && (
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Description:
                </span>
                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
              </div>
            )}
            {event.location && (
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Location:
                </span>
                <p className="text-sm text-gray-600 mt-1">{event.location}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Inventory Items</div>
          <div className="text-2xl font-bold !text-gray-900 mt-1">
            {inventory.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ${totalInventoryValue.toFixed(2)} value
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Crew Members</div>
          <div className="text-2xl font-bold !text-gray-900 mt-1">
            {crew.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {crew.filter((c) => c.role.toLowerCase().includes("lead")).length}{" "}
            leads
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Tasks</div>
          <div className="text-2xl font-bold !text-gray-900 mt-1">
            {completedTasks} / {totalTasks}
          </div>
          <div className="text-xs text-gray-500 mt-1">completed</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Duration</div>
          <div className="text-2xl font-bold !text-gray-900 mt-1">
            {Math.ceil(
              (new Date(event.end_date).getTime() -
                new Date(event.start_date).getTime()) /
                (1000 * 60 * 60 * 24),
            ) + 1}
          </div>
          <div className="text-xs text-gray-500 mt-1">days</div>
        </div>
      </div>
    </div>
  );
}

