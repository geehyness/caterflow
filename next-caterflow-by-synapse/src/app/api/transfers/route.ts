import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';

// Helper function to generate the next unique transfer number
const getNextTransferNumber = async (): Promise<string> => {
    try {
        const query = groq`*[_type == "InternalTransfer"] | order(transferNumber desc)[0].transferNumber`;
        const lastTransferNumber = await client.fetch(query);

        if (!lastTransferNumber) {
            return 'TRF-00001'; // First transfer
        }

        // Extract the numeric part from the transfer number (e.g., "TRF-00023" -> 23)
        const match = lastTransferNumber.match(/TRF-(\d+)/);
        if (!match) {
            return 'TRF-00001'; // Fallback if format is unexpected
        }

        const lastNumber = parseInt(match[1], 10);
        const nextNumber = lastNumber + 1;
        return `TRF-${String(nextNumber).padStart(5, '0')}`;
    } catch (error) {
        console.error('Error generating transfer number:', error);
        // Fallback: generate a timestamp-based ID
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
                "site": site->{name}
            },
            "toBin": toBin->{
                _id,
                name,
                "site": site->{name}
            },
            "totalItems": count(transferredItems),
            "items": transferredItems[]{
                "stockItem": stockItem->{
                    _id,
                    name,
                    sku
                },
                transferredQuantity
            }
        }`;

        const transfers = await client.fetch(query);
        return NextResponse.json(transfers);
    } catch (error) {
        console.error('Failed to fetch transfers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transfers' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Generate a unique transfer number using the new function
        const transferNumber = await getNextTransferNumber();

        // Create the transferred items array
        const transferredItems = (body.items || []).map((item: any) => ({
            _type: 'TransferredItem',
            stockItem: {
                _type: 'reference',
                _ref: item.stockItem,
            },
            transferredQuantity: item.transferredQuantity,
        }));

        const transfer = {
            _type: 'InternalTransfer',
            transferNumber,
            transferDate: body.transferDate || new Date().toISOString().split('T')[0],
            status: body.status || 'pending',
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
        return NextResponse.json(
            { error: 'Failed to create transfer' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updateData } = body;

        // Create the transferred items array if provided
        let transferredItems;
        if (updateData.items) {
            transferredItems = updateData.items.map((item: any) => ({
                _type: 'TransferredItem',
                stockItem: {
                    _type: 'reference',
                    _ref: item.stockItem,
                },
                transferredQuantity: item.transferredQuantity,
            }));
            delete updateData.items;
        }

        // Start the patch operation
        let patch = writeClient.patch(_id).set({
            ...updateData,
            ...(transferredItems && { transferredItems }),
        });

        // If fromBin is being updated, convert to reference
        if (updateData.fromBin) {
            patch = patch.set({
                fromBin: {
                    _type: 'reference',
                    _ref: updateData.fromBin,
                },
            });
        }

        // If toBin is being updated, convert to reference
        if (updateData.toBin) {
            patch = patch.set({
                toBin: {
                    _type: 'reference',
                    _ref: updateData.toBin,
                },
            });
        }

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
        return NextResponse.json(
            { error: 'Failed to update transfer' },
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
                { error: 'Transfer ID is required' },
                { status: 400 }
            );
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
        return NextResponse.json(
            { error: 'Failed to delete transfer' },
            { status: 500 }
        );
    }
}