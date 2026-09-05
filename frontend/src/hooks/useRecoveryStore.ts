import { useSyncExternalStore } from "react";
import type { CaseStatus } from "@/types";

/**
 * Tiny client-side store for demo decisions (approve / reject / rerun).
 * Swap for a mutation against the real API later — the component API stays the same.
 */
export interface Decision {
  transactionId: string;
  caseStatus: CaseStatus;
  decidedBy: "Merchant";
  note: string;
  at: string;
}

let decisions: Record<string, Decision> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const recoveryStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  snapshot: () => decisions,
  decide(transactionId: string, caseStatus: CaseStatus, note: string) {
    decisions = {
      ...decisions,
      [transactionId]: {
        transactionId,
        caseStatus,
        decidedBy: "Merchant",
        note,
        at: new Date().toISOString(),
      },
    };
    emit();
  },
  reset() {
    decisions = {};
    emit();
  },
};

const serverSnapshot: Record<string, Decision> = {};

export function useDecisions() {
  return useSyncExternalStore(
    recoveryStore.subscribe,
    recoveryStore.snapshot,
    () => serverSnapshot,
  );
}

export function useCaseStatus(id: string, fallback: CaseStatus): CaseStatus {
  const d = useDecisions();
  return d[id]?.caseStatus ?? fallback;
}
