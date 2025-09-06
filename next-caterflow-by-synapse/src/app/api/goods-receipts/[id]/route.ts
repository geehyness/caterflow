// src/app/api/goods-receipts/[id]/route.ts
import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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