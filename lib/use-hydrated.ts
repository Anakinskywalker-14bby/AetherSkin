"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => undefined;

/**
 * false during the server render and hydration, true from then on.
 *
 * Replaces the `useEffect(() => setMounted(true), [])` pattern, which React 19's
 * lint rules reject (a setState in an effect body forces a second render pass).
 * useSyncExternalStore gives the same result: React renders the server snapshot
 * while hydrating, then re-renders with the client one.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
