// app/api/stock-items/route.ts
import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        const query = `*[_type == "StockItem" && (name match $search || sku match $search)] {
            _id,
            name,
            sku,
            unitOfMeasure,
            unitPrice,
            minimumStockLevel,
            reorderQuantity,
            category->{
                _id,
                title
            },
            suppliers[]->{
                _id,
                name
            },
            primarySupplier->{
                _id,
                name
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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, sku, minimumStockLevel, category, primarySupplier, unitOfMeasure } = body;

        const document = {
            _type: 'StockItem',
            name,
            sku,
            minimumStockLevel: Number(minimumStockLevel),
            unitOfMeasure,
            category: {
                _type: 'reference',
                _ref: category,
            },
            primarySupplier: primarySupplier ? {
                _type: 'reference',
                _ref: primarySupplier,
            } : undefined,
        };

        const result = await client.create(document);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to create stock item:', error);
        return NextResponse.json(
            { error: 'Failed to create stock item' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { _id, name, sku, minimumStockLevel, category, primarySupplier, unitOfMeasure } = body;

        const document = {
            name,
            sku,
            minimumStockLevel: Number(minimumStockLevel),
            unitOfMeasure,
            category: {
                _type: 'reference',
                _ref: category,
            },
            primarySupplier: primarySupplier ? {
                _type: 'reference',
                _ref: primarySupplier,
            } : undefined,
        };

        const result = await client.patch(_id).set(document).commit();
        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to update stock item:', error);
        return NextResponse.json(
            { error: 'Failed to update stock item' },
            { status: 500 }
        );
    }
}