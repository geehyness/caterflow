// /api/dispatches/route.ts

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
        const today = new Date().toISOString().slice(0, 10);
        const query = groq`*[_type == "DispatchLog" && _createdAt >= "${today}T00:00:00Z" && _createdAt < "${today}T23:59:59Z"] | order(_createdAt desc)[0] {
            dispatchNumber
        }`;

        const lastLog = await client.fetch(query);
        let nextNumber = 1;

        if (lastLog && lastLog.dispatchNumber) {
            const lastNumber = parseInt(lastLog.dispatchNumber.split('-').pop() || '0');
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        const paddedNumber = String(nextNumber).padStart(3, '0');
        return `DL-${today}-${paddedNumber}`;
    } catch (error) {
        console.error('Error generating dispatch number:', error);
        return `DL-${Date.now().toString().slice(-8)}`;
    }
};

export async function GET() {
    try {
        const query = groq`*[_type == "DispatchLog"] | order(dispatchDate desc) {
            _id,
            dispatchNumber,
            dispatchDate,
            evidenceStatus,
            peopleFed,
            notes,
            "dispatchType": coalesce(dispatchType->{_id, name, description}, null),
            "sourceBin": coalesce(sourceBin->{
                _id,
                name,
                "site": site->{_id, name}
            }, null),
            "dispatchedBy": coalesce(dispatchedBy->{_id, name, email}, null),
            "dispatchedItems": coalesce(dispatchedItems[]{
                _key,
                dispatchedQuantity,
                totalCost,
                notes,
                "stockItem": stockItem->{
                    _id,
                    name,
                    sku,
                    unitOfMeasure,
                    currentStock
                }
            }, []),
            "attachments": coalesce(attachments[]->{_id, name, url}, [])
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
            evidenceStatus: 'pending',
        };

        const result = await writeClient.create(newDoc);

        await logSanityInteraction(
            'create',
            `Created new dispatch: ${newDoc.dispatchNumber}`,
            'DispatchLog',
            result._id,
            session.user.id,
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
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { _id, ...updateData } = body;

        let dispatchedItems: DispatchedItem[] | undefined;
        if (updateData.items) {
            dispatchedItems = updateData.items.map((item: any) => ({
                _type: 'DispatchedItem',
                _key: item._key || uuidv4(),
                stockItem: {
                    _type: 'reference',
                    _ref: item.stockItem._id,
                },
                dispatchedQuantity: item.dispatchedQuantity,
                totalCost: item.totalCost || 0,
                notes: item.notes || '',
            }));
            delete updateData.items;
        }

        const patchData: any = {
            ...updateData,
            ...(dispatchedItems && { dispatchedItems }),
            sourceBin: {
                _type: 'reference',
                _ref: updateData.sourceBin,
            },
            dispatchType: {
                _type: 'reference',
                _ref: updateData.dispatchType,
            },
            dispatchedBy: {
                _type: 'reference',
                _ref: updateData.dispatchedBy || session.user.id,
            },
            updatedAt: new Date().toISOString(),
        };

        const patch = writeClient.patch(_id).set(patchData);
        const result = await patch.commit();

        await logSanityInteraction(
            'update',
            `Updated dispatch: ${updateData.dispatchNumber || _id}`,
            'DispatchLog',
            _id,
            session.user.id,
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
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

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
            session.user.id,
            true
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete dispatch:', error);
        return NextResponse.json({ error: 'Failed to delete dispatch' }, { status: 500 });
    }
}