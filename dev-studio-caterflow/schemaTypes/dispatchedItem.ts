// schemas/dispatchedItem.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'DispatchedItem',
    title: 'Dispatched Item',
    type: 'object',
    fields: [
        defineField({
            name: 'stockItem',
            title: 'Stock Item',
            type: 'reference',
            to: [{ type: 'StockItem' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'dispatchedQuantity',
            title: 'Dispatched Quantity',
            type: 'number',
            validation: (Rule) => Rule.required().min(0), // Removed .integer()
        }),
        defineField({
            name: 'totalCost',
            title: 'Total Cost',
            type: 'number',
            description: 'This value is calculated automatically and cannot be edited.',
            readOnly: true, // Prevents manual editing
        }),
    ],
    preview: {
        select: {
            title: 'stockItem.name',
            subtitle: 'dispatchedQuantity',
            unit: 'stockItem.unitOfMeasure',
        },
        prepare({ title, subtitle, unit }) {
            return {
                title: title,
                subtitle: `${subtitle} ${unit}`,
            };
        },
    },
});