// schemas/inventoryCount.js
import { defineType, defineField } from 'sanity';
import { createClient } from '@sanity/client';

// NOTE: You will need to replace the placeholders below with your actual project details.
const client = createClient({
    projectId: 'v3sfsmld', // Replace with your Sanity Project ID
    dataset: 'production', // Replace with your dataset (e.g., 'production')
    apiVersion: '2025-08-20', // Use a recent date, like today's date
    useCdn: true,
});

// Async helper function to check for unique count numbers
const isUniqueCountNumber = async (countNumber, context) => {
    const { document, getClient } = context;
    if (!countNumber) {
        return true;
    }

    const id = document._id.replace('drafts.', '');
    const client = getClient({ apiVersion: '2025-08-20' });

    const query = `
        !defined(*[_type == "InventoryCount" && countNumber == $countNumber && _id != $draft && _id != $published][0]._id)
    `;

    const params = {
        draft: `drafts.${id}`,
        published: id,
        countNumber,
    };

    const result = await client.fetch(query, params);
    return result;
};

export default defineType({
    name: 'InventoryCount',
    title: 'Inventory Count',
    type: 'document',
    fields: [
        defineField({
            name: 'countNumber',
            title: 'Count Number',
            type: 'string',
            validation: (Rule) =>
                Rule.required().custom(async (countNumber, context) => {
                    const isUnique = await isUniqueCountNumber(countNumber, context);
                    if (!isUnique) {
                        return 'Count Number already exists.';
                    }
                    return true;
                }),
            readOnly: ({ document }) => !!document.countNumber,
            description: 'Unique Inventory Count identifier.',
            initialValue: async () => {
                const today = new Date().toISOString().slice(0, 10);
                const query = `
                    *[_type == "InventoryCount" && _createdAt >= "${today}T00:00:00Z" && _createdAt < "${today}T23:59:59Z"] | order(_createdAt desc)[0] {
                        countNumber
                    }
                `;
                const lastCount = await client.fetch(query);

                let nextNumber = 1;
                if (lastCount && lastCount.countNumber) {
                    const lastNumber = parseInt(lastCount.countNumber.split('-').pop());
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }

                const paddedNumber = String(nextNumber).padStart(3, '0');
                return `IC-${today}-${paddedNumber}`;
            },
        }),
        defineField({
            name: 'countDate',
            title: 'Count Date & Time',
            type: 'datetime',
            initialValue: new Date().toISOString(),
            options: {
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                calendarTodayLabel: 'Today',
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'countedBy',
            title: 'Counted By',
            type: 'reference',
            to: [{ type: 'AppUser' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'bin',
            title: 'Bin Counted',
            type: 'reference',
            to: [{ type: 'Bin' }],
            validation: (Rule) => Rule.required(),
            description: 'The specific storage bin where the physical count was performed.',
        }),
        defineField({
            name: 'countedItems',
            title: 'Counted Items',
            type: 'array',
            of: [{ type: 'CountedItem' }],
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
            title: 'countNumber', // Using the new number field
            bin: 'bin.name',
            date: 'countDate',
            countedBy: 'countedBy.name',
        },
        prepare({ title, bin, date, countedBy }) {
            return {
                title: `Count: ${title}`,
                subtitle: `${new Date(date).toLocaleDateString()} | Bin: ${bin} | by ${countedBy}`,
            };
        },
        orderings: [
            {
                name: 'newest',
                title: 'Newest First',
                by: [{ field: 'countDate', direction: 'desc' }],
            },
            {
                name: 'oldest',
                title: 'Oldest First',
                by: [{ field: 'countDate', direction: 'asc' }],
            },
            {
                name: 'countNumberAsc',
                title: 'Count Number (Ascending)',
                by: [{ field: 'countNumber', direction: 'asc' }],
            },
            {
                name: 'binName',
                title: 'Bin Name (A-Z)',
                by: [{ field: 'bin.name', direction: 'asc' }],
            },
        ],
    },
});