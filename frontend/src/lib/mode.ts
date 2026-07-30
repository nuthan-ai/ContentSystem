// Tiny external store so any component can read/react to "are we serving mock data".
import { useSyncExternalStore } from "react";

let mockMode = false;
const listeners = new Set<() => void>();

export function setMockMode(value: boolean) {
  if (mockMode === value) return;
  mockMode = value;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return mockMode;
}

export function useMockMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
