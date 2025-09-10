// schemas/sanityTypes.ts
import type { SanityDocument, ImageAsset, SlugValue, FileValue, Reference } from 'sanity';

// Export Reference along with other types
export type { Reference };

// Interfaces for nested object schemas

// Update OrderedItem interface
export interface OrderedItem {
    _type: 'OrderedItem';
    _key: string;
    stockItem: Reference;
    supplier: Reference; // Add this
    orderedQuantity: number;
    unitPrice: number;
    priceManuallyUpdated?: boolean;
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

export interface DispatchedItem {
    _type: 'DispatchedItem';
    _key: string;
    stockItem: Reference;
    dispatchedQuantity: number;
    totalCost?: number;
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
    suppliers?: Reference[];
    primarySupplier?: Reference;
    minimumStockLevel: number;
    reorderQuantity?: number;
    unitPrice?: number;
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
    orderDate: string;
    orderedItems: OrderedItem[];
    status: 'draft' | 'pending-approval' | 'approved' | 'processing' | 'partially-received' | 'complete' | 'cancelled';
    expectedDeliveryDate?: string;
    totalAmount?: number;
    orderedBy: Reference;
    approvedBy?: Reference;
    approvedAt?: string;
    attachments?: Reference[];
    evidenceStatus: 'pending' | 'partial' | 'complete';
    notes?: string;
    completedSteps?: number;
}

export interface GoodsReceipt extends SanityDocument {
    _type: 'GoodsReceipt';
    receiptNumber: string;
    receiptDate: string;
    purchaseOrder?: Reference;
    receivedBy: Reference;
    receivingBin: Reference;
    receivedItems: ReceivedItem[];
    attachments?: Reference[];
    evidenceStatus: 'pending' | 'partial' | 'complete';
    notes?: string;
    completedSteps?: number;
}

export interface DispatchLog extends SanityDocument {
    _type: 'DispatchLog';
    dispatchNumber: string;
    dispatchDate: string;
    sourceBin: Reference;
    destinationSite: Reference;
    dispatchedBy: Reference;
    dispatchedItems: DispatchedItem[];
    attachments?: Reference[];
    evidenceStatus: 'pending' | 'partial' | 'complete';
    notes?: string;
    completedSteps?: number;
}

export interface InternalTransfer extends SanityDocument {
    _type: 'InternalTransfer';
    transferNumber: string;
    transferDate: string;
    fromBin: Reference;
    toBin: Reference;
    transferredBy: Reference;
    transferredItems: TransferredItem[];
    notes?: string;
    status: 'pending' | 'completed' | 'cancelled';
    completedSteps?: number;
}

export interface StockAdjustment extends SanityDocument {
    _type: 'StockAdjustment';
    adjustmentNumber: string;
    adjustmentDate: string;
    adjustedBy: Reference;
    bin: Reference;
    adjustmentType: 'loss' | 'wastage' | 'expiry' | 'damage' | 'inventory-correction' | 'theft' | 'positive-adjustment';
    adjustedItems: AdjustedItem[];
    attachments?: Reference[];
    evidenceStatus: 'pending' | 'partial' | 'complete';
    notes?: string;
    completedSteps?: number;
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
    site?: string;
    fromSite?: string;
    toSite?: string;
    orderedBy?: string;
}