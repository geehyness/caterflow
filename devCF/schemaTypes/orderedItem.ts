// schemas/orderedItem.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'OrderedItem', // Capitalized for consistency
    title: 'Ordered Item',
    type: 'object',
    fields: [
        defineField({
            name: 'stockItem',
            title: 'Stock Item',
            type: 'reference',
            to: [{ type: 'StockItem' }], // Consistent capitalization
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'orderedQuantity',
            title: 'Ordered Quantity',
            type: 'number',
            validation: (Rule) => Rule.required().min(1).integer(),
        }),
        defineField({
            name: 'unitPrice',
            title: 'Unit Price',
            type: 'number',
            validation: (Rule) => Rule.required().min(0),
            description: 'Price per unit at the time of order.',
        }),
    ],
    preview: {
        select: {
            title: 'stockItem.name',
            subtitle: 'orderedQuantity',
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