"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Event, EventCrew, RoleRequirement } from "@/app/actions/events";
import { addEventCrew, updateEventCrew } from "@/app/actions/events";
import type { CrewMember } from "@/app/actions/crew";
import CrewPoolPanel from "./CrewPoolPanel";
import AssignedCrewPanel from "./AssignedCrewPanel";
import AssignmentSheet from "./AssignmentSheet";
import ExportScheduleModal from "./ExportScheduleModal";
import SyncCalendarModal from "./SyncCalendarModal";

interface EventCrewTabProps {
  event: Event;
  crew: EventCrew[];
  roleRequirements: RoleRequirement[];
}

interface DayAssignment {
  date: Date;
  mode: "none" | "full_day" | "custom";
  startTime: string;
  endTime: string;
}

export default function EventCrewTab({ event, crew, roleRequirements }: EventCrewTabProps) {
  const router = useRouter();
  const [selectedCrewMember, setSelectedCrewMember] = useState<CrewMember | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<EventCrew | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAssign = (crewMember: CrewMember) => {
    setSelectedCrewMember(crewMember);
    setEditingAssignment(null);
  };

  const handleEdit = async (assignment: EventCrew) => {
    // Fetch crew member data
    const { getCrewMembers } = await import("@/app/actions/crew");
    const crewMembers = await getCrewMembers();
    const crewMember = crewMembers.find(c => c.id === assignment.crew_member_id);
    
    if (crewMember) {
      setEditingAssignment(assignment);
      setSelectedCrewMember(crewMember);
    }
  };

  const handleSaveAssignment = async (assignments: DayAssignment[]) => {
    if (!selectedCrewMember) return;

    startTransition(async () => {
      if (editingAssignment) {
        // Update existing assignment
        const activeAssignments = assignments.filter(a => a.mode !== "none");
        
        if (activeAssignments.length > 0) {
          const assignment = activeAssignments[0]; // Take first assignment
          const dateStr = assignment.date.toISOString().split('T')[0];
          let callTime: string | null = null;
          let endTime: string | null = null;

          if (assignment.mode === "full_day") {
            callTime = `${dateStr}T09:00`;
            endTime = `${dateStr}T18:00`;
          } else if (assignment.mode === "custom") {
            callTime = `${dateStr}T${assignment.startTime}`;
            endTime = `${dateStr}T${assignment.endTime}`;
          }

          if (callTime && endTime) {
            const formData = new FormData();
            formData.append("id", editingAssignment.id);
            formData.append("event_id", event.id);
            formData.append("call_time", callTime);
            formData.append("end_time", endTime);
            if (selectedCrewMember.base_rate) {
              formData.append("rate", selectedCrewMember.base_rate.toString());
            }
            if (selectedCrewMember.rate_type) {
              formData.append("rate_type", selectedCrewMember.rate_type);
            }

            await updateEventCrew(formData);
          }
        }
      } else {
        // Create new assignment
        const activeAssignments = assignments.filter(a => a.mode !== "none");
        
        for (const assignment of activeAssignments) {
          const dateStr = assignment.date.toISOString().split('T')[0];
          let callTime: string | null = null;
          let endTime: string | null = null;

          if (assignment.mode === "full_day") {
            callTime = `${dateStr}T09:00`;
            endTime = `${dateStr}T18:00`;
          } else if (assignment.mode === "custom") {
            callTime = `${dateStr}T${assignment.startTime}`;
            endTime = `${dateStr}T${assignment.endTime}`;
          }

          if (callTime && endTime) {
            const formData = new FormData();
            formData.append("event_id", event.id);
            formData.append("crew_member_id", selectedCrewMember.id);
            formData.append("role", selectedCrewMember.technician_type || "Technician");
            formData.append("call_time", callTime);
            formData.append("end_time", endTime);
            if (selectedCrewMember.base_rate) {
              formData.append("rate", selectedCrewMember.base_rate.toString());
            }
            if (selectedCrewMember.rate_type) {
              formData.append("rate_type", selectedCrewMember.rate_type);
            }

            await addEventCrew(formData);
          }
        }
      }

      setSelectedCrewMember(null);
      setEditingAssignment(null);
      router.refresh();
    });
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Action Buttons Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Export Schedule
            </button>
            <button
              onClick={() => setShowSyncModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Sync Calendar
            </button>
          </div>
      </div>

      {/* Main Content: Split Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel: Crew Pool (35%) */}
        <div className="w-[35%] flex-shrink-0">
          <CrewPoolPanel
            event={event}
            existingCrewIds={crew.map(c => c.crew_member_id)}
            onAssign={handleAssign}
          />
        </div>

        {/* Right Panel: Assigned Crew (65%) */}
        <div className="flex-1 min-w-0">
          <AssignedCrewPanel
            event={event}
            crew={crew}
            onEdit={handleEdit}
          />
        </div>
      </div>

      {/* Assignment Sheet */}
      {selectedCrewMember && (
        <AssignmentSheet
          crewMember={selectedCrewMember}
          event={event}
          existingAssignment={editingAssignment}
          onSave={handleSaveAssignment}
          onCancel={() => {
            setSelectedCrewMember(null);
            setEditingAssignment(null);
          }}
        />
      )}

      {/* Export Schedule Modal */}
      {showExportModal && (
        <ExportScheduleModal
          event={event}
          crew={crew}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Sync Calendar Modal */}
      {showSyncModal && (
        <SyncCalendarModal
          event={event}
          crew={crew}
          onClose={() => setShowSyncModal(false)}
        />
      )}
    </div>
  );
}

