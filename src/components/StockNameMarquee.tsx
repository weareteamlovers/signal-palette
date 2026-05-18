"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./StockNameMarquee.module.css";

interface Props {
  text: string;
}

/** Scroll speed (CSS pixels per second) when the name overflows. */
const PIXELS_PER_SECOND = 50;
/** Short pause at the start of every cycle so the name is readable before it
 *  begins moving (sec). */
const START_PAUSE = 0.6;

/**
 * Stock-name marquee for mobile cards. When the rendered name is wider than
 * the available container, the text scrolls right→left at PIXELS_PER_SECOND.
 * Short names that fit are rendered statically with no animation.
 *
 * Mobile-only by design (desktop/tablet cards are 290px wide and fit the
 * existing names) — StockCard wraps the name in this only when viewport
 * === "mobile".
 */
export function StockNameMarquee({ text }: Props) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scrolling, setScrolling] = useState(false);
  const [duration, setDuration] = useState(0);

  // useLayoutEffect on mount, then ResizeObserver afterwards, so the first
  // paint already has the right scrolling/static decision.
  useLayoutEffect(() => {
    const measure = () => {
      const cont = containerRef.current;
      const txt = textRef.current;
      if (!cont || !txt) return;
      const overflow = txt.scrollWidth > cont.clientWidth + 0.5;
      setScrolling(overflow);
      if (overflow) {
        // One full cycle = the text travels from "just off the right edge"
        // to "just off the left edge" = container width + text width.
        const travel = cont.clientWidth + txt.scrollWidth;
        setDuration(travel / PIXELS_PER_SECOND + START_PAUSE);
      }
    };
    measure();
  }, [text]);

  useEffect(() => {
    const cont = containerRef.current;
    const txt = textRef.current;
    if (!cont || !txt) return;
    const obs = new ResizeObserver(() => {
      const overflow = txt.scrollWidth > cont.clientWidth + 0.5;
      setScrolling(overflow);
      if (overflow) {
        const travel = cont.clientWidth + txt.scrollWidth;
        setDuration(travel / PIXELS_PER_SECOND + START_PAUSE);
      }
    });
    obs.observe(cont);
    obs.observe(txt);
    return () => obs.disconnect();
  }, [text]);

  return (
    <span ref={containerRef} className={styles.container}>
      <span
        ref={textRef}
        className={scrolling ? styles.scrolling : styles.static}
        style={
          scrolling
            ? {
                animationDuration: `${duration}s`,
                animationDelay: `-${START_PAUSE}s`,
              }
            : undefined
        }
      >
        {text}
      </span>
    </span>
  );
}
