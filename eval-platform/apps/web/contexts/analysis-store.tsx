"use client";

/**
 * AnalysisStore — global in-memory session store for completed analyses.
 *
 * Why this exists:
 *   Next.js unmounts the upload page when the user navigates away, so all
 *   analysis results disappear.  This context lives at the AppShell level
 *   (above every page) so analyses survive navigation within the same browser
 *   tab.  Up to 8 analyses are kept; oldest are dropped automatically.
 *
 * Usage:
 *   const { addAnalysis, analyses, getAnalysis } = useAnalysisStore();
 */

import {
  createContext,
  ReactNode,
  useContext,
  useReducer,
} from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type StoredAnalysis = {
  /** Unique ID — used in the restore URL (?restore=<id>) */
  id: string;
  /** Human-readable title shown in the sidebar */
  title: string;
  /** Unix timestamp (ms) when the analysis was completed */
  timestamp: number;
  /** The full MultiAnalysisResult from the API */
  result: any;
  /** The MultiAnalysisConfig the user configured */
  config: any;
};

type State = { analyses: StoredAnalysis[] };

type Action =
  | { type: "ADD"; analysis: StoredAnalysis }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" };

// ── Reducer ────────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD": {
      // Remove any previous analysis for the same file to avoid duplicates,
      // prepend the new one, and cap the list at 8 entries.
      const rest = state.analyses.filter(
        (a) => a.config?.file_id !== action.analysis.config?.file_id
      );
      return { analyses: [action.analysis, ...rest].slice(0, 8) };
    }
    case "REMOVE":
      return { analyses: state.analyses.filter((a) => a.id !== action.id) };
    case "CLEAR":
      return { analyses: [] };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

type AnalysisStoreCtx = {
  analyses: StoredAnalysis[];
  addAnalysis: (a: StoredAnalysis) => void;
  removeAnalysis: (id: string) => void;
  getAnalysis: (id: string) => StoredAnalysis | undefined;
};

const AnalysisStoreContext = createContext<AnalysisStoreCtx>({
  analyses: [],
  addAnalysis: () => {},
  removeAnalysis: () => {},
  getAnalysis: () => undefined,
});

// ── Provider ───────────────────────────────────────────────────────────────────

export function AnalysisStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { analyses: [] });

  return (
    <AnalysisStoreContext.Provider
      value={{
        analyses: state.analyses,
        addAnalysis: (a) => dispatch({ type: "ADD", analysis: a }),
        removeAnalysis: (id) => dispatch({ type: "REMOVE", id }),
        getAnalysis: (id) => state.analyses.find((a) => a.id === id),
      }}
    >
      {children}
    </AnalysisStoreContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAnalysisStore() {
  return useContext(AnalysisStoreContext);
}
