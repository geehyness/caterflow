// /api/dispatch-types
import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function GET() {
    try {
        const query = groq`*[_type == "DispatchType"] | order(name asc) {
            _id,
            name,
            description,
            defaultTime
        }`;

        const dispatchTypes = await client.fetch(query);
        return NextResponse.json(dispatchTypes);
    } catch (error) {
        console.error('Failed to fetch dispatch types:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dispatch types' },
            { status: 500 }
        );
    }
}