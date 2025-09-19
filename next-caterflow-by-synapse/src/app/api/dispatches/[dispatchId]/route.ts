// /api/dispatches/[dispatchId]/route.ts

import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DispatchedItem as SanityDispatchedItem } from '@/lib/sanityTypes';
import type { Reference } from 'sanity';

// Define a new type that reflects the data shape returned by the GET request
interface DispatchedItemFromApi {
    _key: string;
    stockItem: {
        _id: string;
        name: string;
        sku: string;
        unitOfMeasure: string;
        currentStock: number;
    };
    dispatchedQuantity: number;
    totalCost?: number;
    notes?: string;
}

// Helper function to transform items to Sanity reference format
interface TransformedDispatchedItem {
    _key: string;
    stockItem: {
        _ref: string;
        _type: 'reference';
    };
    dispatchedQuantity: number;
    totalCost?: number;
    notes?: string;
}

const transformDispatchedItems = (items: DispatchedItemFromApi[]): TransformedDispatchedItem[] => {
    return items.map(item => ({
        _key: item._key,
        stockItem: {
            _ref: item.stockItem._id,
            _type: 'reference',
        },
        dispatchedQuantity: item.dispatchedQuantity,
        totalCost: item.totalCost,
        notes: item.notes,
    }));
};

export async function GET(request: Request, { params }: { params: { dispatchId: string } }) {
    try {
        const { dispatchId } = params;

        if (!dispatchId) {
            return NextResponse.json({ error: 'Dispatch ID is required' }, { status: 400 });
        }

        const query = groq`*[_type == "DispatchLog" && _id == $dispatchId][0] {
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

        const dispatch = await client.fetch(query, { dispatchId });

        if (!dispatch) {
            return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
        }

        return NextResponse.json(dispatch);
    } catch (error) {
        console.error('Failed to fetch dispatch:', error);
        return NextResponse.json({ error: 'Failed to fetch dispatch' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { dispatchId: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        const { dispatchId } = params;
        const updateData = await request.json();

        if (!dispatchId) {
            return NextResponse.json({ error: 'Dispatch ID is required' }, { status: 400 });
        }

        const { dispatchedItems, ...patchData } = updateData;

        const newPatchData: any = { ...patchData };

        if (dispatchedItems) {
            newPatchData.dispatchedItems = transformDispatchedItems(dispatchedItems);
        }
        if (newPatchData.sourceBin) {
            newPatchData.sourceBin = { _type: 'reference', _ref: newPatchData.sourceBin._id };
        }
        if (newPatchData.dispatchType) {
            newPatchData.dispatchType = { _type: 'reference', _ref: newPatchData.dispatchType._id };
        }
        if (newPatchData.dispatchedBy) {
            newPatchData.dispatchedBy = { _type: 'reference', _ref: newPatchData.dispatchedBy._id };
        } else if (session?.user?.id) {
            newPatchData.dispatchedBy = { _type: 'reference', _ref: session.user.id };
        }

        const patch = writeClient.patch(dispatchId).set(newPatchData);
        const result = await patch.commit();

        await logSanityInteraction(
            'update',
            `Updated dispatch: ${newPatchData.dispatchNumber || dispatchId}`,
            'DispatchLog',
            dispatchId,
            session.user.id,
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to update dispatch:', error);
        return NextResponse.json({ error: 'Failed to update dispatch' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        const dispatchData = await request.json();

        // Standardize data for Sanity
        const doc: any = {
            ...dispatchData,
            _type: 'DispatchLog',
            dispatchBy: {
                _type: 'reference',
                _ref: session.user.id
            },
            dispatchedItems: transformDispatchedItems(dispatchData.dispatchedItems),
            sourceBin: {
                _type: 'reference',
                _ref: dispatchData.sourceBin._ref
            },
            dispatchType: {
                _type: 'reference',
                _ref: dispatchData.dispatchType._ref
            }
        };

        const result = await writeClient.create(doc);

        await logSanityInteraction(
            'create',
            `Created new dispatch: ${result.dispatchNumber || result._id}`,
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

export async function DELETE(request: Request, { params }: { params: { dispatchId: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        const { dispatchId } = params;

        if (!dispatchId) {
            return NextResponse.json({ error: 'Dispatch ID is required' }, { status: 400 });
        }

        await writeClient.delete(dispatchId);

        await logSanityInteraction(
            'delete',
            `Deleted dispatch: ${dispatchId}`,
            'DispatchLog',
            dispatchId,
            session.user.id,
            true
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete dispatch:', error);
        return NextResponse.json({ error: 'Failed to delete dispatch' }, { status: 500 });
    }
}