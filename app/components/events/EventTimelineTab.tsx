"use client";

import type { Event, EventCrew, EventTask } from "@/app/actions/events";

interface EventTimelineTabProps {
  event: Event;
  crew: EventCrew[];
  tasks: EventTask[];
}

export default function EventTimelineTab({
  event,
  crew,
  tasks,
}: EventTimelineTabProps) {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Crew Schedule */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Crew Schedule
        </h2>
        {crew.length === 0 ? (
          <p className="text-gray-500 text-sm">No crew members assigned.</p>
        ) : (
          <div className="space-y-3">
            {crew.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {member.crew_member_name || "Unknown"}
                  </div>
                  <div className="text-sm text-gray-600">{member.role}</div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div>
                    Call: {formatDateTime(member.call_time)}
                  </div>
                  {member.end_time && (
                    <div>End: {formatDateTime(member.end_time)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tasks Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Add Task
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-gray-500 text-sm">No tasks created yet.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900">
                        {task.title}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                          task.priority,
                        )}`}
                      >
                        {task.priority}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          task.status,
                        )}`}
                      >
                        {task.status
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1),
                          )
                          .join(" ")}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {task.description}
                      </p>
                    )}
                    {task.due_time && (
                      <p className="text-xs text-gray-500">
                        Due: {formatDateTime(task.due_time)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

