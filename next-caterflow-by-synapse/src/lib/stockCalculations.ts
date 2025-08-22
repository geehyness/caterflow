// src/lib/stockCalculations.ts
import { client } from '@/lib/sanity'; // Assuming sanity client is in a file at this path
import { groq } from 'next-sanity';

/**
 * Calculates the current stock quantity for a single stock item in a specific bin.
 * This function determines the current stock by finding the latest inventory count
 * and then aggregating all subsequent transactions (receipts, transfers, dispatches, and adjustments).
 * @param stockItemId The ID of the StockItem document.
 * @param binId The ID of the Bin document.
 * @returns A promise that resolves to the calculated current stock quantity.
 */
export const calculateStock = async (stockItemId: string, binId: string): Promise<number> => {
    // Find the most recent inventory count for this item in this bin.
    const latestCountQuery = groq`
    *[_type == "InventoryCount" && countDate < now() && bin._ref == $binId] | order(countDate desc)[0] {
      countedItems[stockItem._ref == $stockItemId][0] {
        countedQuantity
      },
      countDate,
    }
  `;
    const latestCount = await client.fetch(latestCountQuery, { stockItemId, binId });
    const baseQuantity = latestCount?.countedItems?.countedQuantity || 0;
    const lastCountDate = latestCount?.countDate || "1970-01-01T00:00:00Z";

    // Calculate inbound movements since the last count
    const inboundQuery = groq`
    {
      "receipts": *[_type == "GoodsReceipt" && receiptDate > $lastCountDate && receivedItems[].stockItem._ref == $stockItemId && receivingBin._ref == $binId] {
        receivedItems[stockItem._ref == $stockItemId][0].receivedQuantity
      },
      "transfers": *[_type == "InternalTransfer" && transferDate > $lastCountDate && transferredItems[].stockItem._ref == $stockItemId && toBin._ref == $binId] {
        transferredItems[stockItem._ref == $stockItemId][0].transferredQuantity
      },
      "adjustments": *[_type == "StockAdjustment" && adjustmentDate > $lastCountDate && adjustedItems[].stockItem._ref == $stockItemId && bin._ref == $binId] {
        adjustedItems[stockItem._ref == $stockItemId][0].adjustedQuantity
      }
    }
  `;
    const inboundData = await client.fetch(inboundQuery, { lastCountDate, stockItemId, binId });
    const totalInbound = (inboundData.receipts?.reduce((sum: number, item: any) => sum + item.receivedQuantity, 0) || 0) +
        (inboundData.transfers?.reduce((sum: number, item: any) => sum + item.transferredQuantity, 0) || 0) +
        (inboundData.adjustments?.reduce((sum: number, item: any) => sum + Math.max(0, item.adjustedQuantity), 0) || 0);

    // Calculate outbound movements since the last count
    const outboundQuery = groq`
    {
      "dispatches": *[_type == "DispatchLog" && dispatchDate > $lastCountDate && dispatchedItems[].stockItem._ref == $stockItemId && sourceBin._ref == $binId] {
        dispatchedItems[stockItem._ref == $stockItemId][0].dispatchedQuantity
      },
      "transfers": *[_type == "InternalTransfer" && transferDate > $lastCountDate && transferredItems[].stockItem._ref == $stockItemId && fromBin._ref == $binId] {
        transferredItems[stockItem._ref == $stockItemId][0].transferredQuantity
      },
      "adjustments": *[_type == "StockAdjustment" && adjustmentDate > $lastCountDate && adjustedItems[].stockItem._ref == $stockItemId && bin._ref == $binId] {
        adjustedItems[stockItem._ref == $stockItemId][0].adjustedQuantity
      }
    }
  `;
    const outboundData = await client.fetch(outboundQuery, { lastCountDate, stockItemId, binId });
    const totalOutbound = (outboundData.dispatches?.reduce((sum: number, item: any) => sum + item.dispatchedQuantity, 0) || 0) +
        (outboundData.transfers?.reduce((sum: number, item: any) => sum + item.transferredQuantity, 0) || 0) +
        (outboundData.adjustments?.reduce((sum: number, item: any) => sum + Math.min(0, item.adjustedQuantity), 0) || 0);

    return baseQuantity + totalInbound - totalOutbound;
};