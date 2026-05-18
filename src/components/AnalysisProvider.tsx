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

type ViewportMode = "desktop" | "tablet" | "mobile";

interface AnalysisValue {
  stocks: Record<string, StockState>;
  overalls: Record<Variant, OverallState>;
  /** Viewport tier: matches the CSS breakpoints (<768 mobile, 768-1279 tablet,
   *  ≥1280 desktop). Drives both layout decisions in React (where CSS can't
   *  reach — e.g. inline-sized ColorBox) and analysis maxIssues. */
  viewport: ViewportMode;
  /** Convenience derived from viewport — kept for backwards compat with
   *  AnalysisProvider's only mobile-vs-everything-else logic. */
  isMobile: boolean;
}

const AnalysisContext = createContext<AnalysisValue>({
  stocks: {},
  overalls: {
    current: { status: "loading" },
    spare: { status: "loading" },
  },
  viewport: "desktop",
  isMobile: false,
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

/** Viewport breakpoints. Mobile uses a 5×2 grid (10 issues); tablet/desktop
 *  use 10×2 (20 issues). The mobile breakpoint also triggers re-fetch with a
 *  different maxIssues. Tablet vs desktop only changes layout, not data. */
const MOBILE_MQ = "(max-width: 767px)";
const TABLET_MQ = "(min-width: 768px) and (max-width: 1279px)";
const MOBILE_MAX_ISSUES = 10;
const DESKTOP_MAX_ISSUES = 20;

function makeLoading(names: readonly string[]): Record<string, StockState> {
  const m: Record<string, StockState> = {};
  for (const n of names) m[n] = { status: "loading" };
  return m;
}

/** Owns every /api/analyze fetch on the page. Kicks off 16 stock requests in
 *  parallel on mount; once a portfolio's 8 stocks are all ready, fires its
 *  portfolio-overall request. Failures fall back to per-stock mock data so a
 *  single bad response never wipes a card.
 *
 *  When viewport crosses the mobile breakpoint (in either direction), the
 *  entire fetch cycle restarts with a different maxIssues so the issue counts
 *  match the new layout (mobile = 10, tablet/desktop = 20).
 */
export function AnalysisProvider({ current, spare, children }: ProviderProps) {
  const allNames = useMemo(() => [...current, ...spare], [current, spare]);

  // SSR-safe initial value: assume desktop so the first render matches the
  // server. The matchMedia effect below corrects it after hydration.
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const isMobile = viewport === "mobile";
  const [stocks, setStocks] = useState<Record<string, StockState>>(() =>
    makeLoading(allNames),
  );
  const [overalls, setOveralls] = useState<Record<Variant, OverallState>>({
    current: { status: "loading" },
    spare: { status: "loading" },
  });

  // Track which portfolio overalls we've already dispatched in the current
  // fetch cycle; reset whenever isMobile flips so the new cycle can fire.
  const overallDispatched = useRef<Record<Variant, boolean>>({
    current: false,
    spare: false,
  });

  // Sync viewport tier with matchMedia. Two queries: mobile and tablet — desktop
  // is the default when neither matches.
  useEffect(() => {
    const mobileMq = window.matchMedia(MOBILE_MQ);
    const tabletMq = window.matchMedia(TABLET_MQ);
    const recompute = () => {
      if (mobileMq.matches) setViewport("mobile");
      else if (tabletMq.matches) setViewport("tablet");
      else setViewport("desktop");
    };
    recompute();
    mobileMq.addEventListener("change", recompute);
    tabletMq.addEventListener("change", recompute);
    return () => {
      mobileMq.removeEventListener("change", recompute);
      tabletMq.removeEventListener("change", recompute);
    };
  }, []);

  const runOverall = useCallback(
    (variant: Variant, stockList: Stock[], signal: AbortSignal) => {
      overallDispatched.current[variant] = true;
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "portfolio-overall",
          label: LABELS[variant],
          stocks: stockList,
        }),
        signal,
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
          if ((err as Error).name === "AbortError") return;
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

  // Whenever isMobile flips (including the initial post-hydration sync), reset
  // state and refetch every stock with the layout-appropriate maxIssues.
  useEffect(() => {
    const aborter = new AbortController();
    const maxIssues = isMobile ? MOBILE_MAX_ISSUES : DESKTOP_MAX_ISSUES;

    setStocks(makeLoading(allNames));
    setOveralls({
      current: { status: "loading" },
      spare: { status: "loading" },
    });
    overallDispatched.current = { current: false, spare: false };

    for (const name of allNames) {
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "stock", stockName: name, maxIssues }),
        signal: aborter.signal,
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
          if ((err as Error).name === "AbortError") return;
          console.warn(`[analyze] "${name}" failed, falling back to mock`, err);
          const full = getMockStock(name);
          const mock: Stock = { ...full, issues: full.issues.slice(0, maxIssues) };
          setStocks((s) => ({
            ...s,
            [name]: { status: "ready", stock: mock, source: "mock" },
          }));
        });
    }

    return () => aborter.abort();
  }, [isMobile, allNames]);

  // After every stocks change, check whether either portfolio is now complete
  // and, if so, fire its overall request (once per fetch cycle).
  useEffect(() => {
    const aborter = new AbortController();
    (["current", "spare"] as const).forEach((variant) => {
      if (overallDispatched.current[variant]) return;
      const names = variant === "current" ? current : spare;
      const ready: Stock[] = [];
      for (const n of names) {
        const s = stocks[n];
        if (!s || s.status !== "ready") return;
        ready.push(s.stock);
      }
      runOverall(variant, ready, aborter.signal);
    });
    return () => aborter.abort();
  }, [stocks, current, spare, runOverall]);

  const value = useMemo<AnalysisValue>(
    () => ({ stocks, overalls, viewport, isMobile }),
    [stocks, overalls, viewport, isMobile],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  return useContext(AnalysisContext);
}

export type { OverallState, StockState, ViewportMode };
