import { NextResponse, NextRequest } from 'next/server';
import { writeClient } from '@/lib/sanity';

export async function POST(request: NextRequest) {
    try {
        const { id, completedSteps, status, approvedBy, approvedAt } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Action ID is required' },
                { status: 400 }
            );
        }

        const patch = writeClient.patch(id);

        if (typeof completedSteps === 'number') {
            patch.set({ completedSteps });
        }

        if (status) {
            patch.set({ status });

            // If approving a purchase order, set approvedBy and approvedAt
            if (status === 'approved' && approvedBy && approvedAt) {
                patch.set({
                    approvedBy: { _type: 'reference', _ref: approvedBy },
                    approvedAt: approvedAt
                });
            }
        }

        const result = await patch.commit();

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error('Failed to update action:', error);
        return NextResponse.json(
            { error: 'Failed to update action' },
            { status: 500 }
        );
    }
}