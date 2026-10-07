import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * False on the server and during hydration, true afterwards. Components that show client-fetched data use it
 * so their first client render matches the server HTML (the query cache may already hold data by the time a
 * Suspense boundary hydrates, which would otherwise cause a hydration mismatch).
 */
export const useHydrated = (): boolean => useSyncExternalStore(subscribe, () => true, () => false);
