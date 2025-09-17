import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { DispatchedItem } from '@/lib/sanityTypes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const getNextDispatchNumber = async (): Promise<string> => {
    try {
        const query = groq`*[_type == "DispatchLog"] | order(dispatchNumber desc)[0].dispatchNumber`;
        const lastDispatchNumber = await client.fetch(query);

        if (!lastDispatchNumber) {
            return 'DISP-00001';
        }

        const match = lastDispatchNumber.match(/DISP-(\d+)/);
        if (!match) {
            return 'DISP-00001';
        }

        const lastNumber = parseInt(match[1], 10);
        const nextNumber = lastNumber + 1;
        return `DISP-${String(nextNumber).padStart(5, '0')}`;
    } catch (error) {
        console.error('Error generating dispatch number:', error);
        return `DISP-${Date.now().toString().slice(-5)}`;
    }
};

export async function GET() {
    try {
        // In your API route, update the query to use coalesce for null safety:
        const query = groq`*[_type == "DispatchLog"] | order(dispatchDate desc) {
    _id,
    dispatchNumber,
    dispatchDate,
    status,
    notes,
    "sourceBin": coalesce(sourceBin->{
        _id,
        name,
        "site": site->{_id, name}
    }, null),
    "destinationSite": coalesce(destinationSite->{_id, name}, null),
    "items": coalesce(dispatchedItems[]{
        _key,
        dispatchedQuantity,
        totalCost,
        "stockItem": stockItem->{
            _id,
            name,
            sku,
            unitOfMeasure,
            currentStock
        }
    }, [])
}`;
        const dispatches = await client.fetch(query);
        return NextResponse.json(dispatches);
    } catch (error) {
        console.error('Failed to fetch dispatches:', error);
        return NextResponse.json({ error: 'Failed to fetch dispatches' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { _id, ...createData } = body;

        const newDoc = {
            ...createData,
            _type: 'DispatchLog',
            dispatchNumber: await getNextDispatchNumber(),
            _id: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const result = await writeClient.create(newDoc);

        await logSanityInteraction(
            'create',
            `Created new dispatch: ${newDoc.dispatchNumber}`,
            'DispatchLog',
            result._id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to create dispatch:', error);
        return NextResponse.json({ error: 'Failed to create dispatch' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updateData } = body;

        let dispatchedItems: DispatchedItem[] | undefined;
        if (updateData.items) {
            dispatchedItems = updateData.items.map((item: any) => ({
                _type: 'DispatchedItem',
                _key: item._key,
                stockItem: {
                    _type: 'reference',
                    _ref: item.stockItem._id,
                },
                dispatchedQuantity: item.dispatchedQuantity,
                totalCost: item.totalCost || 0,
            }));
            delete updateData.items;
        }

        const patch = writeClient.patch(_id).set({
            ...updateData,
            ...(dispatchedItems && { dispatchedItems }),
            sourceBin: {
                _type: 'reference',
                _ref: updateData.sourceBin,
            },
            destinationSite: {
                _type: 'reference',
                _ref: updateData.destinationSite,
            },
        });

        const result = await patch.commit();

        await logSanityInteraction(
            'update',
            `Updated dispatch: ${updateData.dispatchNumber || _id}`,
            'DispatchLog',
            _id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to update dispatch:', error);
        return NextResponse.json({ error: 'Failed to update dispatch' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Dispatch ID is required' }, { status: 400 });
        }

        await writeClient.delete(id);

        await logSanityInteraction(
            'delete',
            `Deleted dispatch: ${id}`,
            'DispatchLog',
            id,
            'system',
            true
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete dispatch:', error);
        return NextResponse.json({ error: 'Failed to delete dispatch' }, { status: 500 });
    }
}