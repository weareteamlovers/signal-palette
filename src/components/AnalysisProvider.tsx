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
import { ANALYSIS_FIXTURE } from "@/data/analysis-fixture";
import {
  FIXTURE_HOLD_MS,
  FIXTURE_STAGGER_MS,
  USE_FIXTURE,
} from "@/lib/feature-flags";
import type { OverallSignal, Stock } from "@/types";

type StockState =
  | { status: "loading" }
  | { status: "ready"; stock: Stock; source: "live" | "mock" | "fixture" };

type OverallState =
  | { status: "loading" }
  | { status: "ready"; overall: OverallSignal; source: "live" | "mock" | "fixture" };

type Variant = "current" | "spare";

type ViewportMode = "desktop" | "tablet" | "mobile";

interface AnalysisValue {
  stocks: Record<string, StockState>;
  overalls: Record<Variant, OverallState>;
  viewport: ViewportMode;
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

const MOBILE_MQ = "(max-width: 767px)";
const TABLET_MQ = "(min-width: 768px) and (max-width: 1279px)";
const MOBILE_MAX_ISSUES = 10;
const DESKTOP_MAX_ISSUES = 20;

function makeLoading(names: readonly string[]): Record<string, StockState> {
  const m: Record<string, StockState> = {};
  for (const n of names) m[n] = { status: "loading" };
  return m;
}

/** Fisher–Yates in place. */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Drives the entire analysis pipeline. Two modes:
 *
 *   USE_FIXTURE = true  →  Serve src/data/analysis-fixture.ts after a fake
 *                          3-second hold, then reveal stocks in random order
 *                          150ms apart. Zero OpenAI cost.
 *   USE_FIXTURE = false →  Real /api/analyze fetch (16 stocks + 2 portfolio
 *                          overalls). When everything settles, the provider
 *                          dumps a fixture-shaped JSON blob to the console
 *                          so the result can be promoted to a fixture.
 */
export function AnalysisProvider({ current, spare, children }: ProviderProps) {
  const allNames = useMemo(() => [...current, ...spare], [current, spare]);

  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const isMobile = viewport === "mobile";
  const [stocks, setStocks] = useState<Record<string, StockState>>(() =>
    makeLoading(allNames),
  );
  const [overalls, setOveralls] = useState<Record<Variant, OverallState>>({
    current: { status: "loading" },
    spare: { status: "loading" },
  });

  const overallDispatched = useRef<Record<Variant, boolean>>({
    current: false,
    spare: false,
  });
  // Capture helper: only print the dump once per fetch cycle.
  const captureLoggedRef = useRef(false);

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

  const runOverallReal = useCallback(
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

  // Fetch / fixture-reveal cycle. Re-runs whenever isMobile flips so the
  // maxIssues cap (and the slice of fixture data we expose) follows the
  // viewport.
  useEffect(() => {
    const aborter = new AbortController();
    const maxIssues = isMobile ? MOBILE_MAX_ISSUES : DESKTOP_MAX_ISSUES;

    setStocks(makeLoading(allNames));
    setOveralls({
      current: { status: "loading" },
      spare: { status: "loading" },
    });
    overallDispatched.current = { current: false, spare: false };
    captureLoggedRef.current = false;

    // --- Fixture mode: fake 3s hold, then random stagger reveal ---
    if (USE_FIXTURE) {
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      const order = shuffle([...allNames]);
      const hold = setTimeout(() => {
        order.forEach((name, idx) => {
          const t = setTimeout(() => {
            if (aborter.signal.aborted) return;
            const f = ANALYSIS_FIXTURE?.stocks[name];
            if (f) {
              const stock: Stock = {
                name,
                issues: f.issues.slice(0, maxIssues),
                overall: f.overall,
              };
              setStocks((s) => ({
                ...s,
                [name]: { status: "ready", stock, source: "fixture" },
              }));
            } else {
              const mock = getMockStock(name);
              const stock: Stock = { ...mock, issues: mock.issues.slice(0, maxIssues) };
              setStocks((s) => ({
                ...s,
                [name]: { status: "ready", stock, source: "mock" },
              }));
            }
          }, idx * FIXTURE_STAGGER_MS);
          timeouts.push(t);
        });
      }, FIXTURE_HOLD_MS);
      timeouts.push(hold);
      return () => {
        aborter.abort();
        for (const t of timeouts) clearTimeout(t);
      };
    }

    // --- Real mode: parallel fetch every stock ---
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

  // Once every per-stock state is ready, fire each portfolio's overall.
  // - Fixture mode: pull the overall straight from ANALYSIS_FIXTURE (no fetch).
  // - Real mode: send the 8-stock summary to /api/analyze.
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
      if (USE_FIXTURE) {
        overallDispatched.current[variant] = true;
        const o = ANALYSIS_FIXTURE?.overalls[variant];
        setOveralls((s) => ({
          ...s,
          [variant]: o
            ? { status: "ready", overall: o, source: "fixture" }
            : {
                status: "ready",
                overall: { signal: "neutral", intensity: "mid" },
                source: "mock",
              },
        }));
        return;
      }
      runOverallReal(variant, ready, aborter.signal);
    });
    return () => aborter.abort();
  }, [stocks, current, spare, runOverallReal]);

  // Capture helper: when real mode finishes everything, print a fixture-
  // shaped JSON to the console so the result can be pasted into
  // src/data/analysis-fixture.ts.
  useEffect(() => {
    if (USE_FIXTURE) return;
    if (captureLoggedRef.current) return;
    const allStocksReady = allNames.every((n) => stocks[n]?.status === "ready");
    const overallsReady =
      overalls.current.status === "ready" && overalls.spare.status === "ready";
    if (!allStocksReady || !overallsReady) return;

    captureLoggedRef.current = true;
    const dump = {
      stocks: {} as Record<string, { issues: Stock["issues"]; overall: OverallSignal }>,
      overalls: {
        current: (overalls.current as { overall: OverallSignal }).overall,
        spare: (overalls.spare as { overall: OverallSignal }).overall,
      },
    };
    for (const n of allNames) {
      const s = stocks[n];
      if (s.status !== "ready") continue;
      dump.stocks[n] = { issues: s.stock.issues, overall: s.stock.overall };
    }
    console.log(
      "[fixture-capture] paste this into src/data/analysis-fixture.ts ANALYSIS_FIXTURE:",
    );
    console.log(JSON.stringify(dump, null, 2));
  }, [stocks, overalls, allNames]);

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
