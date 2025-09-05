import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';

export async function POST(request: Request) {
    try {
        const { poId, itemKey, newPrice, newQuantity } = await request.json();

        if (!poId || !itemKey) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // First, get the stock item reference from the purchase order
        const poQuery = `*[_type == "PurchaseOrder" && _id == $poId][0] {
            orderedItems[_key == $itemKey][0] {
                "stockItemId": stockItem._ref
            }
        }`;

        const poData = await writeClient.fetch(poQuery, { poId, itemKey });
        const stockItemId = poData?.orderedItems?.stockItemId;

        if (!stockItemId) {
            return NextResponse.json({ error: 'Stock item not found' }, { status: 404 });
        }

        // Create a transaction with all the patches
        const transaction = writeClient.transaction();

        // If a new price is provided, update both PO and stock item
        if (newPrice !== undefined && newPrice !== null) {
            // Update price in purchase order
            transaction.patch(poId, (patch) =>
                patch.set({
                    [`orderedItems[_key=="${itemKey}"].unitPrice`]: newPrice,
                    [`orderedItems[_key=="${itemKey}"].priceManuallyUpdated`]: true,
                })
            );

            // Update price in stock item
            transaction.patch(stockItemId, (patch) =>
                patch.set({
                    unitPrice: newPrice,
                })
            );
        }

        // If a new quantity is provided, update only the PO
        if (newQuantity !== undefined && newQuantity !== null) {
            transaction.patch(poId, (patch) =>
                patch.set({
                    [`orderedItems[_key=="${itemKey}"].orderedQuantity`]: newQuantity,
                })
            );
        }

        // Execute the transaction
        await transaction.commit();

        return NextResponse.json({ success: true, message: 'Item updated successfully' });
    } catch (error) {
        console.error('Failed to update item:', error);
        return NextResponse.json(
            { error: 'Failed to update item' },
            { status: 500 }
        );
    }
}