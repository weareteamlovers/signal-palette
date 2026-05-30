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
  openEdit: (variant: Variant) => void;
  closeEdit: () => void;
}

const ActiveEditContext = createContext<ActiveEditValue>({
  activeVariant: null,
  openEdit: () => {},
  closeEdit: () => {},
});

/** Tracks which portfolio's edit modal is open. Only one at a time. Clicking
 *  the other portfolio's [수정] swaps the active variant without closing. */
export function ActiveEditProvider({ children }: { children: ReactNode }) {
  const [activeVariant, setActiveVariant] = useState<Variant | null>(null);
  const openEdit = useCallback((v: Variant) => setActiveVariant(v), []);
  const closeEdit = useCallback(() => setActiveVariant(null), []);
  const value = useMemo(
    () => ({ activeVariant, openEdit, closeEdit }),
    [activeVariant, openEdit, closeEdit],
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
