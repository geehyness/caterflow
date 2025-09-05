// schemas/dispatchLog.ts
import { defineType, defineField } from 'sanity';
import { createClient } from '@sanity/client';

const client = createClient({
    projectId: 'v3sfsmld',
    dataset: 'production',
    apiVersion: '2025-08-20',
    useCdn: true,
});

const isUniqueDispatchNumber = async (dispatchNumber, context) => {
    const { document, getClient } = context;
    if (!dispatchNumber) {
        return true;
    }

    const id = document._id.replace('drafts.', '');
    const client = getClient({ apiVersion: '2025-08-20' });

    const query = `
        !defined(*[_type == "DispatchLog" && dispatchNumber == $dispatchNumber && _id != $draft && _id != $published][0]._id)
    `;

    const params = {
        draft: `drafts.${id}`,
        published: id,
        dispatchNumber,
    };

    const result = await client.fetch(query, params);
    return result;
};

export default defineType({
    name: 'DispatchLog',
    title: 'Dispatch Log',
    type: 'document',
    fields: [
        defineField({
            name: 'dispatchNumber',
            title: 'Dispatch Number',
            type: 'string',
            validation: (Rule) =>
                Rule.required().custom(async (dispatchNumber, context) => {
                    const isUnique = await isUniqueDispatchNumber(dispatchNumber, context);
                    if (!isUnique) {
                        return 'Dispatch Number already exists.';
                    }
                    return true;
                }),
            readOnly: ({ document }) => !!document.dispatchNumber,
            description: 'Unique Dispatch Log identifier.',
            initialValue: async () => {
                const today = new Date().toISOString().slice(0, 10);
                const query = `
                    *[_type == "DispatchLog" && _createdAt >= "${today}T00:00:00Z" && _createdAt < "${today}T23:59:59Z"] | order(_createdAt desc)[0] {
                        dispatchNumber
                    }
                `;
                const lastLog = await client.fetch(query);

                let nextNumber = 1;
                if (lastLog && lastLog.dispatchNumber) {
                    const lastNumber = parseInt(lastLog.dispatchNumber.split('-').pop());
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }

                const paddedNumber = String(nextNumber).padStart(3, '0');
                return `DL-${today}-${paddedNumber}`;
            },
        }),
        defineField({
            name: 'dispatchDate',
            title: 'Dispatch Date',
            type: 'datetime',
            options: {
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                calendarTodayLabel: 'Today',
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'sourceBin',
            title: 'Source Bin',
            type: 'reference',
            to: [{ type: 'Bin' }],
            validation: (Rule) => Rule.required(),
            description: 'The bin from which stock was dispatched.',
        }),
        defineField({
            name: 'destinationSite',
            title: 'Destination Site',
            type: 'reference',
            to: [{ type: 'Site' }],
            validation: (Rule) => Rule.required(),
            description: 'The site receiving the dispatched stock.',
        }),
        defineField({
            name: 'dispatchedBy',
            title: 'Dispatched By',
            type: 'reference',
            to: [{ type: 'AppUser' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'dispatchedItems',
            title: 'Dispatched Items',
            type: 'array',
            of: [{ type: 'DispatchedItem' }],
            validation: (Rule) => Rule.required().min(1),
        }),
        defineField({
            name: 'attachments',
            title: 'Attachments',
            type: 'array',
            of: [{ type: 'reference', to: [{ type: 'FileAttachment' }] }],
            description: 'Related documents like delivery notes, proof of delivery, etc.',
        }),
        defineField({
            name: 'evidenceStatus',
            title: 'Evidence Status',
            type: 'string',
            options: {
                list: [
                    { title: 'Pending', value: 'pending' },
                    { title: 'Partial', value: 'partial' },
                    { title: 'Complete', value: 'complete' },
                ],
            },
            initialValue: 'pending',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'notes',
            title: 'Notes',
            type: 'text',
            rows: 3,
        }),
    ],
    preview: {
        select: {
            title: 'dispatchNumber',
            date: 'dispatchDate',
            source: 'sourceBin.name',
            destination: 'destinationSite.name',
            evidenceStatus: 'evidenceStatus',
        },
        prepare({ title, date, source, destination, evidenceStatus }) {
            const statusText = evidenceStatus ? ` | Evidence: ${evidenceStatus}` : '';
            return {
                title: `Dispatch: ${title}`,
                subtitle: `${new Date(date).toLocaleDateString()} | From: ${source} To: ${destination}${statusText}`,
            };
        },
    },
    orderings: [
        {
            name: 'newest',
            title: 'Newest First',
            by: [{ field: 'dispatchDate', direction: 'desc' }],
        },
        {
            name: 'oldest',
            title: 'Oldest First',
            by: [{ field: 'dispatchDate', direction: 'asc' }],
        },
        {
            name: 'dispatchNumberAsc',
            title: 'Dispatch Number (Ascending)',
            by: [{ field: 'dispatchNumber', direction: 'asc' }],
        },
    ],
});