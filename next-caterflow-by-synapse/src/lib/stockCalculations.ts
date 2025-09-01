// src/lib/stockCalculations.ts
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
import Decimal from 'decimal.js';

export const calculateStock = async (stockItemId: string, binId: string): Promise<number> => {
    const query = groq`{
    "latestCount": *[_type == "InventoryCount" && bin._ref == $binId && countDate < now()] | order(countDate desc)[0] {
      countDate,
      "countedItem": countedItems[stockItem._ref == $stockItemId][0] {
        countedQuantity
      }
    },
    "transactions": *[_type in ["GoodsReceipt", "DispatchLog", "InternalTransfer", "StockAdjustment"] 
      && (receivingBin._ref == $binId || sourceBin._ref == $binId || toBin._ref == $binId || fromBin._ref == $binId || bin._ref == $binId)
      && dateTime(coalesce(receiptDate, dispatchDate, transferDate, adjustmentDate)) > dateTime(^.latestCount.countDate)
    ] {
      _type,
      receiptDate,
      dispatchDate,
      transferDate,
      adjustmentDate,
      receivingBin,
      sourceBin,
      toBin,
      fromBin,
      bin,
      "receiptItems": receivedItems[stockItem._ref == $stockItemId][0] {
        receivedQuantity
      },
      "dispatchItems": dispatchedItems[stockItem._ref == $stockItemId][0] {
        dispatchedQuantity
      },
      "transferInItems": transferredItems[stockItem._ref == $stockItemId && toBin._ref == $binId][0] {
        transferredQuantity
      },
      "transferOutItems": transferredItems[stockItem._ref == $stockItemId && fromBin._ref == $binId][0] {
        transferredQuantity
      },
      "adjustmentItems": adjustedItems[stockItem._ref == $stockItemId][0] {
        adjustedQuantity
      }
    }
  }`;

    const data = await client.fetch(query, { stockItemId, binId });

    const baseQuantity = new Decimal(data.latestCount?.countedItem?.countedQuantity || 0);

    let stock = baseQuantity;

    data.transactions?.forEach((tx: any) => {
        switch (tx._type) {
            case 'GoodsReceipt':
                if (tx.receiptItems) {
                    stock = stock.plus(new Decimal(tx.receiptItems.receivedQuantity || 0));
                }
                break;
            case 'DispatchLog':
                if (tx.dispatchItems) {
                    stock = stock.minus(new Decimal(tx.dispatchItems.dispatchedQuantity || 0));
                }
                break;
            case 'InternalTransfer':
                if (tx.transferInItems) {
                    stock = stock.plus(new Decimal(tx.transferInItems.transferredQuantity || 0));
                }
                if (tx.transferOutItems) {
                    stock = stock.minus(new Decimal(tx.transferOutItems.transferredQuantity || 0));
                }
                break;
            case 'StockAdjustment':
                if (tx.adjustmentItems) {
                    const quantity = new Decimal(tx.adjustmentItems.adjustedQuantity || 0);
                    if (quantity.isPositive()) {
                        stock = stock.plus(quantity);
                    } else {
                        stock = stock.minus(quantity.absoluteValue());
                    }
                }
                break;
        }
    });

    return stock.toNumber();
};

// Bulk calculation for multiple items and bins
export const calculateBulkStock = async (stockItemIds: string[], binIds: string[]): Promise<{ [key: string]: number }> => {
    if (stockItemIds.length === 0 || binIds.length === 0) {
        return {};
    }

    const query = groq`{
    "counts": *[_type == "InventoryCount" && bin._ref in $binIds] | order(countDate desc) {
      bin->{ _ref },
      countDate,
      countedItems[] {
        stockItem->{ _ref },
        countedQuantity
      }
    },
    "transactions": *[_type in ["GoodsReceipt", "DispatchLog", "InternalTransfer", "StockAdjustment"] 
      && (receivingBin._ref in $binIds || sourceBin._ref in $binIds || toBin._ref in $binIds || fromBin._ref in $binIds || bin._ref in $binIds)
    ] | order(coalesce(receiptDate, dispatchDate, transferDate, adjustmentDate) asc) {
      _type,
      receiptDate,
      dispatchDate,
      transferDate,
      adjustmentDate,
      receivingBin->{ _ref },
      sourceBin->{ _ref },
      toBin->{ _ref },
      fromBin->{ _ref },
      bin->{ _ref },
      receivedItems[] {
        stockItem->{ _ref },
        receivedQuantity
      },
      dispatchedItems[] {
        stockItem->{ _ref },
        dispatchedQuantity
      },
      transferredItems[] {
        stockItem->{ _ref },
        transferredQuantity
      },
      adjustedItems[] {
        stockItem->{ _ref },
        adjustedQuantity
      },
      adjustmentType
    }
  }`;

    const data = await client.fetch(query, { binIds, stockItemIds });

    // Step 1: Initialize results with latest counts
    const results: { [key: string]: Decimal } = {};
    const latestCountDates: { [key: string]: string } = {};

    data.counts.forEach((count: any) => {
        const binId = count.bin?._ref;
        if (!latestCountDates[binId]) { // Only consider the latest count per bin
            latestCountDates[binId] = count.countDate;
            count.countedItems.forEach((item: any) => {
                const itemId = item.stockItem?._ref;
                if (stockItemIds.includes(itemId)) {
                    const key = `${itemId}-${binId}`;
                    results[key] = new Decimal(item.countedQuantity || 0);
                }
            });
        }
    });

    // Step 2: Apply transactions that occurred after the latest count
    data.transactions.forEach((tx: any) => {
        const txDate = new Date(tx.receiptDate || tx.dispatchDate || tx.transferDate || tx.adjustmentDate).toISOString();

        const processItems = (items: any[], binId: string, isInbound: boolean) => {
            if (!binId || !latestCountDates[binId]) return;

            // Only process transactions that occurred after the latest count for that bin
            if (txDate > latestCountDates[binId]) {
                items?.forEach((item: any) => {
                    const itemId = item.stockItem?._ref;
                    if (itemId && stockItemIds.includes(itemId)) {
                        const key = `${itemId}-${binId}`;
                        const quantity = new Decimal(item.receivedQuantity || item.dispatchedQuantity || item.transferredQuantity || item.adjustedQuantity || 0);

                        // Ensure the item exists in the results map before calculating
                        if (!results[key]) {
                            results[key] = new Decimal(0);
                        }

                        if (isInbound) {
                            results[key] = results[key].plus(quantity);
                        } else {
                            results[key] = results[key].minus(quantity);
                        }
                    }
                });
            }
        };

        switch (tx._type) {
            case 'GoodsReceipt':
                processItems(tx.receivedItems, tx.receivingBin?._ref, true);
                break;
            case 'DispatchLog':
                processItems(tx.dispatchedItems, tx.sourceBin?._ref, false);
                break;
            case 'InternalTransfer':
                processItems(tx.transferredItems, tx.toBin?._ref, true);
                processItems(tx.transferredItems, tx.fromBin?._ref, false);
                break;
            case 'StockAdjustment':
                processItems(tx.adjustedItems, tx.bin?._ref, tx.adjustmentType === 'addition');
                break;
        }
    });

    // Step 3: Convert Decimal objects to numbers for the final return
    const finalResults: { [key: string]: number } = {};
    for (const key in results) {
        finalResults[key] = results[key].toNumber();
    }

    return finalResults;
};