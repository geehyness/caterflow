// schemas/stockAdjustment.js
import { defineType, defineField } from 'sanity';
import { createClient } from '@sanity/client';

// NOTE: You will need to replace the placeholders below with your actual project details.
const client = createClient({
    projectId: 'v3sfsmld', // Replace with your Sanity Project ID
    dataset: 'production', // Replace with your dataset (e.g., 'production')
    apiVersion: '2025-08-20', // Use a recent date, like today's date
    useCdn: true,
});

// Async helper function to check for unique adjustment numbers
const isUniqueAdjustmentNumber = async (adjustmentNumber, context) => {
    const { document, getClient } = context;
    if (!adjustmentNumber) {
        return true;
    }

    const id = document._id.replace('drafts.', '');
    const client = getClient({ apiVersion: '2025-08-20' });

    const query = `
        !defined(*[_type == "StockAdjustment" && adjustmentNumber == $adjustmentNumber && _id != $draft && _id != $published][0]._id)
    `;

    const params = {
        draft: `drafts.${id}`,
        published: id,
        adjustmentNumber,
    };

    const result = await client.fetch(query, params);
    return result;
};

export default defineType({
    name: 'StockAdjustment',
    title: 'Stock Adjustment',
    type: 'document',
    fields: [
        defineField({
            name: 'adjustmentNumber',
            title: 'Adjustment Number',
            type: 'string',
            validation: (Rule) =>
                Rule.required().custom(async (adjustmentNumber, context) => {
                    const isUnique = await isUniqueAdjustmentNumber(adjustmentNumber, context);
                    if (!isUnique) {
                        return 'Adjustment Number already exists.';
                    }
                    return true;
                }),
            readOnly: ({ document }) => !!document.adjustmentNumber,
            description: 'Unique Stock Adjustment identifier.',
            initialValue: async () => {
                const today = new Date().toISOString().slice(0, 10);
                const query = `
                    *[_type == "StockAdjustment" && _createdAt >= "${today}T00:00:00Z" && _createdAt < "${today}T23:59:59Z"] | order(_createdAt desc)[0] {
                        adjustmentNumber
                    }
                `;
                const lastAdjustment = await client.fetch(query);

                let nextNumber = 1;
                if (lastAdjustment && lastAdjustment.adjustmentNumber) {
                    const lastNumber = parseInt(lastAdjustment.adjustmentNumber.split('-').pop());
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }

                const paddedNumber = String(nextNumber).padStart(3, '0');
                return `AN-${today}-${paddedNumber}`;
            },
        }),
        defineField({
            name: 'adjustmentDate',
            title: 'Adjustment Date',
            type: 'datetime',
            initialValue: new Date().toISOString(),
            options: {
                dateFormat: 'YYYY-MM-DD',
                calendarTodayLabel: 'Today',
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'adjustedBy',
            title: 'Adjusted By',
            type: 'reference',
            to: [{ type: 'AppUser' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'bin',
            title: 'Bin Where Adjusted',
            type: 'reference',
            to: [{ type: 'Bin' }],
            validation: (Rule) => Rule.required(),
            description: 'The bin where the stock adjustment occurred.',
        }),
        defineField({
            name: 'adjustmentType',
            title: 'Adjustment Type',
            type: 'string',
            options: {
                list: [
                    { title: 'Loss', value: 'loss' },
                    { title: 'Wastage', value: 'wastage' },
                    { title: 'Expiry', value: 'expiry' },
                    { title: 'Damage', value: 'damage' },
                    { title: 'Inventory Count Correction', value: 'inventory-correction' },
                    { title: 'Theft', value: 'theft' },
                    { title: 'Positive Adjustment (Found Stock)', value: 'positive-adjustment' },
                ],
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'adjustedItems',
            title: 'Adjusted Items',
            type: 'array',
            of: [{ type: 'AdjustedItem' }],
            validation: (Rule) => Rule.required().min(1),
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
            title: 'adjustmentNumber',
            date: 'adjustmentDate',
            type: 'adjustmentType',
            bin: 'bin.name',
        },
        prepare({ title, date, type, bin }) {
            return {
                title: `Adjustment: ${title}`,
                subtitle: `${new Date(date).toLocaleDateString()} | Type: ${type} | Bin: ${bin}`,
            };
        },
        orderings: [
            {
                name: 'newest',
                title: 'Newest First',
                by: [{ field: 'adjustmentDate', direction: 'desc' }],
            },
            {
                name: 'oldest',
                title: 'Oldest First',
                by: [{ field: 'adjustmentDate', direction: 'asc' }],
            },
            {
                name: 'adjustmentNumberAsc',
                title: 'Adjustment Number (Ascending)',
                by: [{ field: 'adjustmentNumber', direction: 'asc' }],
            },
            {
                name: 'type',
                title: 'Adjustment Type',
                by: [{ field: 'adjustmentType', direction: 'asc' }],
            },
        ],
    },
});