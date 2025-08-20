// schemas/stockAdjustment.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'StockAdjustment',
    title: 'Stock Adjustment',
    type: 'document',
    fields: [
        defineField({
            name: 'adjustmentNumber',
            title: 'Adjustment Number',
            type: 'string',
            validation: (Rule) => Rule.required().unique(),
            description: 'Unique Stock Adjustment identifier.',
        }),
        defineField({
            name: 'adjustmentDate',
            title: 'Adjustment Date',
            type: 'datetime',
            options: {
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
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