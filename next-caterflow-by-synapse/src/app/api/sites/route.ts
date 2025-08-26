import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';

interface SiteData {
    _id?: string;
    name: string;
    location: string;
    manager?: string;
    contactNumber?: string;
    email?: string;
    patientCount?: number;
}

// GET all sites
export async function GET() {
    try {
        const sites = await writeClient.fetch(groq`
      *[_type == "Site"] | order(name asc) {
        _id,
        name,
        location,
        manager->{_id, name},
        contactNumber,
        email,
        patientCount
      }
    `);

        return NextResponse.json(sites);
    } catch (error) {
        console.error('Error fetching sites:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sites' },
            { status: 500 }
        );
    }
}

// CREATE a new site
export async function POST(req: NextRequest) {
    try {
        const siteData: SiteData = await req.json();

        // Validate required fields
        if (!siteData.name || !siteData.location) {
            return NextResponse.json(
                { error: 'Name and location are required' },
                { status: 400 }
            );
        }

        // Check if site already exists
        const existingSite = await writeClient.fetch(
            groq`*[_type == "Site" && name == $name][0]`,
            { name: siteData.name }
        );

        if (existingSite) {
            return NextResponse.json(
                { error: 'Site with this name already exists' },
                { status: 409 }
            );
        }

        // Create site document
        const newSite = {
            _type: 'Site',
            name: siteData.name,
            location: siteData.location,
            manager: siteData.manager ? {
                _type: 'reference',
                _ref: siteData.manager
            } : undefined,
            contactNumber: siteData.contactNumber || undefined,
            email: siteData.email || undefined,
            patientCount: siteData.patientCount || undefined
        };

        const result = await writeClient.create(newSite);

        // Log the action
        await logSanityInteraction(
            'site_management',
            'Site created',
            'Site',
            result._id,
            siteData.name,
            true
        );

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error creating site:', error);
        return NextResponse.json(
            { error: 'Failed to create site' },
            { status: 500 }
        );
    }
}

// UPDATE a site
export async function PATCH(req: NextRequest) {
    try {
        const siteData: SiteData = await req.json();

        if (!siteData._id) {
            return NextResponse.json(
                { error: 'Site ID is required' },
                { status: 400 }
            );
        }

        // Check if site exists
        const existingSite = await writeClient.fetch(
            groq`*[_type == "Site" && _id == $id][0]`,
            { id: siteData._id }
        );

        if (!existingSite) {
            return NextResponse.json(
                { error: 'Site not found' },
                { status: 404 }
            );
        }

        // Check if name is already used by another site
        if (siteData.name && siteData.name !== existingSite.name) {
            const siteWithName = await writeClient.fetch(
                groq`*[_type == "Site" && name == $name && _id != $id][0]`,
                { name: siteData.name, id: siteData._id }
            );

            if (siteWithName) {
                return NextResponse.json(
                    { error: 'Site name already in use by another site' },
                    { status: 409 }
                );
            }
        }

        // Prepare update data
        const updateData: any = {
            name: siteData.name,
            location: siteData.location,
            contactNumber: siteData.contactNumber || null,
            email: siteData.email || null,
            patientCount: siteData.patientCount || null
        };

        // Handle manager reference
        if (siteData.manager) {
            updateData.manager = {
                _type: 'reference',
                _ref: siteData.manager
            };
        } else if (siteData.manager === null) {
            updateData.manager = null;
        }

        // Update site
        const result = await writeClient
            .patch(siteData._id)
            .set(updateData)
            .commit();

        // Log the action
        await logSanityInteraction(
            'site_management',
            'Site updated',
            'Site',
            siteData._id,
            siteData.name,
            true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error updating site:', error);
        return NextResponse.json(
            { error: 'Failed to update site' },
            { status: 500 }
        );
    }
}

// DELETE a site
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Site ID is required' },
                { status: 400 }
            );
        }

        // Check if site exists
        const existingSite = await writeClient.fetch(
            groq`*[_type == "Site" && _id == $id][0]`,
            { id }
        );

        if (!existingSite) {
            return NextResponse.json(
                { error: 'Site not found' },
                { status: 404 }
            );
        }

        // Delete site
        await writeClient.delete(id);

        // Log the action
        await logSanityInteraction(
            'site_management',
            'Site deleted',
            'Site',
            id,
            existingSite.name,
            true
        );

        return NextResponse.json({ message: 'Site deleted successfully' });
    } catch (error) {
        console.error('Error deleting site:', error);
        return NextResponse.json(
            { error: 'Failed to delete site' },
            { status: 500 }
        );
    }
}