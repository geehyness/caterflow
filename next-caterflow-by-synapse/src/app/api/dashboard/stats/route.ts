import { NextRequest, NextResponse } from 'next/server';
import { calculateBulkStock } from '@/lib/stockCalculations';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
import Decimal from 'decimal.js';

// Cache for dashboard data
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

export async function POST(request: NextRequest) {
    try {
        const { siteIds } = await request.json();

        if (!siteIds || !Array.isArray(siteIds)) {
            return NextResponse.json(
                { error: 'siteIds array is required' },
                { status: 400 }
            );
        }

        // Check cache
        const cacheKey = JSON.stringify(siteIds.sort());
        const cachedData = cache.get(cacheKey);

        if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
            return NextResponse.json(cachedData.data);
        }

        // Get current date for time-based queries
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        // Fetch all needed data in parallel
        const [
            transactions,
            stockItems,
            bins,
            monthlyReceiptsCount,
            monthlyDispatchesCount,
            todaysDispatchesCount,
            pendingTransfersCount,
            draftOrdersCount,
            weeklyActivityCount,
            todayActivityCount
        ] = await Promise.all([
            fetchTransactions(siteIds),
            fetchStockItems(),
            fetchBins(siteIds),
            countMonthlyReceipts(siteIds, startOfMonth),
            countMonthlyDispatches(siteIds, startOfMonth),
            countTodaysDispatches(siteIds, startOfToday),
            countPendingTransfers(siteIds),
            countDraftOrders(siteIds),
            countWeeklyActivity(siteIds, startOfWeek),
            countTodayActivity(siteIds, startOfToday)
        ]);

        // Calculate low stock items using the original method
        const [lowStockItemsCount, outOfStockItemsCount] = await calculateLowStockCounts(stockItems, bins, siteIds);

        const result = {
            transactions,
            stats: {
                // Card 1: Receipts This Month
                monthlyReceiptsCount,
                receiptsTrend: await calculateReceiptsTrend(siteIds, startOfMonth),

                // Card 2: Dispatches This Month
                monthlyDispatchesCount,
                todaysDispatchesCount,

                // Card 3: Pending Actions
                pendingActionsCount: pendingTransfersCount + draftOrdersCount,
                pendingTransfersCount,
                draftOrdersCount,

                // Card 4: Low Stock Items (using original calculation)
                lowStockItemsCount,
                outOfStockItemsCount,

                // Card 5: Recent Activity
                weeklyActivityCount,
                todayActivityCount
            }
        };

        // Cache the result
        cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json(
            { error: 'Failed to calculate dashboard stats' },
            { status: 500 }
        );
    }
}

// Original low stock calculation method
async function calculateLowStockCounts(stockItems: any[], bins: any[], siteIds: string[]) {
    // Filter bins to only include those from selected sites
    const relevantBins = bins.filter(bin => siteIds.includes(bin.siteId));

    const stockItemIds = stockItems.map(item => item._id);
    const binIds = relevantBins.map(bin => bin._id);

    // Use bulk calculation from original code
    const stockQuantities = await calculateBulkStock(stockItemIds, binIds);

    let lowStockCount = 0;
    let outOfStockCount = 0;

    stockItems.forEach(item => {
        let totalQuantity = new Decimal(0);

        relevantBins.forEach(bin => {
            const key = `${item._id}-${bin._id}`;
            totalQuantity = totalQuantity.plus(new Decimal(stockQuantities[key] || 0));
        });

        const totalQty = totalQuantity.toNumber();

        if (totalQty <= item.minimumStockLevel) {
            lowStockCount++;
        }

        if (totalQty === 0) {
            outOfStockCount++;
        }
    });

    return [lowStockCount, outOfStockCount];
}

// Helper functions for counting documents
async function fetchTransactions(siteIds: string[]) {
    const query = groq`*[_type in ["GoodsReceipt", "DispatchLog", "InternalTransfer"] 
        && (receivingBin->site._ref in $siteIds || sourceBin->site._ref in $siteIds || fromBin->site._ref in $siteIds || toBin->site._ref in $siteIds)
    ] | order(_updatedAt desc) [0..10] {
        _id,
        _type,
        "createdAt": coalesce(receiptDate, dispatchDate, transferDate),
        "description": coalesce("Receipt: " + receiptNumber, "Dispatch: " + dispatchNumber, "Transfer: " + transferNumber),
        "siteName": coalesce(receivingBin->site->name, sourceBin->site->name, fromBin->site->name)
    }`;

    return await client.fetch(query, { siteIds });
}

async function fetchStockItems() {
    const query = groq`*[_type == "StockItem"] {
        _id,
        name,
        minimumStockLevel,
        unitOfMeasure
    }`;
    return await client.fetch(query);
}

async function fetchBins(siteIds: string[]) {
    const query = groq`*[_type == "Bin" && site._ref in $siteIds] {
        _id,
        "siteId": site._ref
    }`;
    return await client.fetch(query, { siteIds });
}

async function countMonthlyReceipts(siteIds: string[], startOfMonth: string) {
    const query = groq`count(*[
        _type == "GoodsReceipt" && 
        receivingBin->site._ref in $siteIds &&
        receiptDate >= $startOfMonth
    ])`;
    return await client.fetch(query, { siteIds, startOfMonth });
}

async function countMonthlyDispatches(siteIds: string[], startOfMonth: string) {
    const query = groq`count(*[
        _type == "DispatchLog" && 
        sourceBin->site._ref in $siteIds &&
        dispatchDate >= $startOfMonth
    ])`;
    return await client.fetch(query, { siteIds, startOfMonth });
}

async function countTodaysDispatches(siteIds: string[], startOfToday: string) {
    const query = groq`count(*[
        _type == "DispatchLog" && 
        sourceBin->site._ref in $siteIds &&
        dispatchDate >= $startOfToday &&
        status != "completed"
    ])`;
    return await client.fetch(query, { siteIds, startOfToday });
}

async function countPendingTransfers(siteIds: string[]) {
    const query = groq`count(*[
        _type == "InternalTransfer" && 
        (fromBin->site._ref in $siteIds || toBin->site._ref in $siteIds) &&
        status == "pending"
    ])`;
    return await client.fetch(query, { siteIds });
}

async function countDraftOrders(siteIds: string[]) {
    const query = groq`count(*[
        _type == "PurchaseOrder" && 
        status == "draft"
    ])`;
    return await client.fetch(query);
}

async function countWeeklyActivity(siteIds: string[], startOfWeek: string) {
    const query = groq`count(*[
        _type in ["GoodsReceipt", "DispatchLog", "InternalTransfer", "StockAdjustment"] &&
        (receivingBin->site._ref in $siteIds || 
         sourceBin->site._ref in $siteIds || 
         fromBin->site._ref in $siteIds || 
         toBin->site._ref in $siteIds ||
         bin->site._ref in $siteIds) &&
        coalesce(receiptDate, dispatchDate, transferDate, adjustmentDate) >= $startOfWeek
    ])`;
    return await client.fetch(query, { siteIds, startOfWeek });
}

async function countTodayActivity(siteIds: string[], startOfToday: string) {
    const query = groq`count(*[
        _type in ["GoodsReceipt", "DispatchLog", "InternalTransfer", "StockAdjustment"] &&
        (receivingBin->site._ref in $siteIds || 
         sourceBin->site._ref in $siteIds || 
         fromBin->site._ref in $siteIds || 
         toBin->site._ref in $siteIds ||
         bin->site._ref in $siteIds) &&
        coalesce(receiptDate, dispatchDate, transferDate, adjustmentDate) >= $startOfToday
    ])`;
    return await client.fetch(query, { siteIds, startOfToday });
}

async function calculateReceiptsTrend(siteIds: string[], startOfMonth: string) {
    // Calculate previous month for comparison
    const prevMonth = new Date(startOfMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const startOfPrevMonth = prevMonth.toISOString();

    const [currentMonthCount, previousMonthCount] = await Promise.all([
        countMonthlyReceipts(siteIds, startOfMonth),
        countMonthlyReceipts(siteIds, startOfPrevMonth)
    ]);

    return Math.max(0, currentMonthCount - previousMonthCount);
}