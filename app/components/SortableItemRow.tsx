"use client";

import { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { InventoryItem } from "@/lib/inventory";
import ItemCalendar from "./ItemCalendar";

interface SortableItemRowProps {
  item: InventoryItem;
  onItemClick: (item: InventoryItem) => void;
  onArchive?: (item: InventoryItem) => void;
}

export default function SortableItemRow({
  item,
  onItemClick,
  onArchive,
}: SortableItemRowProps) {
  const [mounted, setMounted] = useState(false);
  const lastTouchTsRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !mounted });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const activate = () => onItemClick(item);

  return (
    <tr
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: "manipulation",
      }}
      // iOS/table rows can be flaky; make activation explicit for touch + mouse.
      onTouchEnd={() => {
        lastTouchTsRef.current = Date.now();
        activate();
      }}
      onPointerUp={(e) => {
        // ignore synthetic click after touch
        if (Date.now() - lastTouchTsRef.current < 600) return;
        // only primary button
        if ("button" in e && (e as any).button !== 0) return;
        activate();
      }}
      onClick={() => {
        if (Date.now() - lastTouchTsRef.current < 600) return;
        activate();
      }}
      className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer group"
    >
      <td className="w-4 py-3 px-3 sm:px-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      </td>
      <td className="py-2 px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-900 font-medium text-sm sm:text-base truncate">
            {item.name}
          </span>
          {item.total === 0 && (
            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded whitespace-nowrap flex-shrink-0">
              Needs stock
            </span>
          )}
        </div>
      </td>
      <td className="py-2 px-3 sm:px-4">
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
            item.is_serialized
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {item.is_serialized ? "Serialized" : "Bulk"}
        </span>
      </td>
      <td className="py-2 px-3 sm:px-4">
        {item.sku ? (
          <span className="text-xs text-gray-600 font-mono">{item.sku}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="py-3 px-3 sm:px-4 text-right text-gray-700 text-sm sm:text-base whitespace-nowrap">
        ${item.price.toFixed(2)}
      </td>
      <td className="py-3 px-3 sm:px-4 text-right text-gray-700 font-mono text-sm sm:text-base whitespace-nowrap">
        {item.available} / {item.total}
      </td>
      <td className="py-2 px-3 sm:px-4 text-center" onClick={(e) => e.stopPropagation()}>
        <ItemCalendar itemId={item.id} itemName={item.name} />
      </td>
      <td className="w-10 py-2 px-3 sm:px-4"></td>
    </tr>
  );
}