"use client";

import { useState, useEffect } from "react";
import { getQuoteWithItems } from "@/lib/quotes";
import type { QuoteWithItems, QuoteItem } from "@/lib/quotes";
import { generateQuotePDF } from "@/lib/pdfGenerator";
import QuoteItemsList from "./QuoteItemsList";
import AddQuoteItemDialog from "./AddQuoteItemDialog";
import {
  updateQuote,
  deleteQuote,
  addQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
  confirmQuotation,
} from "@/app/actions/quotes";
import { useRouter } from "next/navigation";

interface QuoteDetailDrawerProps {
  quoteId: string;
  isDrawerOpen: boolean;
  onClose: () => void;
  updateQuote: (
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>;
  deleteQuote: (
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>;
}

export default function QuoteDetailDrawer({
  quoteId,
  isDrawerOpen,
  onClose,
  updateQuote,
  deleteQuote,
}: QuoteDetailDrawerProps) {
  const [quote, setQuote] = useState<QuoteWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<"name" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (quoteId && isDrawerOpen) {
      loadQuote();
    }
  }, [quoteId, isDrawerOpen]);

  const loadQuote = async () => {
    setIsLoading(true);
    const data = await getQuoteWithItems(quoteId);
    setQuote(data);
    setIsLoading(false);
  };

  const handleStartEdit = (field: "name") => {
    if (!quote) return;
    setEditingField(field);
    setEditValue(quote.name);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleSave = async () => {
    if (!quote || !editingField) return;

    setIsSaving(true);
    const formData = new FormData();
    formData.append("quote_id", quote.id);
    formData.append("name", editValue.trim());
    formData.append("start_date", quote.start_date);
    formData.append("end_date", quote.end_date);

    const result = await updateQuote(formData);
    if (result.success) {
      setEditingField(null);
      setEditValue("");
      await loadQuote();
      router.refresh();
    }
    setIsSaving(false);
  };

  const handleDateChange = async (
    field: "start_date" | "end_date",
    value: string,
  ) => {
    if (!quote) return;

    const formData = new FormData();
    formData.append("quote_id", quote.id);
    formData.append("name", quote.name);
    formData.append(
      "start_date",
      field === "start_date" ? value : quote.start_date,
    );
    formData.append("end_date", field === "end_date" ? value : quote.end_date);

    await updateQuote(formData);
    await loadQuote();
    router.refresh();
  };

  const handleDelete = async () => {
    if (!quote) return;

    const formData = new FormData();
    formData.append("quote_id", quote.id);

    const result = await deleteQuote(formData);
    if (result.success) {
      onClose();
      router.refresh();
    }
  };

  const handleAddItem = async (
    itemId: string,
    quantity: number,
    unitPrice: number,
  ) => {
    if (!quote) return;

    const formData = new FormData();
    formData.append("quote_id", quote.id);
    formData.append("item_id", itemId);
    formData.append("quantity", quantity.toString());
    formData.append("unit_price", unitPrice.toString());

    const result = await addQuoteItem(formData);
    if (result.success) {
      await loadQuote();
      router.refresh();
    }
  };

  const handleUpdateItem = async (quoteItemId: string, quantity: number) => {
    const formData = new FormData();
    formData.append("quote_item_id", quoteItemId);
    formData.append("quantity", quantity.toString());

    const result = await updateQuoteItem(formData);
    if (result.success) {
      await loadQuote();
      router.refresh();
    }
  };

  const handleDeleteItem = async (quoteItemId: string) => {
    const formData = new FormData();
    formData.append("quote_item_id", quoteItemId);

    const result = await deleteQuoteItem(formData);
    if (result.success) {
      await loadQuote();
      router.refresh();
    }
  };

  const handleConfirmQuotation = async () => {
    if (!quote) return;

    setIsConfirming(true);
    const formData = new FormData();
    formData.append("quote_id", quote.id);

    const result = await confirmQuotation(formData);
    if (result.ok) {
      await loadQuote();
      router.refresh();
      alert(result.message || "Quotation confirmed successfully!");
    } else {
      alert(result.error || "Failed to confirm quotation.");
    }
    setIsConfirming(false);
  };

  if (!isDrawerOpen) return null;

  const startDate = quote ? new Date(quote.start_date) : null;
  const endDate = quote ? new Date(quote.end_date) : null;
  const numberOfDays =
    startDate && endDate
      ? Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;

  const totalAmount = quote
    ? quote.items.reduce((sum, item) => {
        return sum + item.quantity * item.unit_price_snapshot * numberOfDays;
      }, 0)
    : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={() => {
          if (!editingField) {
            onClose();
          }
        }}
      />

      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex-1">
              {editingField === "name" ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSave();
                    } else if (e.key === "Escape") {
                      handleCancelEdit();
                    }
                  }}
                  onBlur={handleSave}
                  autoFocus
                  disabled={isSaving}
                  className="text-2xl font-bold text-gray-900 w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <h2
                  onClick={() => handleStartEdit("name")}
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {quote?.name || "Loading..."}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                Delete
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
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
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="text-center text-gray-500 py-8">
                Loading quote...
              </div>
            ) : !quote ? (
              <div className="text-center text-gray-500 py-8">
                Quote not found
              </div>
            ) : (
              <div className="space-y-6">
                {/* Date Range */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Rental Period
                  </h4>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={quote.start_date}
                        onChange={(e) =>
                          handleDateChange("start_date", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={quote.end_date}
                        onChange={(e) =>
                          handleDateChange("end_date", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  {numberOfDays > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {numberOfDays} day{numberOfDays !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Items List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Items
                    </h4>
                    <button
                      onClick={() => setShowAddItemDialog(true)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>
                  <QuoteItemsList
                    items={quote.items}
                    numberOfDays={numberOfDays}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                  />
                </div>

                {/* Summary */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-gray-700">
                      Total
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      ${totalAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        quote.status === "draft"
                          ? "bg-gray-100 text-gray-800"
                          : quote.status === "sent"
                            ? "bg-blue-100 text-blue-800"
                            : quote.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                      }`}
                    >
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </span>
                  </div>

                  {/* Action Buttons - Only show for draft quotes */}
                  {quote.status === "draft" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (quote) {
                            generateQuotePDF(quote);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-1.5"
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
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        Generate PDF
                      </button>
                      <button
                        onClick={handleConfirmQuotation}
                        disabled={isConfirming}
                        className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isConfirming ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Confirming...
                          </>
                        ) : (
                          <>
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
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Confirm
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Dialog */}
      {showAddItemDialog && (
        <AddQuoteItemDialog
          onClose={() => setShowAddItemDialog(false)}
          onAddItem={handleAddItem}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Quote
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this quote? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  handleDelete();
                }}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}