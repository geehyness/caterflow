import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function GET() {
    try {
        const [
            totalStockItems,
            lowStockItems,
            pendingOrders,
            activeUsers
        ] = await Promise.all([
            client.fetch(groq`count(*[_type == "StockItem"])`),
            client.fetch(groq`count(*[_type == "StockItem" && minimumStockLevel > 0])`),
            client.fetch(groq`count(*[_type == "PurchaseOrder" && status == "pending"])`),
            client.fetch(groq`count(*[_type == "AppUser" && isActive == true])`)
        ]);

        return NextResponse.json({
            totalStockItems,
            lowStockItems,
            pendingOrders,
            activeUsers
        });
    } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}