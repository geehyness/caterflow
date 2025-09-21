// src/app/api/operations/transfers/[id]/complete/route.ts
import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logSanityInteraction } from '@/lib/sanityLogger';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Transfer ID required' }, { status: 400 });

        // optional attachment id in body
        let payload: any = {};
        try {
            payload = await request.json();
        } catch (e) {
            payload = {};
        }
        const { attachmentId } = payload;

        // Fetch the transfer with resolved refs
        const transferQ = groq`*[_type == "InternalTransfer" && _id == $id][0]{
            _id, transferNumber, status,
            "fromBin": fromBin->{_id, name},
            "toBin": toBin->{_id, name},
            transferredItems[] { _key, transferredQuantity, "stockItem": stockItem->_id }
        }`;

        const transfer = await client.fetch(transferQ, { id });

        if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
        if (transfer.status !== 'approved') {
            return NextResponse.json({ error: 'Transfer must be approved before processing' }, { status: 400 });
        }

        const tx = writeClient.transaction();

        // Verify availability first (non-transactional read)
        for (const item of transfer.transferredItems || []) {
            const stockId = item.stockItem;
            const qty = item.transferredQuantity;
            const fromBinId = transfer.fromBin._id;

            const fromCount = await client.fetch(
                groq`*[_type == "BinCount" && bin._ref == $bin && stockItem._ref == $stock][0]{_id, quantity}`,
                { bin: fromBinId, stock: stockId }
            );

            const available = (fromCount?.quantity || 0);
            if (available < qty) {
                return NextResponse.json({
                    error: `Insufficient stock in source bin (${transfer.fromBin.name}) for item ${stockId}. Available ${available}, requested ${qty}`
                }, { status: 400 });
            }
        }

        // Now build transaction: for each item createIfNotExists bincounts and patch.inc
        for (const item of transfer.transferredItems || []) {
            const stockId = item.stockItem;
            const qty = item.transferredQuantity;
            const fromBinId = transfer.fromBin._id;
            const toBinId = transfer.toBin._id;

            const fromBinCountId = `binCount-${fromBinId}-${stockId}`;
            const toBinCountId = `binCount-${toBinId}-${stockId}`;

            // createIfNotExists and patch inc for from
            tx.createIfNotExists({
                _id: fromBinCountId,
                _type: 'BinCount',
                bin: { _type: 'reference', _ref: fromBinId },
                stockItem: { _type: 'reference', _ref: stockId },
                quantity: 0,
            });
            (tx.patch(toBinCountId) as any).inc({ quantity: qty });

            // createIfNotExists and patch inc for to
            tx.createIfNotExists({
                _id: toBinCountId,
                _type: 'BinCount',
                bin: { _type: 'reference', _ref: toBinId },
                stockItem: { _type: 'reference', _ref: stockId },
                quantity: 0,
            });
            (tx.patch(toBinCountId) as any).inc({ quantity: qty });

            // Create movement log for each item
            const movementId = `stockmove-${id}-${item._key}`;
            tx.create({
                _id: movementId,
                _type: 'StockMovement',
                transferRef: { _type: 'reference', _ref: id },
                stockItem: { _type: 'reference', _ref: stockId },
                fromBin: { _type: 'reference', _ref: fromBinId },
                toBin: { _type: 'reference', _ref: toBinId },
                quantity: qty,
                movedBy: { _type: 'reference', _ref: session.user.id },
                movedAt: new Date().toISOString(),
            });
        }

        // Add optional attachment to attachments array and mark completed
        const setObj: any = {
            status: 'completed',
            processedBy: { _type: 'reference', _ref: session.user.id },
            processedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (attachmentId) {
            // Append to attachments array
            // If attachments doesn't exist yet this set will create it
            (tx.patch(id) as any).set(setObj).append('attachments', [{
                _type: 'reference',
                _ref: attachmentId,
            }]);
        } else {
            (tx.patch(id) as any).set(setObj);
        }

        const result = await tx.commit();

        await logSanityInteraction(
            'complete',
            `Processed transfer ${transfer.transferNumber}`,
            'InternalTransfer',
            id,
            session.user.id,
            true
        );

        return NextResponse.json({ success: true, result });
    } catch (err: any) {
        console.error('Failed to process transfer:', err);
        return NextResponse.json({ error: 'Failed to process transfer', details: err.message }, { status: 500 });
    }
}
