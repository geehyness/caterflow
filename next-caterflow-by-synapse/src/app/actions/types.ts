// types.ts

// Define the interface for an individual action step within a workflow
export interface ActionStep {
    title: string;
    description: string;
    completed: boolean;
    required: boolean;
}

// Define the OrderedItem interface with the supplier object
export interface OrderedItem {
    _key: string;
    stockItem: {
        _id?: string;
        name: string;
    };
    orderedQuantity: number;
    unitPrice: number;
    supplier?: {
        _id?: string;
        name: string;
    };
}

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
    workflow?: ActionStep[];
    completedSteps?: number;
    // status is now a required property
    status: string;
    poNumber?: string;
    supplierName?: string;
    // Add the supplier object property
    supplier?: {
        name: string;
        _id?: string;
    };
    orderedBy?: string;
    orderedItems?: OrderedItem[]; // Using the new OrderedItem interface
    // Add these fields for GoodsReceipt actions
    receiptNumber?: string;
    purchaseOrder?: string;
    receivingBin?: string;
    receivedItems?: any[];
}

export interface PurchaseOrder {
    _id: string;
    _type: string;
    _createdAt: string;
    poNumber: string;
    status: string;
    site: {
        _id: string;
        name: string;
    };
    supplier: {
        _id: string;
        name: string;
    };
    orderedItems: OrderedItem[];
    orderedBy: string;
    totalAmount: number;
}


export interface GoodsReceipt {
    _id: string;
    purchaseOrder?: {
        _ref: string;
    };
}

export const generateWorkflow = (actionType: string, status: string = 'draft', completedSteps: number = 0): ActionStep[] => {
    switch (actionType) {
        case 'PurchaseOrder':
            return []; // Remove workflow steps for purchase orders
        case 'GoodsReceipt':
            return [
                {
                    title: 'Complete Goods Receipt',
                    description: 'Record received items, batch numbers, and stock levels in the Goods Receipt Modal.',
                    completed: completedSteps > 0,
                    required: true
                },
            ];
        case 'StockAdjustment':
            return [
                { title: 'Review Adjustment Reason', description: 'Confirm the reason for the stock adjustment.', completed: completedSteps > 0, required: true },
                { title: 'Update Stock Levels', description: 'Adjust the item quantities in the system.', completed: completedSteps > 1, required: true },
            ];
        default:
            return [];
    }
};

export const actionTypeTitles: { [key: string]: string } = {
    'PurchaseOrder': 'Purchase Orders',
    'GoodsReceipt': 'Goods Receipts',
    'InternalTransfer': 'Internal Transfers',
    'StockAdjustment': 'Stock Adjustments',
};