"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Event, EventCrew } from "@/app/actions/events";
import { addEventCrew, updateEventCrew, deleteEventCrew } from "@/app/actions/events";
import { sendCrewNotification } from "@/app/actions/notifications";
import CrewSidebar from "./CrewSidebar";

interface EventCrewTabProps {
  event: Event;
  crew: EventCrew[];
}

interface RoleRequirement {
  role: string;
  needed: number;
  filled: number;
}

const COMMON_ROLES = [
  "Sound Tech",
  "Driver",
  "Rigger",
  "Camera Operator",
  "Lighting Tech",
  "Stagehand",
  "Lead",
  "Assistant",
  "Technician",
];

export default function EventCrewTab({ event, crew }: EventCrewTabProps) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [roleRequirements, setRoleRequirements] = useState<RoleRequirement[]>([]);
  const [newRole, setNewRole] = useState("");
  const [newRoleNeeded, setNewRoleNeeded] = useState("1");
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    role: "",
    call_time: "",
    end_time: "",
    hourly_rate: "",
    notes: "",
  });
  const [sendingNotificationId, setSendingNotificationId] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Calculate role requirements from assigned crew
  useEffect(() => {
    const roleCounts = new Map<string, number>();
    crew.forEach((member) => {
      const count = roleCounts.get(member.role) || 0;
      roleCounts.set(member.role, count + 1);
    });

    // Convert to requirements array
    const requirements: RoleRequirement[] = Array.from(roleCounts.entries()).map(
      ([role, filled]) => ({
        role,
        needed: filled, // Default to filled count, user can adjust
        filled,
      }),
    );

    // Add any requirements that don't have assignments yet
    roleRequirements.forEach((req) => {
      if (!roleCounts.has(req.role)) {
        requirements.push({
          role: req.role,
          needed: req.needed,
          filled: 0,
        });
      }
    });

    setRoleRequirements(requirements);
  }, [crew]);

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

  const formatDateTimeForInput = (dateTimeString: string | null) => {
    if (!dateTimeString) return "";
    const date = new Date(dateTimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleCrewSelect = async (
    crewMember: { id: string },
    role: string,
    callTime: string | null,
    endTime: string | null,
    hourlyRate: string | null,
  ) => {
    const formData = new FormData();
    formData.append("event_id", event.id);
    formData.append("crew_member_id", crewMember.id);
    formData.append("role", role);
    if (callTime) formData.append("call_time", callTime);
    if (endTime) formData.append("end_time", endTime);
    if (hourlyRate) formData.append("hourly_rate", hourlyRate);

    const result = await addEventCrew(formData);
    if (result.error) {
      alert(result.error);
    } else {
      setIsMobileSidebarOpen(false);
      // Refresh data without changing tabs
      router.refresh();
    }
  };

  const handleDelete = async (assignmentId: string) => {
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

  const handleEdit = (assignment: EventCrew) => {
    setEditingAssignment(assignment.id);
    setEditForm({
      role: assignment.role,
      call_time: formatDateTimeForInput(assignment.call_time),
      end_time: formatDateTimeForInput(assignment.end_time),
      hourly_rate: assignment.hourly_rate?.toString() || "",
      notes: assignment.notes || "",
    });
  };

  const handleSaveEdit = async (assignmentId: string) => {
    const formData = new FormData();
    formData.append("id", assignmentId);
    formData.append("role", editForm.role);
    if (editForm.call_time) formData.append("call_time", editForm.call_time);
    if (editForm.end_time) formData.append("end_time", editForm.end_time);
    if (editForm.hourly_rate) formData.append("hourly_rate", editForm.hourly_rate);
    if (editForm.notes) formData.append("notes", editForm.notes);

    const result = await updateEventCrew(formData);
    if (result.error) {
      alert(result.error);
    } else {
      setEditingAssignment(null);
      router.refresh();
    }
  };

  const handleSendNotification = async (assignmentId: string) => {
    setSendingNotificationId(assignmentId);
    setNotificationMessage(null);

    startTransition(async () => {
      const result = await sendCrewNotification(assignmentId);
      
      if (result.success) {
        setNotificationMessage({
          type: "success",
          text: "Notification sent successfully!",
        });
      } else {
        setNotificationMessage({
          type: "error",
          text: result.error || "Failed to send notification",
        });
      }
      
      setSendingNotificationId(null);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setNotificationMessage(null);
      }, 3000);
    });
  };

  const handleAddRequirement = () => {
    if (!newRole || !newRoleNeeded) return;

    const needed = parseInt(newRoleNeeded, 10);
    if (isNaN(needed) || needed < 1) return;

    const existing = roleRequirements.find((r) => r.role === newRole);
    if (existing) {
      setRoleRequirements(
        roleRequirements.map((r) =>
          r.role === newRole ? { ...r, needed: needed } : r,
        ),
      );
    } else {
      setRoleRequirements([
        ...roleRequirements,
        {
          role: newRole,
          needed,
          filled: crew.filter((c) => c.role === newRole).length,
        },
      ]);
    }

    setNewRole("");
    setNewRoleNeeded("1");
  };

  const getRequirementStatus = (req: RoleRequirement) => {
    if (req.filled >= req.needed) return "filled";
    if (req.filled > 0) return "partial";
    return "unfilled";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "filled":
        return (
          <span className="text-green-600" title="Filled">
            ✅
          </span>
        );
      case "partial":
        return (
          <span className="text-yellow-600" title="Partially filled">
            ⚠️
          </span>
        );
      case "unfilled":
        return (
          <span className="text-red-600" title="Unfilled">
            ❌
          </span>
        );
      default:
        return null;
    }
  };

  const existingCrewIds = crew.map((c) => c.crew_member_id);

  return (
    <div className="space-y-6 relative">
      {/* Requirements Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Role Requirements</h2>
        </div>

        {/* Add Requirement */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-2 mb-2">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select role...</option>
              {COMMON_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={newRoleNeeded}
              onChange={(e) => setNewRoleNeeded(e.target.value)}
              placeholder="Needed"
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddRequirement}
              disabled={!newRole || !newRoleNeeded}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Or enter custom role"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Requirements List */}
        {roleRequirements.length > 0 && (
          <div className="space-y-2">
            {roleRequirements.map((req) => {
              const status = getRequirementStatus(req);
              return (
                <div
                  key={req.role}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status)}
                    <div>
                      <div className="font-medium text-gray-900">{req.role}</div>
                      <div className="text-sm text-gray-500">
                        {req.filled} / {req.needed} assigned
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={req.needed}
                      onChange={(e) => {
                        const needed = parseInt(e.target.value, 10);
                        if (!isNaN(needed) && needed >= 0) {
                          setRoleRequirements(
                            roleRequirements.map((r) =>
                              r.role === req.role ? { ...r, needed } : r,
                            ),
                          );
                        }
                      }}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        setRoleRequirements(
                          roleRequirements.filter((r) => r.role !== req.role),
                        );
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Crew Assignments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Crew Assignments</h2>
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            Add Crew
          </button>
        </div>

        {/* Notification Message */}
        {notificationMessage && (
          <div
            className={`mb-4 p-3 rounded-md ${
              notificationMessage.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <p className="text-sm">{notificationMessage.text}</p>
          </div>
        )}

        {crew.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No crew members assigned yet.</p>
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
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
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {crew.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    {editingAssignment === member.id ? (
                      <>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {member.crew_member_name || "Unknown"}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editForm.role}
                            onChange={(e) =>
                              setEditForm({ ...editForm, role: e.target.value })
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {member.crew_member_contact || member.crew_member_email || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="datetime-local"
                            value={editForm.call_time}
                            onChange={(e) =>
                              setEditForm({ ...editForm, call_time: e.target.value })
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="datetime-local"
                            value={editForm.end_time}
                            onChange={(e) =>
                              setEditForm({ ...editForm, end_time: e.target.value })
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.hourly_rate}
                            onChange={(e) =>
                              setEditForm({ ...editForm, hourly_rate: e.target.value })
                            }
                            placeholder="0.00"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleSaveEdit(member.id)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingAssignment(null)}
                              className="text-gray-600 hover:text-gray-700 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
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
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-end items-center">
                            <button
                              onClick={() => handleSendNotification(member.id)}
                              disabled={isPending && sendingNotificationId === member.id}
                              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={
                                member.crew_member_email || member.crew_member_contact
                                  ? "Send notification via email and SMS"
                                  : "No email or phone number available"
                              }
                            >
                              {isPending && sendingNotificationId === member.id
                                ? "Sending..."
                                : "Notify"}
                            </button>
                            <button
                              onClick={() => handleEdit(member)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <CrewSidebar
        eventId={event.id}
        eventStartDate={event.start_date}
        eventEndDate={event.end_date}
        onCrewSelect={handleCrewSelect}
        existingCrewIds={existingCrewIds}
        variant="desktop"
      />

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <CrewSidebar
          eventId={event.id}
          eventStartDate={event.start_date}
          eventEndDate={event.end_date}
          onCrewSelect={handleCrewSelect}
          existingCrewIds={existingCrewIds}
          variant="mobile"
          onClose={() => setIsMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
}
