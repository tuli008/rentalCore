"use client";

import { useState, useEffect } from "react";
import {
  getItemAssetInfo,
  getItemUnitsAssetInfo,
  calculateAssetDepreciation,
  type AssetInfo,
  type UnitAssetInfo,
} from "@/app/actions/assets";

interface AssetRegisterProps {
  itemId: string;
  isSerialized: boolean;
}

export default function AssetRegister({
  itemId,
  isSerialized,
}: AssetRegisterProps) {
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [unitAssets, setUnitAssets] = useState<UnitAssetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [depreciationData, setDepreciationData] = useState<{
    totalDepreciation: number;
    currentBookValue: number;
    monthsElapsed: number;
  } | null>(null);

  useEffect(() => {
    loadAssetData();
  }, [itemId, isSerialized]);

  const loadAssetData = async () => {
    setIsLoading(true);
    try {
      if (isSerialized) {
        const units = await getItemUnitsAssetInfo(itemId);
        setUnitAssets(units);
        setAssetInfo(null);
      } else {
        const info = await getItemAssetInfo(itemId);
        setAssetInfo(info);
        setUnitAssets([]);

        // Calculate depreciation if asset info exists
        if (
          info &&
          info.purchase_cost &&
          info.purchase_date &&
          info.useful_life_years &&
          info.depreciation_method
        ) {
          const calc = await calculateAssetDepreciation(
            info.purchase_cost,
            info.purchase_date,
            info.useful_life_years,
            info.depreciation_method,
          );
          setDepreciationData(calc);
        }
      }
    } catch (error) {
      console.error("Error loading asset data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Asset Register
        </h3>
        <div className="text-sm text-gray-500">Loading asset information...</div>
      </div>
    );
  }

  // For serialized items, show per-unit asset info
  if (isSerialized) {
    if (unitAssets.length === 0) {
      return (
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Asset Register
          </h3>
          <div className="text-sm text-gray-500">
            No asset information registered for this item.
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Asset Register ({unitAssets.length} unit{unitAssets.length !== 1 ? "s" : ""})
        </h3>
        <div className="space-y-4">
          {unitAssets.map((unit) => (
            <div
              key={unit.unit_id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Serial: {unit.serial_number}
                  </div>
                  {unit.asset_tag && (
                    <div className="text-xs text-gray-600">
                      Tag: {unit.asset_tag}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Purchase Cost</div>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(unit.purchase_cost)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Purchase Date</div>
                  <div className="font-medium text-gray-900">
                    {formatDate(unit.purchase_date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Vendor</div>
                  <div className="font-medium text-gray-900">
                    {unit.vendor_name || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Useful Life</div>
                  <div className="font-medium text-gray-900">
                    {unit.useful_life_years
                      ? `${unit.useful_life_years} years`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Depreciation Method</div>
                  <div className="font-medium text-gray-900">
                    {unit.depreciation_method
                      ? unit.depreciation_method
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Current Book Value</div>
                  <div className="font-semibold text-blue-600">
                    {formatCurrency(unit.current_book_value)}
                  </div>
                </div>
              </div>

              {unit.purchase_cost && unit.current_book_value && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Depreciation</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(
                        unit.purchase_cost - unit.current_book_value,
                      )}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            ((unit.purchase_cost - unit.current_book_value) /
                              unit.purchase_cost) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // For bulk items, show item-level asset info
  if (!assetInfo) {
    return (
      <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Asset Register
        </h3>
        <div className="text-sm text-gray-500">
          No asset information registered for this item.
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Asset Register
      </h3>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <div className="text-xs text-gray-500">Purchase Cost</div>
            <div className="font-medium text-gray-900">
              {formatCurrency(assetInfo.purchase_cost)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Purchase Date</div>
            <div className="font-medium text-gray-900">
              {formatDate(assetInfo.purchase_date)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Vendor</div>
            <div className="font-medium text-gray-900">
              {assetInfo.vendor_name || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Useful Life</div>
            <div className="font-medium text-gray-900">
              {assetInfo.useful_life_years
                ? `${assetInfo.useful_life_years} years`
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Depreciation Method</div>
            <div className="font-medium text-gray-900">
              {assetInfo.depreciation_method
                ? assetInfo.depreciation_method
                    .replace("_", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())
                : "—"}
            </div>
          </div>
          {assetInfo.asset_tag && (
            <div>
              <div className="text-xs text-gray-500">Asset Tag</div>
              <div className="font-medium text-gray-900">
                {assetInfo.asset_tag}
              </div>
            </div>
          )}
        </div>

        {depreciationData && assetInfo.purchase_cost && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs text-gray-500">Current Book Value</div>
                <div className="text-lg font-semibold text-blue-600">
                  {formatCurrency(depreciationData.currentBookValue)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Total Depreciation</div>
                <div className="text-sm font-medium text-red-600">
                  {formatCurrency(depreciationData.totalDepreciation)}
                </div>
              </div>
            </div>

            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${
                      (depreciationData.totalDepreciation /
                        assetInfo.purchase_cost) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                {depreciationData.monthsElapsed} month
                {depreciationData.monthsElapsed !== 1 ? "s" : ""} elapsed
              </span>
              <span>
                {assetInfo.useful_life_years
                  ? `${Math.round(
                      (depreciationData.monthsElapsed /
                        (assetInfo.useful_life_years * 12)) *
                        100,
                    )}% of useful life`
                  : ""}
              </span>
            </div>
          </div>
        )}

        {!depreciationData && assetInfo.purchase_cost && (
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Current Book Value: {formatCurrency(assetInfo.current_book_value)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

