import { createClient } from '@sanity/client';

// Create a single shared client instance
export const client = createClient({
    projectId: 'v3sfsmld',
    dataset: 'production',
    apiVersion: '2025-08-20',
    useCdn: true,
});

export default client;