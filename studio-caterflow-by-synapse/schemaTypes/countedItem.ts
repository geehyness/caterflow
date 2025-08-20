// schemas/countedItem.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'CountedItem', // Capitalized for consistency
    title: 'Counted Item',
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
            name: 'countedQuantity',
            title: 'Counted Quantity',
            type: 'number',
            validation: (Rule) => Rule.required().min(0).integer(),
        }),
        defineField({
            name: 'systemQuantityAtCountTime',
            title: 'System Quantity (at count time)',
            type: 'number',
            readOnly: true,
            description: 'The quantity recorded in the system when the count was initiated. (Populated by app)',
        }),
        defineField({
            name: 'variance',
            title: 'Variance',
            type: 'number',
            readOnly: true,
            description: 'Difference between Counted Quantity and System Quantity.',
        }),
    ],
    preview: {
        select: {
            title: 'stockItem.name',
            subtitle: 'countedQuantity',
            unit: 'stockItem.unitOfMeasure',
            variance: 'variance',
        },
        prepare({ title, subtitle, unit, variance }) {
            const varianceText = variance !== undefined ? ` (Variance: ${variance})` : '';
            return {
                title: title,
                subtitle: `${subtitle} ${unit}${varianceText}`,
            };
        },
    },
});