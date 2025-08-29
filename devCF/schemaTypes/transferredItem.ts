// schemas/transferredItem.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'TransferredItem', // Capitalized for consistency
    title: 'Transferred Item',
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
            name: 'transferredQuantity',
            title: 'Transferred Quantity',
            type: 'number',
            validation: (Rule) => Rule.required().min(1).integer(),
        }),
    ],
    preview: {
        select: {
            title: 'stockItem.name',
            subtitle: 'transferredQuantity',
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