// schemas/appUser.js
import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'AppUser',
    title: 'Application User',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Full Name',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'email',
            title: 'Email Address',
            type: 'string',
            validation: (Rule) => Rule.required().unique(),
            description: 'Must be unique and correspond to the user\'s login email in your Next.js app.',
        }),
        defineField({
            name: 'role',
            title: 'User Role',
            type: 'string',
            options: {
                list: [
                    { title: 'Admin', value: 'admin' },
                    { title: 'Site Manager', value: 'siteManager' },
                    { title: 'Stock Controller', value: 'stockController' },
                    { title: 'Dispatch Staff', value: 'dispatchStaff' },
                    { title: 'Auditor', value: 'auditor' },
                ],
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'associatedSite',
            title: 'Associated Site',
            type: 'reference',
            to: [{ type: 'Site' }],
            description: 'For Site Managers, links them to their specific site; optional for others.',
            hidden: ({ document }) => document?.role !== 'siteManager',
        }),
        defineField({
            name: 'isActive',
            title: 'Is Active',
            type: 'boolean',
            description: 'Whether this user account is active in the application.',
            initialValue: true,
        }),
        defineField({
            name: 'profileImage',
            title: 'Profile Image',
            type: 'image',
            options: {
                hotspot: true,
            },
        }),
    ],
    preview: {
        select: {
            title: 'name',
            subtitle: 'role',
            media: 'profileImage',
        },
        prepare({ title, subtitle, media }) {
            return {
                title: title,
                subtitle: `Role: ${subtitle}`,
                media: media,
            };
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
                name: 'role',
                title: 'Role',
                by: [{ field: 'role', direction: 'asc' }],
            },
            {
                name: 'email',
                title: 'Email',
                by: [{ field: 'email', direction: 'asc' }],
            },
        ],
    },
});