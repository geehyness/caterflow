// src/lib/stockCalculations.ts

import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
import Decimal from 'decimal.js';

export const calculateBulkStock = async (stockItemIds: string[], binIds: string[]): Promise<{ [key: string]: number }> => {
    if (stockItemIds.length === 0 || binIds.length === 0) {
        return {};
    }

    const query = groq`{
        "counts": *[_type == "InventoryCount" && bin._ref in $binIds] | order(countDate desc) {
            _id,
            bin->{ _id },
            countDate,
            countedItems[] {
                stockItem->{ _id },
                countedQuantity
            }
        },
        "transactions": *[_type in ["GoodsReceipt", "DispatchLog", "InternalTransfer", "StockAdjustment"] 
            && (receivingBin._ref in $binIds || sourceBin._ref in $binIds || toBin._ref in $binIds || fromBin._ref in $binIds || bin._ref in $binIds)
            && (
                // Only include completed transactions for stock calculations
                (_type == "GoodsReceipt" && status == "completed") ||
                (_type == "DispatchLog" && status == "completed") ||
                (_type == "StockAdjustment" && status == "completed") ||
                // For InternalTransfer, include if it has a completed status, otherwise include all (backward compatibility)
                (_type == "InternalTransfer" && (!defined(status) || status == "completed"))
            )
        ] | order(coalesce(receiptDate, dispatchDate, transferDate, adjustmentDate) asc) {
            _type,
            _id,
            status,
            receiptDate,
            dispatchDate,
            transferDate,
            adjustmentDate,
            receivingBin->{ _id },
            sourceBin->{ _id },
            toBin->{ _id },
            fromBin->{ _id },
            bin->{ _id },
            receivedItems[] {
                stockItem->{ _id },
                receivedQuantity
            },
            dispatchedItems[] {
                stockItem->{ _id },
                dispatchedQuantity
            },
            transferredItems[] {
                stockItem->{ _id },
                transferredQuantity,
                toBin->{ _id },
                fromBin->{ _id }
            },
            adjustedItems[] {
                stockItem->{ _id },
                adjustedQuantity
            },
            adjustmentType
        }
    }`;

    const data = await client.fetch(query, { binIds, stockItemIds });

    // Step 1: Find the latest count for each bin
    const latestCounts: { [binId: string]: any } = {};
    data.counts.forEach((count: any) => {
        const binId = count.bin?._id;
        if (!binId) return;

        // Only keep the latest count per bin
        if (!latestCounts[binId] || new Date(count.countDate) > new Date(latestCounts[binId].countDate)) {
            latestCounts[binId] = count;
        }
    });

    // Step 2: Initialize results with latest counts
    const results: { [key: string]: Decimal } = {};

    // Initialize all possible combinations with 0
    binIds.forEach(binId => {
        stockItemIds.forEach(itemId => {
            const key = `${itemId}-${binId}`;
            results[key] = new Decimal(0);
        });
    });

    // Set initial values from latest counts
    Object.values(latestCounts).forEach((count: any) => {
        const binId = count.bin?._id;
        if (!binId) return;
        count.countedItems?.forEach((item: any) => {
            const itemId = item.stockItem?._id;
            if (itemId && stockItemIds.includes(itemId)) {
                const key = `${itemId}-${binId}`;
                results[key] = new Decimal(item.countedQuantity || 0);
            }
        });
    });

    // Step 3: Apply transactions in chronological order
    data.transactions.forEach((tx: any) => {
        const txDate = new Date(tx.receiptDate || tx.dispatchDate || tx.transferDate || tx.adjustmentDate);

        const processTransaction = (item: any, binId: string, quantityChange: number) => {
            if (!binId || !item || !item.stockItem?._id) return;
            const key = `${item.stockItem._id}-${binId}`;

            // Check if the key exists before attempting to use it
            if (!results[key]) {
                results[key] = new Decimal(0);
            }

            results[key] = results[key].plus(new Decimal(quantityChange));
        };

        // Skip transactions that are not completed (additional safety check)
        if (tx._type !== "InternalTransfer" && tx.status !== "completed") {
            return;
        }

        switch (tx._type) {
            case 'GoodsReceipt':
                // Goods received into a bin
                tx.receivedItems?.forEach((item: any) => {
                    processTransaction(item, tx.receivingBin?._id, item.receivedQuantity || 0);
                });
                break;
            case 'DispatchLog':
                // Goods dispatched from a bin
                tx.dispatchedItems?.forEach((item: any) => {
                    processTransaction(item, tx.sourceBin?._id, -(item.dispatchedQuantity || 0));
                });
                break;
            case 'InternalTransfer':
                // Transfers between bins
                tx.transferredItems?.forEach((item: any) => {
                    // Remove from source bin
                    processTransaction(item, tx.fromBin?._id, -(item.transferredQuantity || 0));
                    // Add to destination bin
                    processTransaction(item, tx.toBin?._id, item.transferredQuantity || 0);
                });
                break;
            case 'StockAdjustment':
                // Stock adjustments (positive or negative)
                tx.adjustedItems?.forEach((item: any) => {
                    const quantity = item.adjustedQuantity || 0;
                    // For negative adjustments (loss, wastage, etc.), quantity should be negative
                    const isNegativeAdjustment = ['loss', 'wastage', 'expiry', 'damage', 'theft'].includes(tx.adjustmentType);
                    const adjustedQuantity = isNegativeAdjustment ? -Math.abs(quantity) : Math.abs(quantity);

                    processTransaction(item, tx.bin?._id, adjustedQuantity);
                });
                break;
        }
    });

    // Step 4: Convert to numbers and ensure non-negative values
    const finalResults: { [key: string]: number } = {};
    for (const key in results) {
        finalResults[key] = Math.max(0, results[key].toNumber());
    }
    return finalResults;
};

// Helper function to get current stock for a specific item and bin
export const getCurrentStock = async (stockItemId: string, binId: string): Promise<number> => {
    const results = await calculateBulkStock([stockItemId], [binId]);
    const key = `${stockItemId}-${binId}`;
    return results[key] || 0;
};

// Helper function to get stock for multiple items in a specific bin
export const getBinStock = async (stockItemIds: string[], binId: string): Promise<{ [stockItemId: string]: number }> => {
    const results = await calculateBulkStock(stockItemIds, [binId]);
    const binResults: { [stockItemId: string]: number } = {};

    stockItemIds.forEach(itemId => {
        const key = `${itemId}-${binId}`;
        binResults[itemId] = results[key] || 0;
    });

    return binResults;
};

// Helper function to check if there's sufficient stock before dispatch
export const hasSufficientStock = async (stockItemId: string, binId: string, requiredQuantity: number): Promise<boolean> => {
    const currentStock = await getCurrentStock(stockItemId, binId);
    return currentStock >= requiredQuantity;
};