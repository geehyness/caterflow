// schemas/inventoryCount.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'InventoryCount',
    title: 'Inventory Count',
    type: 'document',
    fields: [
        defineField({
            name: 'countDate',
            title: 'Count Date & Time',
            type: 'datetime',
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
            title: 'bin.name',
            date: 'countDate',
            countedBy: 'countedBy.name',
        },
        prepare({ title, date, countedBy }) {
            return {
                title: `Inventory Count for ${title}`,
                subtitle: `${new Date(date).toLocaleDateString()} by ${countedBy}`,
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
                name: 'binName',
                title: 'Bin Name (A-Z)',
                by: [{ field: 'bin.name', direction: 'asc' }], // Sorting by a referenced field
            },
        ],
    },
});