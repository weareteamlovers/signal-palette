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

  return null;
}
