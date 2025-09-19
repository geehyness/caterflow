// schemas/dispatchType.ts
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'DispatchType',
    title: 'Dispatch Type',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Dispatch Type Name',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
            rows: 3,
        }),
        defineField({
            name: 'defaultTime',
            title: 'Default Time',
            type: 'string',
            description: 'Default time for this dispatch type (e.g., "07:00" for Breakfast)',
        }),
        defineField({
            name: 'isActive',
            title: 'Active',
            type: 'boolean',
            initialValue: true,
            description: 'Whether this dispatch type is currently active',
        }),
    ],
    preview: {
        select: {
            title: 'name',
            subtitle: 'description',
        },
        prepare({ title, subtitle }) {
            return {
                title: title,
                subtitle: subtitle || 'No description',
            };
        },
    },
});