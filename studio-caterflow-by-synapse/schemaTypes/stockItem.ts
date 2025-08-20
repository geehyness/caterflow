// schemas/stockItem.js
import { defineType, defineField } from 'sanity';

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
            validation: (Rule) => Rule.required().unique(),
            description: 'A unique identifier for this stock item.',
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
                    { title: 'Liter (L)', value: 'L' },
                    { title: 'Milliliter (ml)', value: 'ml' },
                    { title: 'Unit (ea)', value: 'ea' },
                    { title: 'Box (bx)', value: 'bx' },
                    { title: 'Piece (pc)', value: 'pc' },
                    { title: 'Pack (pk)', value: 'pk' },
                ],
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'minimumStockLevel',
            title: 'Minimum Stock Level',
            type: 'number',
            description: 'Alerts when stock of this item falls below this level.',
            validation: (Rule) => Rule.min(0).integer().required(),
        }),
        defineField({
            name: 'reorderPoint',
            title: 'Reorder Point',
            type: 'number',
            description: 'Quantity at which to reorder this item.',
            validation: (Rule) => Rule.min(0).integer(),
        }),
        defineField({
            name: 'supplier',
            title: 'Preferred Supplier',
            type: 'reference',
            to: [{ type: 'Supplier' }],
        }),
        defineField({
            name: 'purchasePrice',
            title: 'Last Purchase Price (per unit)',
            type: 'number',
            description: 'The price per unit at the last recorded purchase.',
            validation: (Rule) => Rule.min(0),
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
            rows: 3,
        }),
        defineField({
            name: 'imageUrl',
            title: 'Item Image',
            type: 'image',
            options: {
                hotspot: true,
            },
        }),
        defineField({
            name: 'isActive',
            title: 'Is Active',
            type: 'boolean',
            description: 'Whether this item is currently actively stocked and tracked.',
            initialValue: true,
        }),
    ],
    preview: {
        select: {
            title: 'name',
            subtitle: 'sku',
            media: 'imageUrl',
        },
        // --- ADDED ORDERINGS ---
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
                name: 'createdAt', // Default ordering by creation date
                title: 'Newest First',
                by: [{ field: '_createdAt', direction: 'desc' }],
            },
            {
                name: 'updatedAt', // Default ordering by update date
                title: 'Recently Updated',
                by: [{ field: '_updatedAt', direction: 'desc' }],
            },
        ],
    },
});