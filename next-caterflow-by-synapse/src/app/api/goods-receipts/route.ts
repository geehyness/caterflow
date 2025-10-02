// src/app/api/goods-receipts/route.ts
import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserSiteInfo, buildTransactionSiteFilter } from '@/lib/siteFiltering';

const getNextReceiptNumber = async (): Promise<string> => {
    try {
        // Get all receipt numbers and find the maximum
        const query = groq`*[_type == "GoodsReceipt"].receiptNumber`;
        const allReceiptNumbers = await client.fetch(query);

        let maxNumber = 0;

        if (allReceiptNumbers && allReceiptNumbers.length > 0) {
            allReceiptNumbers.forEach((receiptNumber: string) => {
                if (receiptNumber && receiptNumber.startsWith('GR-')) {
                    const numberPart = receiptNumber.split('-')[1];
                    const currentNumber = parseInt(numberPart);
                    if (!isNaN(currentNumber) && currentNumber > maxNumber) {
                        maxNumber = currentNumber;
                    }
                }
            });
        }

        // Generate the next number
        const nextNumber = maxNumber + 1;
        const newReceiptNumber = `GR-${String(nextNumber).padStart(5, '0')}`;

        // Double-check this number doesn't already exist (concurrency safety)
        const checkQuery = groq`count(*[_type == "GoodsReceipt" && receiptNumber == $newNumber])`;
        const existingCount = await client.fetch(checkQuery, { newNumber: newReceiptNumber });

        if (existingCount > 0) {
            // If it exists, try the next number
            return `GR-${String(nextNumber + 1).padStart(5, '0')}`;
        }

        return newReceiptNumber;
    } catch (error) {
        console.error('Error generating receipt number:', error);
        // Fallback with timestamp to ensure uniqueness
        const timestamp = new Date().getTime();
        return `GR-${String(timestamp).slice(-5)}`;
    }
};

export async function GET() {
    try {
        const userSiteInfo = await getUserSiteInfo();
        const siteFilter = buildTransactionSiteFilter(userSiteInfo);

        const query = groq`*[_type == "GoodsReceipt" ${siteFilter}] | order(receiptDate desc) {
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

export async function POST(request: Request) {
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

        // Remove the site permission check entirely
        // Users can now create goods receipts for any site

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