"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState, useEffect } from "react";

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  is_serialized?: boolean;
  available?: number;
  total?: number;
  effectiveAvailable?: number;
  reservedInOverlappingEvents?: number;
  group_id?: string;
  group_name?: string;
  quantityInQuote?: number; // Quantity already in the quote
}

interface DraggableItemCardProps {
  item: InventoryItem;
  effectiveAvailable: number;
  onAddClick: (item: InventoryItem) => void;
  isReadOnly?: boolean;
}

export default function DraggableItemCard({
  item,
  effectiveAvailable,
  onAddClick,
  isReadOnly = false,
}: DraggableItemCardProps) {
  // Detect if we're on a mobile device
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile (touch device or small screen)
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(isTouchDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `item-${item.id}`,
    data: {
      type: "inventory-item",
      item: item,
    },
    // Disable drag on mobile devices or if read-only
    disabled: isReadOnly || isMobile,
  });

  // Memoize style to prevent unnecessary re-renders
  const dragStyle = useMemo(() => ({
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.2 : 1,
    transition: isDragging ? undefined : "opacity 0.15s ease",
    // Only prevent touch action on desktop (where drag is enabled)
    // On mobile, allow normal touch behavior since drag is disabled
    touchAction: (isMobile || isReadOnly) ? "auto" as const : "none" as const,
    // Prevent text selection during drag on desktop
    userSelect: (isMobile || isReadOnly) ? "auto" as const : "none" as const,
  }), [transform, isDragging, isMobile, isReadOnly]);


  const isLowStock = effectiveAvailable === 0;
  const isMediumStock = effectiveAvailable > 0 && effectiveAvailable < 5;

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...(isReadOnly || isMobile ? {} : { ...attributes, ...listeners })}
      className={`p-4 hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0 ${
        isReadOnly || isMobile ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      }`}
      // Prevent text selection during drag on desktop only
      onMouseDown={(e) => {
        if (!isReadOnly && !isMobile) {
          // Prevent text selection during drag
          e.preventDefault();
        }
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
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
            <span className="font-medium text-gray-900">{item.name}</span>
            {item.group_name && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                {item.group_name}
              </span>
            )}
            {item.quantityInQuote && item.quantityInQuote > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                {item.quantityInQuote} in quote
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 ml-7">
            <span>
              Available:{" "}
              <span
                className={`font-mono ${
                  isLowStock
                    ? "text-red-600 font-semibold"
                    : isMediumStock
                      ? "text-yellow-600"
                      : "text-gray-700"
                }`}
              >
                {effectiveAvailable} / {item.total || 0}
              </span>
            </span>
            <span>
              Rate:{" "}
              <span className="font-semibold text-gray-900">
                ${item.price.toFixed(2)}
              </span>
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isReadOnly) {
              onAddClick(item);
            }
          }}
          onMouseDown={(e) => {
            // Prevent drag from starting when clicking the button
            e.stopPropagation();
          }}
          disabled={isReadOnly}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
}

