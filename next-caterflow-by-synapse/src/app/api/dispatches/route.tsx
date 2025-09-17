import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';

// Helper function to generate the next unique dispatch number
const getNextDispatchNumber = async (): Promise<string> => {
    try {
        const query = groq`*[_type == "DispatchLog"] | order(dispatchNumber desc)[0].dispatchNumber`;
        const lastDispatchNumber = await client.fetch(query);

        if (!lastDispatchNumber) {
            return 'DISP-00001'; // First dispatch
        }

        // Extract the numeric part from the dispatch number (e.g., "DISP-00023" -> 23)
        const match = lastDispatchNumber.match(/DISP-(\d+)/);
        if (!match) {
            return 'DISP-00001'; // Fallback if format is unexpected
        }

        const lastNumber = parseInt(match[1], 10);
        const nextNumber = lastNumber + 1;
        return `DISP-${String(nextNumber).padStart(5, '0')}`;
    } catch (error) {
        console.error('Error generating dispatch number:', error);
        // Fallback: generate a timestamp-based ID
        return `DISP-${Date.now().toString().slice(-5)}`;
    }
};

export async function GET() {
    try {
        // Update the GET query to populate stockItem details
        const query = groq`*[_type == "DispatchLog"] | order(dispatchDate desc) {
            _id,
            dispatchNumber,
            dispatchDate,
            status,
            notes,
            "sourceBin": sourceBin->{
                _id,
                name,
                "site": site->{name}
            },
            "destinationSite": destinationSite->{
                _id,
                name
            },
            "totalItems": count(dispatchedItems),
            "items": dispatchedItems[]{
                "stockItem": stockItem->{  // Change this line to populate the stockItem
                    _id,
                    name,
                    sku
                },
                dispatchedQuantity,
                totalCost
            }
        }`;

        const dispatches = await client.fetch(query);
        return NextResponse.json(dispatches);
    } catch (error) {
        console.error('Failed to fetch dispatches:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dispatches' },
            { status: 500 }
        );
    }
}


export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Generate a unique dispatch number using the new function
        const dispatchNumber = await getNextDispatchNumber();

        // Create the dispatched items array
        const dispatchedItems = (body.items || []).map((item: any) => ({
            _type: 'DispatchedItem',
            stockItem: {
                _type: 'reference',
                _ref: item.stockItem,
            },
            dispatchedQuantity: item.dispatchedQuantity,
            totalCost: item.totalCost || 0,
        }));

        const dispatch = {
            _type: 'DispatchLog',
            dispatchNumber,
            dispatchDate: body.dispatchDate || new Date().toISOString().split('T')[0],
            status: body.status || 'pending',
            sourceBin: {
                _type: 'reference',
                _ref: body.sourceBin,
            },
            destinationSite: {
                _type: 'reference',
                _ref: body.destinationSite,
            },
            dispatchedItems,
            notes: body.notes || '',
        };

        const result = await writeClient.create(dispatch);

        await logSanityInteraction(
            'create',
            `Created dispatch: ${dispatchNumber}`,
            'DispatchLog',
            result._id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to create dispatch:', error);
        return NextResponse.json(
            { error: 'Failed to create dispatch' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updateData } = body;

        // Create the dispatched items array if provided
        let dispatchedItems;
        if (updateData.items) {
            dispatchedItems = updateData.items.map((item: any) => ({
                _type: 'DispatchedItem',
                stockItem: {
                    _type: 'reference',
                    _ref: item.stockItem,
                },
                dispatchedQuantity: item.dispatchedQuantity,
                totalCost: item.totalCost || 0,
            }));
            delete updateData.items;
        }

        // Start the patch operation
        let patch = writeClient.patch(_id).set({
            ...updateData,
            ...(dispatchedItems && { dispatchedItems }),
        });

        // If sourceBin is being updated, convert to reference
        if (updateData.sourceBin) {
            patch = patch.set({
                sourceBin: {
                    _type: 'reference',
                    _ref: updateData.sourceBin,
                },
            });
        }

        // If destinationSite is being updated, convert to reference
        if (updateData.destinationSite) {
            patch = patch.set({
                destinationSite: {
                    _type: 'reference',
                    _ref: updateData.destinationSite,
                },
            });
        }

        const result = await patch.commit();

        await logSanityInteraction(
            'update',
            `Updated dispatch: ${updateData.dispatchNumber || _id}`,
            'DispatchLog',
            _id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to update dispatch:', error);
        return NextResponse.json(
            { error: 'Failed to update dispatch' },
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
                { error: 'Dispatch ID is required' },
                { status: 400 }
            );
        }

        await writeClient.delete(id);

        await logSanityInteraction(
            'delete',
            `Deleted dispatch: ${id}`,
            'DispatchLog',
            id,
            'system',
            true
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete dispatch:', error);
        return NextResponse.json(
            { error: 'Failed to delete dispatch' },
            { status: 500 }
        );
    }
}