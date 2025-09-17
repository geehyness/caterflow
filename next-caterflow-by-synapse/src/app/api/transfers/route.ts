// src/app/api/transfers/route.ts

import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { TransferredItem } from '@/lib/sanityTypes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// Helper function to generate the next unique transfer number
const getNextTransferNumber = async (): Promise<string> => {
    try {
        const query = groq`*[_type == "InternalTransfer"] | order(transferNumber desc)[0].transferNumber`;
        const lastTransferNumber = await client.fetch(query);

        if (!lastTransferNumber) {
            return 'TRF-00001';
        }

        const match = lastTransferNumber.match(/TRF-(\d+)/);
        if (!match) {
            return 'TRF-00001';
        }

        const lastNumber = parseInt(match[1], 10);
        const nextNumber = lastNumber + 1;
        return `TRF-${String(nextNumber).padStart(5, '0')}`;
    } catch (error) {
        console.error('Error generating transfer number:', error);
        return `TRF-${Date.now().toString().slice(-5)}`;
    }
};

export async function GET() {
    try {
        const query = groq`*[_type == "InternalTransfer"] | order(transferDate desc) {
            _id,
            transferNumber,
            transferDate,
            status,
            notes,
            "fromBin": fromBin->{
                _id,
                name,
                "site": site->{_id, name}
            },
            "toBin": toBin->{
                _id,
                name,
                "site": site->{_id, name}
            },
            "items": coalesce(transferredItems[]{
                _key,
                transferredQuantity,
                "stockItem": stockItem->{
                    _id,
                    name,
                    sku,
                    unitOfMeasure,
                    currentStock
                }
            }, []),
            "totalItems": count(transferredItems)
        }`;
        const transfers = await client.fetch(query);
        return NextResponse.json(transfers);
    } catch (error) {
        console.error('Failed to fetch transfers:', error);
        return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
    }
}

// Handler for the next transfer number - REMOVED
// export async function GET_NEXT_NUMBER() {
//     try {
//         const nextNumber = await getNextTransferNumber();
//         return NextResponse.json({ transferNumber: nextNumber });
//     } catch (error) {
//         console.error('Failed to get next transfer number:', error);
//         return NextResponse.json({ error: 'Failed to get next transfer number' }, { status: 500 });
//     }
// }

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const transferNumber = await getNextTransferNumber();

        const transferredItems = (body.items || []).map((item: any) => ({
            _type: 'TransferredItem',
            _key: item._key,
            stockItem: {
                _type: 'reference',
                _ref: item.stockItem._id,
            },
            transferredQuantity: item.transferredQuantity,
        }));

        const transfer = {
            _type: 'InternalTransfer',
            transferNumber,
            transferDate: body.transferDate,
            status: body.status,
            fromBin: {
                _type: 'reference',
                _ref: body.fromBin,
            },
            toBin: {
                _type: 'reference',
                _ref: body.toBin,
            },
            transferredItems,
            notes: body.notes || '',
        };

        const result = await writeClient.create(transfer);

        await logSanityInteraction(
            'create',
            `Created transfer: ${transferNumber}`,
            'InternalTransfer',
            result._id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to create transfer:', error);
        return NextResponse.json({ error: 'Failed to create transfer' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updateData } = body;

        let transferredItems: TransferredItem[] | undefined;
        if (updateData.items) {
            transferredItems = updateData.items.map((item: any) => ({
                _type: 'TransferredItem',
                _key: item._key,
                stockItem: {
                    _type: 'reference',
                    _ref: item.stockItem._id,
                },
                transferredQuantity: item.transferredQuantity,
            }));
            delete updateData.items;
        }

        const patch = writeClient.patch(_id).set({
            ...updateData,
            ...(transferredItems && { transferredItems }),
            fromBin: {
                _type: 'reference',
                _ref: updateData.fromBin,
            },
            toBin: {
                _type: 'reference',
                _ref: updateData.toBin,
            },
        });

        const result = await patch.commit();

        await logSanityInteraction(
            'update',
            `Updated transfer: ${updateData.transferNumber || _id}`,
            'InternalTransfer',
            _id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to update transfer:', error);
        return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Transfer ID is required' }, { status: 400 });
        }

        await writeClient.delete(id);

        await logSanityInteraction(
            'delete',
            `Deleted transfer: ${id}`,
            'InternalTransfer',
            id,
            'system',
            true
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete transfer:', error);
        return NextResponse.json({ error: 'Failed to delete transfer' }, { status: 500 });
    }
}