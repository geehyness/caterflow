import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function GET() {
    const query = groq`
    *[_type == "Site"] | order(name asc) {
      _id,
      name,
      location,
      manager->{
        name
      },
      "bins": *[_type == "Bin" && site._ref == ^._id] | order(name asc) {
        _id,
        name,
        binType,
        locationDescription
      }
    }
  `;

    try {
        const locations = await client.fetch(query);
        return NextResponse.json(locations);
    } catch (error) {
        console.error('Failed to fetch locations and bins:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}