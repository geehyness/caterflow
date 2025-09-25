// src/lib/stockCalculations.ts

import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
import Decimal from 'decimal.js';

// ADD THIS FUNCTION - it was missing
export const calculateStock = async (stockItemId: string, binId: string): Promise<number> => {
  try {
    if (!stockItemId || !binId) {
      return 0;
    }

    // Use the bulk function to calculate stock for this specific combination
    const results = await calculateBulkStock([stockItemId], [binId]);
    const key = `${stockItemId}-${binId}`;
    return results[key] || 0;
  } catch (error) {
    console.error('Error calculating stock:', error);
    return 0;
  }
};

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
    "transactions": *[
        (_type in ["GoodsReceipt", "DispatchLog", "StockAdjustment"] && (receivingBin._ref in $binIds || sourceBin._ref in $binIds || bin._ref in $binIds)) ||
        (_type == "InternalTransfer" && status == "completed" && (fromBin._ref in $binIds || toBin._ref in $binIds))
    ] | order(coalesce(receiptDate, dispatchDate, transferDate, adjustmentDate) asc) {
        _type,
        _id,
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
          processTransaction(item, tx.bin?._id, quantity);
        });
        break;
    }
  });

  // Step 4: Convert to numbers
  const finalResults: { [key: string]: number } = {};
  for (const key in results) {
    finalResults[key] = Math.max(0, results[key].toNumber());
  }
  return finalResults;
};

// Add this function to src/lib/stockCalculations.ts
export const getBinStock = async (stockItemIds: string[], binId: string): Promise<{ [key: string]: number }> => {
  if (!binId || stockItemIds.length === 0) {
    return {};
  }

  const results = await calculateBulkStock(stockItemIds, [binId]);

  // Convert the key format from "itemId-binId" to just "itemId"
  const simplifiedResults: { [key: string]: number } = {};

  stockItemIds.forEach(itemId => {
    const compositeKey = `${itemId}-${binId}`;
    simplifiedResults[itemId] = results[compositeKey] || 0;
  });

  return simplifiedResults;
};