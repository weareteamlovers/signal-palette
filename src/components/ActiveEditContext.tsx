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

interface ActiveEditValue {
  activeVariant: Variant | null;
  /** When set, EditPortfolioModal auto-opens this row's [변경] dropdown on
   *  mount. Used by empty StockCard clicks so users land directly on the
   *  search dropdown for that slot. */
  autoOpenRow: number | null;
  openEdit: (variant: Variant, autoOpenRow?: number) => void;
  closeEdit: () => void;
}

const ActiveEditContext = createContext<ActiveEditValue>({
  activeVariant: null,
  autoOpenRow: null,
  openEdit: () => {},
  closeEdit: () => {},
});

/** Tracks which portfolio's edit modal is open. Only one at a time. Clicking
 *  the other portfolio's [수정] swaps the active variant without closing.
 *  An optional `autoOpenRow` lets the trigger (e.g. an empty-slot card) ask
 *  the modal to immediately open that row's search dropdown. */
export function ActiveEditProvider({ children }: { children: ReactNode }) {
  const [activeVariant, setActiveVariant] = useState<Variant | null>(null);
  const [autoOpenRow, setAutoOpenRow] = useState<number | null>(null);

  const openEdit = useCallback((v: Variant, row?: number) => {
    setActiveVariant(v);
    setAutoOpenRow(typeof row === "number" ? row : null);
  }, []);
  const closeEdit = useCallback(() => {
    setActiveVariant(null);
    setAutoOpenRow(null);
  }, []);

  const value = useMemo(
    () => ({ activeVariant, autoOpenRow, openEdit, closeEdit }),
    [activeVariant, autoOpenRow, openEdit, closeEdit],
  );
  return (
    <ActiveEditContext.Provider value={value}>
      {children}
    </ActiveEditContext.Provider>
  );
}

export function useActiveEdit() {
  return useContext(ActiveEditContext);
}
