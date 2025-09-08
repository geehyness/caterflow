'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEye, FiFilter, FiEdit } from 'react-icons/fi';
import DataTable from '@/app/actions/DataTable';
import { useAuth } from '@/context/AuthContext';
import CreatePurchaseOrderModal from './CreatePurchaseOrderModal';
import WorkflowModal from '@/app/actions/WorkflowModal';
import PurchaseOrderModal from '@/app/actions/PurchaseOrderModal';
import AddItemModal from '@/app/actions/AddItemModal';
import { PendingAction, StockItem, Category } from '@/app/actions/types';

interface PurchaseOrderItem {
    stockItem: string;
    orderedQuantity: number;
    unitPrice: number;
    _key?: string;
}

export interface PurchaseOrder {
    _id: string;
    poNumber: string;
    orderDate: string;
    status: 'draft' | 'pending' | 'partially-received' | 'received' | 'cancelled' | 'approved' | 'pending-approval' | 'rejected';
    supplier: { name: string; _id: string } | null;
    totalAmount: number;
    items?: PurchaseOrderItem[];
    site?: { name: string; _id: string } | null;
    orderedBy?: string;
    orderedItems?: Array<{
        _key: string;
        stockItem: {
            name: string;
        };
        orderedQuantity: number;
        unitPrice: number;
    }>;
    description?: string;
    title?: string;
    priority?: 'high' | 'medium' | 'low';
    createdAt?: string;
    siteName?: string;
    actionType?: string;
    evidenceRequired?: boolean;
    evidenceStatus?: 'pending' | 'partial' | 'complete';
    workflow?: any[];
    completedSteps?: number;
}

export default function PurchasesPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'actionRequired' | 'all'>('actionRequired');

    const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
    const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
    const { isOpen: isOrderModalOpen, onOpen: onOrderModalOpen, onClose: onOrderModalClose } = useDisclosure();
    const { isOpen: isAddItemModalOpen, onOpen: onAddItemModalOpen, onClose: onAddItemModalClose } = useDisclosure();
    const [poDetails, setPoDetails] = useState<PendingAction | null>(null);
    const [editedPrices, setEditedPrices] = useState<{ [key: string]: number | undefined }>({});
    const [editedQuantities, setEditedQuantities] = useState<{ [key: string]: number | undefined }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [availableItems, setAvailableItems] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const inputBg = useColorModeValue('white', 'gray.800');

    const fetchPurchaseOrders = useCallback(async () => {
        try {
            const response = await fetch('/api/purchase-orders');
            if (response.ok) {
                const data = await response.json();
                const transformedData = data.map((order: any) => ({
                    ...order,
                    supplier: order.supplier?.name || order.supplier || null,
                    siteName: order.site?.name || '',
                    actionType: 'PurchaseOrder',
                    title: `Purchase Order ${order.poNumber}`,
                    description: `Order from ${order.supplier?.name || order.supplier}`,
                    priority: 'medium',
                    createdAt: order.orderDate,
                }));
                setPurchaseOrders(transformedData);
                setFilteredOrders(transformedData);
            } else {
                throw new Error('Failed to fetch purchase orders');
            }
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            toast({
                title: 'Error',
                description: 'Failed to load purchase orders. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPurchaseOrders();
    }, [fetchPurchaseOrders]); // Fixed: Added fetchPurchaseOrders to dependency array

    useEffect(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            setFilteredOrders(
                purchaseOrders.filter(order => {
                    const poNumberMatch = order.poNumber.toLowerCase().includes(term);
                    const supplierName = typeof order.supplier === 'string' ? order.supplier : order.supplier?.name;
                    const supplierMatch = supplierName?.toLowerCase().includes(term) || false;
                    const siteMatch = order.siteName?.toLowerCase().includes(term) || false;
                    return poNumberMatch || supplierMatch || siteMatch;
                })
            );
        } else {
            setFilteredOrders(purchaseOrders);
        }
    }, [purchaseOrders, searchTerm]);

    const handleAddOrder = () => {
        onOpen();
    };

    const handleViewOrder = (order: PurchaseOrder) => {
        const action: PendingAction = {
            _id: order._id,
            _type: 'PurchaseOrder',
            title: `Purchase Order ${order.poNumber}`,
            description: `Order from ${typeof order.supplier === 'string' ? order.supplier : order.supplier?.name}`,
            createdAt: order.orderDate,
            priority: 'medium',
            siteName: order.siteName || '',
            actionType: 'PurchaseOrder',
            status: order.status,
            poNumber: order.poNumber,
            supplierName: typeof order.supplier === 'string' ? order.supplier : order.supplier?.name || '',
            orderedItems: order.orderedItems?.map(item => ({
                _key: item._key || Math.random().toString(36).substr(2, 9),
                stockItem: { name: item.stockItem?.name || 'Unknown Item' },
                orderedQuantity: item.orderedQuantity,
                unitPrice: item.unitPrice
            })),
            evidenceRequired: false,
            workflow: [
                {
                    title: 'Finalize Order Details',
                    description: 'Review and confirm the items, quantities, and prices before submitting.',
                    completed: order.status !== 'draft',
                    required: true
                },
                {
                    title: 'Submit for Approval',
                    description: 'Send the purchase order to a manager for approval.',
                    completed: order.status === 'approved' || order.status === 'pending-approval',
                    required: true
                }
            ],
            completedSteps: order.status === 'draft' ? 0 : (order.status === 'approved' || order.status === 'pending-approval') ? 2 : 1
        };

        setSelectedAction(action);

        if (order.status === 'draft') {
            handleFinalizeOrderStep(action);
        } else {
            // For non-draft orders, just show the details
            setPoDetails(action);
            onOrderModalOpen();
        }
    };

    const handleSaveSuccess = () => {
        fetchPurchaseOrders();
        onClose();
    };

    const handleFinalizeOrderStep = async (action: PendingAction) => {
        try {
            const response = await fetch(`/api/purchase-orders/${action._id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch purchase order details');
            }
            const data = await response.json();
            setPoDetails(data);
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

    const handleCompleteStep = useCallback(
        async (
            poId: string,
            newStatus: 'pending-approval' | 'approved' | 'rejected' | 'draft',
            nextStepIndex: number
        ) => {
            setIsSaving(true);
            try {
                const response = await fetch('/api/purchase-orders/update-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ poId, status: newStatus }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`API error: ${errorData.error}`);
                }

                setPurchaseOrders(prevOrders => prevOrders.map(order =>
                    order._id === poId ? {
                        ...order,
                        status: newStatus,
                        completedSteps: nextStepIndex
                    } as PurchaseOrder : order
                ));

                if (selectedAction && selectedAction._id === poId) {
                    setSelectedAction({ ...selectedAction, status: newStatus, completedSteps: nextStepIndex });
                }

                toast({
                    title: `Purchase Order Updated`,
                    description: `PO ${selectedAction?.poNumber} status changed to ${newStatus}.`,
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
            } catch (error: any) {
                console.error('Error during status update:', error);
                toast({
                    title: 'Update Failed',
                    description: error.message || 'An error occurred while updating the purchase order.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setIsSaving(false);
            }
        },
        [selectedAction, toast]
    );

    const handleConfirmOrderUpdate = useCallback(async () => {
        setIsSaving(true);
        if (selectedAction) {
            const poId = selectedAction._id;

            try {
                // Submit the purchase order for approval
                await handleCompleteStep(poId, 'pending-approval', 2);

                toast({
                    title: 'Purchase Order Submitted',
                    description: `Order ${selectedAction.poNumber} has been submitted for approval.`,
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });

                onOrderModalClose();
                fetchPurchaseOrders();

            } catch (error) {
                console.error('Error during PO update:', error);
                toast({
                    title: 'Update Failed',
                    description: 'An error occurred while submitting the purchase order.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setIsSaving(false);
            }
        }
    }, [selectedAction, toast, onOrderModalClose, fetchPurchaseOrders, handleCompleteStep]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'gray';
            case 'pending': return 'yellow';
            case 'pending-approval': return 'orange';
            case 'approved': return 'blue';
            case 'partially-received': return 'orange';
            case 'received': return 'green';
            case 'cancelled': return 'red';
            case 'rejected': return 'red';
            default: return 'gray';
        }
    };

    const getOrdersToDisplay = () => {
        if (viewMode === 'actionRequired') {
            // Only show draft purchase orders (exclude pending-approval)
            return filteredOrders.filter(order =>
                order.status === 'draft'
            );
        }
        return filteredOrders;
    };

    const getItemList = (order: PurchaseOrder) => {
        if (!order.orderedItems || order.orderedItems.length === 0) return '';
        const items = order.orderedItems.slice(0, 3).map(item =>
            `${item.stockItem?.name || 'Unknown Item'} (${item.orderedQuantity})`
        );
        return items.join(', ') + (order.orderedItems.length > 3 ? '...' : '');
    };

    const columns = [
        {
            accessorKey: 'workflowAction',
            header: 'Action',
            isSortable: false,
            cell: (row: any) => (
                <Button
                    size="sm"
                    colorScheme={row.status === 'draft' ? 'blue' : 'gray'}
                    variant={row.status === 'draft' ? 'solid' : 'outline'}
                    onClick={() => handleViewOrder(row)}
                    leftIcon={row.status === 'draft' ? <FiEdit /> : <FiEye />}
                >
                    {row.status === 'draft' ? 'Edit' : 'View'}
                </Button>
            )
        },
        {
            accessorKey: 'poNumber',
            header: 'PO Number',
            isSortable: true
        },
        {
            accessorKey: 'description',
            header: 'Description',
            isSortable: true,
            cell: (row: any) => {
                const itemList = getItemList(row);
                return (
                    <Box>
                        <Text>{row.description || `Order from ${typeof row.supplier === 'string' ? row.supplier : row.supplier?.name}`}</Text>
                        {itemList && (
                            <Text fontSize="sm" color="gray.600" mt={1}>
                                Items: {itemList}
                            </Text>
                        )}
                    </Box>
                );
            }
        },
        {
            accessorKey: 'siteName',
            header: 'Site',
            isSortable: true
        },
        {
            accessorKey: 'status',
            header: 'Status',
            isSortable: true,
            cell: (row: any) => (
                <Badge colorScheme={getStatusColor(row.status)}>
                    {row.status.replace('-', ' ').toUpperCase()}
                </Badge>
            )
        },
        {
            accessorKey: 'orderDate',
            header: 'Order Date',
            isSortable: true,
            cell: (row: any) => new Date(row.orderDate).toLocaleDateString()
        },
        {
            accessorKey: 'totalAmount',
            header: 'Total Amount',
            isSortable: true,
            cell: (row: any) => `$${row.totalAmount?.toFixed(2) || '0.00'}`
        },
    ];

    if (loading) {
        return (
            <Box p={4}>
                <Flex justifyContent="center" alignItems="center" height="50vh">
                    <Spinner size="xl" />
                </Flex>
            </Box>
        );
    }

    return (
        <Box p={4}>
            <Flex justifyContent="space-between" alignItems="center" mb={6}>
                <Heading as="h1" size="lg">Purchase Orders</Heading>
                <Flex gap={3}>
                    <Button
                        leftIcon={<FiFilter />}
                        colorScheme={viewMode === 'actionRequired' ? 'blue' : 'gray'}
                        variant={viewMode === 'actionRequired' ? 'solid' : 'outline'}
                        onClick={() => setViewMode('actionRequired')}
                    >
                        Action Required
                    </Button>
                    <Button
                        leftIcon={<FiEye />}
                        colorScheme={viewMode === 'all' ? 'blue' : 'gray'}
                        variant={viewMode === 'all' ? 'solid' : 'outline'}
                        onClick={() => setViewMode('all')}
                    >
                        View All
                    </Button>
                    <Button
                        leftIcon={<FiPlus />}
                        colorScheme="blue"
                        onClick={handleAddOrder}
                    >
                        New Order
                    </Button>
                </Flex>
            </Flex>

            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" mb={4} p={4}>
                <InputGroup>
                    <InputLeftElement pointerEvents="none">
                        <FiSearch color="gray.300" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search purchase orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        bg={inputBg}
                    />
                </InputGroup>
            </Card>

            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md">
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={getOrdersToDisplay()}
                        loading={loading}
                        onActionClick={handleViewOrder}
                    />
                </CardBody>
            </Card>

            <CreatePurchaseOrderModal
                isOpen={isOpen}
                onClose={onClose}
                onSave={handleSaveSuccess}
            />

            <PurchaseOrderModal
                isOpen={isOrderModalOpen}
                onClose={onOrderModalClose}
                poDetails={poDetails}
                editedPrices={editedPrices}
                setEditedPrices={setEditedPrices}
                editedQuantities={editedQuantities}
                setEditedQuantities={setEditedQuantities}
                isSaving={isSaving}
                onConfirmOrderUpdate={handleConfirmOrderUpdate}
                onAddItemModalOpen={onAddItemModalOpen}
                onRemoveItem={() => { }}
            //isStepCompleted={selectedAction?.completedSteps !== undefined && selectedAction.completedSteps > 0}
            />

            <AddItemModal
                isOpen={isAddItemModalOpen}
                onClose={onAddItemModalClose}
                availableItems={availableItems}
                categories={categories}
                onAddItems={() => { }}
                searchTerm={""}
                setSearchTerm={() => { }}
                selectedCategory={""}
                setSelectedCategory={() => { }}
                loadingItems={loadingItems}
            />
        </Box>
    );
}