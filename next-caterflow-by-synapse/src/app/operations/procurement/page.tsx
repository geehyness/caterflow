'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Box,
    Heading,
    Button,
    Flex,
    Spinner,
    useDisclosure,
    useToast,
    useColorModeValue,
    Card,
    CardBody,
    Input,
    InputGroup,
    InputLeftElement,
    Badge,
    Text,
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    VStack,
    Icon,
    HStack,
    Select,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Switch,
    Tooltip,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    NumberInput,
    NumberInputField,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEye, FiFilter, FiEdit, FiInfo, FiCheck } from 'react-icons/fi';
import DataTable from '@/app/actions/DataTable';
import { useSession } from 'next-auth/react';
import CreatePurchaseOrderModal from '@/app/actions/CreatePurchaseOrderModal';
import PurchaseOrderModal, { PurchaseOrderDetails } from '@/app/actions/PurchaseOrderModal';
import { PendingAction } from '@/app/actions/types';
import { StockItem, Category, Site } from '@/lib/sanityTypes';


interface PurchaseOrder {
    _id: string;
    poNumber: string;
    orderDate: string;
    status: string;
    site: { _id: string; name: string };
    orderedItems: Array<{
        _key: string;
        orderedQuantity: number;
        unitPrice: number;
        stockItem: {
            _id: string;
            name: string;
            sku?: string;
            unitOfMeasure: string;
            primarySupplier?: { _id: string; name: string } | null;
            suppliers?: Array<{ _ref: string }>;
        };
        supplier?: { _id: string; name: string } | null;
    }>;
    totalAmount: number;
    supplierNames?: string;
}

interface Supplier {
    _id: string;
    name: string;
}

type StockItemWithSupplier = PurchaseOrder['orderedItems'][0]['stockItem'] & {
    suppliersList?: Supplier[];
};


export default function ProcurementPage() {
    const { data: session, status } = useSession();
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stockItems, setStockItems] = useState<{ [key: string]: StockItemWithSupplier }>({});
    const [editedSuppliers, setEditedSuppliers] = useState<{ [key: string]: string | undefined }>({});
    const [editedPrices, setEditedPrices] = useState<{ [key: string]: number | undefined }>({});
    const [defaultSupplierFlags, setDefaultSupplierFlags] = useState<{ [key: string]: boolean }>({});


    // Theming props - ALL HOOK CALLS MUST BE AT THE TOP LEVEL
    const bgPrimary = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const bgCard = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const accentColor = useColorModeValue('brand.500', 'brand.300');
    const errorBg = useColorModeValue('red.50', 'red.900');
    const errorTextColor = useColorModeValue('red.500', 'red.300');
    const warningAlertBg = useColorModeValue('yellow.50', 'yellow.900');
    const warningAlertTitleColor = useColorModeValue('yellow.800', 'yellow.100');
    const warningAlertDescriptionColor = useColorModeValue('yellow.700', 'yellow.200');
    const hoverColor = useColorModeValue('gray.50', 'gray.700');

    const infoAlertBg = useColorModeValue('blue.50', 'blue.900');
    const infoAlertTitleColor = useColorModeValue('blue.800', 'blue.100');
    const infoAlertDescriptionColor = useColorModeValue('blue.700', 'blue.200');


    /* ---------- Fetch helpers ---------- */

    const fetchApprovedPOs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/purchase-orders?status=approved');
            if (!response.ok) throw new Error('Failed to fetch purchase orders');
            const data = await response.json();
            setPurchaseOrders(data);
        } catch (err) {
            console.error(err);
            toast({
                title: 'Error',
                description: 'Failed to load purchase orders',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchSuppliers = useCallback(async () => {
        try {
            const res = await fetch('/api/suppliers');
            if (!res.ok) throw new Error('Failed to fetch suppliers');
            const data = await res.json();
            setSuppliers(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchStockItemDetails = useCallback(async (itemId: string) => {
        try {
            const response = await fetch(`/api/procurement/stock-items?id=${itemId}`);
            if (!response.ok) throw new Error('Failed to fetch stock item details');
            const data = await response.json();
            const suppliersList = (data.suppliers || []).map((s: any) => ({ _id: s._id, name: s.name }));
            setStockItems(prev => ({
                ...prev,
                [itemId]: { ...data, suppliersList, primarySupplier: data.primarySupplier || null },
            }));
            return { ...data, suppliersList };
        } catch (err) {
            console.error(err);
            return null;
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchApprovedPOs();
            fetchSuppliers();
        }
    }, [status, fetchApprovedPOs, fetchSuppliers]);

    /* ---------- Server helpers (client calls) ---------- */

    const addSupplierToStockItem = async (itemId: string, supplierId: string) => {
        try {
            const resp = await fetch('/api/procurement/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, supplierId }),
            });

            if (!resp.ok) {
                const errorData = await resp.json().catch(() => ({}));
                // If supplier already exists, that's fine - we can continue
                if (errorData.error && errorData.error.includes('already exists')) {
                    return { success: true, message: 'Supplier already exists' };
                }
                throw new Error(errorData.error || 'Failed to add supplier to stock item');
            }

            const json = await resp.json();

            // Update local state to reflect the change
            setStockItems(prev => {
                const s = prev[itemId];
                if (!s) return prev;
                const newSuppliersList = [...(s.suppliersList || [])];
                if (!newSuppliersList.find(x => x._id === supplierId)) {
                    newSuppliersList.push({
                        _id: supplierId,
                        name: suppliers.find(x => x._id === supplierId)?.name || ''
                    });
                }
                return {
                    ...prev,
                    [itemId]: { ...s, suppliersList: newSuppliersList }
                };
            });

            return json;
        } catch (err) {
            console.error('addSupplierToStockItem error:', err);
            throw err;
        }
    };

    const setPrimarySupplierAPI = async (itemId: string, supplierId: string) => {
        try {
            const resp = await fetch('/api/procurement/primary-supplier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, supplierId }),
            });
            if (!resp.ok) {
                const j = await resp.json().catch(() => ({}));
                throw new Error(j?.error || 'Failed to set primary supplier');
            }
            const json = await resp.json();
            setStockItems(prev => {
                const s = prev[itemId];
                if (!s) return prev;
                return {
                    ...prev,
                    [itemId]: { ...s, primarySupplier: { _id: supplierId, name: suppliers.find(x => x._id === supplierId)?.name || '' } }
                };
            });
            return json;
        } catch (err) {
            console.error('setPrimarySupplierAPI error:', err);
            throw err;
        }
    };

    const unsetPrimarySupplierAPI = async (itemId: string) => {
        try {
            const resp = await fetch('/api/procurement/stock-items', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, updates: { primarySupplier: null } }),
            });
            if (!resp.ok) {
                const j = await resp.json().catch(() => ({}));
                throw new Error(j?.error || 'Failed to unset primary supplier');
            }
            setStockItems(prev => {
                const s = prev[itemId];
                if (!s) return prev;
                return {
                    ...prev,
                    [itemId]: { ...s, primarySupplier: null }
                };
            });
            return await resp.json();
        } catch (err) {
            console.error('unsetPrimarySupplierAPI error:', err);
            throw err;
        }
    };

    const updateStockItemUnitPrice = async (itemId: string, unitPrice: number) => {
        try {
            const resp = await fetch('/api/procurement/stock-items', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, updates: { unitPrice } }),
            });
            if (!resp.ok) {
                const j = await resp.json().catch(() => ({}));
                throw new Error(j?.error || 'Failed to update stock item price');
            }
            const json = await resp.json();
            setStockItems(prev => {
                const s = prev[itemId];
                if (!s) return prev;
                return {
                    ...prev,
                    [itemId]: { ...s, unitPrice }
                };
            });
            return json;
        } catch (err) {
            console.error('updateStockItemUnitPrice error:', err);
            throw err;
        }
    };

    const updatePurchaseOrderItems = async (poId: string, updates: Array<{ itemKey: string; newPrice?: number; newQuantity?: number; supplierId?: string }>) => {
        try {
            const resp = await fetch('/api/purchase-orders/update-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poId, updates }),
            });

            if (!resp.ok) {
                const j = await resp.json().catch(() => ({}));
                throw new Error(j?.error || 'Failed to update purchase order items');
            }

            const json = await resp.json();
            return json;
        } catch (err) {
            console.error('updatePurchaseOrderItems error:', err);
            throw err;
        }
    };

    /* ---------- Modal actions ---------- */

    const handleEditPO = useCallback(async (po: PurchaseOrder) => {
        setSelectedPO(po);

        const initialSuppliers: { [key: string]: string | undefined } = {};
        const initialPrices: { [key: string]: number | undefined } = {};
        const initialDefaultFlags: { [key: string]: boolean } = {};

        for (const item of po.orderedItems) {
            let itemDetails = stockItems[item.stockItem._id];
            if (!itemDetails) {
                const fetched = await fetchStockItemDetails(item.stockItem._id);
                itemDetails = fetched || undefined;
            }

            initialSuppliers[item._key] = item.supplier?._id;
            initialPrices[item._key] = item.unitPrice > 0 ? item.unitPrice * item.orderedQuantity : undefined;

            // Check if the selected supplier is the primary supplier
            const selectedSupplierId = item.supplier?._id;
            const isPrimary = !!(itemDetails?.primarySupplier?._id && selectedSupplierId === itemDetails.primarySupplier._id);
            initialDefaultFlags[item._key] = isPrimary;

            // If we have item details but no supplier is selected yet, pre-select the primary supplier if it exists
            if (itemDetails?.primarySupplier && !selectedSupplierId) {
                initialSuppliers[item._key] = itemDetails.primarySupplier._id;
                initialDefaultFlags[item._key] = true;
            }
        }

        setEditedSuppliers(initialSuppliers);
        setEditedPrices(initialPrices);
        setDefaultSupplierFlags(initialDefaultFlags);
        onEditModalOpen();
    }, [fetchStockItemDetails, onEditModalOpen, stockItems]);

    const handleSupplierChange = (itemKey: string, supplierId: string, stockItemId: string) => {
        setEditedSuppliers(prev => ({ ...prev, [itemKey]: supplierId }));

        const itemDetails = stockItems[stockItemId];
        if (itemDetails?.primarySupplier?._id === supplierId) {
            setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: true }));
        } else {
            setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: false }));
        }
    };

    // Add this function with your other helper functions
    const formatCurrencyInput = (value: string) => {
        if (!value) return '';

        // Remove any non-numeric characters except decimal point
        const cleaned = value.replace(/[^\d.]/g, '');

        // Ensure only one decimal point
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            return parts[0] + '.' + parts.slice(1).join('');
        }

        // Limit to 2 decimal places
        if (parts[1] && parts[1].length > 2) {
            return parts[0] + '.' + parts[1].substring(0, 2);
        }

        return cleaned;
    };

    // Update your handlePriceChange function to use this formatter:
    const handlePriceChange = (itemKey: string, value: string) => {
        const formattedValue = formatCurrencyInput(value);
        const valueAsNumber = parseFloat(formattedValue);
        setEditedPrices(prev => ({ ...prev, [itemKey]: isNaN(valueAsNumber) ? undefined : valueAsNumber }));
    };

    const handleDefaultSupplierToggle = async (itemKey: string, stockItemId: string, checked: boolean) => {
        const supplierId = editedSuppliers[itemKey];

        if (!supplierId) {
            toast({
                title: 'Select supplier first',
                description: 'Choose a supplier before marking as default.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: false }));
            return;
        }

        try {
            // First ensure the supplier is added to the stock item
            await addSupplierToStockItem(stockItemId, supplierId);

            if (checked) {
                // Set as primary supplier
                await setPrimarySupplierAPI(stockItemId, supplierId);
                setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: true }));

                toast({
                    title: 'Default supplier set',
                    description: 'Primary supplier updated for this item.',
                    status: 'success',
                    duration: 2000,
                    isClosable: true,
                });
            } else {
                // Unset primary supplier
                await unsetPrimarySupplierAPI(stockItemId);
                setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: false }));

                toast({
                    title: 'Default supplier unset',
                    description: 'Primary supplier removed for this item.',
                    status: 'info',
                    duration: 2000,
                    isClosable: true,
                });
            }

            // Refresh the stock item data to reflect changes
            await fetchStockItemDetails(stockItemId);

        } catch (err: any) {
            console.error(err);
            toast({
                title: 'Error',
                description: err?.message || 'Failed to update primary supplier.',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
            // Revert the toggle state on error
            setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: !checked }));
        }
    };


    /* ---------- Validation helpers & UI state ---------- */

    const canSaveChanges = () => {
        if (!selectedPO) return false;
        return selectedPO.orderedItems.every(item => {
            const supplier = editedSuppliers[item._key] ?? item.supplier?._id;
            return Boolean(supplier); // Only require supplier, price is optional for saving
        });
    };

    const canProcessPO = () => {
        if (!selectedPO) return false;
        return selectedPO.orderedItems.every(item => {
            const supplier = editedSuppliers[item._key] ?? item.supplier?._id;
            const totalPrice = editedPrices[item._key];
            return Boolean(supplier) && typeof totalPrice === 'number' && totalPrice > 0;
        });
    };

    const getRowError = (item: any) => {
        const supplier = editedSuppliers[item._key] ?? item.supplier?._id;
        const totalPrice = editedPrices[item._key];
        if (!supplier) return 'No supplier selected';
        // Don't require price for saving, only for processing
        return null;
    };

    const getRowWarning = (item: any) => {
        const totalPrice = editedPrices[item._key];
        if (totalPrice === undefined || totalPrice === null) return 'No price entered (required for processing)';
        if (typeof totalPrice !== 'number' || totalPrice <= 0) return 'Enter a valid price (required for processing)';
        return null;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'orange';
            case 'processed': return 'green';
            default: return 'gray';
        }
    };

    const exportSinglePO = async () => {
        if (!selectedPO) return;

        try {
            // First save any changes
            if (canSaveChanges()) {
                await handleSaveChanges();
            }

            // Use current state data to generate PDF
            const poData = {
                ...selectedPO,
                orderedItems: selectedPO.orderedItems.map(item => ({
                    ...item,
                    supplier: editedSuppliers[item._key]
                        ? suppliers.find(s => s._id === editedSuppliers[item._key])
                        : item.supplier,
                    // Don't include prices in export
                    unitPrice: undefined
                }))
            };

            // Generate PDF using browser's print functionality
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                throw new Error('Popup blocked. Please allow popups for this site.');
            }

            const htmlContent = generatePDFHTML(poData, false);

            printWindow.document.write(htmlContent);
            printWindow.document.close();

            // Set the window name for better PDF saving
            printWindow.document.title = `PO-${selectedPO.poNumber}`;

            // Wait for content to load then trigger print
            printWindow.onload = () => {
                printWindow.print();
            };

            toast({
                title: 'PDF Generated',
                description: 'Purchase order PDF is ready for printing/saving',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (err: any) {
            console.error('Export failed:', err);
            toast({
                title: 'Export Failed',
                description: err?.message || 'Failed to generate PDF',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const exportMultiplePOsBySupplier = async () => {
        if (!selectedPO) return;

        try {
            // First save any changes
            if (canSaveChanges()) {
                await handleSaveChanges();
            }

            // Group items by supplier using current state
            const itemsBySupplier: { [supplierId: string]: any[] } = {};

            selectedPO.orderedItems.forEach(item => {
                const supplierId = editedSuppliers[item._key] ?? item.supplier?._id;
                if (supplierId) {
                    if (!itemsBySupplier[supplierId]) {
                        itemsBySupplier[supplierId] = [];
                    }
                    itemsBySupplier[supplierId].push({
                        ...item,
                        // Don't include prices in export
                        unitPrice: undefined
                    });
                }
            });

            // Generate separate PDFs for each supplier
            Object.entries(itemsBySupplier).forEach(([supplierId, items]) => {
                const supplier = suppliers.find(s => s._id === supplierId);
                const supplierPO = {
                    ...selectedPO,
                    orderedItems: items,
                    supplierName: supplier?.name
                };

                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                    throw new Error('Popup blocked. Please allow popups for this site.');
                }

                const htmlContent = generatePDFHTML(supplierPO, true);

                printWindow.document.write(htmlContent);
                printWindow.document.close();

                // Set the window name with PO number and supplier name
                const supplierNameSlug = supplier?.name ? supplier.name.replace(/[^a-zA-Z0-9]/g, '-') : 'supplier';
                printWindow.document.title = `PO-${selectedPO.poNumber}-${supplierNameSlug}`;

                printWindow.onload = () => {
                    printWindow.print();
                };
            });

            toast({
                title: 'PDFs Generated',
                description: 'Purchase orders by supplier are ready for printing',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (err: any) {
            console.error('Export failed:', err);
            toast({
                title: 'Export Failed',
                description: err?.message || 'Failed to generate PDFs',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // HTML generator function for PDF content
    const generatePDFHTML = (poData: any, isSupplierSpecific: boolean) => {
        const totalItems = poData.orderedItems.reduce((sum: number, item: any) => sum + item.orderedQuantity, 0);

        // Create a descriptive title
        let documentTitle = `PO-${poData.poNumber}`;
        if (isSupplierSpecific && poData.supplierName) {
            const supplierSlug = poData.supplierName.replace(/[^a-zA-Z0-9]/g, '-');
            documentTitle += `-${supplierSlug}`;
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <title>${documentTitle}</title>
    <style>
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            margin: 40px; 
            color: #151515;
            background: #F5F7FA;
        }
        .header-container {
            display: flex;
            align-items: center; /* Center vertically */
            margin-bottom: 30px;
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 20px;
            gap: 20px; /* Space between logo and text */
        }
        
        .logo-container {
            flex-shrink: 0;
        }
        
        .logo {
            height: 60px; /* Increased to 60px */
            width: auto;
            opacity: 0.8;
        }
        
        .header-content {
            text-align: left; /* Changed from center to left */
            flex-grow: 1;
        }
        .header-content h1 { 
            margin: 0; 
            color: #0067FF;
            font-size: 28px;
            font-weight: 600;
        }
        .info-section { 
            margin-bottom: 30px;
            background: #FFFFFF;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #E2E8F0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .info-item {
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: 600;
            color: #4A5568;
            font-size: 14px;
        }
        .info-value {
            color: #151515;
            font-weight: 500;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: #FFFFFF;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
            border: 1px solid #E2E8F0;
        }
        .table th {
            background-color: #F7FAFC;
            border: 1px solid #E2E8F0;
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            color: #2D3748;
            font-size: 14px;
        }
        .table td {
            border: 1px solid #E2E8F0;
            padding: 12px 16px;
            color: #4A5568;
            font-size: 14px;
        }
        .table tr:nth-child(even) {
            background-color: #F7FAFC;
        }
        .table tr:hover {
            background-color: #EDF2F7;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E2E8F0;
            font-size: 12px;
            color: #718096;
            text-align: center;
            background: #FFFFFF;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #E2E8F0;
        }
        .caterflow-brand {
            font-size: 11px;
            color: #0067FF;
            margin-top: 8px;
            font-style: italic;
        }
        .supplier-header {
            background-color: #EBF8FF;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #BEE3F8;
            color: #2C5A8F;
        }
        .supplier-header h2 {
            margin: 0;
            color: #2C5A8F;
            font-size: 18px;
            font-weight: 600;
        }
        .po-number {
            font-size: 16px;
            font-weight: 600;
            color: #0067FF;
        }
        .po-date {
            font-size: 14px;
            color: #718096;
        }
        @media print {
            body { 
                margin: 25px;
                background: white;
            }
            .no-print { display: none; }
            .header-container {
                margin-bottom: 20px;
            }
            .info-section, .table, .footer {
                box-shadow: none;
                border: 1px solid #E2E8F0;
            }
        }
    </style>
</head>
<body>
<div class="header-container">
<div class="logo-container">
    <img src="/icon-512x512.png" alt="Caterflow" class="logo" />
</div>
<div class="header-content">
    <h1>PURCHASE ORDER</h1>
    <p style="font-size: 16px; margin: 5px 0;">PO Number: <strong class="po-number">${poData.poNumber}</strong></p>
    <p style="font-size: 14px; margin: 5px 0;" class="po-date">Date: ${new Date(poData.orderDate).toLocaleDateString()}</p>
</div>
</div>

    ${isSupplierSpecific && poData.supplierName ? `
        <div class="supplier-header">
            <h2>Supplier: ${poData.supplierName}</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px;">This document contains items to be quoted by ${poData.supplierName}</p>
        </div>
    ` : ''}

    <div class="info-section">
        <div class="info-grid">
            <div>
                <div class="info-item">
                    <span class="info-label">Total Items:</span>
                    <span class="info-value"> ${totalItems}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Unique Items:</span>
                    <span class="info-value"> ${poData.orderedItems.length}</span>
                </div>
            </div>
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Item #</th>
                <th>Description</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Unit of Measure</th>
                ${!isSupplierSpecific ? '<th>Supplier</th>' : ''}
            </tr>
        </thead>
        <tbody>
            ${poData.orderedItems.map((item: any, index: number) => `
                <tr>
                    <td style="font-weight: 500;">${index + 1}</td>
                    <td><strong>${item.stockItem.name}</strong></td>
                    <td>${item.stockItem.sku || 'N/A'}</td>
                    <td style="font-weight: 500;">${item.orderedQuantity}</td>
                    <td>${item.stockItem.unitOfMeasure}</td>
                    ${!isSupplierSpecific ? `<td>${item.supplier?.name || 'Not assigned'}</td>` : ''}
                </tr>
            `).join('')}
        </tbody>
    </table>

    ${poData.notes ? `
        <div class="info-section">
            <h3 style="margin: 0 0 12px 0; color: #2D3748; font-size: 16px;">Notes:</h3>
            <p style="margin: 0; color: #4A5568; line-height: 1.5;">${poData.notes}</p>
        </div>
    ` : ''}

    <div class="footer">
    <p style="margin: 0 0 8px 0;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    <p style="margin: 0 0 8px 0;">This is a system-generated purchase order. Please provide your quotation for the requested items.</p>
    <div class="caterflow-brand">
        <a href="https://synapse-digital.vercel.app/" target="_blank" style="color: #A0AEC0; text-decoration: none; cursor: pointer;">
            Caterflow by Synapse
        </a>
    </div>
</div>

    <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="
            background: #0067FF;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
        " onmouseover="this.style.backgroundColor='#0052CC'" onmouseout="this.style.backgroundColor='#0067FF'">
            Print / Save as PDF
        </button>
        <button onclick="window.close()" style="
            background: #718096;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            margin-left: 10px;
            transition: background-color 0.2s;
        " onmouseover="this.style.backgroundColor='#4A5568'" onmouseout="this.style.backgroundColor='#718096'">
            Close
        </button>
    </div>
</body>
</html>
    `;
    };

    /* ---------- Columns ---------- */

    const columns = useMemo(() => [
        {
            accessorKey: 'actions',
            header: 'Actions',
            isSortable: false, // Actions column should not be sortable
            cell: (row: PurchaseOrder) => (
                <Button
                    size="sm"
                    colorScheme="brand"
                    leftIcon={<Icon as={FiEdit} />}
                    onClick={() => handleEditPO(row)}
                >
                    Edit
                </Button>
            )
        },
        {
            accessorKey: 'poNumber',
            header: 'PO Number',
            isSortable: true, // Enable sorting for PO numbers
            cell: (row: PurchaseOrder) => (
                <Text fontWeight="bold" color={primaryTextColor}>{row.poNumber}</Text>
            )
        },
        {
            accessorKey: 'status',
            header: 'Status',
            isSortable: true, // Enable sorting for status
            cell: (row: PurchaseOrder) => (
                <Badge colorScheme={getStatusColor(row.status)} variant="subtle">
                    {row.status.toUpperCase()}
                </Badge>
            )
        },
        {
            accessorKey: 'site.name',
            header: 'Site',
            isSortable: true, // Enable sorting for site names
            cell: (row: PurchaseOrder) => <Text color={secondaryTextColor}>{row.site?.name || 'N/A'}</Text>
        },
        {
            accessorKey: 'items',
            header: 'Items',
            isSortable: false, // Complex items column - disable sorting
            cell: (row: PurchaseOrder) => (
                <VStack align="start" spacing={1}>
                    {row.orderedItems.map(item => (
                        <HStack key={item._key} spacing={2}>
                            <Text fontSize="sm" color={primaryTextColor}>
                                {item.stockItem.name} ({item.orderedQuantity} {item.stockItem.unitOfMeasure})
                            </Text>
                            {(!item.supplier || item.unitPrice <= 0) && (
                                <Badge colorScheme="red" fontSize="xs">
                                    Needs Setup
                                </Badge>
                            )}
                            {item.supplier && item.unitPrice > 0 && (
                                <Badge colorScheme="green" fontSize="xs">
                                    {item.supplier.name} - E{item.unitPrice.toFixed(2)}
                                </Badge>
                            )}
                        </HStack>
                    ))}
                </VStack>
            )
        },
        {
            accessorKey: 'totalAmount',
            header: 'Total Amount',
            isSortable: true, // Enable sorting for amounts
            cell: (row: PurchaseOrder) => <Text color={primaryTextColor}>E {row.totalAmount?.toFixed(2)}</Text>
        },
        {
            accessorKey: 'orderDate',
            header: 'Order Date',
            isSortable: true, // Enable sorting for dates
            cell: (row: PurchaseOrder) => <Text color={secondaryTextColor}>{new Date(row.orderDate).toLocaleDateString()}</Text>
        },
        {
            accessorKey: 'orderedItems.length',
            header: 'Item Count',
            isSortable: true, // Enable sorting for item counts
            cell: (row: PurchaseOrder) => <Text color={secondaryTextColor}>{row.orderedItems?.length || 0} items</Text>
        },
        {
            accessorKey: 'supplier.name',
            header: 'Supplier',
            isSortable: true, // Enable sorting for supplier names
            cell: (row: PurchaseOrder) => {
                // Get the primary supplier from the first item, or show multiple
                const primarySupplier = row.orderedItems[0]?.supplier?.name;
                const uniqueSuppliers = [...new Set(row.orderedItems.map(item => item.supplier?.name).filter(Boolean))];

                if (uniqueSuppliers.length === 0) return <Text color={secondaryTextColor}>No Supplier</Text>;
                if (uniqueSuppliers.length === 1) return <Text color={secondaryTextColor}>{primarySupplier}</Text>;

                return (
                    <Text color={secondaryTextColor}>
                        {primarySupplier} +{uniqueSuppliers.length - 1} more
                    </Text>
                );
            }
        }
    ], [handleEditPO, primaryTextColor, secondaryTextColor]);

    // Add this function after handleProcessPO
    const handleSaveChanges = async () => {
        if (!selectedPO) return;
        setSaving(true);

        try {
            // First, ensure all suppliers are added to stock items
            for (const item of selectedPO.orderedItems) {
                const supplierId = editedSuppliers[item._key] ?? item.supplier?._id;

                if (supplierId) {
                    // Add supplier to stock item's suppliers list
                    await addSupplierToStockItem(item.stockItem._id, supplierId);

                    // Set as primary supplier if marked as default
                    const isDefault = defaultSupplierFlags[item._key];
                    if (isDefault) {
                        await setPrimarySupplierAPI(item.stockItem._id, supplierId);
                    }
                }
            }

            // Then update purchase order items (even without prices)
            const updates = selectedPO.orderedItems.map(item => {
                const supplierId = editedSuppliers[item._key] ?? item.supplier?._id;
                const totalPrice = editedPrices[item._key];

                return {
                    itemKey: item._key,
                    supplierId: supplierId,
                    newPrice: totalPrice ? totalPrice / item.orderedQuantity : undefined
                };
            }).filter(update => update.supplierId); // Only require supplier, price is optional

            // Update the purchase order items
            await updatePurchaseOrderItems(selectedPO._id, updates);

            // Update stock item prices only if provided
            for (const item of selectedPO.orderedItems) {
                const totalPrice = editedPrices[item._key];
                if (totalPrice) {
                    const unitPrice = totalPrice / item.orderedQuantity;
                    await updateStockItemUnitPrice(item.stockItem._id, unitPrice);
                }
            }

            toast({
                title: 'Success',
                description: 'Changes saved successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onEditModalClose();
            await fetchApprovedPOs();
        } catch (err: any) {
            console.error('Failed to save changes:', err);
            toast({
                title: 'Error',
                description: err?.message || 'Failed to save changes',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };


    // Replace the existing handleProcessPO function with this:
    const handleProcessPO = async () => {
        if (!selectedPO) return;
        setProcessing(true);

        try {
            // First, ensure all suppliers are added to stock items and set as primary if needed
            for (const item of selectedPO.orderedItems) {
                const supplierId = editedSuppliers[item._key] ?? item.supplier?._id;

                if (supplierId) {
                    // Add supplier to stock item's suppliers list
                    await addSupplierToStockItem(item.stockItem._id, supplierId);

                    // Set as primary supplier if marked as default
                    const isDefault = defaultSupplierFlags[item._key];
                    if (isDefault) {
                        await setPrimarySupplierAPI(item.stockItem._id, supplierId);
                    }
                }
            }

            // Then, update purchase order items with supplier and price information
            const updates = selectedPO.orderedItems.map(item => {
                const supplierId = editedSuppliers[item._key] ?? item.supplier?._id;
                const totalPrice = editedPrices[item._key];

                return {
                    itemKey: item._key,
                    supplierId: supplierId,
                    newPrice: totalPrice ? totalPrice / item.orderedQuantity : undefined
                };
            }).filter(update => update.supplierId && update.newPrice);

            // Update the purchase order items
            await updatePurchaseOrderItems(selectedPO._id, updates);

            // Update stock item prices
            for (const item of selectedPO.orderedItems) {
                const totalPrice = editedPrices[item._key];
                if (totalPrice) {
                    const unitPrice = totalPrice / item.orderedQuantity;
                    await updateStockItemUnitPrice(item.stockItem._id, unitPrice);
                }
            }

            // Finally, process the purchase order
            const response = await fetch(`/api/purchase-orders/${selectedPO._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updateData: { status: 'processed' } })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process purchase order');
            }

            toast({
                title: 'Success',
                description: 'Purchase order processed successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onEditModalClose();
            await fetchApprovedPOs();
        } catch (err: any) {
            console.error('Failed to process purchase order:', err);
            toast({
                title: 'Error',
                description: err?.message || 'Failed to process purchase order',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setProcessing(false);
        }
    };

    /* ---------- Render ---------- */

    if (status === 'loading' || loading) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh" bg={bgPrimary}>
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <Box p={{ base: 4, md: 8 }} bg={bgPrimary} minH="100vh">
            <VStack spacing={6} align="stretch">
                <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color={primaryTextColor}>
                    Procurement Processing
                </Heading>
                <Text color={secondaryTextColor}>
                    Process approved purchase orders and manage supplier relationships
                </Text>

                <Card bg={bgCard} border="1px" borderColor={borderColor}>
                    <CardBody>
                        {purchaseOrders.length === 0 ? (
                            <Text textAlign="center" color={secondaryTextColor} py={8}>
                                No approved purchase orders to process
                            </Text>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={purchaseOrders}
                                loading={loading}
                            />
                        )}
                    </CardBody>
                </Card>
            </VStack>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="4xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent bg={bgCard} border="1px" borderColor={borderColor}>
                    <ModalHeader color={primaryTextColor}>
                        Set Suppliers & Prices: {selectedPO?.poNumber}
                    </ModalHeader>
                    <ModalBody>
                        {selectedPO && (
                            <VStack spacing={4} align="stretch">
                                <Text fontSize="sm" color={secondaryTextColor}>
                                    Enter <strong>total price</strong> for each item (total price for the ordered quantity).
                                </Text>
                                <Text fontSize="sm" color={secondaryTextColor}>
                                    The system will calculate the <strong>unit price</strong> (total ÷ quantity) and save it to the stock item and the purchase order.
                                </Text>

                                <TableContainer border="1px" borderColor={borderColor} borderRadius="md">
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>Item</Th>
                                                <Th>Supplier</Th>
                                                <Th>Set Default</Th>
                                                <Th>Total Price (E)</Th>
                                                <Th></Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {selectedPO.orderedItems.map(item => {
                                                const currentSupplier = editedSuppliers[item._key] ?? item.supplier?._id;
                                                const currentPrice = editedPrices[item._key];
                                                const isDefault = defaultSupplierFlags[item._key] ?? false;
                                                const itemDetails = stockItems[item.stockItem._id];
                                                const rowError = getRowError(item);

                                                const totalPriceValue = typeof currentPrice === 'number' ? currentPrice : (item.unitPrice > 0 ? item.unitPrice * item.orderedQuantity : undefined);

                                                return (
                                                    <Tr key={item._key} bg={rowError ? errorBg : undefined} _hover={{ bg: hoverColor }}>
                                                        <Td borderColor={borderColor}>
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontWeight="medium" color={primaryTextColor}>{item.stockItem.name}</Text>
                                                                <Text fontSize="sm" color={secondaryTextColor}>
                                                                    {item.orderedQuantity} {item.stockItem.unitOfMeasure}
                                                                </Text>
                                                            </VStack>
                                                        </Td>
                                                        <Td borderColor={borderColor}>
                                                            <Select
                                                                value={currentSupplier || ''}
                                                                onChange={(e) => handleSupplierChange(item._key, e.target.value, item.stockItem._id)}
                                                                size="sm"
                                                                minW={"120px"}
                                                                placeholder="Select supplier"
                                                                borderColor={borderColor}
                                                                _focus={{ borderColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}` }}
                                                            >
                                                                {suppliers.map(supplier => (
                                                                    <option key={supplier._id} value={supplier._id}>
                                                                        {supplier.name}
                                                                    </option>
                                                                ))}
                                                            </Select>
                                                            {rowError === 'No supplier selected' && (
                                                                <Text fontSize="xs" color={errorTextColor}>Select supplier</Text>
                                                            )}
                                                        </Td>
                                                        <Td borderColor={borderColor}>
                                                            <Tooltip
                                                                label={
                                                                    currentSupplier
                                                                        ? 'Mark this supplier as the default for this item'
                                                                        : 'Select a supplier first'
                                                                }
                                                            >
                                                                <HStack>
                                                                    <Switch
                                                                        isChecked={isDefault}
                                                                        onChange={(e) => handleDefaultSupplierToggle(item._key, item.stockItem._id, e.target.checked)}
                                                                        isDisabled={!currentSupplier}
                                                                        colorScheme="brand"
                                                                    />
                                                                    <Icon as={FiInfo} color={secondaryTextColor} boxSize={4} />
                                                                </HStack>
                                                            </Tooltip>
                                                        </Td>
                                                        <Td borderColor={borderColor}>
                                                            <Input
                                                                value={totalPriceValue === 0 || totalPriceValue === undefined ? '' : totalPriceValue.toFixed(2).toString()}
                                                                onChange={(e) => handlePriceChange(item._key, e.target.value)}
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                size="sm"
                                                                width="100px"
                                                                placeholder="0.00"
                                                            />
                                                            {getRowWarning(item) && (
                                                                <Text fontSize="xs" color="orange.500">{getRowWarning(item)}</Text>
                                                            )}
                                                        </Td>
                                                        <Td borderColor={borderColor}>
                                                            {totalPriceValue !== undefined && (
                                                                <Text fontSize="xs" color={secondaryTextColor}>
                                                                    = E{(totalPriceValue / item.orderedQuantity).toFixed(2)} per {item.stockItem.unitOfMeasure}
                                                                </Text>
                                                            )}
                                                        </Td>
                                                    </Tr>
                                                );
                                            })}
                                        </Tbody>
                                    </Table>
                                </TableContainer>

                                {!canSaveChanges() && (
                                    <Alert status="warning" borderRadius="md" bg={warningAlertBg}>
                                        <AlertIcon />
                                        <AlertTitle color={warningAlertTitleColor}>Missing suppliers</AlertTitle>
                                        <AlertDescription color={warningAlertDescriptionColor}>
                                            Some rows are missing suppliers. You need to select suppliers for all items before saving or exporting.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                {canSaveChanges() && !canProcessPO() && (
                                    <Alert status="info" borderRadius="md" bg={infoAlertBg}>
                                        <AlertIcon />
                                        <AlertTitle color={infoAlertTitleColor}>Prices missing</AlertTitle>
                                        <AlertDescription color={infoAlertDescriptionColor}>
                                            You can save without prices and continue later. Prices are required for processing the PO.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </VStack>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <VStack spacing={3} width="full">
                            {/* First row - Cancel and Save buttons */}
                            <HStack spacing={3} width="full" display={{ base: 'grid', md: 'flex' }} gridTemplateColumns={{ base: '1fr 1fr', md: 'none' }}>
                                <Button variant="ghost" onClick={onEditModalClose} width={{ base: 'full', md: 'auto' }}>
                                    Cancel
                                </Button>
                                <Button
                                    colorScheme="brand"
                                    variant="outline"
                                    onClick={handleSaveChanges}
                                    isLoading={saving}
                                    isDisabled={!canSaveChanges()}
                                    width={{ base: 'full', md: 'auto' }}
                                >
                                    Save All Changes
                                </Button>
                            </HStack>

                            {/* Second row - Export buttons */}
                            <HStack spacing={3} width="full" display={{ base: 'grid', md: 'flex' }} gridTemplateColumns={{ base: '1fr 1fr', md: 'none' }}>
                                <Button
                                    colorScheme="green"
                                    variant="outline"
                                    onClick={exportSinglePO}
                                    isDisabled={!canSaveChanges() || saving}
                                    isLoading={saving}
                                    leftIcon={<Icon as={FiEye} />}
                                    width={{ base: 'full', md: 'auto' }}
                                >
                                    {saving ? 'Saving...' : 'Export Single PO'}
                                </Button>
                                <Button
                                    colorScheme="green"
                                    variant="outline"
                                    onClick={exportMultiplePOsBySupplier}
                                    isDisabled={!canSaveChanges() || saving}
                                    isLoading={saving}
                                    leftIcon={<Icon as={FiFilter} />}
                                    width={{ base: 'full', md: 'auto' }}
                                >
                                    {saving ? 'Saving...' : 'Export by Supplier'}
                                </Button>
                            </HStack>

                            {/* Third row - Process PO button (full width on mobile) */}
                            <Button
                                colorScheme="brand"
                                onClick={handleProcessPO}
                                isLoading={processing}
                                isDisabled={!canProcessPO()}
                                width="full"
                                size={{ base: 'md', md: 'md' }}
                            >
                                Process PO
                            </Button>
                        </VStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box >
    );
}