// src/app/actions/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Heading,
    Text,
    Flex,
    Spinner,
    useToast,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    Icon,
    useDisclosure,
    Button,
    TabPanel,
    HStack,
    Badge,
    VStack,
    useColorModeValue,
    Card,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react'
import { FiPackage, FiEdit, FiEye, FiCheckCircle, FiTruck, FiClipboard, FiRepeat } from 'react-icons/fi';
import PurchaseOrderModal, { PurchaseOrderDetails } from './PurchaseOrderModal';
import DataTable from './DataTable';
import GoodsReceiptModal from '@/app/actions/GoodsReceiptModal';
import TransferModal from '@/components/TransferModal';
import BinCountModal from '@/components/BinCountModal';
import DispatchModal from '@/components/DispatchModal';

// Interfaces matching the individual operation pages
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
        };
        supplier?: { _id: string; name: string } | null;
    }>;
    totalAmount: number;
    supplierNames?: string;
    description?: string;
    siteName?: string;
    createdAt?: string;
}

interface GoodsReceipt {
    _id: string;
    receiptNumber: string;
    receiptDate: string;
    status: 'draft' | 'partially-received' | 'completed';
    purchaseOrder?: any;
    receivedItems?: any[];
}

interface Transfer {
    _id: string;
    transferNumber: string;
    transferDate: string;
    status: 'draft' | 'pending-approval' | 'approved' | 'completed' | 'cancelled';
    fromBin: any;
    toBin: any;
    transferredItems: any[];
}

interface BinCount {
    _id: string;
    countNumber: string;
    countDate: string;
    status: 'draft' | 'in-progress' | 'completed' | 'adjusted';
    bin: any;
    countedItems: any[];
}

// Use the exact same Dispatch interface structure as DispatchModal
interface Site {
    _id: string;
    name: string;
}

interface Bin {
    _id: string;
    name: string;
    site: Site;
}

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    associatedSite?: Site;
}

interface DispatchedItem {
    _key: string;
    stockItem: {
        _id: string;
        name: string;
        sku?: string;
        unitOfMeasure?: string;
        currentStock?: number;
        unitPrice?: number;
    };
    dispatchedQuantity: number;
    unitPrice?: number;
    totalCost?: number;
    notes?: string;
}

// This matches the Dispatch interface from DispatchModal exactly
interface Dispatch {
    _id: string;
    dispatchNumber: string;
    dispatchDate: string;
    notes?: string;
    dispatchType: {
        _id: string;
        name: string;
    };
    dispatchedItems: DispatchedItem[];
    sourceBin: Bin;
    dispatchedBy: User;
    peopleFed?: number;
    evidenceStatus?: 'pending' | 'partial' | 'complete';
    status?: string;
    attachments?: { _id: string; url?: string; name?: string }[];
}

// Operation types and their required roles
const OPERATION_TYPES = {
    PurchaseOrder: {
        title: 'Purchase Orders',
        roles: ['admin', 'siteManager', 'stockController', 'auditor'],
        statusFilter: ['draft'],
        icon: FiEdit,
        actionLabel: 'Edit',
        apiEndpoint: '/api/purchase-orders',
        detailEndpoint: (id: string) => `/api/purchase-orders?id=${id}`,
    },
    GoodsReceipt: {
        title: 'Goods Receipts',
        roles: ['admin', 'siteManager', 'stockController', 'auditor'],
        statusFilter: ['draft', 'partially-received'],
        icon: FiPackage,
        actionLabel: 'Receive',
        apiEndpoint: '/api/goods-receipts',
        detailEndpoint: (id: string) => `/api/goods-receipts/${id}`,
    },
    InternalTransfer: {
        title: 'Transfers',
        roles: ['admin', 'siteManager', 'stockController', 'auditor', 'procurer'],
        statusFilter: ['draft', 'pending-approval'],
        icon: FiRepeat,
        actionLabel: 'Edit',
        apiEndpoint: '/api/transfers',
        detailEndpoint: (id: string) => `/api/operations/transfers/${id}`,
    },
    BinCount: {
        title: 'Bin Counts',
        roles: ['admin', 'siteManager', 'stockController', 'auditor'],
        statusFilter: ['draft', 'in-progress'],
        icon: FiClipboard,
        actionLabel: 'Edit',
        apiEndpoint: '/api/bin-counts',
        detailEndpoint: (id: string) => `/api/bin-counts/${id}`,
    },
    Dispatch: {
        title: 'Dispatches',
        roles: ['admin', 'siteManager', 'stockController', 'auditor'],
        statusFilter: ['draft'],
        icon: FiTruck,
        actionLabel: 'Edit',
        apiEndpoint: '/api/dispatches',
        detailEndpoint: (id: string) => `/api/dispatches/${id}`,
    }
};

export default function ActionsPage() {
    const { data: session, status } = useSession();
    const [actions, setActions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [refreshTriggers, setRefreshTriggers] = useState<{ [key: string]: number }>({});
    const toast = useToast();

    const scrollbarThumbColor = useColorModeValue('gray.300', 'gray.600');
    const scrollbarThumbHoverColor = useColorModeValue('gray.400', 'gray.500');


    // Modal states for different operation types
    const { isOpen: isOrderModalOpen, onOpen: onOrderModalOpen, onClose: onOrderModalClose } = useDisclosure();
    const { isOpen: isGoodsReceiptModalOpen, onOpen: onGoodsReceiptModalOpen, onClose: onGoodsReceiptModalClose } = useDisclosure();
    const { isOpen: isTransferModalOpen, onOpen: onTransferModalOpen, onClose: onTransferModalClose } = useDisclosure();
    const { isOpen: isBinCountModalOpen, onOpen: onBinCountModalOpen, onClose: onBinCountModalClose } = useDisclosure();
    const { isOpen: isDispatchModalOpen, onOpen: onDispatchModalOpen, onClose: onDispatchModalClose } = useDisclosure();

    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [selectedGoodsReceipt, setSelectedGoodsReceipt] = useState<any>(null);
    const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
    const [selectedBinCount, setSelectedBinCount] = useState<BinCount | null>(null);
    const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);

    const [poDetails, setPoDetails] = useState<PurchaseOrderDetails | null>(null);
    const [editedPrices, setEditedPrices] = useState<{ [key: string]: number | undefined }>({});
    const [editedQuantities, setEditedQuantities] = useState<{ [key: string]: number | undefined }>({});
    const [isSaving, setIsSaving] = useState(false);

    // Extract user data from session
    const user = session?.user as any;
    const isAuthenticated = status === 'authenticated';
    const isAuthReady = status !== 'loading';

    // Theme-based colors - ALL HOOKS AT TOP LEVEL
    const primaryBgColor = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const cardBg = useColorModeValue('white', 'gray.700');
    const noActionTextColor = useColorModeValue('gray.600', 'gray.300');
    const tabBg = useColorModeValue('gray.50', 'gray.600');
    const tabSelectedBg = useColorModeValue('white', 'gray.700');

    // Filter operation types based on user role
    const availableOperations = useMemo(() => {
        if (!user?.role) return [];

        return Object.entries(OPERATION_TYPES)
            .filter(([_, config]) => config.roles.includes(user.role))
            .map(([type, config]) => ({ type, ...config }));
    }, [user?.role]);

    // Fetch data for each operation type separately, following the pattern of individual pages
    const fetchActions = useCallback(async (specificType?: string) => {
        setLoading(true);
        setError(null);

        try {
            const operationsToFetch = specificType
                ? availableOperations.filter(op => op.type === specificType)
                : availableOperations;

            const fetchPromises = operationsToFetch.map(async (operation) => {
                try {
                    const response = await fetch(operation.apiEndpoint);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${operation.title}: ${response.status}`);
                    }
                    const data = await response.json();

                    // Filter for actions requiring attention and add type information
                    return data
                        .filter((item: any) => operation.statusFilter.includes(item.status))
                        .map((item: any) => ({
                            ...item,
                            _type: operation.type,
                            actionType: operation.type,
                            siteName: item.site?.name || item.bin?.site?.name || item.sourceBin?.site?.name || 'N/A',
                            description: item.description || `Operation ${item.poNumber || item.receiptNumber || item.transferNumber || item.countNumber || item.dispatchNumber}`,
                            createdAt: item.orderDate || item.receiptDate || item.transferDate || item.countDate || item.dispatchDate || item.createdAt,
                        }));
                } catch (err) {
                    console.error(`Error fetching ${operation.title}:`, err);
                    return [];
                }
            });

            const results = await Promise.all(fetchPromises);
            const allActions = results.flat();

            if (specificType) {
                // Only update actions for the specific type
                setActions(prev => [
                    ...prev.filter(action => action._type !== specificType),
                    ...allActions
                ]);
            } else {
                setActions(allActions);
            }

        } catch (err: any) {
            setError(err.message);
            toast({
                title: 'Error',
                description: err.message || 'Failed to fetch actions',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [availableOperations, toast]);

    // Create a function to refresh the current tab's data
    const refreshCurrentTab = useCallback(() => {
        const currentOperationType = availableOperations[activeTab]?.type;
        if (currentOperationType) {
            setRefreshTriggers(prev => ({
                ...prev,
                [currentOperationType]: (prev[currentOperationType] || 0) + 1
            }));
        }
        // Also refresh the main actions to update badge counts
        fetchActions();
    }, [activeTab, availableOperations, fetchActions]);



    // Get actions that require action for each operation type
    const getActionRequiredActions = (operationType: string) => {
        return actions.filter(action => action._type === operationType);
    };

    // Get count of actions requiring attention for each operation type
    const getActionCounts = () => {
        const counts: { [key: string]: number } = {};

        availableOperations.forEach(({ type }) => {
            counts[type] = getActionRequiredActions(type).length;
        });

        return counts;
    };

    const actionCounts = getActionCounts();

    // Handler for Purchase Order actions - follows the same pattern as PurchasesPage
    const handleEditPO = async (action: any) => {
        try {
            const config = OPERATION_TYPES.PurchaseOrder;
            const response = await fetch(config.detailEndpoint(action._id));
            if (!response.ok) {
                throw new Error('Failed to fetch purchase order details');
            }
            const data = await response.json();

            const transformedData: PurchaseOrderDetails = {
                _id: data._id,
                _type: data._type || 'purchaseOrder',
                poNumber: data.poNumber || '',
                site: data.site || { name: '', _id: '' },
                orderedBy: data.orderedBy || { name: '' },
                orderDate: data.orderDate || '',
                status: data.status || 'draft',
                orderedItems: data.orderedItems?.map((item: any) => ({
                    _key: item._key || Math.random().toString(36).substr(2, 9),
                    stockItem: {
                        name: item.stockItem?.name || 'Unknown Item',
                        _id: item.stockItem?._id || ''
                    },
                    orderedQuantity: item.orderedQuantity || 0,
                    unitPrice: item.unitPrice || 0,
                    supplier: item.supplier || {
                        name: data.supplierNames || data.supplierName || 'Unknown Supplier',
                        _id: item.supplier?._id || ''
                    }
                })) || [],
                supplierNames: data.supplierNames || data.supplierName || '',
                totalAmount: data.totalAmount || 0,
                title: data.title || `Purchase Order ${data.poNumber || ''}`,
                description: data.description || `Order from ${data.supplierNames || data.supplierName || 'Unknown Supplier'}`,
                createdAt: data.createdAt || data.orderDate || new Date().toISOString(),
                priority: data.priority || 'medium',
                siteName: data.siteName || data.site?.name || '',
                actionType: data.actionType || 'PurchaseOrder',
                evidenceRequired: data.evidenceRequired || false,
            };

            setPoDetails(transformedData);
            setEditedPrices({});
            setEditedQuantities({});
            onOrderModalOpen();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: 'Failed to fetch purchase order details. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Handler for Goods Receipt actions - follows GoodsReceiptsPage pattern
    const handleReceiveGoods = async (action: any) => {
        try {
            const config = OPERATION_TYPES.GoodsReceipt;
            const response = await fetch(config.detailEndpoint(action._id));
            if (!response.ok) {
                throw new Error('Failed to fetch goods receipt details');
            }
            const goodsReceipt = await response.json();
            setSelectedGoodsReceipt(goodsReceipt);
            onGoodsReceiptModalOpen();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: 'Failed to fetch goods receipt details. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Handler for Transfer actions - follows TransfersPage pattern
    const handleEditTransfer = async (action: any) => {
        try {
            const config = OPERATION_TYPES.InternalTransfer;
            const response = await fetch(config.detailEndpoint(action._id));
            if (!response.ok) {
                throw new Error('Failed to fetch transfer details');
            }
            const transfer = await response.json();

            // Ensure transferredItems have valid stockItem objects
            const safeTransfer = {
                ...transfer,
                transferredItems: transfer.transferredItems?.map((item: any) => ({
                    ...item,
                    stockItem: item.stockItem || { _id: '', name: 'Unknown Item' }
                })) || []
            };

            setSelectedTransfer(safeTransfer);
            onTransferModalOpen();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: 'Failed to fetch transfer details. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Handler for Bin Count actions - follows BinCountsPage pattern
    const handleEditBinCount = async (action: any) => {
        try {
            const config = OPERATION_TYPES.BinCount;
            const response = await fetch(config.detailEndpoint(action._id));
            if (!response.ok) {
                throw new Error('Failed to fetch bin count details');
            }
            const binCount = await response.json();

            // Ensure countedItems have valid stockItem objects
            const safeBinCount = {
                ...binCount,
                countedItems: binCount.countedItems?.map((item: any) => ({
                    ...item,
                    stockItem: item.stockItem || { _id: '', name: 'Unknown Item', sku: 'N/A' }
                })) || []
            };

            setSelectedBinCount(safeBinCount);
            onBinCountModalOpen();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: 'Failed to fetch bin count details. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Handler for Dispatch actions - follows DispatchesPage pattern
    const handleEditDispatch = async (action: any) => {
        try {
            const config = OPERATION_TYPES.Dispatch;
            const response = await fetch(config.detailEndpoint(action._id));
            if (!response.ok) {
                throw new Error('Failed to fetch dispatch details');
            }
            const dispatch = await response.json();

            // Transform the API response to match the exact Dispatch interface structure
            const safeDispatch: Dispatch = {
                _id: dispatch._id,
                dispatchNumber: dispatch.dispatchNumber,
                dispatchDate: dispatch.dispatchDate,
                notes: dispatch.notes || '',
                dispatchType: dispatch.dispatchType || { _id: '', name: '' },
                dispatchedItems: (dispatch.dispatchedItems || []).map((item: any) => ({
                    _key: item._key || Math.random().toString(36).substr(2, 9),
                    stockItem: {
                        _id: item.stockItem?._id || '',
                        name: item.stockItem?.name || 'Unknown Item',
                        sku: item.stockItem?.sku,
                        unitOfMeasure: item.stockItem?.unitOfMeasure,
                        currentStock: item.stockItem?.currentStock,
                        unitPrice: item.stockItem?.unitPrice
                    },
                    dispatchedQuantity: item.dispatchedQuantity || 0,
                    unitPrice: item.unitPrice || 0,
                    totalCost: item.totalCost || 0,
                    notes: item.notes || ''
                })),
                sourceBin: dispatch.sourceBin || { _id: '', name: '', site: { _id: '', name: '' } },
                dispatchedBy: dispatch.dispatchedBy || { _id: '', name: '', email: '', role: '' },
                peopleFed: dispatch.peopleFed,
                evidenceStatus: dispatch.evidenceStatus || 'pending',
                status: dispatch.status || 'draft',
                attachments: dispatch.attachments || []
            };

            setSelectedDispatch(safeDispatch);
            onDispatchModalOpen();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: 'Failed to fetch dispatch details. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Generic action handler that routes to the appropriate modal
    const handleActionClick = (action: any) => {
        switch (action._type) {
            case 'PurchaseOrder':
                handleEditPO(action);
                break;
            case 'GoodsReceipt':
                handleReceiveGoods(action);
                break;
            case 'InternalTransfer':
                handleEditTransfer(action);
                break;
            case 'BinCount':
                handleEditBinCount(action);
                break;
            case 'Dispatch':
                handleEditDispatch(action);
                break;
            default:
                toast({
                    title: 'Error',
                    description: 'Unknown action type',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
        }
    };

    const handleSaveOrder = async () => {
        if (!poDetails) return;
        setIsSaving(true);
        try {
            const updates = poDetails.orderedItems?.map((item: any) => {
                const newPrice = editedPrices[item._key];
                const newQuantity = editedQuantities[item._key];
                if (newPrice !== undefined || newQuantity !== undefined) {
                    return fetch('/api/purchase-orders/update-item', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            poId: poDetails._id,
                            itemKey: item._key,
                            newPrice,
                            newQuantity,
                        }),
                    });
                }
                return Promise.resolve();
            });
            if (updates) await Promise.all(updates);

            toast({
                title: 'Order Saved',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            onOrderModalClose();
            refreshCurrentTab();
        } catch (error) {
            toast({
                title: 'Save Failed',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleApprovePO = async (action: PurchaseOrderDetails | any) => {
        try {
            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: action._id,
                    status: 'pending-approval',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit for approval');
            }

            toast({
                title: 'Order Submitted',
                description: `The purchase order has been submitted for approval.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            onOrderModalClose();
            refreshCurrentTab();

        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to submit order for approval. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Effect to fetch data when component mounts or refresh triggers change
    useEffect(() => {
        if (isAuthReady && isAuthenticated && user) {
            fetchActions();
        }
    }, [isAuthReady, isAuthenticated, user, fetchActions, refreshTriggers]);

    if (status === 'loading' || loading) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh" bg={primaryBgColor}>
                <Spinner size="xl" color="brand.500" />
            </Flex>
        );
    }

    if (error) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh" direction="column" bg={primaryBgColor}>
                <Text fontSize="xl" color="red.500">
                    {error}
                </Text>
                <Button onClick={() => fetchActions()} mt={4} colorScheme="brand">
                    Try Again
                </Button>
            </Flex>
        );
    }

    return (
        <Box p={{ base: 2, md: 6, lg: 8 }} bg={primaryBgColor} minH="calc(100vh - 60px)">
            <Heading as="h1" size={{ base: 'lg', md: 'xl' }} mb={4} color={primaryTextColor} px={{ base: 2, md: 0 }}>
                Action Required
            </Heading>

            <Tabs
                variant="enclosed"
                onChange={(index) => setActiveTab(index)}
                colorScheme="brand"
                isLazy
            >
                <TabList
                    overflowX="auto"
                    whiteSpace="nowrap"
                    py={1}
                    sx={{
                        // Custom scrollbar that works with your theme
                        '&::-webkit-scrollbar': {
                            height: '4px',
                        },
                        '&::-webkit-scrollbar-track': {
                            bg: 'transparent',
                            borderRadius: '2px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            bg: scrollbarThumbColor,
                            borderRadius: '2px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                            bg: scrollbarThumbHoverColor,
                        },
                        // Ensure smooth scrolling on all devices
                        WebkitOverflowScrolling: 'touch',
                        scrollBehavior: 'smooth',
                        // Hide scrollbar when not scrolling (optional)
                        '&:not(:hover)::-webkit-scrollbar-thumb': {
                            bg: 'transparent',
                        },
                    }}
                >
                    {availableOperations.map((operation, index) => (
                        <Tab
                            key={operation.type}
                            _selected={{
                                bg: tabSelectedBg,
                                borderColor: 'inherit',
                                borderBottomColor: tabSelectedBg,
                                fontWeight: 'semibold'
                            }}
                            bg={tabBg}
                            flexShrink={0}
                            minW="max-content"
                            px={{ base: 3, md: 4 }}
                            py={3}
                            mx={1}
                            borderRadius="md"
                            fontSize={{ base: 'sm', md: 'md' }}
                        >
                            <HStack spacing={2}>
                                <Icon as={operation.icon} fontSize={{ base: 'sm', md: 'md' }} />
                                <Text display={{ base: 'none', sm: 'block' }}>{operation.title}</Text>
                                {actionCounts[operation.type] > 0 && (
                                    <Badge
                                        colorScheme="red"
                                        variant="solid"
                                        borderRadius="full"
                                        fontSize="xs"
                                        minW="5"
                                    >
                                        {actionCounts[operation.type]}
                                    </Badge>
                                )}
                            </HStack>
                        </Tab>
                    ))}
                </TabList>
                <TabPanels>
                    {availableOperations.map((operation, index) => {
                        const actionRequiredActions = getActionRequiredActions(operation.type);

                        return (
                            <TabPanel key={operation.type} px={{ base: 0, md: 2 }} py={4}>
                                {actionRequiredActions.length === 0 ? (
                                    <Card bg={cardBg} p={6} textAlign="center" mx={{ base: 2, md: 0 }}>
                                        <Text fontSize="lg" color={noActionTextColor}>
                                            No {operation.title.toLowerCase()} requiring action at this time.
                                        </Text>
                                    </Card>
                                ) : (
                                    <Box
                                        overflowX="auto"
                                        sx={{
                                            '&::-webkit-scrollbar': {
                                                height: '6px',
                                            },
                                            '&::-webkit-scrollbar-track': {
                                                bg: 'gray.100',
                                                borderRadius: '3px',
                                            },
                                            '&::-webkit-scrollbar-thumb': {
                                                bg: 'gray.300',
                                                borderRadius: '3px',
                                            },
                                            '&::-webkit-scrollbar-thumb:hover': {
                                                bg: 'gray.400',
                                            },
                                        }}
                                    >
                                        <DataTable
                                            columns={[
                                                {
                                                    accessorKey: 'action',
                                                    header: 'Action',
                                                    cell: (row: any) => (
                                                        <Button
                                                            size="sm"
                                                            colorScheme="brand"
                                                            onClick={() => handleActionClick(row)}
                                                            leftIcon={<Icon as={operation.icon} />}
                                                            width={{ base: 'full', sm: 'auto' }}
                                                        >
                                                            <Text display={{ base: 'none', sm: 'block' }}>
                                                                {operation.actionLabel}
                                                            </Text>
                                                            <Text display={{ base: 'block', sm: 'none' }}>
                                                                {operation.actionLabel === 'Edit' ? 'Edit' : 'View'}
                                                            </Text>
                                                        </Button>
                                                    )
                                                },
                                                {
                                                    accessorKey: 'poNumber',
                                                    header: 'Reference',
                                                    cell: (row: any) => (
                                                        <Text fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }}>
                                                            {row.poNumber || row.receiptNumber || row.transferNumber || row.countNumber || row.dispatchNumber || 'N/A'}
                                                        </Text>
                                                    )
                                                },
                                                {
                                                    accessorKey: 'description',
                                                    header: 'Description',
                                                    cell: (row: any) => (
                                                        <Text noOfLines={2} fontSize={{ base: 'sm', md: 'md' }}>
                                                            {row.description || 'No description'}
                                                        </Text>
                                                    )
                                                },
                                                {
                                                    accessorKey: 'siteName',
                                                    header: 'Site',
                                                    cell: (row: any) => (
                                                        <Text fontSize={{ base: 'sm', md: 'md' }}>
                                                            {row.siteName || row.site?.name || 'N/A'}
                                                        </Text>
                                                    )
                                                },
                                                {
                                                    accessorKey: 'status',
                                                    header: 'Status',
                                                    cell: (row: any) => (
                                                        <Badge
                                                            colorScheme={
                                                                row.status === 'draft' ? 'gray' :
                                                                    row.status === 'partially-received' ? 'orange' :
                                                                        row.status === 'in-progress' ? 'blue' :
                                                                            row.status === 'pending-approval' ? 'yellow' : 'gray'
                                                            }
                                                            variant="subtle"
                                                            fontSize={{ base: 'xs', md: 'sm' }}
                                                        >
                                                            {row.status?.replace('-', ' ').toUpperCase() || 'UNKNOWN'}
                                                        </Badge>
                                                    )
                                                },
                                                {
                                                    accessorKey: 'createdAt',
                                                    header: 'Created',
                                                    cell: (row: any) => (
                                                        <Text fontSize={{ base: 'sm', md: 'md' }}>
                                                            {new Date(row.createdAt || row.orderDate || row.receiptDate || row.transferDate || row.countDate || row.dispatchDate).toLocaleDateString()}
                                                        </Text>
                                                    )
                                                },
                                            ]}
                                            data={actionRequiredActions}
                                            loading={loading}
                                        />
                                    </Box>
                                )}
                            </TabPanel>
                        );
                    })}
                </TabPanels>
            </Tabs>

            {/* Modals for different operation types */}
            {poDetails && (
                <PurchaseOrderModal
                    isOpen={isOrderModalOpen}
                    onClose={() => {
                        onOrderModalClose();
                        refreshCurrentTab();
                    }}
                    poDetails={poDetails}
                    editedPrices={editedPrices}
                    setEditedPrices={setEditedPrices}
                    editedQuantities={editedQuantities}
                    setEditedQuantities={setEditedQuantities}
                    isSaving={isSaving}
                    onSave={() => {
                        handleSaveOrder();
                        refreshCurrentTab();
                    }}
                    onApproveRequest={() => {
                        if (poDetails) {
                            handleApprovePO(poDetails);
                            refreshCurrentTab();
                        }
                    }}
                    onRemoveItem={() => { }}
                />
            )}

            <GoodsReceiptModal
                isOpen={isGoodsReceiptModalOpen}
                onClose={() => {
                    onGoodsReceiptModalClose();
                    refreshCurrentTab();
                }}
                receipt={selectedGoodsReceipt}
                onSave={refreshCurrentTab}
                approvedPurchaseOrders={[]}
            />

            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => {
                    onTransferModalClose();
                    refreshCurrentTab();
                }}
                transfer={selectedTransfer}
                onSave={refreshCurrentTab}
            />

            <BinCountModal
                isOpen={isBinCountModalOpen}
                onClose={() => {
                    onBinCountModalClose();
                    refreshCurrentTab();
                }}
                binCount={selectedBinCount}
                onSave={refreshCurrentTab}
            />

            <DispatchModal
                isOpen={isDispatchModalOpen}
                onClose={() => {
                    onDispatchModalClose();
                    refreshCurrentTab();
                }}
                dispatch={selectedDispatch}
                onSave={refreshCurrentTab}
            />
        </Box>
    );
}