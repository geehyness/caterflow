// src/app/api/dispatches/[dispatchId]/route.ts
import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// Helper to normalize incoming reference values to a plain string id
const resolveRef = (val: any): string | null => {
    if (!val && val !== 0) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        if (typeof val._ref === 'string') return val._ref;
        if (typeof val._id === 'string') return val._id;
    }
    return null;
};

// --- GET single dispatch ---
export async function GET(request: Request, { params }: { params: Promise<{ dispatchId: string }> }) {
    try {
        const { dispatchId } = await params;

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
            status,
            "dispatchType": dispatchType->{
                _id,
                name,
                description,
                defaultTime
            },
            "sourceBin": sourceBin->{
                _id,
                name,
                "site": site->{
                    _id,
                    name,
                    location,
                    code
                }
            },
            "dispatchedBy": dispatchedBy->{
                _id,
                name,
                email,
                role,
                "assignedSite": associatedSite->{
                    _id,
                    name
                }
            },
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
                    currentStock,
                    unitPrice,
                    category->{
                        _id,
                        title
                    }
                }
            }, []),
            "attachments": coalesce(attachments[]->{
                _id,
                name,
                url,
                description,
                uploadDate
            }, [])
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

// --- PATCH single dispatch ---
export async function PATCH(request: Request, { params }: { params: Promise<{ dispatchId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        const { dispatchId } = await params;
        const updateData = await request.json();

        if (!dispatchId) {
            return NextResponse.json({ error: 'Dispatch ID is required' }, { status: 400 });
        }

        // fetch existing dispatch to enforce immutability after evidence complete
        const existing = await client.fetch(`*[_type=="DispatchLog" && _id == $id][0]{ evidenceStatus }`, { id: dispatchId });
        if (existing?.evidenceStatus === 'complete') {
            return NextResponse.json({ error: 'Dispatch is completed and cannot be edited' }, { status: 400 });
        }

        let patch = writeClient.patch(dispatchId).set({ updatedAt: new Date().toISOString() });

        // simple fields
        if (updateData.dispatchDate) patch = patch.set({ dispatchDate: updateData.dispatchDate });
        if (updateData.evidenceStatus) patch = patch.set({ evidenceStatus: updateData.evidenceStatus });
        if (updateData.hasOwnProperty('peopleFed')) patch = patch.set({ peopleFed: updateData.peopleFed });
        if (updateData.notes) patch = patch.set({ notes: updateData.notes });

        // references - robustly resolve to string ids
        if (updateData.dispatchType) {
            const ref = resolveRef(updateData.dispatchType);
            if (ref) {
                patch = patch.set({ dispatchType: { _type: 'reference', _ref: ref } });
            }
        }

        if (updateData.sourceBin) {
            const ref = resolveRef(updateData.sourceBin);
            if (ref) {
                patch = patch.set({ sourceBin: { _type: 'reference', _ref: ref } });
            }
        }

        if (updateData.dispatchedBy) {
            const ref = resolveRef(updateData.dispatchedBy);
            if (ref) {
                patch = patch.set({ dispatchedBy: { _type: 'reference', _ref: ref } });
            }
        } else if (session?.user?.id) {
            patch = patch.set({ dispatchedBy: { _type: 'reference', _ref: session.user.id } });
        }

        // dispatchedItems - ensure _ref is a string
        if (updateData.dispatchedItems) {
            const normalizedItems = (updateData.dispatchedItems || []).map((item: any) => {
                const stockRef = resolveRef(item.stockItem) || resolveRef(item.stockItem?._ref) || resolveRef(item.stockItem?._id);
                return {
                    _type: 'DispatchedItem',
                    _key: item._key || uuidv4(),
                    stockItem: {
                        _type: 'reference',
                        _ref: stockRef,
                    },
                    dispatchedQuantity: item.dispatchedQuantity,
                    totalCost: item.totalCost || 0,
                    notes: item.notes || '',
                };
            });
            patch = patch.set({ dispatchedItems: normalizedItems });
        }

        if (updateData.attachments) {
            // If caller wants append rather than replace, consider using .append() with transaction.
            patch = patch.set({ attachments: updateData.attachments });
        }

        if (updateData.status) {
            patch = patch.set({ status: updateData.status });
        }
        if (updateData.completedAt) {
            patch = patch.set({ completedAt: updateData.completedAt });
        }
        if (updateData.completedBy) {
            const cbRef = resolveRef(updateData.completedBy) || updateData.completedBy;
            if (cbRef) patch = patch.set({ completedBy: { _type: 'reference', _ref: cbRef } });
        }

        const result = await patch.commit();

        await logSanityInteraction(
            'update',
            `Updated dispatch: ${updateData.dispatchNumber || dispatchId}`,
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

// --- DELETE single dispatch ---
export async function DELETE(request: Request, { params }: { params: Promise<{ dispatchId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        const { dispatchId } = await params;

        if (!dispatchId) {
            return NextResponse.json({ error: 'Dispatch ID is required' }, { status: 400 });
        }

        // prevent deletion if already completed
        const existing = await client.fetch(`*[_type=="DispatchLog" && _id == $id][0]{ evidenceStatus }`, { id: dispatchId });
        if (existing?.evidenceStatus === 'complete') {
            return NextResponse.json({ error: 'Completed dispatch cannot be deleted' }, { status: 400 });
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
