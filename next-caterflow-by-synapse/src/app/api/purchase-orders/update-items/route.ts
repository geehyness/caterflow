// /api/purchase-orders/update-items/route.ts - FIXED FOR NESTED OBJECTS
import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';

// Alternative: Update the entire array
export async function POST(request: Request) {
    try {
        const { poId, updates } = await request.json();

        console.log('API received update request:', { poId, updates });

        if (!poId || !updates || !Array.isArray(updates)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch the current PO
        const currentPO = await writeClient.fetch(`*[_id == $poId][0]`, { poId });
        if (!currentPO) {
            return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
        }

        // Create updated orderedItems array
        const updatedOrderedItems = currentPO.orderedItems.map((item: any) => {
            const update = updates.find(u => u.itemKey === item._key);
            if (update) {
                return {
                    ...item,
                    unitPrice: update.newPrice !== undefined ? update.newPrice : item.unitPrice,
                    orderedQuantity: update.newQuantity !== undefined ? update.newQuantity : item.orderedQuantity,
                    priceManuallyUpdated: update.newPrice !== undefined ? true : item.priceManuallyUpdated
                };
            }
            return item;
        });

        // Update the entire orderedItems array
        const result = await writeClient
            .patch(poId)
            .set({ orderedItems: updatedOrderedItems })
            .commit();

        console.log('Update successful:', result);

        // Fetch the updated PO
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

        const updatedPO = await writeClient.fetch(query, { poId });

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
            { error: 'Failed to update items', details: error.message },
            { status: 500 }
        );
    }
}