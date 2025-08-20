// schemas/purchaseOrder.js
import { defineType, defineField } from 'sanity';
import { createClient } from '@sanity/client';

// NOTE: You will need to replace the placeholders below with your actual project details.
const client = createClient({
    projectId: 'v3sfsmld', // Replace with your Sanity Project ID
    dataset: 'production', // Replace with your dataset (e.g., 'production')
    apiVersion: '2025-08-20', // Use a recent date, like today's date
    useCdn: true,
});

// Async helper function to check for unique PO numbers
const isUniquePoNumber = async (poNumber, context) => {
    const { document, getClient } = context;
    if (!poNumber) {
        return true;
    }

    const id = document._id.replace('drafts.', '');
    const client = getClient({ apiVersion: '2025-08-20' });

    const query = `
        !defined(*[_type == "PurchaseOrder" && poNumber == $poNumber && _id != $draft && _id != $published][0]._id)
    `;

    const params = {
        draft: `drafts.${id}`,
        published: id,
        poNumber,
    };

    const result = await client.fetch(query, params);
    return result;
};

export default defineType({
    name: 'PurchaseOrder',
    title: 'Purchase Order',
    type: 'document',
    fields: [
        defineField({
            name: 'poNumber',
            title: 'PO Number',
            type: 'string',
            validation: (Rule) =>
                Rule.required().custom(async (poNumber, context) => {
                    const isUnique = await isUniquePoNumber(poNumber, context);
                    if (!isUnique) {
                        return 'PO Number already exists.';
                    }
                    return true;
                }),
            readOnly: ({ document }) => !!document.poNumber,
            description: 'Unique Purchase Order identifier.',
            initialValue: async () => {
                const today = new Date().toISOString().slice(0, 10);
                const query = `
                    *[_type == "PurchaseOrder" && _createdAt >= "${today}T00:00:00Z" && _createdAt < "${today}T23:59:59Z"] | order(_createdAt desc)[0] {
                        poNumber
                    }
                `;
                const lastPO = await client.fetch(query);

                let nextNumber = 1;
                if (lastPO && lastPO.poNumber) {
                    const lastNumber = parseInt(lastPO.poNumber.split('-').pop());
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }

                const paddedNumber = String(nextNumber).padStart(3, '0');
                return `PO-${today}-${paddedNumber}`;
            },
        }),
        defineField({
            name: 'orderDate',
            title: 'Order Date',
            type: 'datetime',
            initialValue: new Date().toISOString(),
            options: {
                dateFormat: 'YYYY-MM-DD',
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