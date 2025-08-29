import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';

export async function GET() {
    try {
        const query = groq`*[_type == "InternalTransfer"] | order(transferDate desc) {
      _id, transferNumber, transferDate, status,
      "fromBin": fromBin->{
        name,
        "site": site->{name}
      },
      "toBin": toBin->{
        name,
        "site": site->{name}
      },
      "totalItems": count(transferredItems)
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

        // Generate a unique transfer number if not provided
        if (!body.transferNumber) {
            const count = await client.fetch(groq`count(*[_type == "InternalTransfer"])`);
            body.transferNumber = `TRF-${(count + 1).toString().padStart(4, '0')}`;
        }

        const transfer = await writeClient.create({
            _type: 'InternalTransfer',
            ...body,
            status: body.status || 'pending',
        });

        await logSanityInteraction(
            'create',
            `Created new transfer: ${transfer.transferNumber}`,
            'InternalTransfer',
            transfer._id,
            'system',
            true
        );

        return NextResponse.json(transfer);
    } catch (error) {
        console.error('Failed to create new transfer:', error);
        return NextResponse.json(
            { error: 'Failed to create new transfer' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updateData } = body;

        const transfer = await writeClient
            .patch(_id)
            .set(updateData)
            .commit();

        await logSanityInteraction(
            'update',
            `Updated transfer: ${updateData.transferNumber || _id}`,
            'InternalTransfer',
            _id,
            'system',
            true
        );

        return NextResponse.json(transfer);
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