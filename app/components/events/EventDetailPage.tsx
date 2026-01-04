"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Event,
  EventInventory,
  EventCrew,
  EventTask,
} from "@/app/actions/events";
import EventSummaryTab from "./EventSummaryTab";
import EventInventoryTab from "./EventInventoryTab";
import EventCrewTab from "./EventCrewTab";
import EventTimelineTab from "./EventTimelineTab";
import EventDocumentsTab from "./EventDocumentsTab";

interface EventDetailPageProps {
  event: Event;
  inventory: EventInventory[];
  crew: EventCrew[];
  tasks: EventTask[];
  updateEvent: (
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>;
  deleteEvent: (
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>;
}

type TabId = "summary" | "inventory" | "crew" | "timeline" | "documents";

export default function EventDetailPage({
  event,
  inventory,
  crew,
  tasks,
  updateEvent,
  deleteEvent,
}: EventDetailPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [isDeleting, setIsDeleting] = useState(false);

  const tabs: { id: TabId; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "inventory", label: "Inventory" },
    { id: "crew", label: "Crew" },
    { id: "timeline", label: "Timeline" },
    { id: "documents", label: "Documents" },
  ];

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    setIsDeleting(true);
    const formData = new FormData();
    formData.append("id", event.id);

    const result = await deleteEvent(formData);

    if (result.error) {
      alert(result.error);
      setIsDeleting(false);
    } else {
      router.push("/events");
      router.refresh();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const numberOfDays = Math.ceil(
    (new Date(event.end_date).getTime() -
      new Date(event.start_date).getTime()) /
      (1000 * 60 * 60 * 24),
  ) + 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex-1 min-w-0">
              <Link
                href="/events"
                className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
              >
                ← Back to Events
              </Link>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                  {event.name}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                    event.status === "draft"
                      ? "bg-gray-100 text-gray-800"
                      : event.status === "confirmed"
                        ? "bg-blue-100 text-blue-800"
                        : event.status === "in_progress"
                          ? "bg-yellow-100 text-yellow-800"
                          : event.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                  }`}
                >
                  {event.status
                    .split("_")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() + word.slice(1),
                    )
                    .join(" ")}
                </span>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {formatDate(event.start_date)} - {formatDate(event.end_date)} (
                {numberOfDays} days)
                {event.location && ` • ${event.location}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-200">
            <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "summary" && (
          <EventSummaryTab
            event={event}
            inventory={inventory}
            crew={crew}
            tasks={tasks}
            updateEvent={updateEvent}
          />
        )}
        {activeTab === "inventory" && (
          <EventInventoryTab
            event={event}
            inventory={inventory}
          />
        )}
        {activeTab === "crew" && (
          <EventCrewTab event={event} crew={crew} />
        )}
        {activeTab === "timeline" && (
          <EventTimelineTab
            event={event}
            crew={crew}
            tasks={tasks}
          />
        )}
        {activeTab === "documents" && (
          <EventDocumentsTab event={event} />
        )}
      </div>
    </div>
  );
}

