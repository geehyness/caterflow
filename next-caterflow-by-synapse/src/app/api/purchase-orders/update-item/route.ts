// /api/purchase-orders/update-item/route.ts (UPDATED)
import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function POST(request: Request) {
    try {
        const { poId, itemKey, newPrice, newQuantity } = await request.json();

        if (!poId || !itemKey) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get the current PO to calculate new total
        const currentPO = await writeClient.getDocument(poId);
        if (!currentPO) {
            return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
        }

        const transaction = writeClient.transaction();

        // Update price if provided
        if (newPrice !== undefined && newPrice !== null) {
            transaction.patch(poId, (patch) =>
                patch.set({
                    [`orderedItems[_key=="${itemKey}"].unitPrice`]: newPrice,
                    [`orderedItems[_key=="${itemKey}"].priceManuallyUpdated`]: true,
                })
            );

            // Update stock item price if needed
            const item = currentPO.orderedItems?.find((i: any) => i._key === itemKey);
            if (item?.stockItem?._ref) {
                transaction.patch(item.stockItem._ref, (patch) =>
                    patch.set({ unitPrice: newPrice })
                );
            }
        }

        // Update quantity if provided
        if (newQuantity !== undefined && newQuantity !== null) {
            transaction.patch(poId, (patch) =>
                patch.set({
                    [`orderedItems[_key=="${itemKey}"].orderedQuantity`]: newQuantity,
                })
            );
        }

        await transaction.commit();

        // Return the complete updated PO for optimistic updates
        const updatedPO = await writeClient.getDocument(poId);

        return NextResponse.json({
            success: true,
            updatedPO,
            updatedFields: {
                ...(newPrice !== undefined && { price: newPrice }),
                ...(newQuantity !== undefined && { quantity: newQuantity })
            }
        });

    } catch (error: any) {
        console.error('Failed to update item:', error);
        return NextResponse.json(
            { error: 'Failed to update item', details: error.message },
            { status: 500 }
        );
    }
}