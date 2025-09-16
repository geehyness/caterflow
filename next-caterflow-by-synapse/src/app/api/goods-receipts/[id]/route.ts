// src/app/api/goods-receipts/[id]/route.ts
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Change params to Promise
) {
    try {
        const { id } = await params; // Await the params

        if (!id) {
            return NextResponse.json(
                { error: 'Goods receipt ID is required' },
                { status: 400 }
            );
        }

        const query = groq`*[_type == "GoodsReceipt" && _id == $id][0] {
        _id,
        _type,
        receiptNumber,
        receiptDate,
        purchaseOrder->{
            _id,
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
            }
        },
        receivingBin->{
            _id,
            name,
            binType,
            site->{name}
        },
        receivedBy->{name},
        receivedItems[] {
            _key,
            stockItem->{
                _id,
                name,
                sku,
                unitOfMeasure
            },
            orderedQuantity,
            receivedQuantity,
            batchNumber,
            expiryDate,
            condition
        },
        status,
        notes,
        evidenceStatus,
        attachments[]->{
            _id,
            name,
            url
        }
    }`;

        const goodsReceipt = await client.fetch(query, { id });

        if (!goodsReceipt) {
            return NextResponse.json(
                { error: 'Goods receipt not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(goodsReceipt);
    } catch (error: any) {
        console.error("Error fetching goods receipt:", error);
        return NextResponse.json(
            { error: "Failed to fetch goods receipt", details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Change params to Promise
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }

        const { id } = await params; // Await the params

        if (!id) {
            return NextResponse.json(
                { error: 'Goods receipt ID is required' },
                { status: 400 }
            );
        }

        const updateData = await request.json();

        // The Sanity patch `set` method will handle partial updates.
        // We only need to ensure the `updatedAt` field is set.
        const result = await writeClient
            .patch(id)
            .set({ ...updateData, updatedAt: new Date().toISOString() })
            .commit();

        await logSanityInteraction(
            'update',
            `Updated goods receipt: ${id} with new status and attachments`,
            'GoodsReceipt',
            id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Failed to update goods receipt:', error);
        return NextResponse.json(
            { error: 'Failed to update goods receipt', details: error.message },
            { status: 500 }
        );
    }
}