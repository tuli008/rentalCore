"use client";

import { useState } from "react";
import type { InventoryGroup } from "@/lib/inventory";
import SortableGroupsList from "./SortableGroupsList";
import InventorySidebar from "./InventorySidebar";

interface InventoryPageContentProps {
  groups: InventoryGroup[];
  createGroup: (formData: FormData) => Promise<void>;
  createItem: (formData: FormData) => Promise<
    | { ok: true }
    | {
        ok: false;
        error: "DUPLICATE_NAME" | "VALIDATION_ERROR" | "SERVER_ERROR";
      }
  >;
  updateItem: (formData: FormData) => Promise<void>;
  updateStock: (formData: FormData) => Promise<void>;
  addMaintenanceLog: (formData: FormData) => Promise<void>;
  updateUnitStatus: (formData: FormData) => Promise<void>;
  reorderGroups: (formData: FormData) => Promise<void>;
  reorderItems: (formData: FormData) => Promise<void>;
  deleteItem: (
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>;
  deleteGroup: (
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>;
  updateGroup?: (
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>;
}

export default function InventoryPageContent({
  groups,
  createGroup,
  createItem,
  updateItem,
  updateStock,
  addMaintenanceLog,
  updateUnitStatus,
  reorderGroups,
  reorderItems,
  deleteItem,
  deleteGroup,
  updateGroup,
}: InventoryPageContentProps) {
  const [itemIdToOpen, setItemIdToOpen] = useState<string | null>(null);

  const handleItemSelect = (itemId: string, groupId: string) => {
    setItemIdToOpen(itemId);
  };

  const handleItemOpened = () => {
    setItemIdToOpen(null);
  };

  // Extract groups for sidebar
  const groupsForSidebar = groups.map((group) => ({
    id: group.id,
    name: group.name,
  }));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-row flex-nowrap w-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-w-0 order-1">
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
          {/* Header with Toolbar */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Inventory Items
              </h1>
            </div>
            
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <form action={createGroup}>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                  <input
                    name="name"
                    placeholder="New group name"
                    required
                    className="flex-1 w-full px-4 py-2.5 sm:py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
                    Add Group
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Groups List */}
          <SortableGroupsList
            groups={groups}
            createItem={createItem}
            updateItem={updateItem}
            updateStock={updateStock}
            addMaintenanceLog={addMaintenanceLog}
            updateUnitStatus={updateUnitStatus}
            reorderGroups={reorderGroups}
            reorderItems={reorderItems}
            deleteItem={deleteItem}
            deleteGroup={deleteGroup}
            updateGroup={updateGroup}
            itemIdToOpen={itemIdToOpen}
            onItemOpened={handleItemOpened}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <InventorySidebar
        onItemSelect={handleItemSelect}
        groups={groupsForSidebar}
      />
    </div>
  );
}