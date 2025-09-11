// src/app/purchases/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEye, FiFilter, FiEdit } from 'react-icons/fi';
import DataTable from '@/app/actions/DataTable';
import { useAuth } from '@/context/AuthContext';
import CreatePurchaseOrderModal from '@/app/actions/CreatePurchaseOrderModal';
import PurchaseOrderModal from '@/app/actions/PurchaseOrderModal';
import { PendingAction } from '@/app/actions/types';
import { StockItem, Category, Site } from '@/lib/sanityTypes';
import { PurchaseOrderDetails } from '@/app/actions/PurchaseOrderModal';

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
    totalAmount: number;
    items?: PurchaseOrderItem[];
    site?: { name: string; _id: string } | null;
    orderedBy?: string;
    orderedItems?: Array<{
        _key: string;
        orderedQuantity: number;
        unitPrice: number;
        stockItem: {
            name: string;
        };
        supplier: {
            name: string;
        } | null;
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
    supplierNames?: string;
}

interface OrderItem {
    stockItem: string;
    supplier: string;
    orderedQuantity: number;
    unitPrice: number;
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

    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [isZeroPriceDialogOpen, setIsZeroPriceDialogOpen] = useState(false);
    const [hasZeroPriceItems, setHasZeroPriceItems] = useState<string[]>([]);

    const [selectedAction, setSelectedAction] = useState<PurchaseOrderDetails | null>(null);
    //const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);


    // Add state for selectedItems, suppliers and sites
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [sites, setSites] = useState<Site[]>([]);


    const cancelRef = useRef<HTMLButtonElement>(null);


    const { isOpen: isOrderModalOpen, onOpen: onOrderModalOpen, onClose: onOrderModalClose } = useDisclosure();
    const { isOpen: isAddItemModalOpen, onOpen: onAddItemModalOpen, onClose: onAddItemModalClose } = useDisclosure();
    //const [poDetails, setPoDetails] = useState<PendingAction | null>(null);
    // Then update the state declaration:
    const [poDetails, setPoDetails] = useState<PurchaseOrderDetails | null>(null);
    const [editedPrices, setEditedPrices] = useState<{ [key: string]: number | undefined }>({});
    const [editedQuantities, setEditedQuantities] = useState<{ [key: string]: number | undefined }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [availableItems, setAvailableItems] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const inputBg = useColorModeValue('white', 'gray.800');


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
        fetchSuppliers();
    }, []);

    // Add new useEffect for fetching sites
    useEffect(() => {
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
        fetchSites();
    }, []);


    const fetchPurchaseOrders = useCallback(async () => {
        try {
            const response = await fetch('/api/purchase-orders');
            if (response.ok) {
                const data = await response.json();
                const transformedData = data.map((order: any) => ({
                    ...order,
                    siteName: order.site?.name || '',
                    actionType: 'PurchaseOrder',
                    title: `Purchase Order ${order.poNumber}`,
                    description: `Order from ${order.supplierNames}`,
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

    const refreshData = useCallback(async () => {
        await fetchPurchaseOrders();
    }, [fetchPurchaseOrders]);

    useEffect(() => {
        fetchPurchaseOrders();
    }, [fetchPurchaseOrders]);

    useEffect(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            setFilteredOrders(
                purchaseOrders.filter(order => {
                    const poNumberMatch = order.poNumber.toLowerCase().includes(term);
                    const supplierMatch = order.supplierNames?.toLowerCase().includes(term) || false;
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

    const handleCreateOrders = async (items: OrderItem[], siteId?: string) => {
        try {
            const totalAmount = items.reduce((sum, item) => {
                return sum + (item.orderedQuantity * item.unitPrice);
            }, 0);

            const response = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    poNumber: `PO-${Date.now()}`,
                    orderDate: new Date().toISOString(),
                    orderedBy: user?._id,
                    orderedItems: items,
                    totalAmount,
                    status: 'draft',
                    site: siteId,
                }),
            });

            if (response.ok) {
                toast({
                    title: 'Purchase order created',
                    description: 'The purchase order has been created successfully',
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });


                onClose();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create purchase order');
            }
        } catch (error: any) {
            console.error('Error creating purchase order:', error);
            toast({
                title: 'Error creating purchase order',
                description: error.message || 'An unexpected error occurred. Please try again.',
                status: 'error',
                duration: 5000,
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

            if (updates && updates.length > 0) {
                await Promise.all(updates);
            }

            await fetchLatestPOData(poDetails._id);

            toast({
                title: 'Order Saved',
                description: 'Purchase order has been updated successfully.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onOrderModalClose();
            await refreshData();
        } catch (error) {
            console.error('Error saving order:', error);
            toast({
                title: 'Save Failed',
                description: 'Failed to save purchase order.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Add this helper function
    const fetchLatestPOData = async (poId: string) => {
        try {
            const response = await fetch(`/api/purchase-orders?id=${poId}`);
            if (response.ok) {
                const data = await response.json();
                setPoDetails({
                    ...data,
                    description: `Order for items from ${data.supplierNames}`,
                    orderedItems: data.orderedItems?.map((item: any) => ({
                        _key: item._key || Math.random().toString(36).substr(2, 9),
                        stockItem: { name: item.stockItem?.name || 'Unknown Item' },
                        orderedQuantity: item.orderedQuantity,
                        unitPrice: item.unitPrice,
                        supplier: item.supplier ? { name: item.supplier.name } : undefined // Convert null to undefined
                    })) || [] // Add empty array fallback
                });
            }
        } catch (error) {
            console.error('Failed to fetch latest PO data:', error);
        }
    };

    const handleRemoveItem = (itemKey: string) => {
        if (!poDetails) return;

        console.log('Removing item:', itemKey);
        setPoDetails({
            ...poDetails,
            orderedItems: poDetails.orderedItems?.filter((item: { _key: string; }) => item._key !== itemKey) || [],
        });
    };

    // Add this function after handleRemoveItem
    const handleAddItems = (items: any[]) => {
        if (!poDetails) return;

        // Create new items with proper structure
        const newItems = items.map(item => ({
            _key: Math.random().toString(36).substr(2, 9),
            stockItem: {
                name: item.item.name,
                _id: item.item._id
            },
            orderedQuantity: item.quantity,
            unitPrice: item.price,
            supplier: item.item.primarySupplier || item.item.suppliers?.[0] || null
        }));

        // Update the PO details with new items
        setPoDetails({
            ...poDetails,
            orderedItems: [...(poDetails.orderedItems || []), ...newItems]
        });

        toast({
            title: 'Items Added',
            description: `${items.length} item(s) added to the purchase order.`,
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
    };

    const handleApprovePO = async (action: PurchaseOrderDetails | PendingAction) => {
        try {
            // Extract the ID from either type
            const actionId = action._id;

            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: actionId,
                    status: 'pending-approval',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit for approval');
            }

            toast({
                title: 'Order Submitted',
                description: `The purchase order has been submitted for approval.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            await refreshData();

        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to submit order for approval. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleViewOrder = (order: PurchaseOrder) => {
        const action: PurchaseOrderDetails = {
            _id: order._id,
            _type: 'PurchaseOrder',
            title: `Purchase Order ${order.poNumber}`,
            description: `Order for items from ${order.supplierNames}`,
            createdAt: order.orderDate,
            priority: 'medium',
            siteName: order.siteName || '',
            actionType: 'PurchaseOrder',
            status: order.status,
            poNumber: order.poNumber, // Ensure this is always provided
            supplierNames: order.supplierNames || "",
            totalAmount: order.totalAmount,
            orderedItems: order.orderedItems?.map(item => ({
                _key: item._key || Math.random().toString(36).substr(2, 9),
                stockItem: { name: item.stockItem?.name || 'Unknown Item' },
                orderedQuantity: item.orderedQuantity,
                unitPrice: item.unitPrice,
                supplier: item.supplier ? { name: item.supplier.name } : undefined
            })) || [], // Add empty array fallback
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
            setPoDetails(action);
            onOrderModalOpen();
        }
    };

    const handleSaveSuccess = () => {
        refreshData();
        onClose();
    };

    const handleFinalizeOrderStep = async (action: PurchaseOrderDetails) => {
        try {
            const response = await fetch(`/api/purchase-orders?id=${action._id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch purchase order details');
            }
            const data = await response.json();
            setPoDetails({
                ...data,
                description: `Order for items from ${data.supplierNames}`,
                // Ensure all required PendingAction properties are included
                _type: 'PurchaseOrder',
                actionType: 'PurchaseOrder',
                priority: 'medium',
            });
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

    const validatePrices = (order: any) => {
        const zeroPriceItems: string[] = [];

        order.orderedItems?.forEach((item: any) => {
            const price = editedPrices[item._key] ?? item.unitPrice;
            if (price === 0) {
                zeroPriceItems.push(item.stockItem?.name || 'Unknown Item');
            }
        });

        return zeroPriceItems;
    };

    const handleConfirmOrderUpdate = async () => {
        if (!selectedAction) return;

        const zeroPriceItems = validatePrices(selectedAction);

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
            if (selectedAction) {
                await handleApprovePO(selectedAction);
            }
            onOrderModalClose();
            await refreshData();
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
    };

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
            accessorKey: 'supplierNames',
            header: 'Suppliers',
            isSortable: false,
            cell: (row: any) => {
                return row.supplierNames;
            }
        },
        {
            accessorKey: 'description',
            header: 'Description',
            isSortable: true,
            cell: (row: any) => {
                const itemList = getItemList(row);
                return (
                    <Box>
                        <Text>Items: </Text>
                        {itemList && (
                            <Text fontSize="sm" color="gray.600" mt={1}>
                                {itemList}
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
                onSave={handleCreateOrders}
                selectedItems={selectedItems}
                suppliers={suppliers}
                sites={sites}
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
                onSave={handleSaveOrder}
                onApprove={handleConfirmOrderUpdate}
                onAddItem={handleAddItems}
                onRemoveItem={handleRemoveItem}
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