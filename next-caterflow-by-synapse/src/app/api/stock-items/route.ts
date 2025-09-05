// app/api/stock-items/route.ts
import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        const query = groq`*[_type == "StockItem" && (name match $search || sku match $search)] {
            _id,
            name,
            sku,
            unitOfMeasure,
            unitPrice,
            category->{
                _id,
                title
            }
        } | order(name asc)`;

        const stockItems = await client.fetch(query, { search: `${search}*` });
        return NextResponse.json(stockItems);
    } catch (error) {
        console.error('Failed to fetch stock items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stock items' },
            { status: 500 }
        );
    }
}