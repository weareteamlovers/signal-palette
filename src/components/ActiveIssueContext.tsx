"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Issue } from "@/types";

interface ActiveIssueContextValue {
  activeIssue: Issue | null;
  setActiveIssue: (issue: Issue | null) => void;
}

const ActiveIssueContext = createContext<ActiveIssueContextValue>({
  activeIssue: null,
  setActiveIssue: () => {},
});

export function ActiveIssueProvider({ children }: { children: ReactNode }) {
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const value = useMemo(() => ({ activeIssue, setActiveIssue }), [activeIssue]);
  return (
    <ActiveIssueContext.Provider value={value}>
      {children}
    </ActiveIssueContext.Provider>
  );
}

export function useActiveIssue() {
  return useContext(ActiveIssueContext);
}
