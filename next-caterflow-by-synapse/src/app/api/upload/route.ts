// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { getServerSession } from 'next-auth/next';

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
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const fileName = formData.get('fileName') as string;
        const fileType = formData.get('fileType') as string;
        const description = formData.get('description') as string;
        const relatedTo = formData.get('relatedTo') as string;
        const relatedType = formData.get('relatedType') as string;

        // Validate required fields
        if (!file || !fileName || !fileType || !relatedTo || !relatedType) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'File size exceeds 10MB limit' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'File type not allowed' },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload file to Sanity
        const asset = await writeClient.assets.upload('file', buffer, {
            filename: fileName,
        });

        // Get user from session (you'll need to implement authentication)
        // For now, we'll use a placeholder user ID
        const uploadedBy = 'placeholder-user-id';

        // Create file attachment document
        const fileAttachment = {
            _type: 'FileAttachment',
            fileName,
            fileType,
            file: {
                _type: 'file',
                asset: {
                    _type: 'reference',
                    _ref: asset._id,
                },
            },
            uploadedBy: {
                _type: 'reference',
                _ref: uploadedBy,
            },
            uploadedAt: new Date().toISOString(),
            description: description || undefined,
            relatedTo: {
                _type: 'reference',
                _ref: relatedTo,
                _weak: true,
            },
        };

        const result = await writeClient.create(fileAttachment);

        // Update the related document with the attachment reference
        await writeClient
            .patch(relatedTo)
            .setIfMissing({ attachments: [] })
            .append('attachments', [{ _type: 'reference', _ref: result._id }])
            .commit();

        // Update evidence status if needed
        const relatedDoc = await writeClient.getDocument(relatedTo);
        if (relatedDoc && relatedDoc.evidenceStatus === 'pending') {
            await writeClient
                .patch(relatedTo)
                .set({ evidenceStatus: 'partial' })
                .commit();
        }

        return NextResponse.json({
            success: true,
            attachment: result,
            message: 'File uploaded successfully',
        });
    } catch (error) {
        console.error('File upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
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

        return NextResponse.json({ success: true, message: 'Attachment deleted successfully' });
    } catch (error) {
        console.error('File deletion error:', error);
        return NextResponse.json(
            { error: 'Failed to delete attachment' },
            { status: 500 }
        );
    }
}