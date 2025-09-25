// app/api/complete-goods-receipt/route.ts
import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function POST(request: Request) {
    try {
        const { receiptId, poId, attachmentIds } = await request.json();

        if (!receiptId || !poId) {
            return NextResponse.json(
                { error: 'Receipt ID and PO ID are required' },
                { status: 400 }
            );
        }

        // Start a transaction
        const transaction = writeClient.transaction();

        // 1. Update the goods receipt status to 'completed'
        transaction.patch(receiptId, (patch) =>
            patch.set({
                status: 'completed',
                completedAt: new Date().toISOString(),
            })
        );

        // 2. Update the purchase order status to 'complete'
        transaction.patch(poId, (patch) =>
            patch.set({
                status: 'complete',
                evidenceStatus: 'complete',
            })
        );

        // 3. Add attachments to receipt if provided
        if (attachmentIds && attachmentIds.length > 0) {
            // First check if the attachments already exist in the receipt
            const currentReceipt = await writeClient.fetch(
                groq`*[_type == "GoodsReceipt" && _id == $receiptId][0] {
                    attachments[]
                }`,
                { receiptId }
            );

            const existingAttachmentRefs = currentReceipt.attachments?.map((att: any) => att._ref) || [];

            // Add only new attachments that don't already exist
            const newAttachments = attachmentIds
                .filter((attachmentId: string) => !existingAttachmentRefs.includes(attachmentId))
                .map((attachmentId: string) => ({
                    _type: 'reference',
                    _ref: attachmentId,
                    _key: Math.random().toString(36).substr(2, 9)
                }));

            if (newAttachments.length > 0) {
                transaction.patch(receiptId, (patch) =>
                    patch.append('attachments', newAttachments)
                );
            }
        }

        // 4. Update stock levels for all received items
        const receiptQuery = groq`
            *[_type == "GoodsReceipt" && _id == $receiptId][0] {
                receivedItems[] {
                    stockItem->{_id},
                    receivedQuantity,
                    receivingBin->{_id}
                }
            }
        `;

        const receipt = await writeClient.fetch(receiptQuery, { receiptId });

        if (receipt?.receivedItems) {
            for (const item of receipt.receivedItems) {
                // Ensure stockItem, receivedQuantity, and receivingBin exist before proceeding
                if (item.stockItem?._id && item.receivedQuantity && item.receivingBin?._id) {
                    // Update stock level in the bin
                    const binStockQuery = groq`
                        *[_type == "BinStock" && 
                         bin._ref == $binId && 
                         stockItem._ref == $stockItemId][0] {
                            _id,
                            quantity
                        }
                    `;

                    const binStock = await writeClient.fetch(binStockQuery, {
                        binId: item.receivingBin?._id,
                        stockItemId: item.stockItem._id,
                    });

                    if (binStock) {
                        // Update existing bin stock
                        transaction.patch(binStock._id, (patch) =>
                            patch.inc({ quantity: item.receivedQuantity })
                        );
                    } else {
                        // Create new bin stock entry
                        transaction.create({
                            _type: 'BinStock',
                            bin: {
                                _type: 'reference',
                                _ref: item.receivingBin?._id,
                            },
                            stockItem: {
                                _type: 'reference',
                                _ref: item.stockItem._id,
                            },
                            quantity: item.receivedQuantity,
                            _id: undefined, // Let Sanity generate the ID
                        });
                    }
                }
            }
        }

        // Execute the transaction
        const result = await transaction.commit();

        // Update evidence status after transaction
        await updateEvidenceStatus(receiptId, attachmentIds);

        return NextResponse.json({
            success: true,
            message: `Goods receipt completed successfully with ${attachmentIds?.length || 0} attachment(s)`,
            result,
            attachmentCount: attachmentIds?.length || 0
        });
    } catch (error: any) {
        console.error('Failed to complete goods receipt:', error);
        return NextResponse.json(
            {
                error: 'Failed to complete goods receipt',
                details: error.message,
            },
            { status: 500 }
        );
    }
}

// Updated helper function to handle multiple attachments
async function updateEvidenceStatus(receiptId: string, attachmentIds: string[] = []) {
    try {
        const receipt = await writeClient.fetch(
            groq`*[_type == "GoodsReceipt" && _id == $receiptId][0] {
                attachments[]->{_id},
                notes
            }`,
            { receiptId }
        );

        let evidenceStatus = 'pending';

        // Check if we have attachments (either from the receipt or newly provided ones)
        const hasAttachments = (receipt.attachments?.length > 0) || (attachmentIds.length > 0);
        const hasNotes = receipt.notes;

        if (hasAttachments && hasNotes) {
            evidenceStatus = 'complete';
        } else if (hasAttachments) {
            evidenceStatus = 'partial';
        }

        await writeClient
            .patch(receiptId)
            .set({ evidenceStatus })
            .commit();
    } catch (error) {
        console.error('Error updating evidence status:', error);
    }
}