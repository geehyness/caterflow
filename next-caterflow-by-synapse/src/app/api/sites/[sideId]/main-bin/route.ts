// pages/api/sites/[siteId]/main-bin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function GET(req: NextRequest, { params }: { params: { siteId: string } }) {
    try {
        const { siteId } = params;

        if (!siteId) {
            return NextResponse.json(
                { error: 'Site ID is required' },
                { status: 400 }
            );
        }

        // Sanity query to find a bin with the binType "main-storage" for the given site
        const query = groq`*[_type == "Bin" && site._ref == $siteId && binType == "main-storage"][0] {
        _id,
        name,
        "site": site->{_id, name}
    }`;

        const mainBin = await writeClient.fetch(query, { siteId });

        if (!mainBin) {
            return NextResponse.json(
                { error: 'Main bin not found for this site' },
                { status: 404 }
            );
        }

        return NextResponse.json(mainBin);
    } catch (error) {
        console.error('Error fetching main bin:', error);
        return NextResponse.json(
            { error: 'Failed to fetch main bin' },
            { status: 500 }
        );
    }
}