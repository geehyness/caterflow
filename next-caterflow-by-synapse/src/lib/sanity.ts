// src/lib/sanity.ts
import { createClient } from 'next-sanity';
import imageUrlBuilder from '@sanity/image-url';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';

// ✅ Public read client (safe in browser)
export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-08-20',
  useCdn: true,
});

// ✅ Write client (server-only, never use NEXT_PUBLIC here)
export const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-08-20',
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
});

// ✅ Image helper
const builder = imageUrlBuilder(client);
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// ✅ Helper function for optimistic updates
export const createOptimisticPatch = (documentId: string, updates: any) => {
  return {
    _id: documentId,
    ...updates,
    _updatedAt: new Date().toISOString(),
  };
};