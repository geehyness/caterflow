// src/lib/react-query.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
        },
        mutations: {
            retry: 1,
            // Optimistic updates configuration
            onMutate: async (variables: any) => {
                // Cancel any outgoing refetches
                await queryClient.cancelQueries({ queryKey: variables.queryKey });

                // Snapshot the previous value
                const previousData = queryClient.getQueryData(variables.queryKey);

                return { previousData };
            },
            onError: (err, variables, context) => {
                // Rollback on error
                if (context?.previousData) {
                    queryClient.setQueryData(variables.queryKey, context.previousData);
                }
            },
            onSettled: () => {
                // Always refetch after error or success
                queryClient.invalidateQueries();
            },
        },
    },
});

// Helper function for optimistic updates
export const optimisticUpdate = <T>(
    queryKey: any[],
    updateFn: (oldData: T | undefined) => T
) => {
    queryClient.setQueryData(queryKey, updateFn);
};