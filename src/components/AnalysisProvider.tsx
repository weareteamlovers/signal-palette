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
  | { status: "ready"; overall: OverallSignal; source: "live" | "mock" | "fixture" }
  /** All slots in the portfolio are empty (name=""), so there's nothing to
   *  fetch. PortfolioSection renders the comp box with --signal-empty. */
  | { status: "empty" };

type Variant = "current" | "spare";

type ViewportMode = "desktop" | "tablet" | "mobile";

interface AnalysisValue {
  stocks: Record<string, StockState>;
  overalls: Record<Variant, OverallState>;
  viewport: ViewportMode;
  isMobile: boolean;
  /** Current names for each portfolio (8 slots, empty slot = ""). Mutated
   *  by `updatePortfolio` after an edit-modal save. */
  currentNames: readonly string[];
  spareNames: readonly string[];
  /** Apply an edit-modal save: diffs added/removed stocks, fetches only the
   *  added ones, resets the portfolio overall so it re-fires once the new
   *  ready set settles. Empty slots ("") are skipped (no fetch). */
  updatePortfolio: (variant: Variant, newNames: readonly string[]) => void;
}

const AnalysisContext = createContext<AnalysisValue>({
  stocks: {},
  overalls: {
    current: { status: "loading" },
    spare: { status: "loading" },
  },
  viewport: "desktop",
  isMobile: false,
  currentNames: [],
  spareNames: [],
  updatePortfolio: () => {},
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
  for (const n of names) {
    if (n !== "") m[n] = { status: "loading" };
  }
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
 *
 * 4a-6-3: portfolio names are now mutable. `updatePortfolio` performs an
 * incremental diff — only newly added stocks fetch; removed stocks drop
 * out; unchanged stocks keep their state. Empty slots ("") never hit the
 * network. The portfolio overall resets and re-fires once the new ready
 * set is complete.
 */
export function AnalysisProvider({ current, spare, children }: ProviderProps) {
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const isMobile = viewport === "mobile";

  // Names are state, not props, so edit-modal saves don't tear down the
  // entire stocks dictionary via the initial-load effect.
  const [currentNames, setCurrentNames] = useState<readonly string[]>(current);
  const [spareNames, setSpareNames] = useState<readonly string[]>(spare);

  const allNames = useMemo(
    () => [...currentNames, ...spareNames].filter((n) => n !== ""),
    [currentNames, spareNames],
  );

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

  /** Fetch a single stock (real mode) and merge into `stocks`. Empty-slot
   *  names are filtered by the caller. */
  const fetchOneReal = useCallback(
    (name: string, maxIssues: number, signal: AbortSignal) => {
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "stock", stockName: name, maxIssues }),
        signal,
      })
        .then(async (r) => {
          const data = (await r.json()) as
            | { issues: Stock["issues"]; overall: OverallSignal }
            | { error: string };
          if (!r.ok || "error" in data) {
            throw new Error("error" in data ? data.error : `HTTP ${r.status}`);
          }
          const stock: Stock = { name, issues: data.issues, overall: data.overall };
          setStocks((s) => ({
            ...s,
            [name]: { status: "ready", stock, source: "live" },
          }));
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
    },
    [],
  );

  /** Fixture-mode single-stock reveal — same shape as fetchOneReal but
   *  pulls from ANALYSIS_FIXTURE, no network. Used by `updatePortfolio`
   *  for incremental adds so we don't restart the whole stagger cycle. */
  const revealOneFixture = useCallback(
    (name: string, maxIssues: number) => {
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
    },
    [],
  );

  // Initial load (and re-load whenever the viewport tier flips between
  // mobile and non-mobile so the maxIssues cap is respected). NOT re-run
  // when names change — those are handled incrementally by `updatePortfolio`.
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

    if (USE_FIXTURE) {
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      const order = shuffle([...allNames]);
      const hold = setTimeout(() => {
        order.forEach((name, idx) => {
          const t = setTimeout(() => {
            if (aborter.signal.aborted) return;
            revealOneFixture(name, maxIssues);
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

    for (const name of allNames) {
      fetchOneReal(name, maxIssues, aborter.signal);
    }

    return () => aborter.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  /** Edit-modal save. Diff-applies the new name list for one portfolio:
   *  - added (in newNames, not in current set) → seed loading + fetch
   *  - removed (in current set, not in newNames) → drop from stocks
   *  - unchanged → leave intact
   *  Then reset that portfolio's overall so the next-effect re-fires it
   *  once the post-edit ready set is settled. */
  const updatePortfolio = useCallback(
    (variant: Variant, newNames: readonly string[]) => {
      const maxIssues = isMobile ? MOBILE_MAX_ISSUES : DESKTOP_MAX_ISSUES;
      const oldNames = variant === "current" ? currentNames : spareNames;
      const otherNames = variant === "current" ? spareNames : currentNames;

      const oldSet = new Set(oldNames.filter((n) => n !== ""));
      const newSet = new Set(newNames.filter((n) => n !== ""));
      // A removed stock that still appears in the OTHER portfolio must stay
      // in `stocks` (current ↔ spare overlap is allowed per CLAUDE.md §14-4).
      const otherSet = new Set(otherNames.filter((n) => n !== ""));

      const removed = [...oldSet].filter(
        (n) => !newSet.has(n) && !otherSet.has(n),
      );
      const added = [...newSet].filter((n) => !oldSet.has(n));

      setStocks((s) => {
        const next = { ...s };
        for (const n of removed) delete next[n];
        for (const n of added) {
          if (!next[n]) next[n] = { status: "loading" };
        }
        return next;
      });

      if (variant === "current") setCurrentNames(newNames);
      else setSpareNames(newNames);

      // Reset overall so the next effect re-fires it for this variant.
      setOveralls((o) => ({ ...o, [variant]: { status: "loading" } }));
      overallDispatched.current[variant] = false;

      // Fetch / reveal added stocks. Fixture mode does it immediately (no
      // stagger — only 1–8 new at most). Real mode fires parallel requests.
      if (added.length > 0) {
        if (USE_FIXTURE) {
          for (const n of added) revealOneFixture(n, maxIssues);
        } else {
          const aborter = new AbortController();
          for (const n of added) fetchOneReal(n, maxIssues, aborter.signal);
          // Note: this aborter is intentionally never aborted from outside.
          // Mid-flight cancellation on subsequent edits would orphan
          // promises; we accept the cheap leak of letting them resolve.
        }
      }
    },
    [
      currentNames,
      spareNames,
      isMobile,
      fetchOneReal,
      revealOneFixture,
    ],
  );

  // Portfolio overall — fires once per variant when every non-empty slot
  // is ready. Empty slots are skipped per CLAUDE.md 4a-6-3 ("빈 슬롯은
  // analyze 호출 없음"). All-empty → status="empty" with no fetch.
  useEffect(() => {
    const aborter = new AbortController();
    (["current", "spare"] as const).forEach((variant) => {
      if (overallDispatched.current[variant]) return;
      const names = variant === "current" ? currentNames : spareNames;
      const filled = names.filter((n) => n !== "");

      if (filled.length === 0) {
        overallDispatched.current[variant] = true;
        setOveralls((s) => ({ ...s, [variant]: { status: "empty" } }));
        return;
      }

      const ready: Stock[] = [];
      for (const n of filled) {
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
  }, [stocks, currentNames, spareNames, runOverallReal]);

  // Fixture-capture (real mode only) — unchanged from prior behavior.
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
    () => ({
      stocks,
      overalls,
      viewport,
      isMobile,
      currentNames,
      spareNames,
      updatePortfolio,
    }),
    [
      stocks,
      overalls,
      viewport,
      isMobile,
      currentNames,
      spareNames,
      updatePortfolio,
    ],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  return useContext(AnalysisContext);
}

export type { OverallState, StockState, ViewportMode };
