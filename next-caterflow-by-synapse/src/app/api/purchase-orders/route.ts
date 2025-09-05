// src/app/api/purchase-orders/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { nanoid } from 'nanoid';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: 'Purchase order ID is required' },
                { status: 400 }
            );
        }

        const query = groq`*[_type == "PurchaseOrder" && _id == $id] {
            _id,
            _type,
            poNumber,
            supplier->{name},
            site->{name},
            orderedItems[] {
                _key,
                orderedQuantity,
                unitPrice,
                stockItem->{
                    _id,
                    name,
                    sku,
                    unitOfMeasure
                }
            },
            status,
            orderDate,
            totalAmount
        }`;

        const purchaseOrder = await client.fetch(query, { id });

        if (!purchaseOrder || purchaseOrder.length === 0) {
            return NextResponse.json(
                { error: 'Purchase order not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(purchaseOrder[0]);
    } catch (error: any) {
        console.error("Error fetching purchase order:", error);
        return NextResponse.json(
            { error: "Failed to fetch purchase order", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST handler to create a new purchase order.
 * It also fetches current stock item prices to ensure data integrity.
 */
export async function POST(request: Request) {
    try {
        const {
            poNumber,
            orderDate,
            supplier,
            orderedBy,
            orderedItems,
            totalAmount,
            status,
            site
        } = await request.json();

        // Fetch current prices for stock items
        const stockItemIds = orderedItems.map((item: any) => item.stockItem._ref);
        const stockItemsQuery = groq`*[_type == "StockItem" && _id in $stockItemIds] {
            _id,
            unitPrice
        }`;
        const currentStockPrices = await client.fetch(stockItemsQuery, { stockItemIds });

        const poDocument = {
            _type: 'PurchaseOrder',
            poNumber: poNumber || `PO-${nanoid(8)}`,
            orderDate,
            supplier: {
                _type: 'reference',
                _ref: supplier
            },
            orderedBy: {
                _type: 'reference',
                _ref: orderedBy
            },
            site: {
                _type: 'reference',
                _ref: site
            },
            poItems: orderedItems.map((item: any) => ({
                ...item,
                unitPrice: currentStockPrices.find((price: any) => price._id === item.stockItem._ref)?.unitPrice || item.unitPrice
            })),
            totalAmount,
            status: status || 'pending-approval',
            _id: nanoid(10)
        };

        const result = await writeClient.create(poDocument);

        await logSanityInteraction(
            'create',
            `Created purchase order: ${poDocument.poNumber}`,
            'PurchaseOrder',
            result._id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to create purchase order:', error);
        return NextResponse.json(
            { error: 'Failed to create purchase order' },
            { status: 500 }
        );
    }
}

/**
 * PATCH handler to update an existing purchase order.
 */
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { _id, updateData } = body;

        const purchaseOrder = await writeClient
            .patch(_id)
            .set(updateData)
            .commit();

        await logSanityInteraction(
            'update',
            `Updated purchase order: ${updateData.poNumber || _id}`,
            'PurchaseOrder',
            _id,
            'system',
            true
        );

        return NextResponse.json(purchaseOrder);
    } catch (error) {
        console.error('Failed to update purchase order:', error);
        return NextResponse.json(
            { error: 'Failed to update purchase order' },
            { status: 500 }
        );
    }
}

/**
 * DELETE handler to remove a purchase order by ID.
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Purchase order ID is required' },
                { status: 400 }
            );
        }

        await writeClient.delete(id);

        await logSanityInteraction(
            'delete',
            `Deleted purchase order: ${id}`,
            'PurchaseOrder',
            id,
            'system',
            true
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete purchase order:', error);
        return NextResponse.json(
            { error: 'Failed to delete purchase order' },
            { status: 500 }
        );
    }
}