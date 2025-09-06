// src/app/api/purchase-orders/[id]/route.ts
import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Purchase Order ID is required' },
                { status: 400 }
            );
        }

        const query = groq`
            *[_type == "PurchaseOrder" && _id == $id][0] {
                _id,
                poNumber,
                "supplierName": supplier->name,
                "siteName": site->name,
                orderedItems[] {
                    _key,
                    "stockItem": stockItem->{name},
                    orderedQuantity,
                    unitPrice
                }
            }
        `;

        const poDetails = await client.fetch(query, { id });

        if (!poDetails) {
            return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
        }

        return NextResponse.json(poDetails);
    } catch (error) {
        console.error('Failed to fetch purchase order details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch purchase order details', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Purchase Order ID is required' },
                { status: 400 }
            );
        }

        const updatedOrder = await writeClient
            .patch(id)
            .set(body)
            .commit();

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Failed to update purchase order:', error);
        return NextResponse.json(
            { error: 'Failed to update purchase order', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}