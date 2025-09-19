// schemas/sanityTypes.ts

import type { SanityDocument, ImageAsset, SlugValue, FileValue, Reference } from 'sanity';

// Export Reference along with other types
export type { Reference };

//
// Updated or new interfaces for document schemas
//

// New interface for the Category schema
export interface Category extends SanityDocument {
    _type: 'Category';
    title: string;
    description?: string;
}

// New interface for the Supplier schema
export interface Supplier extends SanityDocument {
    _type: 'Supplier';
    name: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    terms?: string;
}

// New interface for the StockItem schema
export interface StockItem extends SanityDocument {
    _type: 'StockItem';
    name: string;
    sku: string;
    category: Reference;
    unitOfMeasure: string;
    supplier?: Reference;
    minimumStockLevel?: number;
    isArchived: boolean;
    image?: ImageAsset;
    notes?: string;
}

// New interface for the Site schema
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

// New interface for the Bin schema
export interface Bin extends SanityDocument {
    _type: 'Bin';
    name: string;
    site: Reference;
    locationDescription?: string;
    capacity?: number;
    binType: 'main-storage' | 'overflow-storage' | 'refrigerator' | 'freezer' | 'dispensing-point' | 'receiving-area';
}

// Updated interface for AppUser to include all fields
export interface AppUser extends SanityDocument {
    _type: 'AppUser';
    name: string;
    email: string;
    role: 'admin' | 'siteManager' | 'stockController' | 'dispatchStaff' | 'auditor';
    site?: Reference;
    isActive: boolean;
    profileImage?: ImageAsset;
}

// New interface for the PurchaseOrder schema
export interface PurchaseOrder extends SanityDocument {
    _type: 'PurchaseOrder';
    poNumber: string;
    orderDate: string;
    orderedBy: Reference;
    orderedItems: OrderedItem[];
    status: 'draft' | 'ordered' | 'partially-received' | 'received' | 'cancelled';
    notes?: string;
}

// New interface for the GoodsReceipt schema
export interface GoodsReceipt extends SanityDocument {
    _type: 'GoodsReceipt';
    receiptNumber: string;
    receiptDate: string;
    purchaseOrder?: Reference;
    receivedFrom?: string;
    receivingBin: Reference;
    receivedItems: ReceivedItem[];
    receivedBy: Reference;
    evidenceStatus?: 'pending' | 'partial' | 'complete';
    notes?: string;
}

// New interface for the DispatchType schema
export interface DispatchType extends SanityDocument {
    _type: 'DispatchType';
    name: string;
    description?: string;
    defaultTime?: string;
    isActive: boolean;
}

// New interface for the DispatchLog schema
export interface DispatchLog extends SanityDocument {
    _type: 'DispatchLog';
    dispatchNumber: string;
    dispatchDate: string;
    dispatchType: Reference;
    sourceBin: Reference;
    destinationBin: Reference;
    dispatchedItems: DispatchedItem[];
    dispatchedBy: Reference;
    peopleFed: number;
    evidenceStatus?: 'pending' | 'partial' | 'complete';
    notes?: string;
    attachments?: Reference[];
}

// New interface for the InternalTransfer schema
export interface InternalTransfer extends SanityDocument {
    _type: 'InternalTransfer';
    transferNumber: string;
    transferDate: string;
    transferredItems: TransferredItem[];
    fromBin: Reference;
    toBin: Reference;
    transferredBy: Reference;
    evidenceStatus?: 'pending' | 'partial' | 'complete';
    notes?: string;
    status: 'pending' | 'completed' | 'cancelled';
}

// New interface for the StockAdjustment schema
export interface StockAdjustment extends SanityDocument {
    _type: 'StockAdjustment';
    adjustmentNumber: string;
    adjustmentDate: string;
    bin: Reference;
    adjustmentType: 'add' | 'subtract' | 'transfer';
    adjustedItems: AdjustedItem[];
    adjustedBy: Reference;
    evidenceStatus?: 'pending' | 'partial' | 'complete';
    notes?: string;
}

// New interface for the InventoryCount schema
export interface InventoryCount extends SanityDocument {
    _type: 'InventoryCount';
    countNumber: string;
    countDate: string;
    countedBy: Reference;
    bin: Reference;
    status: 'pending' | 'completed' | 'on-hold';
    countedItems: CountedItem[];
    notes?: string;
}

export interface NotificationPreference extends SanityDocument {
    _type: 'NotificationPreference';
    title: string;
    description?: string;
    isEnabled: boolean;
    thresholdValue?: number;
    notificationChannels: ('email' | 'sms')[];
    appliesToRoles: ('admin' | 'siteManager' | 'stockController' | 'dispatchStaff' | 'auditor')[];
}

export interface FileAttachment extends SanityDocument {
    _type: 'FileAttachment';
    fileName: string;
    fileType: 'invoice' | 'receipt' | 'photo' | 'contract' | 'delivery-note' | 'quality-check' | 'other';
    file: FileValue;
    uploadedBy: Reference;
    uploadedAt: string;
    description?: string;
    relatedTo: Reference;
    isArchived: boolean;
}

// Interface for nested object schemas

export interface OrderedItem {
    _type: 'OrderedItem';
    _key: string;
    stockItem: Reference;
    supplier: Reference;
    orderedQuantity: number;
    unitPrice: number;
}

export interface ReceivedItem {
    _type: 'ReceivedItem';
    _key: string;
    stockItem: Reference;
    receivedQuantity: number;
    batchNumber?: string;
    expiryDate?: string;
    condition: 'good' | 'damaged' | 'short-shipped' | 'over-shipped';
}

// Updated interface for DispatchedItem
export interface DispatchedItem {
    _type: 'DispatchedItem';
    _key: string;
    stockItem: Reference;
    dispatchedQuantity: number;
    totalCost?: number;
    notes?: string;
}

export interface AdjustedItem {
    _type: 'AdjustedItem';
    _key: string;
    stockItem: Reference;
    adjustedQuantity: number;
    reason: string;
}

export interface CountedItem {
    _type: 'CountedItem';
    _key: string;
    stockItem: Reference;
    countedQuantity: number;
    systemQuantityAtCountTime?: number;
    variance?: number;
}

export interface TransferredItem {
    _type: 'TransferredItem';
    _key: string;
    stockItem: Reference;
    transferredQuantity: number;
}

// Interface for pending actions used in the Actions page
export interface PendingAction {
    _id: string;
    _type: string;
    title: string;
    description: string;
    createdAt: string;
    priority: 'high' | 'medium' | 'low';
    siteName: string;
    actionType: string;
    evidenceRequired: boolean;
    evidenceTypes?: string[];
    evidenceStatus?: 'pending' | 'partial' | 'complete';
    attachments?: any[];
    workflow?: {
        title: string;
        description: string;
        completed: boolean;
        required: boolean;
    }[];
    completedSteps?: number;
    status?: string;
    poNumber?: string;
    supplierName?: string;
    orderedItems?: Array<{
        _key: string;
        stockItem: {
            name: string;
        };
        orderedQuantity: number;
        unitPrice: number;
    }>;
}