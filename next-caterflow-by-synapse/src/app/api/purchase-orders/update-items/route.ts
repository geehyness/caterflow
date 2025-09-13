// /api/purchase-orders/update-items/route.ts - FIXED FOR NESTED OBJECTS
import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';

export async function POST(request: Request) {
    try {
        const { poId, updates } = await request.json();

        console.log('API received update request:', { poId, updates });

        if (!poId || !updates || !Array.isArray(updates)) {
            console.error('Missing required fields');
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // First, fetch the current PO to validate structure
        const currentPO = await writeClient.fetch(`*[_id == $poId][0]`, { poId });
        if (!currentPO) {
            return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
        }

        const transaction = writeClient.transaction();

        for (const update of updates) {
            console.log('Processing update:', update);

            // For nested objects, we need to replace the entire array item
            const currentItem = currentPO.orderedItems.find((item: any) => item._key === update.itemKey);

            if (!currentItem) {
                console.error(`Item with key ${update.itemKey} not found`);
                continue;
            }

            // Create updated item with all required fields
            const updatedItem = {
                ...currentItem,
                unitPrice: update.newPrice !== undefined ? update.newPrice : currentItem.unitPrice,
                orderedQuantity: update.newQuantity !== undefined ? update.newQuantity : currentItem.orderedQuantity,
                priceManuallyUpdated: update.newPrice !== undefined ? true : currentItem.priceManuallyUpdated
            };

            // Remove the old item and add the updated one
            transaction.patch(poId, (patch) =>
                patch
                    .unset([`orderedItems[_key=="${update.itemKey}"]`])
                    .insert('after', 'orderedItems[-1]', [updatedItem])
            );
        }

        console.log('Committing transaction...');
        const result = await transaction.commit();
        console.log('Transaction committed successfully:', result);

        // Fetch the updated PO with proper structure
        const query = `*[_id == $poId][0]{
            _id,
            _type,
            poNumber,
            orderDate,
            status,
            totalAmount,
            "site": site->{_id, name},
            "orderedBy": orderedBy->{name},
            orderedItems[]{
                _key,
                orderedQuantity,
                unitPrice,
                "stockItem": stockItem->{_id, name},
                "supplier": supplier->{_id, name}
            },
            "supplierNames": coalesce(orderedItems[].supplier->name, []) |> unique() |> join(", ")
        }`;

        console.log('Fetching updated PO...');
        const updatedPO = await writeClient.fetch(query, { poId });

        if (!updatedPO) {
            throw new Error('Failed to fetch updated purchase order');
        }

        console.log('Updated PO fetched successfully');

        // Transform to match frontend structure
        const transformedPO = {
            ...updatedPO,
            siteName: updatedPO.site?.name || '',
            actionType: 'PurchaseOrder',
            title: `Purchase Order ${updatedPO.poNumber}`,
            description: `Order from ${updatedPO.supplierNames || 'suppliers'}`,
            priority: 'medium',
            createdAt: updatedPO.orderDate,
        };

        return NextResponse.json({
            success: true,
            updatedPO: transformedPO
        });

    } catch (error: any) {
        console.error('Failed to update items:', error);

        return NextResponse.json(
            {
                error: 'Failed to update items',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}