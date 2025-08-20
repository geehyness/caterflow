// schemas/stockItem.js
import { defineType, defineField } from 'sanity';
import { createClient } from '@sanity/client';

// NOTE: For Sanity Studio v3, it is recommended to create a separate client instance.
// For example, in a file like 'sanityClient.js'
// You will need to replace the placeholders below with your actual project details.
const client = createClient({
    projectId: 'v3sfsmld', // Replace with your Sanity Project ID
    dataset: 'production', // Replace with your dataset (e.g., 'production')
    apiVersion: '2025-08-20', // Use a recent date, like today's date
    useCdn: true,
});

// Async helper function to check for SKU uniqueness
const isUniqueSku = async (sku, context) => {
    const { document, getClient } = context;
    if (!sku) {
        return true;
    }

    const id = document._id.replace('drafts.', '');
    const client = getClient({ apiVersion: '2025-08-20' });

    const query = `
        !defined(*[_type == "StockItem" && sku == $sku && _id != $draft && _id != $published][0]._id)
    `;

    const params = {
        draft: `drafts.${id}`,
        published: id,
        sku,
    };

    const result = await client.fetch(query, params);
    return result;
};

export default defineType({
    name: 'StockItem',
    title: 'Stock Item',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Item Name',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'sku',
            title: 'SKU (Stock Keeping Unit)',
            type: 'string',
            validation: (Rule) =>
                Rule.required().custom(async (sku, context) => {
                    const isSkuUnique = await isUniqueSku(sku, context);

                    if (!isSkuUnique) {
                        return 'SKU already exists.';
                    }
                    return true;
                }),
            readOnly: ({ document }) => !!document.sku, // Makes the field read-only after the initial creation
            description: 'A unique identifier for this stock item.',
            initialValue: async () => {
                const query = `
                    *[_type == "StockItem"]|order(_createdAt desc)[0]{
                        sku
                    }
                `;
                const lastItem = await client.fetch(query);
                let nextNumber = 1;
                if (lastItem && lastItem.sku) {
                    const lastNumber = parseInt(lastItem.sku.split('-')[1]);
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }
                const paddedNumber = String(nextNumber).padStart(3, '0');
                return `sku-${paddedNumber}`;
            },
        }),
        defineField({
            name: 'itemType',
            title: 'Item Type',
            type: 'string',
            options: {
                list: [
                    { title: 'Food Item', value: 'food' },
                    { title: 'Non-Food Item', value: 'nonFood' },
                ],
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'category',
            title: 'Category',
            type: 'reference',
            to: [{ type: 'Category' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'unitOfMeasure',
            title: 'Unit of Measure',
            type: 'string',
            options: {
                list: [
                    { title: 'Kilogram (kg)', value: 'kg' },
                    { title: 'Gram (g)', value: 'g' },
                    { title: 'Liter (l)', value: 'l' },
                    { title: 'Milliliter (ml)', value: 'ml' },
                    { title: 'Each', value: 'each' },
                    { title: 'Box', value: 'box' },
                    { title: 'Case', value: 'case' },
                ],
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'imageUrl',
            title: 'Image URL',
            type: 'url',
            description: 'URL to the stock item image.',
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
            rows: 3,
        }),
        defineField({
            name: 'supplier',
            title: 'Supplier',
            type: 'reference',
            to: [{ type: 'Supplier' }],
        }),
        defineField({
            name: 'minimumStockLevel',
            title: 'Minimum Stock Level',
            type: 'number',
            description: 'Set a minimum quantity to trigger low stock alerts.',
            validation: (Rule) => Rule.required().min(0),
        }),
        defineField({
            name: 'reorderQuantity',
            title: 'Reorder Quantity',
            type: 'number',
            description: 'Suggested quantity to reorder when stock is low.',
            validation: (Rule) => Rule.min(0),
        }),
    ],
    preview: {
        select: {
            title: 'name',
            subtitle: 'sku',
            media: 'imageUrl',
        },
        orderings: [
            {
                name: 'nameAsc',
                title: 'Name (A-Z)',
                by: [{ field: 'name', direction: 'asc' }],
            },
            {
                name: 'nameDesc',
                title: 'Name (Z-A)',
                by: [{ field: 'name', direction: 'desc' }],
            },
            {
                name: 'skuAsc',
                title: 'SKU (Ascending)',
                by: [{ field: 'sku', direction: 'asc' }],
            },
            {
                name: 'minStockLevelAsc',
                title: 'Min Stock Level (Low to High)',
                by: [{ field: 'minimumStockLevel', direction: 'asc' }],
            },
            {
                name: 'minStockLevelDesc',
                title: 'Min Stock Level (High to Low)',
                by: [{ field: 'minimumStockLevel', direction: 'desc' }],
            },
            {
                name: 'createdAt',
                title: 'Newest First',
                by: [{ field: '_createdAt', direction: 'desc' }],
            },
            {
                name: 'updatedAt',
                title: 'Recently Updated',
                by: [{ field: '_updatedAt', direction: 'desc' }],
            },
        ],
    },
});