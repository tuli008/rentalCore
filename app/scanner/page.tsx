import BarcodeScanner from "@/app/components/barcode/BarcodeScanner";

export default function ScannerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Barcode Scanner</h1>
          <p className="mt-1 text-sm text-gray-600">
            Scan or manually enter a barcode to lookup serialized inventory items
          </p>
        </div>

        <BarcodeScanner />
      </div>
    </div>
  );
}

