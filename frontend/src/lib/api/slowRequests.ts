/** Tracks API requests that take long enough to suggest a cold-starting (sleeping) free-tier server. */
export const SLOW_REQUEST_MS = 4000;

const slow = new Set<number>();
const listeners = new Set<() => void>();
let nextId = 0;

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** Call when a request starts; call the returned function when it settles. */
export function trackRequest(): () => void {
  const id = nextId++;
  const timer = setTimeout(() => {
    slow.add(id);
    emit();
  }, SLOW_REQUEST_MS);
  return () => {
    clearTimeout(timer);
    if (slow.delete(id)) emit();
  };
}

export function subscribeSlowRequests(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasSlowRequests(): boolean {
  return slow.size > 0;
}
