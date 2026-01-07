"use client";

import { useState } from "react";
import type { Event, EventCrew } from "@/app/actions/events";

interface ExportScheduleModalProps {
  event: Event;
  crew: EventCrew[];
  onClose: () => void;
}

export default function ExportScheduleModal({ event, crew, onClose }: ExportScheduleModalProps) {
  const [includeRates, setIncludeRates] = useState(true);
  const [format, setFormat] = useState<"pdf" | "excel" | "ics">("pdf");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      if (format === "pdf") {
        await exportToPDF();
      } else if (format === "excel") {
        await exportToExcel();
      } else if (format === "ics") {
        await exportToICS();
      }
      
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export schedule. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Title
    doc.setFontSize(18);
    doc.text(`Crew Schedule: ${event.name}`, margin, yPos);
    yPos += 10;

    // Event details
    doc.setFontSize(12);
    const startDate = new Date(event.start_date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const endDate = new Date(event.end_date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    doc.text(`Dates: ${startDate} - ${endDate}`, margin, yPos);
    yPos += 6;
    if (event.location) {
      doc.text(`Location: ${event.location}`, margin, yPos);
      yPos += 10;
    } else {
      yPos += 6;
    }

    // Crew assignments table
    doc.setFontSize(14);
    doc.text("Crew Assignments", margin, yPos);
    yPos += 8;

    // Table header
    doc.setFontSize(10);
    let xPos = margin;
    doc.setFont(undefined, "bold");
    doc.text("Name", xPos, yPos);
    xPos += 60;
    doc.text("Role", xPos, yPos);
    xPos += 40;
    doc.text("Dates", xPos, yPos);
    xPos += 40;
    doc.text("Call Time", xPos, yPos);
    if (includeRates) {
      xPos += 30;
      doc.text("Rate", xPos, yPos);
    }
    yPos += 6;

    // Table rows
    doc.setFont(undefined, "normal");
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);

    crew.forEach((member) => {
      if (yPos > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        yPos = margin;
      }

      xPos = margin;
      doc.text(member.crew_member_name || "Unknown", xPos, yPos);
      xPos += 60;
      doc.text(member.role || "—", xPos, yPos);
      xPos += 40;
      
      const memberStart = new Date(event.start_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const memberEnd = new Date(event.end_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      doc.text(`${memberStart} - ${memberEnd}`, xPos, yPos);
      xPos += 40;
      
      const callTime = member.call_time
        ? new Date(member.call_time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "—";
      doc.text(callTime, xPos, yPos);
      xPos += 30;
      
      if (includeRates) {
        const rate = member.rate && member.rate_type
          ? `$${member.rate.toFixed(2)}/${member.rate_type === "hourly" ? "hr" : member.rate_type === "daily" ? "day" : member.rate_type === "weekly" ? "wk" : "mo"}`
          : "—";
        doc.text(rate, xPos, yPos);
      }
      
      yPos += 7;
    });

    // Save
    const fileName = `${event.name.replace(/[^a-z0-9]/gi, "_")}_schedule.pdf`;
    doc.save(fileName);
  };

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    
    // Prepare data
    const rows = crew.map((member) => {
      const callTime = member.call_time
        ? new Date(member.call_time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "—";
      
      const endTime = member.end_time
        ? new Date(member.end_time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "—";

      const row: any = {
        Name: member.crew_member_name || "Unknown",
        Role: member.role || "—",
        "Start Date": new Date(event.start_date).toLocaleDateString("en-US"),
        "End Date": new Date(event.end_date).toLocaleDateString("en-US"),
        "Call Time": callTime,
        "End Time": endTime,
      };

      if (includeRates) {
        row.Rate = member.rate && member.rate_type
          ? `$${member.rate.toFixed(2)}/${member.rate_type === "hourly" ? "hr" : member.rate_type === "daily" ? "day" : member.rate_type === "weekly" ? "wk" : "mo"}`
          : "—";
      }

      return row;
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, // Name
      { wch: 20 }, // Role
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 12 }, // Call Time
      { wch: 12 }, // End Time
    ];
    if (includeRates) {
      colWidths.push({ wch: 15 }); // Rate
    }
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Crew Schedule");

    // Add event info sheet
    const eventInfo = [
      { Field: "Event Name", Value: event.name },
      { Field: "Start Date", Value: new Date(event.start_date).toLocaleDateString("en-US") },
      { Field: "End Date", Value: new Date(event.end_date).toLocaleDateString("en-US") },
      { Field: "Location", Value: event.location || "—" },
      { Field: "Status", Value: event.status?.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "—" },
    ];
    const infoWs = XLSX.utils.json_to_sheet(eventInfo);
    infoWs["!cols"] = [{ wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, infoWs, "Event Info");

    // Save
    const fileName = `${event.name.replace(/[^a-z0-9]/gi, "_")}_schedule.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToICS = async () => {
    const ics = await import("ics");
    
    const events = crew.map((member) => {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      
      // Use call_time/end_time if available, otherwise use event dates
      let startDateTime: Date;
      let endDateTime: Date;
      
      if (member.call_time && member.end_time) {
        startDateTime = new Date(member.call_time);
        endDateTime = new Date(member.end_time);
      } else {
        // Default to 9 AM - 6 PM for full day
        startDateTime = new Date(startDate);
        startDateTime.setHours(9, 0, 0, 0);
        endDateTime = new Date(endDate);
        endDateTime.setHours(18, 0, 0, 0);
      }

      const start: [number, number, number, number, number] = [
        startDateTime.getFullYear(),
        startDateTime.getMonth() + 1,
        startDateTime.getDate(),
        startDateTime.getHours(),
        startDateTime.getMinutes(),
      ];

      const end: [number, number, number, number, number] = [
        endDateTime.getFullYear(),
        endDateTime.getMonth() + 1,
        endDateTime.getDate(),
        endDateTime.getHours(),
        endDateTime.getMinutes(),
      ];

      const description = [
        `Role: ${member.role || "—"}`,
        includeRates && member.rate && member.rate_type
          ? `Rate: $${member.rate.toFixed(2)}/${member.rate_type === "hourly" ? "hr" : member.rate_type === "daily" ? "day" : member.rate_type === "weekly" ? "wk" : "mo"}`
          : null,
        event.location ? `Location: ${event.location}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      return {
        start,
        end,
        title: `${event.name} - ${member.crew_member_name || "Crew Member"}`,
        description,
        location: event.location || undefined,
        status: "CONFIRMED" as const,
        busyStatus: "BUSY" as const,
      };
    });

    const { error, value } = ics.createEvents(events);

    if (error) {
      throw new Error(`Failed to create calendar file: ${error.message}`);
    }

    if (!value) {
      throw new Error("Failed to create calendar file");
    }

    // Create download
    const blob = new Blob([value], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.replace(/[^a-z0-9]/gi, "_")}_schedule.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Export Schedule</h2>
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
        <div className="px-6 py-4 space-y-6">
          {/* Event Info */}
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Export Schedule for Event: <span className="font-medium text-gray-900">{event.name}</span>
            </p>
          </div>

          {/* Include Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Include:</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Crew assignments</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Dates & call times</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeRates}
                  onChange={(e) => setIncludeRates(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Rates</span>
              </label>
              {includeRates && (
                <label className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    checked={false}
                    disabled
                    className="rounded border-gray-300 text-gray-400"
                  />
                  <span className="ml-2 text-sm text-gray-400">Hide rates (client-facing)</span>
                </label>
              )}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Format:</label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === "pdf"}
                  onChange={(e) => setFormat(e.target.value as "pdf")}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">PDF</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === "excel"}
                  onChange={(e) => setFormat(e.target.value as "excel")}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Excel</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="ics"
                  checked={format === "ics"}
                  onChange={(e) => setFormat(e.target.value as "ics")}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Calendar (.ics)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? "Exporting..." : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}

