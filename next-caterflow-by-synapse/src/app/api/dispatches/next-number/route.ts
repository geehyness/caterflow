import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

export async function GET() {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const query = groq`*[_type == "DispatchLog" && _createdAt >= "${today}T00:00:00Z" && _createdAt < "${today}T23:59:59Z"] | order(_createdAt desc)[0] {
            dispatchNumber
        }`;

        const lastLog = await client.fetch(query);
        let nextNumber = 1;

        if (lastLog && lastLog.dispatchNumber) {
            const lastNumber = parseInt(lastLog.dispatchNumber.split('-').pop() || '0');
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        const paddedNumber = String(nextNumber).padStart(3, '0');
        const dispatchNumber = `DL-${today}-${paddedNumber}`;

        return NextResponse.json({ dispatchNumber });
    } catch (error) {
        console.error('Error generating dispatch number:', error);
        return NextResponse.json(
            { error: 'Failed to generate dispatch number' },
            { status: 500 }
        );
    }
}