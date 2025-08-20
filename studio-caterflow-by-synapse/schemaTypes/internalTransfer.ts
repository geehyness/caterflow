// schemas/internalTransfer.js
import { defineType, defineField } from 'sanity';
import { createClient } from '@sanity/client';

// NOTE: You will need to replace the placeholders below with your actual project details.
const client = createClient({
    projectId: 'v3sfsmld', // Replace with your Sanity Project ID
    dataset: 'production', // Replace with your dataset (e.g., 'production')
    apiVersion: '2025-08-20', // Use a recent date, like today's date
    useCdn: true,
});

// Async helper function to check for unique transfer numbers
const isUniqueTransferNumber = async (transferNumber, context) => {
    const { document, getClient } = context;
    if (!transferNumber) {
        return true;
    }

    const id = document._id.replace('drafts.', '');
    const client = getClient({ apiVersion: '2025-08-20' });

    const query = `
        !defined(*[_type == "InternalTransfer" && transferNumber == $transferNumber && _id != $draft && _id != $published][0]._id)
    `;

    const params = {
        draft: `drafts.${id}`,
        published: id,
        transferNumber,
    };

    const result = await client.fetch(query, params);
    return result;
};

export default defineType({
    name: 'InternalTransfer',
    title: 'Internal Stock Transfer',
    type: 'document',
    fields: [
        defineField({
            name: 'transferNumber',
            title: 'Transfer Number',
            type: 'string',
            validation: (Rule) =>
                Rule.required().custom(async (transferNumber, context) => {
                    const isUnique = await isUniqueTransferNumber(transferNumber, context);
                    if (!isUnique) {
                        return 'Transfer Number already exists.';
                    }
                    return true;
                }),
            readOnly: ({ document }) => !!document.transferNumber,
            description: 'Unique Internal Transfer identifier.',
            initialValue: async () => {
                const today = new Date().toISOString().slice(0, 10);
                const query = `
                    *[_type == "InternalTransfer" && _createdAt >= "${today}T00:00:00Z" && _createdAt < "${today}T23:59:59Z"] | order(_createdAt desc)[0] {
                        transferNumber
                    }
                `;
                const lastTransfer = await client.fetch(query);

                let nextNumber = 1;
                if (lastTransfer && lastTransfer.transferNumber) {
                    const lastNumber = parseInt(lastTransfer.transferNumber.split('-').pop());
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }

                const paddedNumber = String(nextNumber).padStart(3, '0');
                return `TR-${today}-${paddedNumber}`;
            },
        }),
        defineField({
            name: 'transferDate',
            title: 'Transfer Date',
            type: 'datetime',
            initialValue: new Date().toISOString(),
            options: {
                dateFormat: 'YYYY-MM-DD',
                calendarTodayLabel: 'Today',
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'fromBin',
            title: 'From Bin',
            type: 'reference',
            to: [{ type: 'Bin' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'toBin',
            title: 'To Bin',
            type: 'reference',
            to: [{ type: 'Bin' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'transferredBy',
            title: 'Transferred By',
            type: 'reference',
            to: [{ type: 'AppUser' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'transferredItems',
            title: 'Transferred Items',
            type: 'array',
            of: [{ type: 'TransferredItem' }],
            validation: (Rule) => Rule.required().min(1),
        }),
        defineField({
            name: 'notes',
            title: 'Notes',
            type: 'text',
            rows: 3,
        }),
        defineField({
            name: 'status',
            title: 'Status',
            type: 'string',
            options: {
                list: [
                    { title: 'Pending', value: 'pending' },
                    { title: 'Completed', value: 'completed' },
                    { title: 'Cancelled', value: 'cancelled' },
                ],
            },
            initialValue: 'completed',
            validation: (Rule) => Rule.required(),
        }),
    ],
    preview: {
        select: {
            title: 'transferNumber',
            date: 'transferDate',
            from: 'fromBin.name',
            to: 'toBin.name',
        },
        prepare({ title, date, from, to }) {
            return {
                title: `Transfer: ${title}`,
                subtitle: `${new Date(date).toLocaleDateString()} | ${from} -> ${to}`,
            };
        },
        orderings: [
            {
                name: 'newest',
                title: 'Newest First',
                by: [{ field: 'transferDate', direction: 'desc' }],
            },
            {
                name: 'oldest',
                title: 'Oldest First',
                by: [{ field: 'transferDate', direction: 'asc' }],
            },
            {
                name: 'transferNumberAsc',
                title: 'Transfer Number (Ascending)',
                by: [{ field: 'transferNumber', direction: 'asc' }],
            },
            {
                name: 'status',
                title: 'Status',
                by: [{ field: 'status', direction: 'asc' }],
            },
        ],
    },
});