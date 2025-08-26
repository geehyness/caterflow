// src/lib/stockCalculations.ts
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

/**
 * Calculates the current stock quantity for a single stock item in a specific bin.
 * This function determines the current stock by finding the latest inventory count
 * and then aggregating all subsequent transactions.
 * @param stockItemId The ID of the StockItem document.
 * @param binId The ID of the Bin document.
 * @returns A promise that resolves to the calculated current stock quantity.
 */
export const calculateStock = async (stockItemId: string, binId: string): Promise<number> => {
  const query = groq`{
        "latestCount": *[_type == "InventoryCount" && countDate < now() && bin._ref == $binId] | order(countDate desc)[0] {
            "countedItem": countedItems[stockItem._ref == $stockItemId][0],
            countDate,
        },
        "inbound": {
            "receipts": *[_type == "GoodsReceipt" && receiptDate > ^.latestCount.countDate && receivedItems[].stockItem._ref == $stockItemId && receivingBin._ref == $binId] {
                "quantity": receivedItems[stockItem._ref == $stockItemId][0].receivedQuantity
            },
            "transfers": *[_type == "InternalTransfer" && transferDate > ^.latestCount.countDate && transferredItems[].stockItem._ref == $stockItemId && toBin._ref == $binId] {
                "quantity": transferredItems[stockItem._ref == $stockItemId][0].transferredQuantity
            },
            "adjustments": *[_type == "StockAdjustment" && adjustmentDate > ^.latestCount.countDate && adjustedItems[].stockItem._ref == $stockItemId && bin._ref == $binId] {
                "quantity": adjustedItems[stockItem._ref == $stockItemId][0].adjustedQuantity
            }
        },
        "outbound": {
            "dispatches": *[_type == "DispatchLog" && dispatchDate > ^.latestCount.countDate && dispatchedItems[].stockItem._ref == $stockItemId && sourceBin._ref == $binId] {
                "quantity": dispatchedItems[stockItem._ref == $stockItemId][0].dispatchedQuantity
            },
            "transfers": *[_type == "InternalTransfer" && transferDate > ^.latestCount.countDate && transferredItems[].stockItem._ref == $stockItemId && fromBin._ref == $binId] {
                "quantity": transferredItems[stockItem._ref == $stockItemId][0].transferredQuantity
            },
            "adjustments": *[_type == "StockAdjustment" && adjustmentDate > ^.latestCount.countDate && adjustedItems[].stockItem._ref == $stockItemId && bin._ref == $binId] {
                "quantity": adjustedItems[stockItem._ref == $stockItemId][0].adjustedQuantity
            }
        }
    }`;

  const data = await client.fetch(query, { stockItemId, binId });

  // Handle initial quantity from the latest count
  // Access the quantity from the new `countedItem` object
  const baseQuantity = data.latestCount?.countedItem?.countedQuantity || 0;

  // Aggregate all inbound movements
  const totalInbound = (data.inbound.receipts?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0) +
    (data.inbound.transfers?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0) +
    (data.inbound.adjustments?.reduce((sum: number, item: any) => sum + Math.max(0, item.quantity), 0) || 0);

  // Aggregate all outbound movements
  const totalOutbound = (data.outbound.dispatches?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0) +
    (data.outbound.transfers?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0) +
    (data.outbound.adjustments?.reduce((sum: number, item: any) => sum + Math.min(0, item.quantity), 0) || 0);

  return baseQuantity + totalInbound - totalOutbound;
};