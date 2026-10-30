import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Domain } from "../shared/domains";
import { readJson, writeJson } from "../shared/utils/storage";

export type View =
  | { name: "landing" }
  | { name: "workspace" }
  | { name: "signin"; domain: Domain }
  | { name: "app"; domain: Domain; page: string; requirementId?: string };

interface NavigationApi {
  view: View;
  go: (view: View) => void;
}

const STORAGE_KEY = "ls.view";
const NavigationContext = createContext<NavigationApi | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>(() => readJson<View>(sessionStorage, STORAGE_KEY) ?? { name: "landing" });

  const go = useCallback((next: View) => {
    setView(next);
    writeJson(sessionStorage, STORAGE_KEY, next);
    window.scrollTo(0, 0);
  }, []);

  return <NavigationContext.Provider value={{ view, go }}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationApi {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used inside NavigationProvider");
  return ctx;
}
