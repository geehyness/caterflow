import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';

interface BinData {
    _id?: string;
    name: string;
    binType: string;
    locationDescription?: string;
    site: string;
}

// GET all bins
// Update the GET function in /api/bins/route.ts
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId');

        let query;
        let params = {};

        if (siteId) {
            query = groq`*[_type == "Bin" && site._ref == $siteId] | order(name asc) {
                _id,
                name,
                binType,
                locationDescription,
                site->{_id, name}
            }`;
            params = { siteId };
        } else {
            query = groq`*[_type == "Bin"] | order(name asc) {
                _id,
                name,
                binType,
                locationDescription,
                site->{_id, name}
            }`;
        }

        const bins = await writeClient.fetch(query, params);
        return NextResponse.json(bins);
    } catch (error) {
        console.error('Error fetching bins:', error);
        return NextResponse.json(
            { error: 'Failed to fetch bins' },
            { status: 500 }
        );
    }
}

// CREATE a new bin
export async function POST(req: NextRequest) {
    try {
        const binData: BinData = await req.json();

        // Validate required fields
        if (!binData.name || !binData.binType || !binData.site) {
            return NextResponse.json(
                { error: 'Name, type, and site are required' },
                { status: 400 }
            );
        }

        // Check if bin already exists
        const existingBin = await writeClient.fetch(
            groq`*[_type == "Bin" && name == $name && site._ref == $siteId][0]`,
            { name: binData.name, siteId: binData.site }
        );

        if (existingBin) {
            return NextResponse.json(
                { error: 'Bin with this name already exists at this site' },
                { status: 409 }
            );
        }

        // Create bin document
        const newBin = {
            _type: 'Bin',
            name: binData.name,
            binType: binData.binType,
            locationDescription: binData.locationDescription || undefined,
            site: {
                _type: 'reference',
                _ref: binData.site
            }
        };

        const result = await writeClient.create(newBin);

        // Log the action
        await logSanityInteraction(
            'bin_management',
            'Bin created',
            'Bin',
            result._id,
            binData.name,
            true
        );

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error creating bin:', error);
        return NextResponse.json(
            { error: 'Failed to create bin' },
            { status: 500 }
        );
    }
}

// UPDATE a bin
export async function PATCH(req: NextRequest) {
    try {
        const binData: BinData = await req.json();

        if (!binData._id) {
            return NextResponse.json(
                { error: 'Bin ID is required' },
                { status: 400 }
            );
        }

        // Check if bin exists
        const existingBin = await writeClient.fetch(
            groq`*[_type == "Bin" && _id == $id][0]`,
            { id: binData._id }
        );

        if (!existingBin) {
            return NextResponse.json(
                { error: 'Bin not found' },
                { status: 404 }
            );
        }

        // Check if name is already used by another bin at the same site
        if (binData.name && binData.name !== existingBin.name) {
            const binWithName = await writeClient.fetch(
                groq`*[_type == "Bin" && name == $name && site._ref == $siteId && _id != $id][0]`,
                { name: binData.name, siteId: binData.site, id: binData._id }
            );

            if (binWithName) {
                return NextResponse.json(
                    { error: 'Bin name already in use at this site' },
                    { status: 409 }
                );
            }
        }

        // Prepare update data
        const updateData: any = {
            name: binData.name,
            binType: binData.binType,
            locationDescription: binData.locationDescription || null
        };

        // Handle site reference
        if (binData.site) {
            updateData.site = {
                _type: 'reference',
                _ref: binData.site
            };
        }

        // Update bin
        const result = await writeClient
            .patch(binData._id)
            .set(updateData)
            .commit();

        // Log the action
        await logSanityInteraction(
            'bin_management',
            'Bin updated',
            'Bin',
            binData._id,
            binData.name,
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error updating bin:', error);
        return NextResponse.json(
            { error: 'Failed to update bin' },
            { status: 500 }
        );
    }
}

// DELETE a bin
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Bin ID is required' },
                { status: 400 }
            );
        }

        // Check if bin exists
        const existingBin = await writeClient.fetch(
            groq`*[_type == "Bin" && _id == $id][0]`,
            { id }
        );

        if (!existingBin) {
            return NextResponse.json(
                { error: 'Bin not found' },
                { status: 404 }
            );
        }

        // Delete bin
        await writeClient.delete(id);

        // Log the action
        await logSanityInteraction(
            'bin_management',
            'Bin deleted',
            'Bin',
            id,
            existingBin.name,
            true
        );

        return NextResponse.json({ message: 'Bin deleted successfully' });
    } catch (error) {
        console.error('Error deleting bin:', error);
        return NextResponse.json(
            { error: 'Failed to delete bin' },
            { status: 500 }
        );
    }
}