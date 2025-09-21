// schemas/index.ts
import stockItem from './stockItem';
import category from './category';
import site from './site';
import bin from './bin';
import supplier from './supplier';
import purchaseOrder from './purchaseOrder';
import goodsReceipt from './goodsReceipt';
import dispatchLog from './dispatchLog';
import internalTransfer from './internalTransfer';
import stockAdjustment from './stockAdjustment';
import inventoryCount from './inventoryCount';
import appUser from './appUser';
import notificationPreference from './notificationPreference';
import fileAttachment from './fileAttachment';
import dispatchType from './dispatchType'; // Add this import

// Nested object schemas
import orderedItem from './orderedItem';
import receivedItem from './receivedItem';
import dispatchedItem from './dispatchedItem';
import adjustedItem from './adjustedItem';
import countedItem from './countedItem';
import transferredItem from './transferredItem';

export const schemaTypes = [
    // Document types
    stockItem,
    category,
    site,
    bin,
    supplier,
    purchaseOrder,
    goodsReceipt,
    dispatchLog,
    internalTransfer,
    stockAdjustment,
    inventoryCount,
    appUser,
    notificationPreference,
    fileAttachment,
    dispatchType, // Add this

    // Nested object types
    orderedItem,
    receivedItem,
    dispatchedItem,
    transferredItem,
    adjustedItem,
    countedItem,
];