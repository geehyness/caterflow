// src/app/api/dashboard/stats/route.ts
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
            todayActivityCount,
            urgentPendingActionsCount,
            negativeStockItemsCount,
            transfersInTransitCount,
            totalActiveUsers,
            totalSites
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
            countTodayActivity(siteIds, startOfToday),
            countUrgentPendingActions(siteIds),
            countNegativeStockItems(siteIds),
            countTransfersInTransit(siteIds),
            countTotalActiveUsers(),
            countTotalSites()
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
                todayActivityCount,

                // New Stats
                urgentPendingActionsCount,
                negativeStockItemsCount,
                transfersInTransitCount,
                totalActiveUsers,
                totalSites
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

// --- Helper functions for new stats ---

async function countUrgentPendingActions(siteIds: string[]) {
    const query = groq`count(*[_type in ["PurchaseOrder", "InternalTransfer"] && status == "pending" && priority == "high" && (toBin->site._ref in $siteIds || fromBin->site._ref in $siteIds || supplier->site._ref in $siteIds)])`;
    return await client.fetch(query, { siteIds });
}

async function countNegativeStockItems(siteIds: string[]) {
    // This requires fetching all stock items and relevant bins to calculate stock
    const stockItems = await fetchStockItems();
    const bins = await fetchBins(siteIds);

    // Filter bins to only include those from selected sites
    const relevantBins = bins.filter((bin: { siteId: string; }) => siteIds.includes(bin.siteId));

    const stockItemIds = stockItems.map((item: { _id: any; }) => item._id);
    const binIds = relevantBins.map((bin: { _id: any; }) => bin._id);

    // Use bulk calculation from original code
    const stockQuantities = await calculateBulkStock(stockItemIds, binIds);

    let negativeStockCount = 0;

    // Group stock quantities by stockItemId
    const groupedStock = stockItems.reduce((acc: { [x: string]: Decimal; }, item: { _id: string | number; }) => {
        acc[item._id] = new Decimal(0);
        return acc;
    }, {});

    for (const key in stockQuantities) {
        const [stockItemId] = key.split('-');
        if (groupedStock[stockItemId]) {
            groupedStock[stockItemId] = groupedStock[stockItemId].plus(new Decimal(stockQuantities[key]));
        }
    }

    // Count items with a total negative stock
    for (const stockItemId in groupedStock) {
        if (groupedStock[stockItemId].isNegative()) {
            negativeStockCount++;
        }
    }

    return negativeStockCount;
}

async function countTotalSites() {
    const query = groq`count(*[_type == "Site"])`;
    return await client.fetch(query);
}

async function countTotalActiveUsers() {
    const query = groq`count(*[_type == "AppUser" && isActive == true])`;
    return await client.fetch(query);
}

async function countTransfersInTransit(siteIds: string[]) {
    const query = groq`count(*[
        _type == "InternalTransfer" && 
        (fromBin->site._ref in $siteIds || toBin->site._ref in $siteIds) &&
        status == "pending"
    ])`;
    return await client.fetch(query, { siteIds });
}

// --- Original helper functions (no changes) ---

async function calculateLowStockCounts(stockItems: any[], bins: any[], siteIds: string[]) {
    const relevantBins = bins.filter(bin => siteIds.includes(bin.siteId));
    const stockItemIds = stockItems.map(item => item._id);
    const binIds = relevantBins.map(bin => bin._id);
    const stockQuantities = await calculateBulkStock(stockItemIds, binIds);

    let lowStockCount = 0;
    let outOfStockCount = 0;

    const groupedStock = stockItems.reduce((acc, item) => {
        acc[item._id] = new Decimal(0);
        return acc;
    }, {});

    for (const key in stockQuantities) {
        const [stockItemId] = key.split('-');
        if (groupedStock[stockItemId]) {
            groupedStock[stockItemId] = groupedStock[stockItemId].plus(new Decimal(stockQuantities[key]));
        }
    }

    stockItems.forEach(item => {
        const totalQty = groupedStock[item._id]?.toNumber() || 0;
        if (totalQty <= item.minimumStockLevel) {
            lowStockCount++;
        }
        if (totalQty === 0) {
            outOfStockCount++;
        }
    });

    return [lowStockCount, outOfStockCount];
}

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
        dispatchDate >= $startOfToday
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