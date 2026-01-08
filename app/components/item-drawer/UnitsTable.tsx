"use client";

import { useState } from "react";
import BarcodeScanner from "@/app/components/barcode/BarcodeScanner";
import type { UnitInfo } from "@/app/actions/units";

interface Unit {
  id: string;
  serial_number: string;
  barcode: string;
  status: "available" | "out" | "maintenance";
  location_name: string;
}

interface UnitsTableProps {
  units: Unit[];
  isLoadingUnits: boolean;
  updatingUnitId: string | null;
  onUnitStatusChange: (unitId: string, currentStatus: string) => void;
  itemId?: string;
  onUnitScanned?: () => void; // Callback to refresh units after scanning
}

export default function UnitsTable({
  units,
  isLoadingUnits,
  updatingUnitId,
  onUnitStatusChange,
  itemId,
  onUnitScanned,
}: UnitsTableProps) {
  const [showScanner, setShowScanner] = useState(false);

  const handleScanSuccess = (unit: UnitInfo) => {
    // If this unit belongs to the current item, refresh the list
    if (unit.item_id === itemId) {
      onUnitScanned?.();
    }
    // Close scanner after successful scan
    setShowScanner(false);
  };

  if (isLoadingUnits) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Units</h4>
        </div>
        <div className="text-sm text-gray-500 py-4">Loading units...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Units</h4>
        <button
          onClick={() => setShowScanner(!showScanner)}
          className="px-2 sm:px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          {showScanner ? "Hide Scanner" : "Scan Barcode"}
        </button>
      </div>

      {/* Barcode Scanner */}
      {showScanner && (
        <div className="mb-4 p-2 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg w-full overflow-x-hidden">
          <BarcodeScanner
            onScanSuccess={handleScanSuccess}
            allowStatusUpdate={true}
          />
        </div>
      )}

      {units.length === 0 && !showScanner && (
        <div className="text-sm text-gray-500 py-4">No units found</div>
      )}

      {units.length > 0 && (
      <div className="max-h-96 overflow-y-auto overflow-x-auto border border-gray-200 rounded-md">
        <table className="w-full border-collapse text-sm min-w-[600px]">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">
                Serial Number
              </th>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">
                Barcode
              </th>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">
                Status
              </th>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">
                Location
              </th>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr
                key={unit.id}
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <td
                  className="py-2 px-3 text-gray-900 truncate max-w-[120px]"
                  title={unit.serial_number}
                >
                  {unit.serial_number}
                </td>
                <td
                  className="py-2 px-3 text-gray-900 font-mono truncate max-w-[120px]"
                  title={unit.barcode}
                >
                  {unit.barcode}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      unit.status === "available"
                        ? "bg-green-100 text-green-800"
                        : unit.status === "out"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {unit.status}
                  </span>
                </td>
                <td
                  className="py-2 px-3 text-gray-700 truncate max-w-[120px]"
                  title={unit.location_name}
                >
                  {unit.location_name}
                </td>
                <td className="py-2 px-3">
                  {unit.status === "available" && (
                    <button
                      onClick={() => onUnitStatusChange(unit.id, unit.status)}
                      disabled={updatingUnitId === unit.id}
                      className="px-3 py-1.5 sm:px-2 sm:py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingUnitId === unit.id ? "Updating..." : "Check Out"}
                    </button>
                  )}
                  {unit.status === "out" && (
                    <button
                      onClick={() => onUnitStatusChange(unit.id, unit.status)}
                      disabled={updatingUnitId === unit.id}
                      className="px-3 py-1.5 sm:px-2 sm:py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingUnitId === unit.id ? "Updating..." : "Check In"}
                    </button>
                  )}
                  {unit.status === "maintenance" && (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}