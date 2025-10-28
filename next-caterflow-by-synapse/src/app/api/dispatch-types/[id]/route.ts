import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET single dispatch type
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const query = `*[_type == "DispatchType" && _id == $id][0] {
            _id,
            name,
            description,
            defaultTime,
            sellingPrice,
            isActive
        }`;

        const dispatchType = await client.fetch(query, { id });

        if (!dispatchType) {
            return NextResponse.json({ error: 'Dispatch type not found' }, { status: 404 });
        }

        return NextResponse.json(dispatchType);
    } catch (error) {
        console.error('Failed to fetch dispatch type:', error);
        return NextResponse.json({ error: 'Failed to fetch dispatch type' }, { status: 500 });
    }
}

// PUT update dispatch type
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, description, defaultTime, sellingPrice, isActive } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Check if dispatch type exists
        const existing = await client.fetch(`*[_type == "DispatchType" && _id == $id][0]`, { id });
        if (!existing) {
            return NextResponse.json({ error: 'Dispatch type not found' }, { status: 404 });
        }

        // Handle null/undefined selling price - default to 0
        const safeSellingPrice = sellingPrice !== null && sellingPrice !== undefined
            ? Number(sellingPrice)
            : existing.sellingPrice || 0;

        if (safeSellingPrice < 0) {
            return NextResponse.json({ error: 'Selling price cannot be negative' }, { status: 400 });
        }

        const patch = writeClient.patch(id)
            .set({
                name: name.trim(),
                description: description?.trim() || '',
                defaultTime: defaultTime || '',
                sellingPrice: safeSellingPrice,
                isActive: isActive !== undefined ? isActive : existing.isActive,
                updatedAt: new Date().toISOString()
            });

        const result = await patch.commit();
        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to update dispatch type:', error);
        return NextResponse.json({ error: 'Failed to update dispatch type' }, { status: 500 });
    }
}

// DELETE dispatch type
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Check if dispatch type exists first
        const existing = await client.fetch(`*[_type == "DispatchType" && _id == $id][0]`, { id });
        if (!existing) {
            return NextResponse.json({ error: 'Dispatch type not found' }, { status: 404 });
        }

        // Check if any dispatches are using this type
        const dispatchesUsingType = await client.fetch(
            `count(*[_type == "DispatchLog" && dispatchType._ref == $id])`,
            { id }
        );

        if (dispatchesUsingType > 0) {
            return NextResponse.json(
                {
                    error: 'Cannot delete dispatch type',
                    message: `This dispatch type is being used by ${dispatchesUsingType} dispatch(es). Please reassign or delete those dispatches first.`
                },
                { status: 400 }
            );
        }

        await writeClient.delete(id);
        return NextResponse.json({
            success: true,
            message: 'Dispatch type deleted successfully'
        });
    } catch (error) {
        console.error('Failed to delete dispatch type:', error);
        return NextResponse.json({ error: 'Failed to delete dispatch type' }, { status: 500 });
    }
}