"use client";

import { useEffect } from "react";

/**
 * Locks the app's single scroll container (`#app-main-scroll`) while overlays/drawers are open.
 * This avoids the "two pages" feeling (background still scrolls behind a drawer).
 */
export function useLockAppScroll(locked: boolean) {
  useEffect(() => {
    const el = document.getElementById("app-main-scroll");
    if (!el) return;

    if (!locked) return;

    const prevOverflowY = el.style.overflowY;
    const prevOverscrollBehaviorY = el.style.overscrollBehaviorY as string;

    el.style.overflowY = "hidden";
    el.style.overscrollBehaviorY = "none";

    return () => {
      el.style.overflowY = prevOverflowY;
      el.style.overscrollBehaviorY = prevOverscrollBehaviorY;
    };
  }, [locked]);
}


