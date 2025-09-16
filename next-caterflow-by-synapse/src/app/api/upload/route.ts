// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { getServerSession } from 'next-auth';
import { groq } from 'next-sanity';
import { authOptions } from '@/lib/auth';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            console.log('User not authenticated');
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }

        // Get the user's ID from Sanity based on their email
        const userQuery = groq`*[_type == "AppUser" && email == $email][0] {
            _id
        }`;

        const user = await writeClient.fetch(userQuery, {
            email: session.user.email
        });

        if (!user) {
            console.log('User not found in database for email:', session.user.email);
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null; // Change from Blob to File
        const relatedToId = formData.get('relatedTo');
        const fileType = formData.get('fileType');
        const description = formData.get('description');

        // **Log the received form data**
        console.log('--- Server-side Received Data ---');
        console.log('Received File:', file ? file.name : 'No file received');
        console.log('Received Related To ID:', relatedToId);
        console.log('Received File Type:', fileType);
        console.log('Received Description:', description);
        console.log('---------------------------------');

        if (!file || !relatedToId) {
            console.log('Missing file or related document ID');
            return NextResponse.json(
                { error: 'File and related document ID are required' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            console.log(`File size too large: ${file.size}`);
            return NextResponse.json(
                { error: `File size exceeds the limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            console.log(`Unsupported file type: ${file.type}`);
            return NextResponse.json(
                { error: 'Unsupported file type' },
                { status: 400 }
            );
        }

        // Upload file to Sanity
        console.log('Uploading file to Sanity...');
        const fileAsset = await writeClient.assets.upload('file', file, {
            filename: file.name,
            contentType: file.type,
        });
        console.log('Sanity asset upload successful:', fileAsset._id);

        // Create a new FileAttachment document
        console.log('Creating new FileAttachment document...');
        const newAttachment = await writeClient.create({
            _type: 'FileAttachment',
            fileName: file.name,
            fileType: fileType,
            file: {
                _type: 'file',
                asset: {
                    _type: 'reference',
                    _ref: fileAsset._id,
                },
            },
            uploadedBy: {
                _type: 'reference',
                _ref: user._id,
            },
            uploadedAt: new Date().toISOString(),
            description: description,
            relatedTo: {
                _type: 'reference',
                _ref: relatedToId,
            },
            isArchived: false,
        });
        console.log('FileAttachment document created:', newAttachment._id);


        // Validate types
        if (!file || !relatedToId || typeof relatedToId !== 'string') {
            console.log('Missing file or related document ID');
            return NextResponse.json(
                { error: 'File and related document ID are required' },
                { status: 400 }
            );
        }


        // Link the attachment to the related document
        console.log(`Patching document ${relatedToId} to add attachment reference...`);
        await writeClient
            .patch(relatedToId)
            .setIfMissing({ attachments: [] })
            .insert('after', 'attachments[-1]', [
                {
                    _key: newAttachment._id,
                    _ref: newAttachment._id,
                    _type: 'reference',
                },
            ])
            .commit();
        console.log('Patch operation successful.');

        return NextResponse.json({
            success: true,
            message: 'File uploaded successfully',
            attachment: newAttachment,
        });
    } catch (error: any) {
        console.error('File upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file', details: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const relatedTo = searchParams.get('relatedTo');

        if (!id) {
            return NextResponse.json(
                { error: 'Attachment ID is required' },
                { status: 400 }
            );
        }

        // Delete the attachment reference from the related document
        if (relatedTo) {
            await writeClient
                .patch(relatedTo)
                .unset([`attachments[_ref=="${id}"]`])
                .commit();
        }

        // Delete the attachment document
        await writeClient.delete(id);

        return NextResponse.json({
            success: true,
            message: 'Attachment deleted successfully'
        });
    } catch (error: any) {
        console.error('File deletion error:', error);
        return NextResponse.json(
            { error: 'Failed to delete attachment', details: error.message },
            { status: 500 }
        );
    }
}