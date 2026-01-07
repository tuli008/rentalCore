"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Event } from "@/app/actions/events";
import EventsCalendarView from "./EventsCalendarView";

interface EventsListPageProps {
  initialEvents: Event[];
  createEvent: (formData: FormData) => Promise<{
    success?: boolean;
    error?: string;
    eventId?: string;
  }>;
}

export default function EventsListPage({
  initialEvents,
  createEvent,
}: EventsListPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Deduplicate events by ID and by name+dates (in case there are duplicates from database)
  const uniqueEvents = useMemo(() => {
    // First deduplicate by ID
    const seenIds = new Set<string>();
    let deduplicatedById = initialEvents.filter((event) => {
      if (seenIds.has(event.id)) {
        console.warn(`[EventsListPage] Duplicate event ID found: ${event.id} - ${event.name}`);
        return false;
      }
      seenIds.add(event.id);
      return true;
    });
    
    // Then deduplicate by name + dates (keep first occurrence)
    const seenByNameAndDate = new Map<string, string>();
    const deduplicated = deduplicatedById.filter((event) => {
      const key = `${event.name}|${event.start_date}|${event.end_date}`;
      const existingId = seenByNameAndDate.get(key);
      if (existingId) {
        console.warn(`[EventsListPage] Duplicate event by name+dates found: ${event.id} (${event.name} ${event.start_date}-${event.end_date}) matches existing ${existingId}`);
        return false;
      }
      seenByNameAndDate.set(key, event.id);
      return true;
    });
    
    console.log(`[EventsListPage] Deduplicated: ${initialEvents.length} -> ${deduplicated.length} events`);
    return deduplicated;
  }, [initialEvents]);
  
  const [events, setEvents] = useState<Event[]>(uniqueEvents);
  
  // Update events when initialEvents changes (e.g., after refresh)
  useEffect(() => {
    // First deduplicate by ID
    const seenIds = new Set<string>();
    let deduplicatedById = initialEvents.filter((event) => {
      if (seenIds.has(event.id)) {
        return false;
      }
      seenIds.add(event.id);
      return true;
    });
    
    // Then deduplicate by name + dates
    const seenByNameAndDate = new Map<string, string>();
    const deduplicated = deduplicatedById.filter((event) => {
      const key = `${event.name}|${event.start_date}|${event.end_date}`;
      const existingId = seenByNameAndDate.get(key);
      if (existingId) {
        return false;
      }
      seenByNameAndDate.set(key, event.id);
      return true;
    });
    
    setEvents(deduplicated);
  }, [initialEvents]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    location: "",
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const getStatusColor = (status: Event["status"]) => {
    switch (status) {
      case "prepping":
        return "bg-gray-100 text-gray-800";
      case "planned":
        return "bg-blue-100 text-blue-800";
      case "in_transit":
        return "bg-yellow-100 text-yellow-800";
      case "on_venue":
        return "bg-orange-100 text-orange-800";
      case "closed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formDataObj = new FormData();
    formDataObj.append("name", formData.name);
    formDataObj.append("description", formData.description);
    formDataObj.append("start_date", formData.start_date);
    formDataObj.append("end_date", formData.end_date);
    formDataObj.append("location", formData.location);

    const result = await createEvent(formDataObj);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Event created successfully! A draft quote has been automatically created.");
      setShowAddForm(false);
      setFormData({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        location: "",
      });
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setFormData({
      name: "",
      description: "",
      start_date: "",
      end_date: "",
      location: "",
    });
    setError(null);
    setSuccess(null);
  };

  return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold !text-gray-900">Events</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Create events and manage your schedule. A draft quote will be automatically created for each event.
                </p>
              </div>
              {!showAddForm && (
                <div className="flex items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-md p-1">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                        viewMode === "list"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      List
                    </button>
                    <button
                      onClick={() => setViewMode("calendar")}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                        viewMode === "calendar"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Calendar
                    </button>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                  >
                    New Event
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Add Event Form */}
          {showAddForm && (
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Event
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Event Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="start_date"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="start_date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="end_date"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="end_date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      required
                      min={formData.start_date}
                      className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="location"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {(error || success) && (
                  <div
                    className={`p-3 rounded-md ${
                      error
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-green-50 text-green-800 border border-green-200"
                    }`}
                  >
                    {error || success}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Creating..." : "Create Event"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {events.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first event. A draft quote will be automatically created.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Event
                </button>
              </div>
            </div>
          ) : viewMode === "list" ? (
            /* List View */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Event Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Dates
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Location
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/events/${event.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            {event.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(event.start_date)} -{" "}
                          {formatDate(event.end_date)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {event.location || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              event.status,
                            )}`}
                          >
                            {event.status
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1),
                              )
                              .join(" ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/events/${event.id}`}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Calendar View */
            <EventsCalendarView initialEvents={events} />
          )}
      </div>
    </div>
  );
}

