import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET all dispatch types
export async function GET() {
    try {
        const query = `*[_type == "DispatchType"] | order(name asc) {
            _id,
            name,
            description,
            defaultTime,
            isActive
        }`;

        const dispatchTypes = await client.fetch(query);
        return NextResponse.json(dispatchTypes);
    } catch (error) {
        console.error('Failed to fetch dispatch types:', error);
        return NextResponse.json({ error: 'Failed to fetch dispatch types' }, { status: 500 });
    }
}

// POST create new dispatch type
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, defaultTime, isActive = true } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const newDoc = {
            _type: 'DispatchType',
            name,
            description,
            defaultTime,
            isActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const result = await writeClient.create(newDoc);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to create dispatch type:', error);
        return NextResponse.json({ error: 'Failed to create dispatch type' }, { status: 500 });
    }
}