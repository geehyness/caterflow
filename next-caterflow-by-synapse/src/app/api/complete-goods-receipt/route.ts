// app/api/complete-goods-receipt/route.ts
import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function POST(request: Request) {
    try {
        const { receiptId, poId, attachmentId } = await request.json();

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

        // 3. Add attachment to receipt if provided
        if (attachmentId) {
            // First check if the attachment already exists in the receipt
            const currentReceipt = await writeClient.fetch(
                groq`*[_type == "GoodsReceipt" && _id == $receiptId][0] {
                    attachments[]
                }`,
                { receiptId }
            );

            const attachmentExists = currentReceipt.attachments?.some(
                (att: any) => att._ref === attachmentId
            );

            if (!attachmentExists) {
                transaction.patch(receiptId, (patch) =>
                    patch.append('attachments', [
                        {
                            _type: 'reference',
                            _ref: attachmentId,
                            _key: Math.random().toString(36).substr(2, 9)
                        }
                    ])
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
                            _id: undefined,
                        });
                    }
                }
            }
        }

        // Execute the transaction
        const result = await transaction.commit();

        // Update evidence status after transaction
        await updateEvidenceStatus(receiptId);

        return NextResponse.json({
            success: true,
            message: 'Goods receipt completed successfully',
            result,
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

// Helper function to update evidence status
async function updateEvidenceStatus(receiptId: string) {
    try {
        const receipt = await writeClient.fetch(
            groq`*[_type == "GoodsReceipt" && _id == $receiptId][0] {
        attachments[]->{_id},
        notes
      }`,
            { receiptId }
        );

        let evidenceStatus = 'pending';

        if (receipt.attachments?.length > 0) {
            evidenceStatus = receipt.notes ? 'complete' : 'partial';
        }

        await writeClient
            .patch(receiptId)
            .set({ evidenceStatus })
            .commit();
    } catch (error) {
        console.error('Error updating evidence status:', error);
    }
}