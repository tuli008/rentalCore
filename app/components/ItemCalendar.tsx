"use client";

import { useState, useEffect } from "react";
import { getItemBookedDates, type BookedDateRange } from "@/app/actions/calendar";

interface ItemCalendarProps {
  itemId: string;
  itemName: string;
}

export default function ItemCalendar({ itemId, itemName }: ItemCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookedDates, setBookedDates] = useState<BookedDateRange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (isOpen && bookedDates.length === 0) {
      loadBookedDates();
    }
  }, [isOpen, itemId]);

  const loadBookedDates = async () => {
    setIsLoading(true);
    try {
      const dates = await getItemBookedDates(itemId);
      setBookedDates(dates);
    } catch (error) {
      console.error("Error loading booked dates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDateBooked = (date: Date): boolean => {
    const dateStr = date.toISOString().split("T")[0];
    return bookedDates.some(
      (range) => dateStr >= range.start_date && dateStr <= range.end_date,
    );
  };

  const getBookedRangeForDate = (date: Date): BookedDateRange | null => {
    const dateStr = date.toISOString().split("T")[0];
    return (
      bookedDates.find(
        (range) => dateStr >= range.start_date && dateStr <= range.end_date,
      ) || null
    );
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const { daysInMonth, startingDayOfWeek, year, month } =
    getDaysInMonth(currentMonth);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
        title="View booking calendar"
        type="button"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Booking Calendar: {itemName}
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  type="button"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={previousMonth}
                        className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                        type="button"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {monthNames[month]} {year}
                      </h3>
                      <button
                        onClick={nextMonth}
                        className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                        type="button"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {dayNames.map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-semibold text-gray-600 py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: startingDayOfWeek }, (_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                      ))}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const date = new Date(year, month, day);
                        const booked = isDateBooked(date);
                        const bookedRange = getBookedRangeForDate(date);

                        return (
                          <div
                            key={day}
                            className={`aspect-square flex items-center justify-center text-sm rounded-md transition-colors ${
                              booked
                                ? "bg-red-100 text-red-800 font-semibold"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                            title={
                              bookedRange
                                ? `Booked: ${bookedRange.quote_name} (Qty: ${bookedRange.quantity})`
                                : undefined
                            }
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {bookedDates.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        Booked Periods:
                      </h3>
                      <div className="space-y-2">
                        {bookedDates.map((range, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-red-50 rounded-md border border-red-200"
                          >
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {range.quote_name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(range.start_date).toLocaleDateString()} -{" "}
                                {new Date(range.end_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-red-700">
                              Qty: {range.quantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bookedDates.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No bookings found for this item.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

