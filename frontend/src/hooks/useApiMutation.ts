import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { notify } from "@/lib/toast";

interface ApiMutationOptions<TData, TVars, TContext> {
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Success toast text; return null/omit for no toast (e.g. when the caller shows its own). */
  success?: string | null | ((data: TData, vars: TVars) => string | null);
  /** Fallback error text; the API's own `detail` message is preferred when present. */
  errorFallback?: string;
  /** Optimistic update: apply it here and return whatever `rollback` needs (typically a cache snapshot). */
  optimistic?: (qc: QueryClient, vars: TVars) => Promise<TContext>;
  /** Undo the optimistic update after a failure. */
  rollback?: (qc: QueryClient, vars: TVars, context: TContext) => void;
  /** Runs after success (navigation, closing a modal...). */
  onSuccess?: (data: TData, vars: TVars, qc: QueryClient) => void;
  /** Runs after success OR failure, so caches converge on the server's truth. Use the `invalidate` map. */
  invalidate?: (qc: QueryClient, data: TData | undefined, vars: TVars) => Promise<unknown> | void;
}

/**
 * The one way to mutate: success toast, error toast with the API's message, optional optimistic update with
 * rollback, and cache invalidation. Callers read `isPending` to disable submit buttons / show a spinner.
 */
export function useApiMutation<TData, TVars = void, TContext = undefined>(options: ApiMutationOptions<TData, TVars, TContext>) {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVars, TContext | undefined>({
    mutationFn: options.mutationFn,
    onMutate: options.optimistic ? (vars) => options.optimistic?.(queryClient, vars) : undefined,
    onError: (error, vars, context) => {
      if (options.rollback && context !== undefined) options.rollback(queryClient, vars, context);
      notify.error(error.message || options.errorFallback || "Something went wrong. Please try again.");
    },
    onSuccess: (data, vars) => {
      const message = typeof options.success === "function" ? options.success(data, vars) : options.success;
      if (message) notify.success(message);
      options.onSuccess?.(data, vars, queryClient);
    },
    // Fire and forget: `isPending` should end when the server answers, not when the follow-up refetches finish.
    onSettled: (data, _error, vars) => {
      void options.invalidate?.(queryClient, data, vars);
    },
  });
}
