// src/app/api/auth/verify/route.ts
import { NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.slice(7);

        // In a real implementation, you would verify a JWT token here
        // For now, we'll use a simple base64 encoded JSON token
        try {
            const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

            // Check if token is expired
            if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
                return NextResponse.json({ message: 'Token expired' }, { status: 401 });
            }

            // Fetch fresh user data from Sanity
            const userQuery = `*[_type == "AppUser" && _id == $userId][0] {
        _id,
        name,
        email,
        role,
        isActive,
        associatedSite->{_id, name}
      }`;

            const user = await writeClient.fetch(userQuery, { userId: decoded.userId });

            if (!user || !user.isActive) {
                return NextResponse.json({ message: 'User not found or inactive' }, { status: 401 });
            }

            return NextResponse.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                associatedSite: user.associatedSite
            });

        } catch (error) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }
    } catch (error) {
        console.error('Token verification error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}