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
    IconButton,
    useColorModeValue,
    Card,
    CardBody,
    Input,
    InputGroup,
    InputLeftElement,
    Badge,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import DataTable from '@/components/DataTable';
import { useAuth } from '@/context/AuthContext';
import CreatePurchaseOrderModal from './CreatePurchaseOrderModal';;

// Update the interface to match what PurchaseOrderModal expects
interface PurchaseOrderItem {
    stockItem: string;
    orderedQuantity: number;
    unitPrice: number;
}

interface PurchaseOrder {
    _id: string;
    poNumber: string;
    orderDate: string;
    status: 'draft' | 'pending' | 'partially-received' | 'received' | 'cancelled';
    supplier: string; // Changed from object to string to match modal expectation
    totalAmount: number;
    items: PurchaseOrderItem[];
}

export default function PurchasesPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
    //const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const { user } = useAuth();

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const inputBg = useColorModeValue('white', 'gray.800');

    const fetchPurchaseOrders = useCallback(async () => {
        try {
            const response = await fetch('/api/purchase-orders');
            if (response.ok) {
                const data = await response.json();
                // Transform the data to match the expected structure
                const transformedData = data.map((order: any) => ({
                    ...order,
                    supplier: order.supplier?.name || order.supplier || '', // Extract name if it's an object
                }));
                setPurchaseOrders(transformedData);
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
    }, [fetchPurchaseOrders]);

    useEffect(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            setFilteredOrders(
                purchaseOrders.filter(order =>
                    order.poNumber.toLowerCase().includes(term) ||
                    order.supplier.toLowerCase().includes(term)
                )
            );
        } else {
            setFilteredOrders(purchaseOrders);
        }
    }, [purchaseOrders, searchTerm]);

    const handleAddOrder = () => {
        onOpen();
    };

    {/*const handleEditOrder = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        onOpen();
    };*/}

    const handleViewOrder = (order: PurchaseOrder) => {
        // Navigate to detail page or open a view modal
        console.log('View order:', order);
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (window.confirm('Are you sure you want to delete this purchase order?')) {
            try {
                const response = await fetch(`/api/purchase-orders?id=${orderId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete purchase order');
                }

                setPurchaseOrders(purchaseOrders.filter(order => order._id !== orderId));
                toast({
                    title: 'Order deleted.',
                    description: 'The purchase order has been successfully deleted.',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } catch (error) {
                console.error('Error deleting purchase order:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to delete purchase order. Please try again.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };

    const handleSaveSuccess = () => {
        fetchPurchaseOrders();
        onClose();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'gray';
            case 'pending': return 'yellow';
            case 'partially-received': return 'blue';
            case 'received': return 'green';
            case 'cancelled': return 'red';
            default: return 'gray';
        }
    };

    const columns = [
        {
            accessorKey: 'actions',
            header: 'Actions',
            cell: (row: PurchaseOrder) => (
                <Flex>
                    <IconButton
                        aria-label="View order"
                        icon={<FiEye />}
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        mr={2}
                        onClick={() => console.log('View order:', row)}
                    />
                    <IconButton
                        aria-label="Delete order"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleDeleteOrder(row._id)}
                    />
                </Flex>
            ),
        },
        {
            accessorKey: 'poNumber',
            header: 'PO Number',
            isSortable: true,
        },
        {
            accessorKey: 'orderDate',
            header: 'Order Date',
            isSortable: true,
            cell: (row: PurchaseOrder) => new Date(row.orderDate).toLocaleDateString(),
        },
        {
            accessorKey: 'supplier',
            header: 'Supplier',
            isSortable: true,
        },
        {
            accessorKey: 'totalAmount',
            header: 'Total Amount',
            isSortable: true,
            cell: (row: PurchaseOrder) => `$${row.totalAmount?.toFixed(2) || '0.00'}`,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            isSortable: true,
            cell: (row: PurchaseOrder) => (
                <Badge colorScheme={getStatusColor(row.status)}>
                    {row.status.replace('-', ' ').toUpperCase()}
                </Badge>
            ),
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
                <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={handleAddOrder}
                >
                    New Order
                </Button>
            </Flex>

            {/* Search */}
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

            {/* Purchase Orders Table */}
            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md">
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={filteredOrders}
                        loading={false}
                    />
                </CardBody>
            </Card>

            <CreatePurchaseOrderModal
                isOpen={isOpen}
                onClose={onClose}
                onSave={handleSaveSuccess}
            />
        </Box>
    );
}