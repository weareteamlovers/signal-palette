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
import { getMockStock } from "@/data/default-portfolio";
import type { OverallSignal, Stock } from "@/types";

type StockState =
  | { status: "loading" }
  | { status: "ready"; stock: Stock; source: "live" | "mock" };

type OverallState =
  | { status: "loading" }
  | { status: "ready"; overall: OverallSignal; source: "live" | "mock" };

type Variant = "current" | "spare";

interface AnalysisValue {
  stocks: Record<string, StockState>;
  overalls: Record<Variant, OverallState>;
}

const AnalysisContext = createContext<AnalysisValue>({
  stocks: {},
  overalls: {
    current: { status: "loading" },
    spare: { status: "loading" },
  },
});

interface ProviderProps {
  current: readonly string[];
  spare: readonly string[];
  children: ReactNode;
}

const LABELS: Record<Variant, string> = {
  current: "현재 포트폴리오",
  spare: "예비 포트폴리오",
};

/** Owns every /api/analyze fetch on the page. Kicks off 16 stock requests in
 *  parallel on mount; once a portfolio's 8 stocks are all ready, fires its
 *  portfolio-overall request. Failures fall back to per-stock mock data so a
 *  single bad response never wipes a card. */
export function AnalysisProvider({ current, spare, children }: ProviderProps) {
  const [stocks, setStocks] = useState<Record<string, StockState>>(() => {
    const m: Record<string, StockState> = {};
    for (const n of [...current, ...spare]) m[n] = { status: "loading" };
    return m;
  });
  const [overalls, setOveralls] = useState<Record<Variant, OverallState>>({
    current: { status: "loading" },
    spare: { status: "loading" },
  });

  // Track which portfolio overalls we've already dispatched so the deps-based
  // effect doesn't refire when stocks update for unrelated reasons.
  const overallDispatched = useRef<Record<Variant, boolean>>({
    current: false,
    spare: false,
  });

  // Kick off all per-stock fetches once on mount.
  useEffect(() => {
    const all = [...current, ...spare];
    for (const name of all) {
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "stock", stockName: name }),
      })
        .then(async (r) => {
          const data = (await r.json()) as
            | { issues: Stock["issues"]; overall: OverallSignal }
            | { error: string };
          if (!r.ok || "error" in data) {
            throw new Error("error" in data ? data.error : `HTTP ${r.status}`);
          }
          const stock: Stock = { name, issues: data.issues, overall: data.overall };
          setStocks((s) => ({ ...s, [name]: { status: "ready", stock, source: "live" } }));
        })
        .catch((err) => {
          console.warn(`[analyze] "${name}" failed, falling back to mock`, err);
          const mock = getMockStock(name);
          setStocks((s) => ({ ...s, [name]: { status: "ready", stock: mock, source: "mock" } }));
        });
    }
    // current/spare are stable refs from page-level constants — empty deps OK.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runOverall = useCallback(
    (variant: Variant, stockList: Stock[]) => {
      overallDispatched.current[variant] = true;
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "portfolio-overall",
          label: LABELS[variant],
          stocks: stockList,
        }),
      })
        .then(async (r) => {
          const data = (await r.json()) as
            | { overall: OverallSignal }
            | { error: string };
          if (!r.ok || "error" in data) {
            throw new Error("error" in data ? data.error : `HTTP ${r.status}`);
          }
          setOveralls((o) => ({
            ...o,
            [variant]: { status: "ready", overall: data.overall, source: "live" },
          }));
        })
        .catch((err) => {
          console.warn(`[analyze] portfolio "${variant}" overall failed`, err);
          setOveralls((o) => ({
            ...o,
            [variant]: {
              status: "ready",
              overall: { signal: "neutral", intensity: "mid" },
              source: "mock",
            },
          }));
        });
    },
    [],
  );

  // After every stocks change, check whether either portfolio is now complete
  // and, if so, fire its overall request (once).
  useEffect(() => {
    (["current", "spare"] as const).forEach((variant) => {
      if (overallDispatched.current[variant]) return;
      const names = variant === "current" ? current : spare;
      const ready: Stock[] = [];
      for (const n of names) {
        const s = stocks[n];
        if (!s || s.status !== "ready") return;
        ready.push(s.stock);
      }
      runOverall(variant, ready);
    });
  }, [stocks, current, spare, runOverall]);

  const value = useMemo<AnalysisValue>(() => ({ stocks, overalls }), [stocks, overalls]);

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  return useContext(AnalysisContext);
}

export type { OverallState, StockState };
