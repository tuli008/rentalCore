"use client";

import { useState, useEffect } from "react";

interface CreateItemModalProps {
  isOpen: boolean;
  groupId: string;
  groupName: string;
  initialName?: string;
  onClose: () => void;
  onCreateItem: (formData: FormData) => Promise<void>;
}

export default function CreateItemModal({
  isOpen,
  groupId,
  groupName,
  initialName = "",
  onClose,
  onCreateItem,
}: CreateItemModalProps) {
  const [isSerialized, setIsSerialized] = useState(false);
  const [price, setPrice] = useState("0.00");
  const [totalQuantity, setTotalQuantity] = useState("0");
  const [outOfServiceQuantity, setOutOfServiceQuantity] = useState("0");
  const [isCreating, setIsCreating] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsSerialized(false);
      setPrice("0.00");
      setTotalQuantity("0");
      setOutOfServiceQuantity("0");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!initialName.trim()) {
      alert("Please enter an item name");
      return;
    }

    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      alert("Please enter a valid price");
      return;
    }

    const totalQty = parseInt(totalQuantity, 10);
    const outQty = parseInt(outOfServiceQuantity, 10);

    if (
      Number.isNaN(totalQty) ||
      totalQty < 0 ||
      Number.isNaN(outQty) ||
      outQty < 0 ||
      outQty > totalQty
    ) {
      alert("Please enter valid stock quantities");
      return;
    }

    setIsCreating(true);

    const formData = new FormData();
    formData.append("group_id", groupId);
    formData.append("name", initialName.trim());
    formData.append("is_serialized", isSerialized ? "on" : "off");
    formData.append("price", priceNum.toFixed(2));
    formData.append("total_quantity", totalQty.toString());
    formData.append("out_of_service_quantity", outQty.toString());

    try {
      await onCreateItem(formData);
      // Reset form
      setIsSerialized(false);
      setPrice("0.00");
      setTotalQuantity("0");
      setOutOfServiceQuantity("0");
      onClose();
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Failed to create item. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setIsSerialized(false);
      setPrice("0.00");
      setTotalQuantity("0");
      setOutOfServiceQuantity("0");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Create New Item
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">{initialName}</span> • Group: {groupName}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors disabled:opacity-50"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Is Serialized */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isSerialized}
                onChange={(e) => setIsSerialized(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              Serialized Item
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Serialized items are tracked individually by serial number
            </p>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price ($) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stock (only for non-serialized items) */}
          {!isSerialized && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-md border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700">Stock</h4>

              {/* Total Quantity */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Total Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalQuantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      setTotalQuantity(val);
                    }
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Out of Service Quantity */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Out of Service
                </label>
                <input
                  type="number"
                  min="0"
                  max={parseInt(totalQuantity) || 0}
                  value={outOfServiceQuantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      const numVal = parseInt(val, 10);
                      const maxVal = parseInt(totalQuantity) || 0;
                      if (val === "" || (!Number.isNaN(numVal) && numVal >= 0)) {
                        setOutOfServiceQuantity(
                          val === "" ? "0" : Math.min(numVal, maxVal).toString(),
                        );
                      }
                    }
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available:{" "}
                  {Math.max(
                    0,
                    (parseInt(totalQuantity) || 0) -
                      (parseInt(outOfServiceQuantity) || 0),
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !initialName.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating..." : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

