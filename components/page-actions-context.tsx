"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type PageAction = {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
};

export type PageActionsConfig = {
  back?: { label: string; href: string };
  primary?: PageAction;
  secondary?: PageAction[];
  custom?: ReactNode;
};

// Split into two contexts so registering a page's actions (which only needs the
// setter) never re-subscribes to the actions value itself — otherwise every
// setActions call would re-render the registering component, which would
// re-run its effect and call setActions again, forever.
const SetPageActionsContext = createContext<((a: PageActionsConfig | null) => void) | null>(null);
const PageActionsValueContext = createContext<PageActionsConfig | null>(null);

export function PageActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<PageActionsConfig | null>(null);
  return (
    <SetPageActionsContext.Provider value={setActions}>
      <PageActionsValueContext.Provider value={actions}>{children}</PageActionsValueContext.Provider>
    </SetPageActionsContext.Provider>
  );
}

export function usePageActionsSlot(): PageActionsConfig | null {
  const ctx = useContext(PageActionsValueContext);
  return ctx;
}

export function useRegisterPageActions(config: PageActionsConfig | null) {
  const setActions = useContext(SetPageActionsContext);
  if (!setActions) throw new Error("useRegisterPageActions must be used within PageActionsProvider");
  useEffect(() => {
    setActions(config);
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
}
