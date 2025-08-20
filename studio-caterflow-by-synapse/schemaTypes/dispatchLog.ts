// schemas/dispatchLog.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'DispatchLog',
    title: 'Dispatch Log',
    type: 'document',
    fields: [
        defineField({
            name: 'dispatchNumber',
            title: 'Dispatch Number',
            type: 'string',
            validation: (Rule) => Rule.required().unique(),
            description: 'Unique Dispatch Log identifier.',
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
        },
        prepare({ title, date, source, destination }) {
            return {
                title: `Dispatch: ${title}`,
                subtitle: `${new Date(date).toLocaleDateString()} | From: ${source} To: ${destination}`,
            };
        },
        // --- ADDED ORDERINGS ---
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
    },
});