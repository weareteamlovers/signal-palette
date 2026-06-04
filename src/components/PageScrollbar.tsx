"use client";

import { useEffect } from "react";
import { useOverlayScrollbars } from "overlayscrollbars-react";

/**
 * Replaces the page (document body) scrollbar with an OverlayScrollbars overlay
 * so it behaves consistently across browsers/OS: visible only while scrolling
 * (autoHide: "scroll"), floats over the gradient with no track background, and
 * is themed #31343F via the `os-theme-signal` class (see globals.css).
 *
 * Initialization is deferred to after hydration and targets document.body;
 * `cancel` is disabled so it also applies where the OS uses native overlay
 * scrollbars (e.g. macOS). Renders nothing.
 */
export function PageScrollbar() {
  const [initialize] = useOverlayScrollbars({
    defer: true,
    options: {
      scrollbars: {
        theme: "os-theme-signal",
        autoHide: "scroll",
        autoHideDelay: 700,
      },
    },
  });

  useEffect(() => {
    initialize({
      target: document.body,
      cancel: {
        nativeScrollbarsOverlaid: false,
        body: false,
      },
    });
  }, [initialize]);

  // Reveal the overlay scrollbar while the mouse sits over its region (the
  // right edge), in addition to the autoHide: "scroll" trigger. Toggles the
  // `os-peek` class on <html>; the CSS override (globals.css) forces the
  // vertical scrollbar visible. Mouse-only — touch reveals via scrolling.
  useEffect(() => {
    const REVEAL_PX = 24;
    const root = document.documentElement;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      root.classList.toggle(
        "os-peek",
        e.clientX >= window.innerWidth - REVEAL_PX,
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      root.classList.remove("os-peek");
    };
  }, []);

  return null;
}
