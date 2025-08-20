// schemas/internalTransfer.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'InternalTransfer',
    title: 'Internal Stock Transfer',
    type: 'document',
    fields: [
        defineField({
            name: 'transferNumber',
            title: 'Transfer Number',
            type: 'string',
            validation: (Rule) => Rule.required().unique(),
            description: 'Unique Internal Transfer identifier.',
        }),
        defineField({
            name: 'transferDate',
            title: 'Transfer Date',
            type: 'datetime',
            options: {
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
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