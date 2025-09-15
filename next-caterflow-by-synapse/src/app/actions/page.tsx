// src/app/actions/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    HStack,
    Badge,
    VStack,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Table,
    TableContainer,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import { FaBoxes } from 'react-icons/fa';
import { FiPackage } from 'react-icons/fi';
import ActionCard from './ActionCard';
import WorkflowModal from './WorkflowModal';
import PurchaseOrderModal, { PurchaseOrderDetails } from './PurchaseOrderModal';
import FileUploadModal from '@/components/FileUploadModal';

import {
    PendingAction,
    ActionStep,
    generateWorkflow,
    actionTypeTitles,

} from './types';
import DataTable from './DataTable';
import GoodsReceiptModal from '@/app/actions/GoodsReceiptModal';
import { Category, Reference, StockItem } from '@/lib/sanityTypes';

// Interface for items selected in the modal
interface SelectedItemData {
    item: StockItem;
    quantity: number;
    price: number;
}

export interface OrderedItem {
    _key: string;
    stockItem: {
        _id?: string;
        name: string;
    };
    orderedQuantity: number;
    unitPrice: number;
    supplier?: { // Change from | null to optional (| undefined)
        _id?: string;
        name: string;
    };
}

interface PurchaseOrder {
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
    orderDate: string;
}

interface GoodsReceipt {
    _id: string;
    purchaseOrder?: {
        _ref: string;
    };
}

export default function ActionsPage() {
    const { isAuthenticated, isAuthReady, user } = useAuth();
    const [actions, setActions] = useState<PendingAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const toast = useToast();
    const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
    const { isOpen: isUploadModalOpen, onOpen: onUploadModalOpen, onClose: onUploadModalClose } = useDisclosure();
    const { isOpen: isOrderModalOpen, onOpen: onOrderModalOpen, onClose: onOrderModalClose } = useDisclosure();
    const { isOpen: isAddItemModalOpen, onOpen: onAddItemModalOpen, onClose: onAddItemModalClose } = useDisclosure();
    const { isOpen: isApprovalModalOpen, onOpen: onApprovalModalOpen, onClose: onApprovalModalClose } = useDisclosure();
    const { isOpen: isGoodsReceiptModalOpen, onOpen: onGoodsReceiptModalOpen, onClose: onGoodsReceiptModalClose } = useDisclosure();
    const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
    const [selectedApproval, setSelectedApproval] = useState<PendingAction | null>(null);
    const [poDetails, setPoDetails] = useState<PurchaseOrderDetails | null>(null);
    const [editedPrices, setEditedPrices] = useState<{ [key: string]: number | undefined }>({});
    const [editedQuantities, setEditedQuantities] = useState<{ [key: string]: number | undefined }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [availableItems, setAvailableItems] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [loadingItems, setLoadingItems] = useState(false);
    const [preSelectedPO, setPreSelectedPO] = useState<string | null>(null);
    const [selectedActions, setSelectedActions] = useState<PendingAction[]>([]);
    const [selectedGoodsReceipt, setSelectedGoodsReceipt] = useState<any>(null);

    // State for purchase orders and receipts
    const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
    const [loadingPOs, setLoadingPOs] = useState(false);
    const [loadingReceipts, setLoadingReceipts] = useState(false);


    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [isZeroPriceDialogOpen, setIsZeroPriceDialogOpen] = useState(false);
    const [hasZeroPriceItems, setHasZeroPriceItems] = useState<string[]>([]);

    const cancelRef = useRef<HTMLButtonElement>(null);

    const fetchActions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/actions?userId=${user?._id}&userRole=${user?.role}&userSite=${user?.associatedSite?._id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || `Failed to fetch actions: ${response.status} ${response.statusText}`);
            }

            const fetchedActions: PendingAction[] = data.map((action: PendingAction) => {
                const workflow = generateWorkflow(action._type, action.status, action.completedSteps || 0);
                return {
                    ...action,
                    actionType: action._type,
                    workflow: workflow,
                    completedSteps: action.completedSteps || 0,
                    evidenceStatus: action.evidenceStatus || 'pending',
                };
            });
            setActions(fetchedActions);
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
    }, [user, toast]);

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchAvailableItems = async () => {
        try {
            const response = await fetch('/api/stock-items');
            if (response.ok) {
                const data = await response.json();
                setAvailableItems(data);
            }
        } catch (error) {
            console.error('Failed to fetch stock items:', error);
        }
    };

    const fetchAllPurchaseOrders = useCallback(async () => {
        try {
            setLoadingPOs(true);
            const response = await fetch('/api/purchase-orders');
            if (response.ok) {
                const data = await response.json();
                setAllPurchaseOrders(Array.isArray(data) ? data : []);
            } else {
                setAllPurchaseOrders([]);
                console.error('Failed to fetch purchase orders:', response.status);
            }
        } catch (error) {
            console.error('Failed to fetch purchase orders:', error);
            setAllPurchaseOrders([]);
        } finally {
            setLoadingPOs(false);
        }
    }, []);

    const fetchGoodsReceipts = useCallback(async () => {
        try {
            setLoadingReceipts(true);
            const response = await fetch('/api/goods-receipts');
            if (response.ok) {
                const data = await response.json();
                setGoodsReceipts(Array.isArray(data) ? data : []);
            } else {
                setGoodsReceipts([]);
                console.error('Failed to fetch goods receipts:', response.status);
            }
        } catch (error) {
            console.error('Failed to fetch goods receipts:', error);
            setGoodsReceipts([]);
        } finally {
            setLoadingReceipts(false);
        }
    }, []);

    const refreshActions = useCallback(async () => {
        await fetchActions();
    }, [fetchActions]);

    const refreshPOsAndReceipts = useCallback(async () => {
        await Promise.all([fetchAllPurchaseOrders(), fetchGoodsReceipts()]);
    }, [fetchAllPurchaseOrders, fetchGoodsReceipts]);


    // Filter approved POs without receipts
    const getApprovedPOsWithoutReceipts = (): PurchaseOrder[] => {
        // Get all PO IDs that have receipts
        const poIdsWithReceipts = new Set(
            goodsReceipts
                .filter(receipt => receipt.purchaseOrder?._ref)
                .map(receipt => receipt.purchaseOrder!._ref)
        );

        // Filter approved POs that don't have receipts and map to the correct structure
        const approvedPOs = allPurchaseOrders
            .filter(po => po.status === 'approved' && !poIdsWithReceipts.has(po._id))
            .map(po => ({
                _id: po._id,
                _type: 'purchaseOrder',
                _createdAt: po.orderDate || new Date().toISOString(),
                poNumber: po.poNumber || '',
                status: po.status || 'approved',
                site: {
                    _id: po.site?._id || '',
                    name: po.site?.name || ''
                },
                supplier: {
                    _id: po.supplier?._id || '',
                    name: po.supplier?.name || ''
                },
                orderedItems: po.orderedItems || [],
                orderedBy: po.orderedBy || '',
                totalAmount: po.totalAmount || 0
            } as PurchaseOrder));

        return approvedPOs;
    };

    const approvedPOsWithoutReceipts = getApprovedPOsWithoutReceipts();

    const handleReceiveGoods = async (action: PendingAction) => {
        if (action.actionType === 'PurchaseOrder') {
            // Handle PO receiving
            setPreSelectedPO(action._id);
            setSelectedGoodsReceipt(null);
            onGoodsReceiptModalOpen();
        } else if (action.actionType === 'GoodsReceipt') {
            // Handle pending GoodsReceipt action
            try {
                // Fetch the full goods receipt details
                const response = await fetch(`/api/goods-receipts/${action._id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch goods receipt details');
                }
                const goodsReceipt = await response.json();

                // Open the modal with the existing goods receipt data
                setSelectedGoodsReceipt(goodsReceipt);
                setPreSelectedPO(null);
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
        }
    };

    const handleSelectionChange = (selectedItems: PendingAction[]) => {
        setSelectedActions(selectedItems);
    };

    // Refactored useEffects to be more specific
    useEffect(() => {
        if (isAuthReady && isAuthenticated && user) {
            refreshActions();
        }
    }, [isAuthReady, isAuthenticated, user, refreshActions]);

    useEffect(() => {
        if (isAddItemModalOpen) {
            setLoadingItems(true);
            const fetchAllData = async () => {
                await Promise.all([fetchCategories(), fetchAvailableItems()]);
                setLoadingItems(false);
            };
            fetchAllData();
        }
    }, [isAddItemModalOpen]);

    useEffect(() => {
        if (activeTab === 1) { // Goods Receipt tab
            refreshPOsAndReceipts();
        }
    }, [activeTab, refreshPOsAndReceipts]);

    const handleOpenWorkflow = (action: PendingAction) => {
        setSelectedAction(action);
        onModalOpen();
    };

    const handleOpenEditPO = async (action: PendingAction) => {
        try {
            const response = await fetch(`/api/purchase-orders?id=${action._id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch purchase order details');
            }
            const data = await response.json();

            // Transform the data to match PurchaseOrderDetails interface
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
                // Add the missing required properties
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

    const handleOpenApprovalDetails = (action: PendingAction) => {
        setSelectedApproval(action);
        onApprovalModalOpen();
    };

    {/*const handleFinalizeOrderStep = async (action: PendingAction) => {
        try {
            const response = await fetch(`/api/purchase-orders?id=${action._id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch purchase order details');
            }
            const data = await response.json();

            // Transform the data to match PurchaseOrderDetails interface
            const transformedData: PurchaseOrderDetails = {
                _id: data._id,
                _type: data._type || 'purchaseOrder', // Add this line
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
                totalAmount: data.totalAmount || 0
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
    };*/}

    const handleCompleteStep = async (stepIndex: number) => {
        // Only handle non-PO actions
        if (selectedAction && selectedAction.actionType !== 'PurchaseOrder') {
            const newCompletedSteps = stepIndex + 1;
            const newWorkflow = selectedAction.workflow?.map((step: any, index: number) => ({
                ...step,
                completed: index < newCompletedSteps,
            }));

            try {
                const response = await fetch('/api/actions/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: selectedAction._id,
                        completedSteps: newCompletedSteps,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to update action');
                }

                // Update local state
                const updatedAction = {
                    ...selectedAction,
                    workflow: newWorkflow,
                    completedSteps: newCompletedSteps,
                };
                setActions(prevActions =>
                    prevActions.map(action =>
                        action._id === updatedAction._id ? updatedAction : action
                    )
                );
                setSelectedAction(updatedAction);

                toast({
                    title: 'Step Completed',
                    description: `Workflow step "${selectedAction.workflow?.[stepIndex].title}" has been marked as complete.`,
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });

                const isEvidenceComplete = !selectedAction.evidenceRequired || selectedAction.evidenceStatus === 'complete';
                const allRequiredStepsCompleted = newWorkflow?.every((step: { required: any; completed: any; }, index: any) => !step.required || step.completed);

                if (isEvidenceComplete && allRequiredStepsCompleted) {
                    await onCompleteAction(selectedAction);
                }
            } catch (error: any) {
                toast({
                    title: 'Error',
                    description: 'Failed to update action. Please try again.',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
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
            // Refresh only the actions list after saving
            refreshActions();
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

    const handleConfirmOrderUpdate = () => {
        if (!poDetails) return;

        const zeroPriceItems = poDetails.orderedItems?.filter(item => {
            const price = editedPrices[item._key] ?? item.unitPrice;
            return price === 0;
        }).map(item => item.stockItem?.name || 'Unknown Item') || [];

        if (zeroPriceItems.length > 0) {
            setHasZeroPriceItems(zeroPriceItems);
            setIsZeroPriceDialogOpen(true);
        } else {
            setIsConfirmDialogOpen(true);
        }
    };

    const proceedWithOrderUpdate = async () => {
        setIsConfirmDialogOpen(false);
        setIsZeroPriceDialogOpen(false);
        setIsSaving(true);
        try {
            await handleSaveOrder();
            if (poDetails) {
                await handleApprovePO(poDetails);
            }
        } catch (error) {
            // Errors are handled in the specific functions
        } finally {
            setIsSaving(false);
            onOrderModalClose();
            refreshActions();
        }
    };



    const handleApprovePO = async (action: PurchaseOrderDetails | PendingAction) => {
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

    const onCompleteAction = async (action: PendingAction) => {
        try {
            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: action._id,
                    status: 'completed',
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to complete action');
            }
            toast({
                title: 'Action Completed',
                description: `The action "${action.title}" has been successfully completed.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            await refreshActions();
            onModalClose();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to complete action. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const onUploadSuccess = async () => {
        onUploadModalClose();
        toast({
            title: 'Evidence Uploaded',
            description: 'Your file has been uploaded successfully.',
            status: 'success',
            duration: 5000,
            isClosable: true,
        });
        await fetchActions();
    };

    // Add this helper function
    const fetchLatestPOData = async (poId: string | undefined) => {
        try {
            const response = await fetch(`/api/purchase-orders?id=${poId}`);
            if (response.ok) {
                const data = await response.json();
                setPoDetails({
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
                    // Add the missing required properties
                    title: data.title || `Purchase Order ${data.poNumber || ''}`,
                    description: data.description || `Order from ${data.supplierNames || data.supplierName || 'Unknown Supplier'}`,
                    createdAt: data.createdAt || data.orderDate || new Date().toISOString(),
                    priority: data.priority || 'medium',
                    siteName: data.siteName || data.site?.name || '',
                    actionType: data.actionType || 'PurchaseOrder',
                    evidenceRequired: data.evidenceRequired || false,
                });
            }
        } catch (error) {
            console.error('Failed to fetch latest PO data:', error);
        }
    };

    const handleRemoveItemFromPO = (itemKey: string) => {
        if (!poDetails) return;
        setPoDetails({
            ...poDetails,
            orderedItems: poDetails.orderedItems?.filter((item: { _key: string; }) => item._key !== itemKey) || [],
        });
    };

    const actionTypes = ['PurchaseOrder', 'GoodsReceipt', 'InternalTransfer', 'StockAdjustment'];

    // Filter actions for each tab - FIXED FILTERING
    const filteredActions = actions.filter(action => {
        const type = actionTypes[activeTab];
        // Only show actions that match the current tab AND are not completed/pending-approval
        return action.actionType === type &&
            action.status !== 'completed' &&
            action.status !== 'pending-approval';
    });

    // Filter pending approval actions for each tab - FIXED FILTERING
    const pendingApprovalActions = actions.filter(action => {
        const type = actionTypes[activeTab];
        // Only show pending approval actions that match the current tab
        return action.actionType === type &&
            action.status === 'pending-approval';
    });

    const completedActions = actions.filter(action => action.status === 'completed');

    if (!isAuthReady || loading) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Flex>
        );
    }

    if (error) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh" direction="column">
                <Text fontSize="xl" color="red.500">
                    {error}
                </Text>
                <Button onClick={fetchActions} mt={4}>
                    Try Again
                </Button>
            </Flex>
        );
    }

    return (
        <Box p={8}>
            <Heading as="h1" size="xl" mb={6}>
                Pending Actions
            </Heading>

            <Tabs variant="enclosed" onChange={(index) => setActiveTab(index)}>
                <TabList>
                    {actionTypes.map((type, index) => (
                        <Tab key={type}>{actionTypeTitles[type as keyof typeof actionTypeTitles]}</Tab>
                    ))}
                </TabList>
                <TabPanels>
                    {actionTypes.map((type, index) => (
                        <TabPanel key={type}>
                            {/* Pending Approvals Section */}
                            {pendingApprovalActions.length > 0 && (
                                <Accordion defaultIndex={[]} allowToggle mb={6}>
                                    <AccordionItem>
                                        <h2>
                                            <AccordionButton>
                                                <Box flex="1" textAlign="left">
                                                    <HStack>
                                                        <Text fontWeight="bold">Pending Approvals</Text>
                                                        <Badge colorScheme="yellow" ml={2}>
                                                            {pendingApprovalActions.length}
                                                        </Badge>
                                                    </HStack>
                                                </Box>
                                                <AccordionIcon />
                                            </AccordionButton>
                                        </h2>
                                        <AccordionPanel pb={4}>
                                            <DataTable
                                                columns={[
                                                    {
                                                        accessorKey: 'approvalAction',
                                                        header: 'Action',
                                                        isSortable: false,
                                                        cell: (row: any) => (
                                                            <Button
                                                                size="sm"
                                                                colorScheme="blue"
                                                                onClick={() => handleOpenApprovalDetails(row)}
                                                            >
                                                                View
                                                            </Button>
                                                        )
                                                    },
                                                    { accessorKey: 'title', header: 'Title', isSortable: true },
                                                    {
                                                        accessorKey: 'description',
                                                        header: 'Description',
                                                        isSortable: true,
                                                        cell: (row: any) => {
                                                            if (row.actionType === 'PurchaseOrder' && row.orderedItems && row.orderedItems.length > 0) {
                                                                return (
                                                                    <Box>
                                                                        <Text>{row.description}</Text>
                                                                        <Text fontSize="sm" color="gray.600" mt={1}>
                                                                            Items: {row.orderedItems.map((item: any) =>
                                                                                `${item.stockItem.name} (${item.orderedQuantity})`
                                                                            ).join(', ')}
                                                                        </Text>
                                                                    </Box>
                                                                );
                                                            }
                                                            return <Text>{row.description}</Text>;
                                                        }
                                                    },
                                                    { accessorKey: 'siteName', header: 'Site', isSortable: true },
                                                    { accessorKey: 'priority', header: 'Priority', isSortable: true },
                                                    {
                                                        accessorKey: 'createdAt',
                                                        header: 'Created At',
                                                        isSortable: true,
                                                        cell: (row: any) => new Date(row.createdAt).toLocaleDateString()
                                                    },
                                                ]}
                                                data={pendingApprovalActions}
                                                loading={loading}
                                                onActionClick={handleOpenApprovalDetails}
                                                onSelectionChange={handleSelectionChange}
                                            />
                                        </AccordionPanel>
                                    </AccordionItem>
                                </Accordion>
                            )}

                            {type === 'GoodsReceipt' && (
                                <>
                                    <Heading as="h3" size="md" mb={4}>
                                        Approved Purchase Orders Ready for Receiving
                                    </Heading>

                                    {loadingPOs || loadingReceipts ? (
                                        <Flex justifyContent="center" alignItems="center" py={10}>
                                            <Spinner size="xl" />
                                        </Flex>
                                    ) : approvedPOsWithoutReceipts.length === 0 ? (
                                        <Text fontSize="lg" color="gray.500">
                                            No approved purchase orders available for receiving.
                                        </Text>
                                    ) : (
                                        <DataTable
                                            columns={[
                                                {
                                                    accessorKey: 'receiveAction',
                                                    header: 'Action',
                                                    cell: (row: any) => (
                                                        <Button
                                                            size="sm"
                                                            colorScheme="green"
                                                            onClick={() => handleReceiveGoods({
                                                                _id: row._id,
                                                                actionType: 'PurchaseOrder',
                                                                title: `Receive PO ${row.poNumber}`,
                                                                description: `Receive items from ${row.supplier?.name}`,
                                                                createdAt: new Date().toISOString(),
                                                                priority: 'medium',
                                                                siteName: row.site?.name || '',
                                                                status: 'draft'
                                                            } as PendingAction)}
                                                            leftIcon={<FiPackage />}
                                                        >
                                                            Receive
                                                        </Button>
                                                    )
                                                },
                                                {
                                                    accessorKey: 'poNumber',
                                                    header: 'PO Number',
                                                    isSortable: true,
                                                    cell: (row: any) => <Text>{row.poNumber || 'N/A'}</Text>
                                                },
                                                {
                                                    accessorKey: 'supplierName',
                                                    header: 'Supplier',
                                                    isSortable: true,
                                                    cell: (row: any) => <Text>{row.supplier?.name || 'N/A'}</Text>
                                                },
                                                {
                                                    accessorKey: 'siteName',
                                                    header: 'Site',
                                                    isSortable: true,
                                                    cell: (row: any) => <Text>{row.site?.name || 'N/A'}</Text>
                                                },
                                                {
                                                    accessorKey: 'orderedItems',
                                                    header: 'Items',
                                                    isSortable: false,
                                                    cell: (row: any) => (
                                                        <Box>
                                                            {row.orderedItems?.slice(0, 2).map((item: any, index: number) => (
                                                                <Text key={index} fontSize="sm">
                                                                    {item.stockItem?.name || 'Unknown Item'} (x{item.orderedQuantity || 0})
                                                                </Text>
                                                            ))}
                                                            {row.orderedItems?.length > 2 && (
                                                                <Text fontSize="sm" color="gray.500">
                                                                    +{row.orderedItems.length - 2} more items
                                                                </Text>
                                                            )}
                                                            {(!row.orderedItems || row.orderedItems.length === 0) && (
                                                                <Text fontSize="sm" color="gray.500">
                                                                    No items
                                                                </Text>
                                                            )}
                                                        </Box>
                                                    )
                                                }
                                            ]}
                                            data={approvedPOsWithoutReceipts.map(po => ({
                                                _id: po._id,
                                                poNumber: po.poNumber || '',
                                                supplier: po.supplier || { name: '' },
                                                site: po.site || { name: '' },
                                                orderedItems: po.orderedItems || []
                                            }))}
                                            loading={loadingPOs || loadingReceipts}
                                            onActionClick={() => { }}
                                            hideStatusColumn={true}
                                            onSelectionChange={handleSelectionChange}
                                        />
                                    )}

                                    {/* Regular Goods Receipt Actions Section */}
                                    <Heading as="h3" size="md" mt={8} mb={4}>
                                        Pending Goods Receipts
                                    </Heading>

                                    {filteredActions.filter(action =>
                                        action.actionType === 'GoodsReceipt' &&
                                        (action.status === 'draft' || action.status === 'partial')
                                    ).length === 0 ? (
                                        <Text fontSize="lg" color="gray.500">
                                            No pending goods receipts at this time.
                                        </Text>
                                    ) : (
                                        <DataTable
                                            columns={[
                                                {
                                                    accessorKey: 'receiveAction',
                                                    header: 'Action',
                                                    cell: (row: any) => (
                                                        <Button
                                                            size="sm"
                                                            colorScheme="green"
                                                            onClick={() => handleReceiveGoods(row)}
                                                            leftIcon={<FiPackage />}
                                                        >
                                                            {row.status === 'draft' || row.status === 'partial' ? 'Receive' : 'View'}
                                                        </Button>
                                                    )
                                                },
                                                { accessorKey: 'title', header: 'Title', isSortable: true },
                                                { accessorKey: 'status', header: 'Status', isSortable: true },
                                                {
                                                    accessorKey: 'description',
                                                    header: 'Description',
                                                    isSortable: true,
                                                    cell: (row: any) => <Text>{row.description}</Text>
                                                },
                                                { accessorKey: 'siteName', header: 'Site', isSortable: true },
                                                { accessorKey: 'priority', header: 'Priority', isSortable: true },
                                                {
                                                    accessorKey: 'createdAt',
                                                    header: 'Created At',
                                                    isSortable: true,
                                                    cell: (row: any) => new Date(row.createdAt).toLocaleDateString()
                                                },
                                            ]}
                                            data={filteredActions.filter(action =>
                                                action.actionType === 'GoodsReceipt' &&
                                                (action.status === 'draft' || action.status === 'partial')
                                            )}
                                            loading={loading}
                                            onActionClick={(row) => handleReceiveGoods(row)}
                                            onSelectionChange={handleSelectionChange}
                                        />
                                    )}
                                </>
                            )}
                            {type !== 'GoodsReceipt' && (
                                filteredActions.length === 0 ? (
                                    <Text fontSize="lg" color="gray.500">
                                        No pending {actionTypeTitles[type as keyof typeof actionTypeTitles].toLowerCase()} at this time.
                                    </Text>
                                ) : (
                                    <DataTable
                                        columns={[
                                            {
                                                accessorKey: 'action',
                                                header: 'Action',
                                                isSortable: false,
                                                cell: (row: any) => {
                                                    if (row.actionType === 'PurchaseOrder' && row.status === 'draft') {
                                                        return (
                                                            <HStack spacing={2}>
                                                                <Button
                                                                    size="sm"
                                                                    colorScheme="blue"
                                                                    onClick={() => handleOpenEditPO(row)}
                                                                >
                                                                    Edit
                                                                </Button>
                                                            </HStack>
                                                        );
                                                    } else {
                                                        return (
                                                            <Button
                                                                size="sm"
                                                                colorScheme="blue"
                                                                onClick={() => handleOpenWorkflow(row)}
                                                            >
                                                                Resolve
                                                            </Button>
                                                        );
                                                    }
                                                },
                                            },
                                            { accessorKey: 'title', header: 'Title', isSortable: true },
                                            {
                                                accessorKey: 'description',
                                                header: 'Description',
                                                isSortable: true,
                                                cell: (row: any) => {
                                                    if (row.actionType === 'PurchaseOrder' && row.orderedItems && row.orderedItems.length > 0) {
                                                        return (
                                                            <Box>
                                                                <Text>{row.description}</Text>
                                                                <Text fontSize="sm" color="gray.600" mt={1}>
                                                                    Items: {row.orderedItems.map((item: any) =>
                                                                        `${item.stockItem.name} (${item.orderedQuantity})`
                                                                    ).join(', ')}
                                                                </Text>
                                                            </Box>
                                                        );
                                                    }
                                                    return <Text>{row.description}</Text>;
                                                }
                                            },
                                            { accessorKey: 'siteName', header: 'Site', isSortable: true },
                                            { accessorKey: 'priority', header: 'Priority', isSortable: true },
                                            {
                                                accessorKey: 'createdAt',
                                                header: 'Created At',
                                                isSortable: true,
                                                cell: (row: any) => new Date(row.createdAt).toLocaleDateString()
                                            },
                                        ]}
                                        data={filteredActions}
                                        loading={loading}
                                        onActionClick={(row) => {
                                            if (row.actionType === 'PurchaseOrder' && row.status === 'draft') {
                                                handleOpenEditPO(row);
                                            } else {
                                                handleOpenWorkflow(row);
                                            }
                                        }}
                                        onSelectionChange={handleSelectionChange}
                                    />
                                )
                            )}
                        </TabPanel>
                    ))}
                </TabPanels>
            </Tabs>

            {/* Workflow Modal */}
            <WorkflowModal
                isOpen={isModalOpen}
                onClose={onModalClose}
                selectedAction={selectedAction}
                onCompleteStep={handleCompleteStep}
            />

            {/* Approval Details Modal */}
            <Modal isOpen={isApprovalModalOpen} onClose={onApprovalModalClose} size="3xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        <HStack spacing={2} alignItems="center">
                            <Icon as={FaBoxes} color="blue.500" />
                            <Text>{selectedApproval?.poNumber} Details</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            <Flex justifyContent="space-between" flexWrap="wrap">
                                <Box>
                                    <Text fontWeight="bold">Reference Number:</Text>
                                    <Text>{selectedApproval?.poNumber}</Text>
                                </Box>
                                {selectedApproval?.supplierName && (
                                    <Box>
                                        <Text fontWeight="bold">Supplier:</Text>
                                        <Text>{selectedApproval.supplierName}</Text>
                                    </Box>
                                )}
                                <Box>
                                    <Text fontWeight="bold">Site:</Text>
                                    <Text>{selectedApproval?.siteName}</Text>
                                </Box>
                                {selectedApproval?.orderedBy && (
                                    <Box>
                                        <Text fontWeight="bold">Ordered By:</Text>
                                        <Text>{selectedApproval.orderedBy}</Text>
                                    </Box>
                                )}
                            </Flex>

                            {selectedApproval?.orderedItems && selectedApproval.orderedItems.length > 0 && (
                                <>
                                    <Heading as="h4" size="sm" mt={4}>
                                        Ordered Items
                                    </Heading>
                                    <TableContainer>
                                        <Table variant="simple" size="sm">
                                            <Thead>
                                                <Tr>
                                                    <Th>Item</Th>
                                                    <Th isNumeric>Quantity</Th>
                                                    <Th isNumeric>Unit Price</Th>
                                                    <Th isNumeric>Total</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {selectedApproval.orderedItems.map((item: any) => (
                                                    <Tr key={item._key}>
                                                        <Td>{item.stockItem?.name}</Td>
                                                        <Td isNumeric>{item.orderedQuantity}</Td>
                                                        <Td isNumeric>E {item.unitPrice?.toFixed(2)}</Td>
                                                        <Td isNumeric>E {(item.unitPrice * item.orderedQuantity).toFixed(2)}</Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" onClick={onApprovalModalClose}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Existing modals */}
            {selectedAction && (
                <FileUploadModal
                    isOpen={isUploadModalOpen}
                    onClose={onUploadModalClose}
                    relatedTo={selectedAction._id}
                    relatedType={selectedAction._type}
                    onUploadSuccess={onUploadSuccess}
                />
            )}

            <PurchaseOrderModal
                isOpen={isOrderModalOpen}
                onClose={onOrderModalClose}
                poDetails={poDetails}
                editedPrices={editedPrices}
                setEditedPrices={setEditedPrices}
                editedQuantities={editedQuantities}
                setEditedQuantities={setEditedQuantities}
                isSaving={isSaving}
                onSave={handleSaveOrder}
                onApproveRequest={handleConfirmOrderUpdate}
                onRemoveItem={handleRemoveItemFromPO}
            />


            <GoodsReceiptModal
                isOpen={isGoodsReceiptModalOpen}
                onClose={() => {
                    onGoodsReceiptModalClose();
                    setPreSelectedPO(null);
                    setSelectedGoodsReceipt(null);
                }}
                receipt={selectedGoodsReceipt}
                onSave={() => {
                    onGoodsReceiptModalClose();
                    setPreSelectedPO(null);
                    setSelectedGoodsReceipt(null);
                    refreshActions();
                    // Refresh both purchase orders and receipts
                    refreshPOsAndReceipts();
                }}
                approvedPurchaseOrders={approvedPOsWithoutReceipts}
                preSelectedPO={preSelectedPO}
            />

            <AlertDialog
                isOpen={isConfirmDialogOpen}
                onClose={() => setIsConfirmDialogOpen(false)}
                leastDestructiveRef={cancelRef}>
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Confirm Submission
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            Are you sure you want to submit this Purchase Order for approval?
                            This action cannot be undone.
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button onClick={() => setIsConfirmDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button colorScheme="blue" onClick={proceedWithOrderUpdate} ml={3}>
                                Confirm Submit
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>


            <AlertDialog
                isOpen={isZeroPriceDialogOpen}
                onClose={() => setIsZeroPriceDialogOpen(false)}
                leastDestructiveRef={cancelRef}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Zero Price Warning
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            <Text mb={3}>The following items have a price of $0:</Text>
                            <VStack align="start" spacing={1} mb={3}>
                                {hasZeroPriceItems.map((itemName, index) => (
                                    <Text key={index} fontSize="sm">• {itemName}</Text>
                                ))}
                            </VStack>
                            <Text>Are you sure you want to proceed with zero prices?</Text>
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button onClick={() => setIsZeroPriceDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button colorScheme="orange" onClick={proceedWithOrderUpdate} ml={3}>
                                Proceed Anyway
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
}