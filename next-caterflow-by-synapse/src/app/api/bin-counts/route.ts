// src/app/api/bin-counts/route.ts
import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { nanoid } from 'nanoid'; // Add this import

export async function GET() {
    try {
        const query = groq`*[_type == "InventoryCount"] | order(countDate desc) {
            _id,
            countNumber,
            countDate,
            status,
            notes,
            "bin": bin->{
                _id,
                name,
                "site": site->{
                    _id,
                    name
                }
            },
            "countedBy": countedBy->{
                _id,
                name
            },
            "countedItems": countedItems[]{
                _key,
                "stockItem": stockItem->{
                    _id,
                    name,
                    sku
                },
                countedQuantity,
                systemQuantityAtCountTime,
                variance
            }
        }`;

        const binCounts = await client.fetch(query);

        const countsWithTotals = binCounts.map((count: any) => {
            const totalItems = count.countedItems?.length || 0;
            const totalVariance = count.countedItems?.reduce((sum: number, item: any) => sum + (item.variance || 0), 0) || 0;
            return {
                ...count,
                totalItems,
                totalVariance
            };
        });

        return NextResponse.json(countsWithTotals);
    } catch (error) {
        console.error('Failed to fetch bin counts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch bin counts' },
            { status: 500 }
        );
    }
}

const getNextCountNumber = async (): Promise<string> => {
    try {
        const query = groq`*[_type == "InventoryCount"] | order(countNumber desc)[0].countNumber`;
        const lastCountNumber = await client.fetch(query);

        if (!lastCountNumber) {
            return 'BC-00001';
        }

        const match = lastCountNumber.match(/BC-(\d+)/);
        if (!match) {
            return 'BC-00001';
        }

        const lastNumber = parseInt(match[1], 10);
        const nextNumber = lastNumber + 1;
        return `BC-${String(nextNumber).padStart(5, '0')}`;
    } catch (error) {
        console.error('Error generating count number:', error);
        return `BC-${Date.now().toString().slice(-5)}`;
    }
};

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { _id, ...updateData } = body;

        console.log('PUT request received for bin count:', { _id, updateData });

        if (!updateData.bin) {
            return NextResponse.json(
                { error: 'Bin is required' },
                { status: 400 }
            );
        }

        let countedItems;
        if (updateData.countedItems) {
            countedItems = updateData.countedItems.map((item: any) => {
                console.log('Processing counted item for PUT:', item);

                // Extract stock item ID from object or string
                const stockItemId = typeof item.stockItem === 'string'
                    ? item.stockItem
                    : item.stockItem?._id;

                if (!stockItemId) {
                    console.error('Invalid stock item reference:', item.stockItem);
                    throw new Error(`Invalid stock item reference for item: ${item._key}`);
                }

                return {
                    _type: 'CountedItem',
                    _key: item._key || nanoid(),
                    stockItem: {
                        _type: 'reference',
                        _ref: stockItemId,
                    },
                    countedQuantity: item.countedQuantity || 0,
                    systemQuantityAtCountTime: item.systemQuantityAtCountTime || 0,
                    variance: item.variance || 0,
                };
            });
            delete updateData.countedItems;
        }

        // Start with the basic update data
        let patch = writeClient.patch(_id).set({
            ...updateData,
            ...(countedItems && { countedItems }),
            updatedAt: new Date().toISOString(),
        });

        // Always set the bin reference
        patch = patch.set({
            bin: {
                _type: 'reference',
                _ref: updateData.bin,
            },
        });

        if (updateData.countedBy) {
            patch = patch.set({
                countedBy: {
                    _type: 'reference',
                    _ref: updateData.countedBy,
                },
            });
        }

        const result = await patch.commit();

        await logSanityInteraction(
            'update',
            `Updated bin count: ${updateData.countNumber || _id}`,
            'InventoryCount',
            _id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Failed to update bin count:', error);
        return NextResponse.json(
            { error: 'Failed to update bin count', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const newBinCount = await request.json();
        const countNumber = await getNextCountNumber();

        console.log('POST request received for new bin count:', newBinCount);

        if (!newBinCount.bin) {
            return NextResponse.json(
                { error: 'Bin is required' },
                { status: 400 }
            );
        }

        // Process countedItems correctly
        const countedItems = newBinCount.countedItems?.map((item: any) => {
            console.log('Processing counted item for POST:', item);

            // Extract stock item ID from object or string
            const stockItemId = typeof item.stockItem === 'string'
                ? item.stockItem
                : item.stockItem?._id;

            if (!stockItemId) {
                console.error('Invalid stock item reference:', item.stockItem);
                throw new Error(`Invalid stock item reference for item: ${item._key}`);
            }

            return {
                _type: 'CountedItem',
                _key: item._key || nanoid(),
                stockItem: {
                    _type: 'reference',
                    _ref: stockItemId,
                },
                countedQuantity: item.countedQuantity || 0,
                systemQuantityAtCountTime: item.systemQuantityAtCountTime || 0,
                variance: item.variance || 0,
            };
        });

        const doc = {
            _type: 'InventoryCount',
            ...newBinCount,
            countNumber,
            status: newBinCount.status || 'in-progress',
            countDate: newBinCount.countDate || new Date().toISOString(),
            bin: {
                _type: 'reference',
                _ref: newBinCount.bin,
            },
            countedItems: countedItems || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        console.log('Creating document:', doc);

        const result = await writeClient.create(doc);

        await logSanityInteraction(
            'create',
            `Created new bin count: ${countNumber}`,
            'InventoryCount',
            result._id,
            'system',
            true
        );

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Failed to create new bin count:', error);
        return NextResponse.json(
            { error: 'Failed to create new bin count', details: error.message },
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
                { error: 'Bin count ID is required' },
                { status: 400 }
            );
        }

        await writeClient.delete(id);

        await logSanityInteraction(
            'delete',
            `Deleted bin count: ${id}`,
            'InventoryCount',
            id,
            'system',
            true
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete bin count:', error);
        return NextResponse.json(
            { error: 'Failed to delete bin count', details: error.message },
            { status: 500 }
        );
    }
}