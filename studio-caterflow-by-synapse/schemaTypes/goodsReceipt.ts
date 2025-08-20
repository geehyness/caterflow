// schemas/goodsReceipt.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'GoodsReceipt',
    title: 'Goods Receipt',
    type: 'document',
    fields: [
        defineField({
            name: 'receiptNumber',
            title: 'Receipt Number',
            type: 'string',
            validation: (Rule) => Rule.required().unique(),
            description: 'Unique Goods Receipt identifier.',
        }),
        defineField({
            name: 'receiptDate',
            title: 'Receipt Date',
            type: 'datetime',
            options: {
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                calendarTodayLabel: 'Today',
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'purchaseOrder',
            title: 'Associated Purchase Order',
            type: 'reference',
            to: [{ type: 'PurchaseOrder' }],
            description: 'Optional: Link to the original Purchase Order if applicable.',
        }),
        defineField({
            name: 'receivedBy',
            title: 'Received By',
            type: 'reference',
            to: [{ type: 'AppUser' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'receivingBin',
            title: 'Receiving Bin',
            type: 'reference',
            to: [{ type: 'Bin' }],
            validation: (Rule) => Rule.required(),
            description: 'The bin where the goods were initially stored.',
        }),
        defineField({
            name: 'receivedItems',
            title: 'Received Items',
            type: 'array',
            of: [{ type: 'ReceivedItem' }],
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
            title: 'receiptNumber',
            date: 'receiptDate',
            po: 'purchaseOrder.poNumber',
            bin: 'receivingBin.name',
        },
        prepare({ title, date, po, bin }) {
            const poText = po ? ` (PO: ${po})` : '';
            return {
                title: `Receipt: ${title}`,
                subtitle: `${new Date(date).toLocaleDateString()} | To: ${bin}${poText}`,
            };
        },
        orderings: [
            {
                name: 'newest',
                title: 'Newest First',
                by: [{ field: 'receiptDate', direction: 'desc' }],
            },
            {
                name: 'oldest',
                title: 'Oldest First',
                by: [{ field: 'receiptDate', direction: 'asc' }],
            },
            {
                name: 'receiptNumberAsc',
                title: 'Receipt Number (Ascending)',
                by: [{ field: 'receiptNumber', direction: 'asc' }],
            },
        ],
    },
});