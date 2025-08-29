// src/lib/sanityTypes.ts
import type { SanityDocument, ImageAsset, SlugValue, FileValue, Reference } from 'sanity';

// Export Reference along with other types
export type { Reference };

// Interfaces for nested object schemas
export interface OrderedItem {
    _type: 'OrderedItem';
    stockItem: Reference;
    orderedQuantity: number;
    unitPrice: number;
}

export interface ReceivedItem {
    _type: 'ReceivedItem';
    stockItem: Reference;
    receivedQuantity: number;
    batchNumber?: string;
    expiryDate?: string;
    condition: 'good' | 'damaged' | 'short-shipped' | 'over-shipped';
}

export interface DispatchedItem {
    _type: 'DispatchedItem';
    stockItem: Reference;
    dispatchedQuantity: number;
    totalCost?: number;
}

export interface AdjustedItem {
    _type: 'AdjustedItem';
    stockItem: Reference;
    adjustedQuantity: number;
    reason: string;
}

export interface CountedItem {
    _type: 'CountedItem';
    stockItem: Reference;
    countedQuantity: number;
    systemQuantityAtCountTime?: number;
    variance?: number;
}

export interface TransferredItem {
    _type: 'TransferredItem';
    stockItem: Reference;
    transferredQuantity: number;
}

// Interfaces for document schemas
export interface StockItem extends SanityDocument {
    _type: 'StockItem';
    name: string;
    sku: string;
    itemType: 'food' | 'nonFood';
    category: Reference;
    unitOfMeasure: string;
    imageUrl?: string;
    description?: string;
    supplier?: Reference;
    minimumStockLevel: number;
    reorderQuantity?: number;
}

export interface AppUser extends SanityDocument {
    _type: 'AppUser';
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'siteManager' | 'stockController' | 'dispatchStaff' | 'auditor';
    associatedSite?: Reference;
    isActive: boolean;
    profileImage?: ImageAsset;
}

export interface Category extends SanityDocument {
    _type: 'Category';
    title: string;
    description?: string;
}

export interface Site extends SanityDocument {
    _type: 'Site';
    name: string;
    code: SlugValue;
    location?: string;
    manager?: Reference;
    contactNumber?: string;
    email?: string;
    patientCount?: number;
}

export interface Bin extends SanityDocument {
    _type: 'Bin';
    name: string;
    site: Reference;
    locationDescription?: string;
    capacity?: number;
    binType: 'main-storage' | 'overflow-storage' | 'refrigerator' | 'freezer' | 'dispensing-point' | 'receiving-area';
}

export interface Supplier extends SanityDocument {
    _type: 'Supplier';
    name: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    terms?: string;
}

export interface PurchaseOrder extends SanityDocument {
    _type: 'PurchaseOrder';
    poNumber: string;
    supplier: Reference;
    orderDate: string;
    poItems: OrderedItem[];
    status: 'draft' | 'pending' | 'partially-received' | 'received' | 'cancelled';
    notes?: string;
}

export interface GoodsReceipt extends SanityDocument {
    _type: 'GoodsReceipt';
    receiptNumber: string;
    receiptDate: string;
    purchaseOrder?: Reference;
    receivingBin: Reference;
    receivedItems: ReceivedItem[];
    notes?: string;
}

export interface DispatchLog extends SanityDocument {
    _type: 'DispatchLog';
    dispatchNumber: string;
    dispatchDate: string;
    sourceBin: Reference;
    destinationSite: Reference;
    dispatchedItems: DispatchedItem[];
    notes?: string;
}

export interface InternalTransfer extends SanityDocument {
    _type: 'InternalTransfer';
    transferNumber: string;
    transferDate: string;
    fromBin: Reference;
    toBin: Reference;
    transferredItems: TransferredItem[];
    status: 'pending' | 'completed' | 'cancelled';
}

export interface StockAdjustment extends SanityDocument {
    _type: 'StockAdjustment';
    adjustmentNumber: string;
    adjustmentDate: string;
    adjustmentType: 'addition' | 'reduction' | 'correction';
    bin: Reference;
    reason: string;
    adjustedBy: Reference;
    adjustedItems: AdjustedItem[];
    notes?: string;
}

export interface InventoryCount extends SanityDocument {
    _type: 'InventoryCount';
    countNumber: string;
    countDate: string;
    bin: Reference;
    countedBy: Reference;
    countedItems: CountedItem[];
    notes?: string;
}

export interface NotificationPreference extends SanityDocument {
    _type: 'NotificationPreference';
    title: string;
    description?: string;
    isEnabled: boolean;
    thresholdValue?: number;
    notificationChannels: string[];
    roles: ('admin' | 'siteManager' | 'stockController' | 'dispatchStaff' | 'auditor')[];
}