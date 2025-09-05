// Define the interface for an individual action step within a workflow
export interface ActionStep {
    title: string;
    description: string;
    completed: boolean;
    required: boolean;
}

// Define the interface for a pending action document
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

// Update the interface for the add item modal to match the API response
export interface StockItem {
    _id: string;
    name: string;
    sku: string;
    unitPrice: number;
    unitOfMeasure: string;
    category?: {
        _id: string;
        title: string;
    };
    itemType?: string;
}

// Update interface for Category to use 'title'
export interface Category {
    _id: string;
    title: string;
}

// Helper function to generate a specific workflow based on the action type
export const generateWorkflow = (actionType: string, status: string = 'draft', completedSteps: number = 0): ActionStep[] => {
    switch (actionType) {
        case 'PurchaseOrder':
            return [
                {
                    title: 'Finalize Order Details',
                    description: 'Review and confirm the items, quantities, and prices before submitting.',
                    completed: completedSteps > 0,
                    required: true
                },
                {
                    title: 'Submit for Approval',
                    description: 'Send the purchase order to a manager for approval.',
                    completed: completedSteps > 1,
                    required: true
                }
            ];
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