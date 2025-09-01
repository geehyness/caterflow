// src/app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { calculateBulkStock } from '@/lib/stockCalculations';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
import Decimal from 'decimal.js';

// Cache for dashboard data (simple in-memory cache)
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

        // Fetch all needed data in parallel with optimized queries
        const [transactions, stockItems, bins] = await Promise.all([
            fetchTransactions(siteIds),
            fetchStockItems(),
            fetchBins(siteIds)
        ]);

        // Calculate stats in parallel
        const [lowStockItems, totalStock] = await Promise.all([
            calculateLowStockItems(stockItems, bins, siteIds),
            calculateTotalStock(stockItems, bins, siteIds)
        ]);

        const result = {
            transactions,
            stats: {
                totalItemsReceived: calculateTotalReceived(transactions),
                totalItemsDispatched: calculateTotalDispatched(transactions),
                pendingInternalTransfers: countPendingTransfers(transactions),
                lowStockItems,
                totalStock
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

// Optimized helper functions
async function fetchTransactions(siteIds: string[]) {
    const query = groq`*[_type in ["GoodsReceipt", "DispatchLog", "InternalTransfer"] 
        && (receivingBin->site._ref in $siteIds || sourceBin->site._ref in $siteIds || fromBin->site._ref in $siteIds || toBin->site._ref in $siteIds)
    ] | order(_updatedAt desc) [0..50] {
        _id,
        _type,
        "createdAt": coalesce(receiptDate, dispatchDate, transferDate),
        "description": coalesce("Receipt " + receiptNumber, "Dispatch " + dispatchNumber, "Transfer " + transferNumber),
        "siteName": coalesce(receivingBin->site->name, sourceBin->site->name, fromBin->site->name),
        receivedItems[] { receivedQuantity },
        dispatchedItems[] { dispatchedQuantity },
        status
    }`;

    return await client.fetch(query, { siteIds });
}

async function fetchStockItems() {
    const query = groq`*[_type == "StockItem"] {
        _id,
        name,
        minimumStockLevel
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

async function calculateLowStockItems(stockItems: any[], bins: any[], siteIds: string[]) {
    const relevantBins = bins.filter(bin => siteIds.includes(bin.siteId));
    const stockItemIds = stockItems.map(item => item._id);
    const binIds = relevantBins.map(bin => bin._id);

    // Use bulk calculation
    const stockQuantities = await calculateBulkStock(stockItemIds, binIds);

    let lowStockCount = 0;

    stockItems.forEach(item => {
        let totalQuantity = new Decimal(0);

        relevantBins.forEach(bin => {
            const key = `${item._id}-${bin._id}`;
            totalQuantity = totalQuantity.plus(new Decimal(stockQuantities[key] || 0));
        });

        if (totalQuantity.lessThan(new Decimal(item.minimumStockLevel))) {
            lowStockCount++;
        }
    });

    return lowStockCount;
}

async function calculateTotalStock(stockItems: any[], bins: any[], siteIds: string[]) {
    const relevantBins = bins.filter(bin => siteIds.includes(bin.siteId));
    const stockItemIds = stockItems.map(item => item._id);
    const binIds = relevantBins.map(bin => bin._id);

    // Use bulk calculation
    const stockQuantities = await calculateBulkStock(stockItemIds, binIds);

    let totalStock = new Decimal(0);

    Object.values(stockQuantities).forEach(quantity => {
        totalStock = totalStock.plus(new Decimal(quantity));
    });

    return totalStock.toNumber();
}

function calculateTotalReceived(transactions: any[]) {
    return transactions
        .filter(tx => tx._type === 'GoodsReceipt')
        .flatMap(tx => tx.receivedItems || [])
        .reduce((sum, item) => new Decimal(sum).plus(new Decimal(item.receivedQuantity || 0)), new Decimal(0))
        .toNumber();
}

function calculateTotalDispatched(transactions: any[]) {
    return transactions
        .filter(tx => tx._type === 'DispatchLog')
        .flatMap(tx => tx.dispatchedItems || [])
        .reduce((sum, item) => new Decimal(sum).plus(new Decimal(item.dispatchedQuantity || 0)), new Decimal(0))
        .toNumber();
}

function countPendingTransfers(transactions: any[]) {
    return transactions
        .filter(tx => tx._type === 'InternalTransfer' && tx.status === 'pending')
        .length;
}