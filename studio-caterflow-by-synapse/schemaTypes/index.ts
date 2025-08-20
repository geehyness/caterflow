// schemas/index.js (or schema.js)
import stockItem from './stockItem';
import category from './category';
import site from './site'; // No change needed here for import path or variable name
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
    site, // This refers to the imported 'site' object, which internally has name: 'Site'
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

    // Nested object types (if defined as separate files)
    orderedItem,
    receivedItem,
    dispatchedItem,
    transferredItem,
    adjustedItem,
    countedItem,
];