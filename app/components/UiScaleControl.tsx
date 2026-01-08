"use client";

import { useEffect, useState } from "react";

type UiScaleOption = {
  label: string;
  value: number;
};

const OPTIONS: UiScaleOption[] = [
  { label: "50%", value: 0.5 },
  { label: "67%", value: 2 / 3 },
  { label: "80%", value: 0.8 },
  { label: "100%", value: 1 },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function UiScaleControl() {
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("uiScale");
      if (stored) {
        const parsed = clamp(Number(stored), 0.5, 1);
        if (!Number.isNaN(parsed)) setScale(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const clamped = clamp(scale, 0.5, 1);
    document.documentElement.dataset.uiScale = String(clamped);

    // Prefer CSS `zoom` when supported (gives the most "browser zoom-like" density).
    // Safari iOS does NOT support `zoom`, so we fall back to changing root font-size (rem-based scaling).
    const supportsZoom =
      typeof window !== "undefined" &&
      typeof (window as any).CSS !== "undefined" &&
      typeof (window as any).CSS.supports === "function" &&
      (window as any).CSS.supports("zoom: 1");

    if (supportsZoom) {
      // Reset rem scaling so we don't double-scale.
      document.documentElement.style.fontSize = "16px";
      (document.body.style as any).zoom = String(clamped);
    } else {
      // Tailwind uses rem units, so changing root font-size scales most of the UI safely.
      const basePx = 16;
      const px = Math.round(basePx * clamped);
      document.documentElement.style.fontSize = `${px}px`;
      (document.body.style as any).zoom = "";
    }

    try {
      window.localStorage.setItem("uiScale", String(clamped));
    } catch {
      // ignore
    }

    return () => {
      // keep user preference; no cleanup
    };
  }, [scale]);

  return (
    <label className="flex items-center gap-2 text-blue-100">
      <span className="text-xs font-semibold">UI</span>
      <select
        value={scale}
        onChange={(e) => setScale(Number(e.target.value))}
        className="bg-blue-600 border border-blue-400 text-white text-xs sm:text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="UI scale"
      >
        {OPTIONS.map((o) => (
          <option key={o.label} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="text-[10px] text-blue-100/80 hidden sm:inline">
        ({Math.round(clamp(scale, 0.5, 1) * 100)}%)
      </span>
    </label>
  );
}


