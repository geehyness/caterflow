// src/hooks/useMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PendingAction } from '@/app/actions/types';
import { PurchaseOrderDetails } from '@/app/actions/PurchaseOrderModal';

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

export const usePOMutations = () => {
    const queryClient = useQueryClient();

    const updatePOItem = useMutation({
        mutationFn: async (updateData: { poId: string; itemKey: string; newPrice?: number; newQuantity?: number }) => {
            const response = await fetch('/api/purchase-orders/update-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                throw new Error('Failed to update PO item');
            }
            return response.json();
        },
        onMutate: async (updateData) => {
            await queryClient.cancelQueries({ queryKey: ['purchaseOrders'] });

            const previousPOs = queryClient.getQueryData(['purchaseOrders']);

            // Optimistic update for PO list
            queryClient.setQueryData(['purchaseOrders'], (old: PurchaseOrderDetails[] | undefined) =>
                old?.map(po => {
                    if (po._id === updateData.poId) {
                        const updatedItems = po.orderedItems?.map((item: { _key: string; unitPrice: any; orderedQuantity: any; }) => {
                            if (item._key === updateData.itemKey) {
                                return {
                                    ...item,
                                    unitPrice: updateData.newPrice ?? item.unitPrice,
                                    orderedQuantity: updateData.newQuantity ?? item.orderedQuantity,
                                };
                            }
                            return item;
                        });

                        return { ...po, orderedItems: updatedItems };
                    }
                    return po;
                })
            );

            return { previousPOs };
        },
        onError: (err, updateData, context) => {
            if (context?.previousPOs) {
                queryClient.setQueryData(['purchaseOrders'], context.previousPOs);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
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

            const previousPOs = queryClient.getQueryData(['purchaseOrders']);

            // Optimistic update
            queryClient.setQueryData(['purchaseOrders'], (old: PurchaseOrderDetails[] | undefined) =>
                old?.map(po => po._id === poId ? { ...po, status: 'pending-approval' } : po)
            );

            return { previousPOs };
        },
        onError: (err, poId, context) => {
            if (context?.previousPOs) {
                queryClient.setQueryData(['purchaseOrders'], context.previousPOs);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            queryClient.invalidateQueries({ queryKey: ['pendingActions'] });
        },
    });

    return { updatePOItem, approvePO };
};