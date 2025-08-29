import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';

export async function GET() {
    try {
        const query = groq`*[_type == "PurchaseOrder"] | order(orderDate desc) {
      _id, poNumber, orderDate, status,
      "supplier": supplier->{name},
      "orderedBy": orderedBy->{name},
      totalAmount,
      "items": poItems[]{
        "stockItem": stockItem->{name, sku},
        orderedQuantity,
        unitPrice
      }
    }`;

        const purchaseOrders = await client.fetch(query);
        return NextResponse.json(purchaseOrders);
    } catch (error) {
        console.error('Failed to fetch purchase orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch purchase orders' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Generate a unique PO number if not provided
        if (!body.poNumber) {
            const count = await client.fetch(groq`count(*[_type == "PurchaseOrder"])`);
            body.poNumber = `PO-${(count + 1).toString().padStart(4, '0')}`;
        }

        const purchaseOrder = await writeClient.create({
            _type: 'PurchaseOrder',
            ...body,
            status: body.status || 'draft',
            orderDate: body.orderDate || new Date().toISOString().split('T')[0],
        });

        await logSanityInteraction(
            'create',
            `Created purchase order: ${body.poNumber}`,
            'PurchaseOrder',
            purchaseOrder._id,
            'system',
            true
        );

        return NextResponse.json(purchaseOrder);
    } catch (error) {
        console.error('Failed to create purchase order:', error);
        return NextResponse.json(
            { error: 'Failed to create purchase order' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updateData } = body;

        const purchaseOrder = await writeClient
            .patch(_id)
            .set(updateData)
            .commit();

        await logSanityInteraction(
            'update',
            `Updated purchase order: ${updateData.poNumber || _id}`,
            'PurchaseOrder',
            _id,
            'system',
            true
        );

        return NextResponse.json(purchaseOrder);
    } catch (error) {
        console.error('Failed to update purchase order:', error);
        return NextResponse.json(
            { error: 'Failed to update purchase order' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Purchase order ID is required' },
                { status: 400 }
            );
        }

        await writeClient.delete(id);

        await logSanityInteraction(
            'delete',
            `Deleted purchase order: ${id}`,
            'PurchaseOrder',
            id,
            'system',
            true
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete purchase order:', error);
        return NextResponse.json(
            { error: 'Failed to delete purchase order' },
            { status: 500 }
        );
    }
}