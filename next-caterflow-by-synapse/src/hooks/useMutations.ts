// src/hooks/useMutations.ts - UPDATED
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PendingAction } from '@/app/actions/types';
import { PurchaseOrderDetails } from '@/app/actions/PurchaseOrderModal';

export const usePOMutations = () => {
    const queryClient = useQueryClient();

    const updatePOItems = useMutation({
        mutationFn: async (updateData: {
            poId: string;
            updates: { itemKey: string; newPrice?: number; newQuantity?: number }[]
        }) => {
            const response = await fetch('/api/purchase-orders/update-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update PO items');
            }
            return response.json();
        },
        onMutate: async (updateData) => {
            // Cancel all related queries
            await queryClient.cancelQueries({ queryKey: ['purchaseOrders'] });
            await queryClient.cancelQueries({ queryKey: ['purchaseOrder', updateData.poId] });

            const previousPOs = queryClient.getQueryData(['purchaseOrders']);
            const previousSinglePO = queryClient.getQueryData(['purchaseOrder', updateData.poId]);

            // Optimistic update for PO list
            queryClient.setQueryData(['purchaseOrders'], (old: PurchaseOrderDetails[] | undefined) =>
                old?.map(po => {
                    if (po._id === updateData.poId) {
                        const updatedItems = po.orderedItems?.map(item => {
                            const update = updateData.updates.find(u => u.itemKey === item._key);
                            if (update) {
                                return {
                                    ...item,
                                    unitPrice: update.newPrice ?? item.unitPrice,
                                    orderedQuantity: update.newQuantity ?? item.orderedQuantity,
                                };
                            }
                            return item;
                        });

                        // Recalculate total
                        const totalAmount = updatedItems?.reduce((sum, item) =>
                            sum + (item.orderedQuantity * item.unitPrice), 0) || 0;

                        return { ...po, orderedItems: updatedItems, totalAmount };
                    }
                    return po;
                })
            );

            // Optimistic update for single PO
            queryClient.setQueryData(['purchaseOrder', updateData.poId], (old: PurchaseOrderDetails | undefined) => {
                if (!old) return old;

                const updatedItems = old.orderedItems?.map(item => {
                    const update = updateData.updates.find(u => u.itemKey === item._key);
                    if (update) {
                        return {
                            ...item,
                            unitPrice: update.newPrice ?? item.unitPrice,
                            orderedQuantity: update.newQuantity ?? item.orderedQuantity,
                        };
                    }
                    return item;
                });

                const totalAmount = updatedItems?.reduce((sum, item) =>
                    sum + (item.orderedQuantity * item.unitPrice), 0) || 0;

                return { ...old, orderedItems: updatedItems, totalAmount };
            });

            return { previousPOs, previousSinglePO };
        },
        onError: (err, updateData, context) => {
            // Rollback both queries
            if (context?.previousPOs) {
                queryClient.setQueryData(['purchaseOrders'], context.previousPOs);
            }
            if (context?.previousSinglePO) {
                queryClient.setQueryData(['purchaseOrder', updateData.poId], context.previousSinglePO);
            }
        },
        onSuccess: (data, updateData) => {
            // Update the cache with the server response
            queryClient.setQueryData(['purchaseOrders'], (old: PurchaseOrderDetails[] | undefined) =>
                old?.map(po => po._id === updateData.poId ? data.updatedPO : po)
            );

            queryClient.setQueryData(['purchaseOrder', updateData.poId], data.updatedPO);
        },
        onSettled: (data, error, updateData) => {
            // Always invalidate to ensure sync
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            queryClient.invalidateQueries({ queryKey: ['purchaseOrder', updateData.poId] });
        },
    });

    const approvePO = useMutation({
        mutationFn: async (poId: string) => {
            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: poId,
                    status: 'pending-approval',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit for approval');
            }
            return response.json();
        },
        onMutate: async (poId) => {
            await queryClient.cancelQueries({ queryKey: ['purchaseOrders'] });
            await queryClient.cancelQueries({ queryKey: ['purchaseOrder', poId] });

            const previousPOs = queryClient.getQueryData(['purchaseOrders']);
            const previousSinglePO = queryClient.getQueryData(['purchaseOrder', poId]);

            // Optimistic update
            queryClient.setQueryData(['purchaseOrders'], (old: PurchaseOrderDetails[] | undefined) =>
                old?.map(po => po._id === poId ? { ...po, status: 'pending-approval' } : po)
            );

            queryClient.setQueryData(['purchaseOrder', poId], (old: PurchaseOrderDetails | undefined) =>
                old ? { ...old, status: 'pending-approval' } : old
            );

            return { previousPOs, previousSinglePO };
        },
        onError: (err, poId, context) => {
            if (context?.previousPOs) {
                queryClient.setQueryData(['purchaseOrders'], context.previousPOs);
            }
            if (context?.previousSinglePO) {
                queryClient.setQueryData(['purchaseOrder', poId], context.previousSinglePO);
            }
        },
        onSuccess: (data, poId) => {
            // Update cache with server response
            queryClient.setQueryData(['purchaseOrders'], (old: PurchaseOrderDetails[] | undefined) =>
                old?.map(po => po._id === poId ? data : po)
            );

            queryClient.setQueryData(['purchaseOrder', poId], data);
        },
        onSettled: (data, error, poId) => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            queryClient.invalidateQueries({ queryKey: ['purchaseOrder', poId] });
            queryClient.invalidateQueries({ queryKey: ['pendingActions'] });
        },
    });

    return { updatePOItems, approvePO };
};

// Add this to your useMutations.ts file:
export const useActionMutations = () => {
    const queryClient = useQueryClient();

    const updateAction = useMutation({
        mutationFn: async (updateData: { id: string; updates: Partial<PendingAction> }) => {
            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: updateData.id,
                    ...updateData.updates,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update action');
            }
            return response.json();
        },
        onMutate: async (updateData) => {
            await queryClient.cancelQueries({ queryKey: ['pendingActions'] });

            const previousActions = queryClient.getQueryData(['pendingActions']);

            // Optimistic update
            queryClient.setQueryData(['pendingActions'], (old: PendingAction[] | undefined) =>
                old?.map(action =>
                    action._id === updateData.id
                        ? { ...action, ...updateData.updates }
                        : action
                )
            );

            return { previousActions };
        },
        onError: (err, updateData, context) => {
            if (context?.previousActions) {
                queryClient.setQueryData(['pendingActions'], context.previousActions);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingActions'] });
        },
    });

    return { updateAction };
};