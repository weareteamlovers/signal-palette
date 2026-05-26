"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Variant = "current" | "spare";

interface ActiveStockValue {
  activeStockName: string | null;
  /** Variant the active stock came from — drives the modal's y-position
   *  (current: y=114 / spare: y=343 per Figma §14-6). */
  activeVariant: Variant | null;
  openStock: (name: string, variant: Variant) => void;
  closeStock: () => void;
}

const ActiveStockContext = createContext<ActiveStockValue>({
  activeStockName: null,
  activeVariant: null,
  openStock: () => {},
  closeStock: () => {},
});

/** Tracks which stock's detail modal is open, if any. Only one stock modal
 *  can be open at a time. Clicking a different card while one is open just
 *  switches the active stock (and possibly variant) without closing first. */
export function ActiveStockProvider({ children }: { children: ReactNode }) {
  const [activeStockName, setActiveStockName] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<Variant | null>(null);

  const openStock = useCallback((name: string, variant: Variant) => {
    setActiveStockName(name);
    setActiveVariant(variant);
  }, []);
  const closeStock = useCallback(() => {
    setActiveStockName(null);
    setActiveVariant(null);
  }, []);

  const value = useMemo(
    () => ({ activeStockName, activeVariant, openStock, closeStock }),
    [activeStockName, activeVariant, openStock, closeStock],
  );
  return (
    <ActiveStockContext.Provider value={value}>
      {children}
    </ActiveStockContext.Provider>
  );
}

export function useActiveStock() {
  return useContext(ActiveStockContext);
}
