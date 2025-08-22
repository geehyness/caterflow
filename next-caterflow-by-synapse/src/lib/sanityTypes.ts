// src/lib/sanityTypes.ts
export interface SanityDocument {
    _id: string;
    _type: string;
    _createdAt: string;
    _updatedAt: string;
    _rev: string;
}

export interface StockItem extends SanityDocument {
    _type: 'StockItem';
    name: string;
    sku: string;
    itemType: 'food' | 'nonFood';
    category: { _ref: string; _type: 'reference' };
    unitOfMeasure: string;
    imageUrl?: string;
    description?: string;
    supplier?: { _ref: string; _type: 'reference' };
    minimumStockLevel: number;
    reorderQuantity?: number;
}

export interface AppUser extends SanityDocument {
    _type: 'AppUser';
    name: string;
    email: string;
    role: 'admin' | 'siteManager' | 'stockController' | 'dispatchStaff' | 'auditor';
    associatedSite?: { _ref: string; _type: 'reference' };
    isActive: boolean;
    profileImage?: any;
}

// Add interfaces for all your schema types...