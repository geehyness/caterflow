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
    Card,
    CardBody,
    Input,
    InputGroup,
    InputLeftElement,
    useColorModeValue,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react'
import { FaBoxes } from 'react-icons/fa';
import { FiPackage, FiFilter, FiEye, FiSearch, FiPlus } from 'react-icons/fi';
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
import { Category, Reference, Site, StockItem } from '@/lib/sanityTypes';
import CreatePurchaseOrderModal from './CreatePurchaseOrderModal';

// Interface for items selected in the modal
interface SelectedItemData {
    item: StockItem;
    quantity: number;
    price: number;
}

// Interface for items to be saved in a new PO
interface OrderItem {
    stockItem: string;
    supplier: string;
    orderedQuantity: number;
    unitPrice: number;
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
    const { data: session, status } = useSession();
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
    const { isOpen: isPOSelectionModalOpen, onOpen: onPOSelectionModalOpen, onClose: onPOSelectionModalClose } = useDisclosure();
    const { isOpen: isCreatePOModalOpen, onOpen: onCreatePOModalOpen, onClose: onCreatePOModalClose } = useDisclosure();

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
    const [viewMode, setViewMode] = useState<'actionRequired' | 'all'>('actionRequired');

    // State for purchase orders and receipts
    const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
    const [loadingPOs, setLoadingPOs] = useState(false);
    const [loadingReceipts, setLoadingReceipts] = useState(false);

    // State for creating new POs
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedItems, setSelectedItems] = useState<any[]>([]); // For CreatePurchaseOrderModal, initially empty


    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [isZeroPriceDialogOpen, setIsZeroPriceDialogOpen] = useState(false);
    const [hasZeroPriceItems, setHasZeroPriceItems] = useState<string[]>([]);

    const cancelRef = useRef<HTMLButtonElement>(null);

    // Add this state to track which data needs refreshing
    const [refreshFlags, setRefreshFlags] = useState({
        actions: false,
        purchaseOrders: false,
        goodsReceipts: false
    });

    // Extract user data from session
    const user = session?.user as any; // Temporary any type
    const isAuthenticated = status === 'authenticated';
    const isAuthReady = status !== 'loading';

    // Theme-based colors
    const primaryBgColor = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');

    const fetchActions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Update the API call to use the correct user data structure
            const response = await fetch(`/api/actions?userId=${user?.id}&userRole=${user?.role}&userSite=${user?.associatedSite?._id}`);
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
    }, [user, toast]); // Keep user in dependencies

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

    // Fetch suppliers and sites for PO creation
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const response = await fetch('/api/suppliers');
                if (response.ok) {
                    const data = await response.json();
                    setSuppliers(data);
                }
            } catch (error) {
                console.error('Failed to fetch suppliers:', error);
            }
        };

        const fetchSites = async () => {
            try {
                const response = await fetch('/api/sites');
                if (response.ok) {
                    const data = await response.json();
                    setSites(data);
                }
            } catch (error) {
                console.error('Failed to fetch sites:', error);
            }
        };

        fetchSuppliers();
        fetchSites();
    }, []);

    // Modify the refresh functions to use flags instead of full refreshes
    const refreshActions = useCallback(async () => {
        setRefreshFlags(prev => ({ ...prev, actions: true }));
        try {
            await fetchActions();
        } finally {
            setRefreshFlags(prev => ({ ...prev, actions: false }));
        }
    }, [fetchActions]);

    const refreshPOsAndReceipts = useCallback(async () => {
        setRefreshFlags(prev => ({ ...prev, purchaseOrders: true, goodsReceipts: true }));
        try {
            await Promise.all([fetchAllPurchaseOrders(), fetchGoodsReceipts()]);
        } finally {
            setRefreshFlags(prev => ({ ...prev, purchaseOrders: false, goodsReceipts: false }));
        }
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

    const handleAddReceipt = () => {
        onPOSelectionModalOpen();
    };

    const handleCreateReceiptFromPO = (po: any) => {
        setPreSelectedPO(po._id);
        setSelectedGoodsReceipt(null); // Ensure we're creating a new one
        onPOSelectionModalClose(); // Close the selection modal
        onGoodsReceiptModalOpen(); // Open the main receipt modal
    };

    const handleAddOrder = () => onCreatePOModalOpen();

    const handleCreateOrders = async (items: OrderItem[], siteId?: string) => {
        try {
            const totalAmount = items.reduce((sum, item) => sum + (item.orderedQuantity * item.unitPrice), 0);

            const response = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    poNumber: `PO-${Date.now()}`,
                    orderDate: new Date().toISOString(),
                    orderedBy: user?.id,
                    orderedItems: items,
                    totalAmount,
                    status: 'draft',
                    site: siteId,
                }),
            });

            if (response.ok) {
                toast({
                    title: 'Purchase order created',
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
                onCreatePOModalClose();
                refreshActions(); // Refresh the actions list
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create purchase order');
            }
        } catch (error: any) {
            console.error('Error creating purchase order:', error);
            toast({
                title: 'Error creating purchase order',
                description: error.message || 'An unexpected error occurred.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
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

    // Get actions that require action for the current tab
    const getActionRequiredActions = (tabIndex: number) => {
        const type = actionTypes[tabIndex];

        switch (type) {
            case 'PurchaseOrder':
                return actions.filter(action =>
                    action.actionType === 'PurchaseOrder' &&
                    action.status === 'draft'
                );
            case 'GoodsReceipt':
                return actions.filter(action =>
                    action.actionType === 'GoodsReceipt' &&
                    (action.status === 'draft' || action.status === 'partial')
                );
            case 'InternalTransfer':
                return actions.filter(action =>
                    action.actionType === 'InternalTransfer' &&
                    action.status === 'draft'
                );
            case 'StockAdjustment':
                return actions.filter(action =>
                    action.actionType === 'StockAdjustment' &&
                    action.status === 'draft'
                );
            default:
                return [];
        }
    };

    // Get all actions for the current tab
    const getAllActions = (tabIndex: number) => {
        const type = actionTypes[tabIndex];
        return actions.filter(action => action.actionType === type);
    };

    // Get actions to display based on view mode
    const getActionsToDisplay = (tabIndex: number) => {
        return viewMode === 'actionRequired'
            ? getActionRequiredActions(tabIndex)
            : getAllActions(tabIndex);
    };

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
                <Button onClick={fetchActions} mt={4} colorScheme="brand">
                    Try Again
                </Button>
            </Flex>
        );
    }

    return (
        <Box p={{ base: 4, md: 8 }} bg={primaryBgColor} minH="calc(100vh - 60px)">
            <Heading as="h1" size={{ base: 'lg', md: 'xl' }} mb={6} color={primaryTextColor}>
                Pending Actions
            </Heading>

            <Tabs variant="enclosed" onChange={(index) => setActiveTab(index)} colorScheme="brand">
                <TabList overflowX="auto" whiteSpace="nowrap">
                    {actionTypes.map((type, index) => (
                        <Tab key={type}>{actionTypeTitles[type as keyof typeof actionTypeTitles]}</Tab>
                    ))}
                </TabList>
                <TabPanels>
                    {actionTypes.map((type, index) => (
                        <TabPanel key={type}>
                            <Flex
                                direction={{ base: 'column', sm: 'row' }}
                                justifyContent="space-between"
                                alignItems="center"
                                mb={4}
                                gap={3}
                            >
                                {/* New Order button for PurchaseOrder tab */}
                                {type === 'PurchaseOrder' && (
                                    <Button
                                        leftIcon={<FiPlus />}
                                        colorScheme="brand"
                                        onClick={handleAddOrder}
                                        w={{ base: '100%', sm: 'auto' }}
                                    >
                                        New Order
                                    </Button>
                                )}
                                <HStack
                                    justifyContent={{ base: 'flex-start', sm: 'flex-end' }}
                                    flex="1"
                                    w={{ base: '100%', sm: 'auto' }}
                                >
                                    <Button
                                        leftIcon={<FiFilter />}
                                        colorScheme={viewMode === 'actionRequired' ? 'brand' : 'gray'}
                                        onClick={() => setViewMode('actionRequired')}
                                        size="sm"
                                    >
                                        Action Required
                                    </Button>
                                    <Button
                                        leftIcon={<FiEye />}
                                        colorScheme={viewMode === 'all' ? 'brand' : 'gray'}
                                        onClick={() => setViewMode('all')}
                                        size="sm"
                                    >
                                        View All
                                    </Button>
                                </HStack>
                            </Flex>

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
                                                                colorScheme="brand"
                                                                variant="outline"
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
                                                                        <Text fontSize="sm" color="neutral.light.text-secondary">
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
                                                loading={refreshFlags.actions}
                                                onActionClick={handleOpenApprovalDetails}
                                                onSelectionChange={handleSelectionChange}
                                            />
                                        </AccordionPanel>
                                    </AccordionItem>
                                </Accordion>
                            )}

                            {type === 'GoodsReceipt' && (
                                <>
                                    <Flex
                                        direction={{ base: 'column', sm: 'row' }}
                                        justifyContent="space-between"
                                        alignItems="center"
                                        mb={4}
                                        gap={3}
                                    >
                                        <Heading as="h3" size="md" color={primaryTextColor} w={{ base: '100%', sm: 'auto' }}>
                                            Pending Goods Receipts
                                        </Heading>
                                        <Button
                                            leftIcon={<Icon as={FiPlus} />}
                                            colorScheme="brand"
                                            onClick={handleAddReceipt}
                                            w={{ base: '100%', sm: 'auto' }}
                                        >
                                            New Receipt
                                        </Button>
                                    </Flex>

                                    {getActionsToDisplay(index).filter(action =>
                                        action.actionType === 'GoodsReceipt' &&
                                        (action.status === 'draft' || action.status === 'partial')
                                    ).length === 0 ? (
                                        <Text fontSize="lg" color="neutral.light.text-secondary">
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
                                                            {row.status === 'draft' ? 'Receive' : 'Continue Receiving'}
                                                        </Button>
                                                    )
                                                },
                                                { accessorKey: 'title', header: 'Title', isSortable: true },
                                                { accessorKey: 'description', header: 'Description', isSortable: true },
                                                { accessorKey: 'siteName', header: 'Site', isSortable: true },
                                                { accessorKey: 'priority', header: 'Priority', isSortable: true },
                                                {
                                                    accessorKey: 'createdAt',
                                                    header: 'Created At',
                                                    isSortable: true,
                                                    cell: (row: any) => new Date(row.createdAt).toLocaleDateString()
                                                },
                                            ]}
                                            data={getActionsToDisplay(index).filter(action =>
                                                action.actionType === 'GoodsReceipt' &&
                                                (action.status === 'draft' || action.status === 'partial')
                                            )}
                                            loading={refreshFlags.goodsReceipts}
                                            onActionClick={handleReceiveGoods}
                                            onSelectionChange={handleSelectionChange}
                                        />
                                    )}
                                </>
                            )}

                            {type !== 'GoodsReceipt' && (
                                <>
                                    {getActionsToDisplay(index).length === 0 ? (
                                        <Text fontSize="lg" color="neutral.light.text-secondary">
                                            {viewMode === 'actionRequired'
                                                ? `No ${actionTypeTitles[type as keyof typeof actionTypeTitles].toLowerCase()} actions requiring attention at this time.`
                                                : `No ${actionTypeTitles[type as keyof typeof actionTypeTitles].toLowerCase()} actions found.`
                                            }
                                        </Text>
                                    ) : (
                                        <DataTable
                                            columns={[
                                                {
                                                    accessorKey: 'action',
                                                    header: 'Action',
                                                    cell: (row: any) => (
                                                        <VStack spacing={2} align="start">
                                                            {row.actionType === 'PurchaseOrder' && row.status === 'draft' && (
                                                                <Button
                                                                    size="sm"
                                                                    colorScheme="blue"
                                                                    onClick={() => handleOpenEditPO(row)}
                                                                >
                                                                    Edit
                                                                </Button>
                                                            )}
                                                        </VStack>
                                                    )
                                                },
                                                { accessorKey: 'title', header: 'Title', isSortable: true },
                                                { accessorKey: 'description', header: 'Description', isSortable: true },
                                                { accessorKey: 'siteName', header: 'Site', isSortable: true },
                                                { accessorKey: 'priority', header: 'Priority', isSortable: true },
                                                {
                                                    accessorKey: 'createdAt',
                                                    header: 'Created At',
                                                    isSortable: true,
                                                    cell: (row: any) => new Date(row.createdAt).toLocaleDateString()
                                                },
                                            ]}
                                            data={getActionsToDisplay(index)}
                                            loading={refreshFlags.actions}
                                            //onActionClick={handleOpenWorkflow}
                                            onSelectionChange={handleSelectionChange}
                                        />
                                    )}
                                </>
                            )}
                        </TabPanel>
                    ))}
                </TabPanels>
            </Tabs>

            {/* Modals */}
            {poDetails && (
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
            )}

            {selectedAction && (
                <FileUploadModal
                    isOpen={isUploadModalOpen}
                    onClose={onUploadModalClose}
                    onUploadComplete={onUploadSuccess}
                    relatedToId={selectedAction._id}
                    fileType="photo" // Changed from "evidence" to an allowed value
                    title={`Upload Evidence for ${selectedAction.title}`}
                    description="Please upload supporting documents or photos as evidence."
                />
            )}

            <GoodsReceiptModal
                isOpen={isGoodsReceiptModalOpen}
                onClose={onGoodsReceiptModalClose}
                receipt={selectedGoodsReceipt}
                onSave={() => {
                    onGoodsReceiptModalClose();
                    refreshActions();
                    refreshPOsAndReceipts();
                }}
                approvedPurchaseOrders={approvedPOsWithoutReceipts}
                preSelectedPO={preSelectedPO}
            />

            <Modal isOpen={isPOSelectionModalOpen} onClose={onPOSelectionModalClose} size="4xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Select Purchase Order for Receiving</ModalHeader>
                    <ModalBody>
                        <Heading as="h3" size="md" mb={4}>
                            Approved Purchase Orders Ready for Receiving
                        </Heading>
                        {refreshFlags.purchaseOrders ? (
                            <Flex justifyContent="center" alignItems="center" py={10}>
                                <Spinner size="xl" />
                            </Flex>
                        ) : approvedPOsWithoutReceipts.length === 0 ? (
                            <Text fontSize="lg" color="neutral.light.text-secondary">
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
                                                onClick={() => handleCreateReceiptFromPO(row)}
                                                leftIcon={<FiPackage />}
                                            >
                                                Receive
                                            </Button>
                                        )
                                    },
                                    { accessorKey: 'poNumber', header: 'PO Number', isSortable: true },
                                    { accessorKey: 'supplierName', header: 'Supplier', isSortable: true, cell: (row: any) => <Text>{row.supplier?.name || 'N/A'}</Text> },
                                    { accessorKey: 'siteName', header: 'Site', isSortable: true, cell: (row: any) => <Text>{row.site?.name || 'N/A'}</Text> },
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
                                                    <Text fontSize="sm" color="neutral.light.text-secondary">
                                                        +{row.orderedItems.length - 2} more items
                                                    </Text>
                                                )}
                                                {(!row.orderedItems || row.orderedItems.length === 0) && (
                                                    <Text fontSize="sm" color="neutral.light.text-secondary">No items</Text>
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
                                loading={refreshFlags.purchaseOrders}
                                onActionClick={() => { }}
                                hideStatusColumn={true}
                                onSelectionChange={() => { }}
                            />
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" onClick={onPOSelectionModalClose}>
                            Cancel
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <CreatePurchaseOrderModal
                isOpen={isCreatePOModalOpen}
                onClose={onCreatePOModalClose}
                onSave={handleCreateOrders}
                selectedItems={selectedItems}
                suppliers={suppliers}
                sites={sites}
            />


            {/* Confirmation Dialogs */}
            <AlertDialog
                isOpen={isConfirmDialogOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => setIsConfirmDialogOpen(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Confirm Submission
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            Are you sure you want to submit this purchase order for approval?
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setIsConfirmDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button colorScheme="brand" onClick={proceedWithOrderUpdate} ml={3}>
                                Confirm
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>

            <AlertDialog
                isOpen={isZeroPriceDialogOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => setIsZeroPriceDialogOpen(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Zero Price Items Detected
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            <Text mb={3}>The following items have a price of £0.00:</Text>
                            <VStack align="start" spacing={1}>
                                {hasZeroPriceItems.map((item, index) => (
                                    <Text key={index} fontSize="sm" color="orange.500">
                                        • {item}
                                    </Text>
                                ))}
                            </VStack>
                            <Text mt={3}>Are you sure you want to proceed with submission?</Text>
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setIsZeroPriceDialogOpen(false)}>
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