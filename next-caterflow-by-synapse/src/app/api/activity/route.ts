// src/app/api/activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'week';

        // Calculate date range based on timeframe
        const now = new Date();
        let startDate = new Date();

        switch (timeframe) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        // Query for recent activity across multiple document types
        const query = groq`
      {
        "receipts": *[_type == "GoodsReceipt" && _createdAt >= $startDate] | order(_createdAt desc) {
          _id,
          _type,
          "description": "Goods received: " + count(_type) + " items",
          "user": user->name,
          "timestamp": _createdAt,
          "siteName": site->name
        },
        "dispatches": *[_type == "DispatchLog" && _createdAt >= $startDate] | order(_createdAt desc) {
          _id,
          _type,
          "description": "Goods dispatched: " + count(_type) + " items",
          "user": user->name,
          "timestamp": _createdAt,
          "siteName": site->name
        },
        "transfers": *[_type == "InternalTransfer" && _createdAt >= $startDate] | order(_createdAt desc) {
          _id,
          _type,
          "description": "Internal transfer: " + count(_type) + " items",
          "user": user->name,
          "timestamp": _createdAt,
          "siteName": fromSite->name + " → " + toSite->name
        },
        "adjustments": *[_type == "StockAdjustment" && _createdAt >= $startDate] | order(_createdAt desc) {
          _id,
          _type,
          "description": "Stock adjustment: " + count(_type) + " items",
          "user": user->name,
          "timestamp": _createdAt,
          "siteName": site->name
        }
      }
    `;

        const data = await client.fetch(query, { startDate: startDate.toISOString() });

        // Combine all activity types
        const allActivities = [
            ...data.receipts,
            ...data.dispatches,
            ...data.transfers,
            ...data.adjustments
        ];

        // Sort by timestamp (newest first)
        allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json(allActivities);
    } catch (error) {
        console.error('Failed to fetch activity:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activity' },
            { status: 500 }
        );
    }
}