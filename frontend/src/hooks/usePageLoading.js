import { useEffect, useSyncExternalStore } from "react";

const activeLoads = new Set();
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const isLoading = () => activeLoads.size > 0;

export function usePageLoading(loading) {
  useEffect(() => {
    if (!loading) return undefined;
    const load = Symbol("page loading");
    activeLoads.add(load);
    notify();
    return () => {
      activeLoads.delete(load);
      notify();
    };
  }, [loading]);
}

export function usePageLoadingState() {
  return useSyncExternalStore(subscribe, isLoading, () => false);
}
