"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { lookupUnitByBarcode, updateUnitStatusByBarcode, type UnitInfo } from "@/app/actions/units";

interface BarcodeScannerProps {
  onScanSuccess?: (unit: UnitInfo) => void;
  onScanError?: (error: string) => void;
  allowStatusUpdate?: boolean;
}

export default function BarcodeScanner({
  onScanSuccess,
  onScanError,
  allowStatusUpdate = true,
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [scannedUnit, setScannedUnit] = useState<UnitInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanControlRef = useRef<{ stop: () => void } | null>(null);

  // Initialize barcode reader
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    return () => {
      stopScanning();
      codeReaderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stopScanning is stable, no need to include in deps

  // Stop scanning and release camera
  const stopScanning = useCallback(() => {
    // Stop the scan control if it exists
    if (scanControlRef.current) {
      try {
        scanControlRef.current.stop();
      } catch (error) {
        console.debug('Error stopping scan control:', error);
      }
      scanControlRef.current = null;
    }
    
    // Stop the media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    // Reset the reader
    if (codeReaderRef.current) {
      try {
        // BrowserMultiFormatReader may have reset method
        if (typeof (codeReaderRef.current as any).reset === 'function') {
          (codeReaderRef.current as any).reset();
        }
      } catch (error) {
        // Ignore errors - the stream cleanup above is sufficient
        console.debug('Error resetting scanner:', error);
      }
    }
    
    setIsScanning(false);
  }, []);

  // Start camera scanning
  const startScanning = async () => {
    if (!codeReaderRef.current || !videoRef.current) return;

    try {
      setError(null);
      setIsScanning(true);
      setScannedUnit(null);

      // Get available video input devices
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        setError("No camera found. Please use manual input.");
        setIsScanning(false);
        return;
      }

      // Use the first available camera (or allow user to choose)
      const selectedDeviceId = videoInputDevices[0].deviceId;

      // Start decoding from camera
      // decodeFromVideoDevice returns a Promise that may resolve with control object or void
      const control = await codeReaderRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        async (result, error) => {
          if (result) {
            const barcode = result.getText();
            stopScanning();
            await handleBarcodeScanned(barcode);
          }
          if (error && error.name !== "NotFoundException") {
            console.error("Scan error:", error);
          }
        }
      );

      // Store the control object if it exists (may be undefined depending on library version)
      if (control && typeof control === 'object' && 'stop' in control) {
        scanControlRef.current = control as { stop: () => void };
      }

      // Get the stream from the video element after a short delay to ensure it's attached
      setTimeout(() => {
        if (videoRef.current?.srcObject) {
          streamRef.current = videoRef.current.srcObject as MediaStream;
        }
        
        // Ensure video is playing
        if (videoRef.current) {
          videoRef.current.play().catch((err) => {
            console.error("Error playing video:", err);
          });
        }
      }, 100);
    } catch (err) {
      console.error("Error starting camera:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        setError("Camera permission denied. Please allow camera access and try again.");
      } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("no camera")) {
        setError("No camera found. Please use manual input.");
      } else if (errorMessage.includes("NotReadableError")) {
        setError("Camera is already in use by another application. Please close other apps and try again.");
      } else {
        setError(`Failed to access camera: ${errorMessage}. Please use manual input.`);
      }
      
      setIsScanning(false);
    }
  };

  // Handle scanned barcode
  const handleBarcodeScanned = async (barcode: string) => {
    if (!barcode || !barcode.trim()) return;

    setIsLoading(true);
    setError(null);
    setScannedUnit(null);

    try {
      const result = await lookupUnitByBarcode(barcode.trim());

      if (!result.success || !result.unit) {
        setError(result.error || "Unit not found");
        onScanError?.(result.error || "Unit not found");
        return;
      }

      setScannedUnit(result.unit);
      setManualInput("");
      onScanSuccess?.(result.unit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to lookup unit";
      setError(errorMessage);
      onScanError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual input
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await handleBarcodeScanned(manualInput);
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: "available" | "out" | "maintenance") => {
    if (!scannedUnit) return;

    setIsUpdatingStatus(true);
    setError(null);

    try {
      const result = await updateUnitStatusByBarcode(scannedUnit.barcode, newStatus);

      if (!result.success) {
        setError(result.error || "Failed to update status");
        return;
      }

      // Update the unit status in state
      setScannedUnit({ ...scannedUnit, status: newStatus });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "out":
        return "bg-red-100 text-red-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Camera Scanner */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Camera Scanner</h3>
          {isScanning && (
            <button
              onClick={stopScanning}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Stop Scanning
            </button>
          )}
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: "200px", maxHeight: "400px" }}>
          <video
            ref={videoRef}
            className={`w-full h-full object-contain ${isScanning ? '' : 'hidden'}`}
            autoPlay
            playsInline
            muted
          />
          {!isScanning && (
            <div className="flex items-center justify-center" style={{ minHeight: "200px" }}>
              <div className="text-center text-gray-400">
                <svg
                  className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                <p className="text-xs sm:text-sm">Camera not active</p>
              </div>
            </div>
          )}
        </div>

        {!isScanning && (
          <button
            onClick={startScanning}
            className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Start Camera Scanner
          </button>
        )}
      </div>

      {/* Manual Input */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Manual Entry</h3>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter or scan barcode..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !manualInput.trim()}
            className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isLoading ? "Searching..." : "Lookup"}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Scanned Unit Info */}
      {scannedUnit && (
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Unit Found</h3>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Item:</span>
              <span className="font-medium text-gray-900">{scannedUnit.item_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Group:</span>
              <span className="font-medium text-gray-900">{scannedUnit.group_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Serial Number:</span>
              <span className="font-mono text-gray-900">{scannedUnit.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Barcode:</span>
              <span className="font-mono text-gray-900">{scannedUnit.barcode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="font-medium text-gray-900">{scannedUnit.location_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                  scannedUnit.status
                )}`}
              >
                {scannedUnit.status}
              </span>
            </div>
          </div>

          {/* Status Update Actions */}
          {allowStatusUpdate && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Update Status:</p>
              <div className="flex gap-2 flex-wrap">
                {scannedUnit.status !== "available" && (
                  <button
                    onClick={() => handleStatusUpdate("available")}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingStatus ? "Updating..." : "Check In"}
                  </button>
                )}
                {scannedUnit.status !== "out" && (
                  <button
                    onClick={() => handleStatusUpdate("out")}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingStatus ? "Updating..." : "Check Out"}
                  </button>
                )}
                {scannedUnit.status !== "maintenance" && (
                  <button
                    onClick={() => handleStatusUpdate("maintenance")}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingStatus ? "Updating..." : "Mark Maintenance"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

