// schemas/purchaseOrder.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'PurchaseOrder',
    title: 'Purchase Order',
    type: 'document',
    fields: [
        defineField({
            name: 'poNumber',
            title: 'PO Number',
            type: 'string',
            validation: (Rule) => Rule.required().unique(),
            description: 'Unique Purchase Order identifier.',
        }),
        defineField({
            name: 'orderDate',
            title: 'Order Date',
            type: 'datetime',
            options: {
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                calendarTodayLabel: 'Today',
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'supplier',
            title: 'Supplier',
            type: 'reference',
            to: [{ type: 'Supplier' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'status',
            title: 'Status',
            type: 'string',
            options: {
                list: [
                    { title: 'Draft', value: 'draft' },
                    { title: 'Pending Approval', value: 'pending-approval' },
                    { title: 'Ordered', value: 'ordered' },
                    { title: 'Partially Received', value: 'partiallyReceived' },
                    { title: 'Received', value: 'received' },
                    { title: 'Cancelled', value: 'cancelled' },
                ],
            },
            initialValue: 'draft',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'orderedItems',
            title: 'Ordered Items',
            type: 'array',
            of: [{ type: 'OrderedItem' }],
            validation: (Rule) => Rule.required().min(1),
        }),
        defineField({
            name: 'expectedDeliveryDate',
            title: 'Expected Delivery Date',
            type: 'date',
            options: {
                dateFormat: 'YYYY-MM-DD',
            },
        }),
        defineField({
            name: 'totalAmount',
            title: 'Total Amount',
            type: 'number',
            readOnly: true,
            description: 'Calculated sum of all ordered items (populated by app).',
        }),
        defineField({
            name: 'orderedBy',
            title: 'Ordered By',
            type: 'reference',
            to: [{ type: 'AppUser' }],
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
            title: 'poNumber',
            subtitle: 'supplier.name',
            date: 'orderDate',
            status: 'status',
        },
        prepare({ title, subtitle, date, status }) {
            return {
                title: `PO: ${title}`,
                subtitle: `${subtitle} | ${new Date(date).toLocaleDateString()} | Status: ${status}`,
            };
        },
        // --- ADDED ORDERINGS ---
        orderings: [
            {
                name: 'newest',
                title: 'Newest First',
                by: [{ field: 'orderDate', direction: 'desc' }],
            },
            {
                name: 'oldest',
                title: 'Oldest First',
                by: [{ field: 'orderDate', direction: 'asc' }],
            },
            {
                name: 'poNumberAsc',
                title: 'PO Number (Ascending)',
                by: [{ field: 'poNumber', direction: 'asc' }],
            },
            {
                name: 'status',
                title: 'Status',
                by: [{ field: 'status', direction: 'asc' }],
            },
            {
                name: 'totalAmountDesc',
                title: 'Total Amount (High to Low)',
                by: [{ field: 'totalAmount', direction: 'desc' }],
            },
        ],
    },
});