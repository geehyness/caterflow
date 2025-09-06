// src/app/api/purchase-orders/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { nanoid } from 'nanoid';

/**
 * GET handler to fetch all purchase orders or a specific one by query parameter
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const status = searchParams.get('status');

        // If an ID is provided, fetch a specific purchase order
        if (id) {
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
                totalAmount,
                // Check if this PO has any goods receipts
                "hasReceipts": count(*[_type == "GoodsReceipt" && purchaseOrder._ref == ^._id]) > 0
            }`;

            const purchaseOrder = await client.fetch(query, { id });

            if (!purchaseOrder || purchaseOrder.length === 0) {
                return NextResponse.json(
                    { error: 'Purchase order not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json(purchaseOrder[0]);
        }

        // Build the base query - only filter by status if provided
        let baseQuery = '*[_type == "PurchaseOrder"]';
        const queryParams: any = {};

        // Add status filter if provided
        if (status) {
            baseQuery += ` && status == $status`;
            queryParams.status = status;
        }

        // Complete query with ordering and projection
        const allQuery = groq`${baseQuery} | order(orderDate desc) {
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
            totalAmount,
            // Check if this PO has any goods receipts
            "hasReceipts": count(*[_type == "GoodsReceipt" && purchaseOrder._ref == ^._id]) > 0
        }`;

        let purchaseOrders = await client.fetch(allQuery, queryParams);

        // Ensure purchaseOrders is always an array, even if null/undefined
        purchaseOrders = purchaseOrders || [];

        return NextResponse.json(purchaseOrders);
    } catch (error: any) {
        console.error("Error fetching purchase orders:", error);
        return NextResponse.json(
            { error: "Failed to fetch purchase orders", details: error.message },
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
            supplier, // This should be a string ID, not an object
            orderedBy, // This should be a string ID, not an object
            orderedItems,
            totalAmount,
            status,
            site // This should be a string ID, not an object
        } = await request.json();

        // Validate required fields
        if (!supplier || !orderedBy || !site || !orderedItems || orderedItems.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields: supplier, orderedBy, site, or orderedItems' },
                { status: 400 }
            );
        }

        // Validate that reference fields are strings, not objects
        if (typeof supplier !== 'string') {
            return NextResponse.json(
                { error: 'Supplier must be a string ID, not an object' },
                { status: 400 }
            );
        }

        if (typeof orderedBy !== 'string') {
            return NextResponse.json(
                { error: 'OrderedBy must be a string ID, not an object' },
                { status: 400 }
            );
        }

        if (typeof site !== 'string') {
            return NextResponse.json(
                { error: 'Site must be a string ID, not an object' },
                { status: 400 }
            );
        }

        // Validate orderedItems structure
        const invalidItems = orderedItems.filter((item: any) =>
            !item.stockItem || typeof item.stockItem !== 'string'
        );

        if (invalidItems.length > 0) {
            return NextResponse.json(
                { error: 'Stock items must be string IDs in orderedItems' },
                { status: 400 }
            );
        }

        // Fetch current prices for stock items
        const stockItemIds = orderedItems.map((item: any) => item.stockItem);
        let currentStockPrices = [];

        if (stockItemIds.length > 0) {
            const stockItemsQuery = groq`*[_type == "StockItem" && _id in $stockItemIds] {
                _id,
                unitPrice
            }`;
            currentStockPrices = await client.fetch(stockItemsQuery, { stockItemIds });
        }

        const poDocument = {
            _type: 'PurchaseOrder',
            poNumber: poNumber || `PO-${nanoid(8)}`,
            orderDate: orderDate || new Date().toISOString(),
            supplier: {
                _type: 'reference',
                _ref: supplier // Direct string ID
            },
            orderedBy: {
                _type: 'reference',
                _ref: orderedBy // Direct string ID
            },
            site: {
                _type: 'reference',
                _ref: site // Direct string ID
            },
            orderedItems: orderedItems.map((item: any) => ({
                _key: item._key || nanoid(),
                orderedQuantity: item.orderedQuantity || 1,
                unitPrice: currentStockPrices.find((price: any) => price._id === item.stockItem)?.unitPrice || item.unitPrice || 0,
                stockItem: {
                    _type: 'reference',
                    _ref: item.stockItem // Direct string ID
                }
            })),
            totalAmount: totalAmount || 0,
            status: status || 'draft',
            _id: nanoid()
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
    } catch (error: any) {
        console.error('Failed to create purchase order:', error);
        return NextResponse.json(
            {
                error: 'Failed to create purchase order',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
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

        if (!_id) {
            return NextResponse.json(
                { error: 'Purchase order ID is required' },
                { status: 400 }
            );
        }

        // Clean up any nested reference objects that might be sent
        const cleanUpdateData = { ...updateData };

        // Ensure reference fields are properly formatted
        if (cleanUpdateData.supplier && typeof cleanUpdateData.supplier === 'object') {
            cleanUpdateData.supplier = {
                _type: 'reference',
                _ref: cleanUpdateData.supplier._ref || cleanUpdateData.supplier
            };
        }

        if (cleanUpdateData.orderedBy && typeof cleanUpdateData.orderedBy === 'object') {
            cleanUpdateData.orderedBy = {
                _type: 'reference',
                _ref: cleanUpdateData.orderedBy._ref || cleanUpdateData.orderedBy
            };
        }

        if (cleanUpdateData.site && typeof cleanUpdateData.site === 'object') {
            cleanUpdateData.site = {
                _type: 'reference',
                _ref: cleanUpdateData.site._ref || cleanUpdateData.site
            };
        }

        // Clean orderedItems if present
        if (cleanUpdateData.orderedItems && Array.isArray(cleanUpdateData.orderedItems)) {
            cleanUpdateData.orderedItems = cleanUpdateData.orderedItems.map((item: any) => ({
                ...item,
                stockItem: {
                    _type: 'reference',
                    _ref: item.stockItem._ref || item.stockItem
                }
            }));
        }

        const purchaseOrder = await writeClient
            .patch(_id)
            .set(cleanUpdateData)
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