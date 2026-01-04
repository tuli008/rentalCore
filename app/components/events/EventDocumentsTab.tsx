"use client";

import type { Event } from "@/app/actions/events";

interface EventDocumentsTabProps {
  event: Event;
}

export default function EventDocumentsTab({
  event,
}: EventDocumentsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Upload Document
          </button>
        </div>

        <div className="text-center py-12">
          <p className="text-gray-500">No documents uploaded yet.</p>
          <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Upload your first document
          </button>
        </div>
      </div>
    </div>
  );
}

