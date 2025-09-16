import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const getNextReceiptNumber = async (): Promise<string> => {
    const query = groq`*[_type == "GoodsReceipt"] | order(receiptDate desc)[0].receiptNumber`;
    const lastReceiptNumber = await client.fetch(query);
    const lastNumber = lastReceiptNumber ? parseInt(lastReceiptNumber.split('-')[1]) : 0;
    const nextNumber = lastNumber + 1;
    return `GR-${String(nextNumber).padStart(5, '0')}`;
};

export async function GET() {
    try {
        const query = groq`*[_type == "GoodsReceipt"] | order(receiptDate desc) {
            _id,
            receiptNumber,
            receiptDate,
            status,
            notes,
            "purchaseOrder": purchaseOrder->{
                _id,
                poNumber,
                status,
                orderDate,
                "supplier": supplier->{
                    _id,
                    name
                }
            },
            "receivingBin": receivingBin->{
                _id,
                name,
                "site": site->{
                    _id,
                    name
                }
            },
            "receivedItems": receivedItems[] {
                _key,
                orderedQuantity,
                receivedQuantity,
                batchNumber,
                expiryDate,
                condition,
                "stockItem": stockItem->{
                    _id,
                    name,
                    sku,
                    unitOfMeasure
                }
            },
            attachments[]->{
                _id,
                fileName,
                fileType
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

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }

        const payload = await request.json();
        const { _id, ...createData } = payload;

        const newDoc = {
            ...createData,
            _type: 'GoodsReceipt',
            receiptNumber: await getNextReceiptNumber(),
            _id: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const result = await writeClient.create(newDoc);

        await logSanityInteraction(
            'create',
            `Created new goods receipt: ${newDoc.receiptNumber}`,
            'GoodsReceipt',
            result._id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to create goods receipt:', error);
        return NextResponse.json(
            { error: 'Failed to create goods receipt', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}