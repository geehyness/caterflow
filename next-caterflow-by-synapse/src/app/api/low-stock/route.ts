import { NextRequest, NextResponse } from 'next/server';
import { calculateBulkStock } from '@/lib/stockCalculations';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
import Decimal from 'decimal.js';

// GET handler to fetch all low stock items without filtering by site
export async function GET() {
    try {
        const query = groq`
            *[_type == "stockItem" && quantity <= minimumStockLevel] {
                ...,
                "siteName": bin->site->name,
                "binName": bin->name,
                "currentStock": quantity
            }
        `;
        const lowStockItems = await client.fetch(query);
        return NextResponse.json(lowStockItems);
    } catch (error) {
        console.error('Failed to fetch low stock items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch low stock items' },
            { status: 500 }
        );
    }
}

// POST handler to fetch low stock items filtered by siteIds
export async function POST(request: NextRequest) {
    try {
        const { siteIds } = await request.json();

        if (!siteIds || !Array.isArray(siteIds)) {
            return NextResponse.json(
                { error: 'siteIds array is required' },
                { status: 400 }
            );
        }

        const [stockItems, bins] = await Promise.all([
            fetchStockItems(),
            fetchBins(siteIds)
        ]);

        const lowStockItems = await calculateLowStockItems(stockItems, bins, siteIds);

        return NextResponse.json(lowStockItems);

    } catch (error) {
        console.error('Low stock items error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch low stock items' },
            { status: 500 }
        );
    }
}

async function fetchStockItems() {
    const query = groq`*[_type == "StockItem"] {
        _id,
        name,
        sku,
        minimumStockLevel,
        unitOfMeasure,
        "category": category->title
    }`;
    return await client.fetch(query);
}

async function fetchBins(siteIds: string[]) {
    const query = groq`*[_type == "Bin" && site._ref in $siteIds] {
        _id,
        name,
        "siteId": site._ref,
        "siteName": site->name
    }`;
    return await client.fetch(query, { siteIds });
}

async function calculateLowStockItems(stockItems: any[], bins: any[], siteIds: string[]) {
    const relevantBins = bins.filter(bin => siteIds.includes(bin.siteId));

    if (relevantBins.length === 0) {
        return [];
    }

    const stockItemIds = stockItems.map(item => item._id);
    const binIds = relevantBins.map(bin => bin._id);

    const stockQuantities = await calculateBulkStock(stockItemIds, binIds);

    const lowStockItems: any[] = [];

    stockItems.forEach(item => {
        let totalQuantity = new Decimal(0);

        relevantBins.forEach(bin => {
            const key = `${item._id}-${bin._id}`;
            const quantity = stockQuantities[key] || 0;
            totalQuantity = totalQuantity.plus(new Decimal(quantity));
        });

        const currentStock = totalQuantity.toNumber();

        if (currentStock <= item.minimumStockLevel) {
            const primaryBin = relevantBins.find(bin => {
                const key = `${item._id}-${bin._id}`;
                return stockQuantities[key] > 0;
            }) || relevantBins[0];

            lowStockItems.push({
                _id: item._id,
                name: item.name,
                sku: item.sku,
                minimumStockLevel: item.minimumStockLevel,
                currentStock: currentStock,
                unitOfMeasure: item.unitOfMeasure,
                category: item.category,
                siteId: primaryBin.siteId,
                siteName: primaryBin.siteName,
                binId: primaryBin._id,
                binName: primaryBin.name
            });
        }
    });

    return lowStockItems;
}