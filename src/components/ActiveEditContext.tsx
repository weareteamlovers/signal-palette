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
type EditMode = "edit" | "onboarding";

interface ActiveEditValue {
  activeVariant: Variant | null;
  /** When set, EditPortfolioModal auto-opens this row's [변경/추가] dropdown
   *  on mount. Used by empty StockCard clicks AND by the onboarding modal
   *  (autoOpenRow=0 so the first row's search appears immediately). */
  autoOpenRow: number | null;
  /** 'onboarding' adds the "포트폴리오를 채워주세요" title + extra height.
   *  Defaults to 'edit'. */
  mode: EditMode;
  openEdit: (variant: Variant, autoOpenRow?: number, mode?: EditMode) => void;
  closeEdit: () => void;
}

const ActiveEditContext = createContext<ActiveEditValue>({
  activeVariant: null,
  autoOpenRow: null,
  mode: "edit",
  openEdit: () => {},
  closeEdit: () => {},
});

interface ProviderProps {
  /** Optional initial state — page.tsx (server component) sets these to
   *  auto-mount the onboarding modal for users who just finished nickname
   *  setup but have no portfolios yet. */
  initialActive?: Variant | null;
  initialAutoOpenRow?: number | null;
  initialMode?: EditMode;
  children: ReactNode;
}

/** Tracks which portfolio's edit modal is open. Only one at a time. */
export function ActiveEditProvider({
  initialActive = null,
  initialAutoOpenRow = null,
  initialMode = "edit",
  children,
}: ProviderProps) {
  const [activeVariant, setActiveVariant] = useState<Variant | null>(
    initialActive,
  );
  const [autoOpenRow, setAutoOpenRow] = useState<number | null>(
    initialAutoOpenRow,
  );
  const [mode, setMode] = useState<EditMode>(initialMode);

  const openEdit = useCallback(
    (v: Variant, row?: number, m: EditMode = "edit") => {
      setActiveVariant(v);
      setAutoOpenRow(typeof row === "number" ? row : null);
      setMode(m);
    },
    [],
  );
  const closeEdit = useCallback(() => {
    setActiveVariant(null);
    setAutoOpenRow(null);
    setMode("edit");
  }, []);

  const value = useMemo(
    () => ({ activeVariant, autoOpenRow, mode, openEdit, closeEdit }),
    [activeVariant, autoOpenRow, mode, openEdit, closeEdit],
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
