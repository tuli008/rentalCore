"use client";

import { useState, useEffect } from "react";
import type { Event, EventCrew } from "@/app/actions/events";
import { syncCrewAssignmentToGoogleCalendar } from "@/app/actions/google-calendar";
import { getCrewMembers } from "@/app/actions/crew";

interface SyncCalendarModalProps {
  event: Event;
  crew: EventCrew[];
  onClose: () => void;
}

interface CrewSyncStatus {
  crewMemberId: string;
  crewMemberName: string;
  isConnected: boolean;
  isSyncing: boolean;
  syncResult?: { success: boolean; error?: string };
}

export default function SyncCalendarModal({ event, crew, onClose }: SyncCalendarModalProps) {
  const [crewSyncStatus, setCrewSyncStatus] = useState<Map<string, CrewSyncStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [syncTarget, setSyncTarget] = useState<"google" | "outlook">("google");
  const [syncScope, setSyncScope] = useState<"assigned" | "all">("assigned");

  useEffect(() => {
    const loadSyncStatus = async () => {
      setIsLoading(true);
      try {
        const allCrewMembers = await getCrewMembers();
        const statusMap = new Map<string, CrewSyncStatus>();

        // Build status for assigned crew members
        crew.forEach((assignment) => {
          const crewMember = allCrewMembers.find((cm) => cm.id === assignment.crew_member_id);
          if (crewMember) {
            statusMap.set(assignment.id, {
              crewMemberId: crewMember.id,
              crewMemberName: crewMember.name,
              isConnected: crewMember.google_calendar_connected || false,
              isSyncing: false,
            });
          }
        });

        setCrewSyncStatus(statusMap);
      } catch (error) {
        console.error("Error loading sync status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSyncStatus();
  }, [crew]);

  const handleSyncAll = async () => {
    const assignmentsToSync = syncScope === "assigned" 
      ? crew 
      : crew; // For now, only assigned (future: filter by leads if needed)

    for (const assignment of assignmentsToSync) {
      const status = crewSyncStatus.get(assignment.id);
      if (!status) continue;

      // Only sync if crew member has Google Calendar connected
      if (!status.isConnected) {
        continue;
      }

      // Update status to syncing
      setCrewSyncStatus((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(assignment.id);
        if (current) {
          newMap.set(assignment.id, { ...current, isSyncing: true });
        }
        return newMap;
      });

      try {
        const result = await syncCrewAssignmentToGoogleCalendar(assignment.id);
        
        // Update status with result
        setCrewSyncStatus((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(assignment.id);
          if (current) {
            newMap.set(assignment.id, {
              ...current,
              isSyncing: false,
              syncResult: result,
            });
          }
          return newMap;
        });
      } catch (error) {
        setCrewSyncStatus((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(assignment.id);
          if (current) {
            newMap.set(assignment.id, {
              ...current,
              isSyncing: false,
              syncResult: {
                success: false,
                error: error instanceof Error ? error.message : "Sync failed",
              },
            });
          }
          return newMap;
        });
      }
    }
  };

  const handleConnectGoogleCalendar = () => {
    // Redirect to Google Calendar auth
    window.location.href = `/api/google-calendar/auth?event_id=${event.id}`;
  };

  const assignedCrew = Array.from(crewSyncStatus.values());
  const connectedCrew = assignedCrew.filter((c) => c.isConnected);
  const needsConnection = assignedCrew.filter((c) => !c.isConnected);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Sync Calendars</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Sync crew schedules to their personal calendars. Updates automatically when assignments change.
            </p>
          </div>

          {/* Sync Target */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Sync to:</label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="syncTarget"
                  value="google"
                  checked={syncTarget === "google"}
                  onChange={(e) => setSyncTarget(e.target.value as "google")}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Google Calendar</span>
              </label>
              <label className="flex items-center cursor-pointer opacity-50">
                <input
                  type="radio"
                  name="syncTarget"
                  value="outlook"
                  checked={syncTarget === "outlook"}
                  disabled
                  className="border-gray-300 text-gray-400"
                />
                <span className="ml-2 text-sm text-gray-400">Outlook (coming soon)</span>
              </label>
            </div>
          </div>

          {/* Sync Scope */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Who:</label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="syncScope"
                  value="assigned"
                  checked={syncScope === "assigned"}
                  onChange={(e) => setSyncScope(e.target.value as "assigned")}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Assigned crew only</span>
              </label>
              <label className="flex items-center cursor-pointer opacity-50">
                <input
                  type="radio"
                  name="syncScope"
                  value="all"
                  checked={syncScope === "all"}
                  disabled
                  className="border-gray-300 text-gray-400"
                />
                <span className="ml-2 text-sm text-gray-400">Include leads (coming soon)</span>
              </label>
            </div>
          </div>

          {/* Crew Status */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Crew Members:</label>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {assignedCrew.length === 0 ? (
                  <p className="text-sm text-gray-500">No crew members assigned to this event.</p>
                ) : (
                  assignedCrew.map((status) => (
                    <div
                      key={status.crewMemberId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {status.crewMemberName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {status.isConnected ? (
                            <span className="text-green-600">✓ Google Calendar connected</span>
                          ) : (
                            <span className="text-gray-400">Not connected</span>
                          )}
                        </div>
                        {status.syncResult && (
                          <div className="text-xs mt-1">
                            {status.syncResult.success ? (
                              <span className="text-green-600">✓ Synced successfully</span>
                            ) : (
                              <span className="text-red-600">✗ {status.syncResult.error || "Sync failed"}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {status.isSyncing ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        ) : status.isConnected ? (
                          <span className="text-xs text-green-600">Ready</span>
                        ) : (
                          <a
                            href={`/api/google-calendar/auth?crew_member_id=${status.crewMemberId}`}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Connect
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Connect Button for Unconnected */}
          {needsConnection.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                {needsConnection.length} crew member{needsConnection.length !== 1 ? "s" : ""} need{needsConnection.length === 1 ? "s" : ""} to connect Google Calendar.
              </p>
              <p className="text-xs text-blue-600">
                Crew members can connect their calendars from their profile page. Events will auto-sync once connected.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSyncAll}
            disabled={connectedCrew.length === 0 || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connectedCrew.length === 0
              ? "No Connected Calendars"
              : `Sync ${connectedCrew.length} Calendar${connectedCrew.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

