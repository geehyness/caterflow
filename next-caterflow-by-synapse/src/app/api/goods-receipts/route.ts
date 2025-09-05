import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';

export async function GET() {
    try {
        const query = groq`*[_type == "GoodsReceipt"] | order(receiptDate desc) {
            _id,
            receiptNumber,
            receiptDate,
            status,
            notes,
            "purchaseOrder": purchaseOrder->{_id, poNumber},
            "receivingBin": receivingBin->{name},
            "items": receivedItems[] {
                "stockItem": stockItem->{name, sku, unitOfMeasure, _id},
                orderedQuantity,
                receivedQuantity,
                batchNumber,
                expiryDate,
                condition,
                _key
            }
        }`;

        const goodsReceipts = await client.fetch(query);
        return NextResponse.json(goodsReceipts);
    } catch (error) {
        console.error('Failed to fetch goods receipts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch goods receipts' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Generate a unique receipt number if not provided
        if (!body.receiptNumber) {
            const count = await client.fetch(groq`count(*[_type == "GoodsReceipt"])`);
            body.receiptNumber = `GR-${(count + 1).toString().padStart(4, '0')}`;
        }

        const goodsReceipt = await writeClient.create({
            _type: 'GoodsReceipt',
            receiptNumber: body.receiptNumber,
            receiptDate: body.receiptDate,
            purchaseOrder: { _ref: body.purchaseOrder, _type: 'reference' },
            receivingBin: { _ref: body.receivingBin, _type: 'reference' },
            status: body.status,
            notes: body.notes,
            receivedItems: body.items.map((item: any) => ({
                _type: 'ReceivedItem',
                stockItem: { _ref: item.stockItem, _type: 'reference' },
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: item.receivedQuantity,
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate,
                condition: item.condition,
            })),
        });

        await logSanityInteraction(
            'create',
            `Created new goods receipt: ${goodsReceipt.receiptNumber}`,
            'GoodsReceipt',
            goodsReceipt._id,
            'system',
            true
        );

        return NextResponse.json(goodsReceipt);
    } catch (error) {
        console.error('Failed to create goods receipt:', error);
        return NextResponse.json(
            { error: 'Failed to create goods receipt' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updateData } = body;

        if (!_id) {
            return NextResponse.json(
                { error: 'Goods receipt ID is required' },
                { status: 400 }
            );
        }

        const goodsReceipt = await writeClient
            .patch(_id)
            .set({
                ...updateData,
                purchaseOrder: updateData.purchaseOrder ? { _ref: updateData.purchaseOrder, _type: 'reference' } : undefined,
                receivingBin: updateData.receivingBin ? { _ref: updateData.receivingBin, _type: 'reference' } : undefined,
                receivedItems: updateData.items ? updateData.items.map((item: any) => ({
                    _type: 'ReceivedItem',
                    _key: item._key,
                    stockItem: { _ref: item.stockItem, _type: 'reference' },
                    orderedQuantity: item.orderedQuantity,
                    receivedQuantity: item.receivedQuantity,
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate,
                    condition: item.condition,
                })) : undefined,
            })
            .commit();

        await logSanityInteraction(
            'update',
            `Updated goods receipt: ${updateData.receiptNumber || _id}`,
            'GoodsReceipt',
            _id,
            'system',
            true
        );

        return NextResponse.json(goodsReceipt);
    } catch (error) {
        console.error('Failed to update goods receipt:', error);
        return NextResponse.json(
            { error: 'Failed to update goods receipt' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Goods receipt ID is required' },
                { status: 400 }
            );
        }

        await writeClient.delete(id);

        await logSanityInteraction(
            'delete',
            `Deleted goods receipt: ${id}`,
            'GoodsReceipt',
            id,
            'system',
            true
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete goods receipt:', error);
        return NextResponse.json(
            { error: 'Failed to delete goods receipt' },
            { status: 500 }
        );
    }
}