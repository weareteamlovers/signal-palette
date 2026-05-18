"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ActiveTooltipValue {
  activeKey: string | null;
  /** Toggle a tooltip: same-key tap closes it; different-key tap switches to
   *  the new one and starts a fresh 3s timer. */
  toggle: (key: string) => void;
}

const ActiveTooltipContext = createContext<ActiveTooltipValue>({
  activeKey: null,
  toggle: () => {},
});

const VISIBLE_MS = 3000;

/** Tracks at most one open touch-tooltip across the page. ColorBox tap handlers
 *  call `toggle(key)` and read `activeKey` to decide whether to render the
 *  ::after tooltip. Mouse hover is unaffected. */
export function ActiveTooltipProvider({ children }: { children: ReactNode }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const toggle = useCallback(
    (key: string) => {
      clear();
      setActiveKey((prev) => {
        if (prev === key) return null; // same box → close
        timerRef.current = setTimeout(() => setActiveKey(null), VISIBLE_MS);
        return key;
      });
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  const value = useMemo(() => ({ activeKey, toggle }), [activeKey, toggle]);
  return (
    <ActiveTooltipContext.Provider value={value}>
      {children}
    </ActiveTooltipContext.Provider>
  );
}

export function useActiveTooltip() {
  return useContext(ActiveTooltipContext);
}
