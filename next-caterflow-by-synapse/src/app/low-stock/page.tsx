// src/app/low-stock/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Box,
    Heading,
    Text,
    Flex,
    Spinner,
    Button,
    useToast,
    useDisclosure,
    HStack,
    IconButton,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import { FiPlusCircle, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import DataTable, { Column } from '@/components/DataTable';
import CreatePurchaseOrderModal from '@/app/actions/CreatePurchaseOrderModal';
import { Site, Supplier, StockItem } from '@/lib/sanityTypes';

interface LowStockItem extends StockItem {
    currentStock: number;
    siteName: string;
    binName: string;
    orderQuantity: number;
    selected: boolean;
}

interface OrderItem {
    stockItem: string;
    supplier: string;
    orderedQuantity: number;
    unitPrice: number;
}

// Define a compatible interface for the PurchaseOrderModal
interface PurchaseOrderGroup {
    supplierId: string;
    items: StockItem[];
}

export default function LowStockPage() {
    const { isAuthenticated, isAuthReady, user } = useAuth();
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<LowStockItem[]>([]);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const sitesContainerRef = useRef<HTMLDivElement>(null);

    const fetchLowStockItems = async (siteId: string | null) => {
        setIsLoading(true);
        setError(null);
        try {
            let response;
            if (siteId) {
                response = await fetch('/api/low-stock?includeSuppliers=true', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ siteIds: [siteId] }),
                });
            } else {
                response = await fetch('/api/low-stock?includeSuppliers=true');
            }
            if (!response.ok) {
                throw new Error('Failed to fetch low stock items');
            }
            const data = await response.json();
            const initialData = data.map((item: any) => ({
                ...item,
                orderQuantity: item.reorderQuantity || 1,
                selected: false,
            }));
            setLowStockItems(initialData);
            setSelectedItems([]);
        } catch (err: any) {
            console.error('Error fetching low stock items:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await fetch('/api/suppliers');
            if (!response.ok) {
                throw new Error('Failed to fetch suppliers');
            }
            const data = await response.json();
            setSuppliers(data);
        } catch (err) {
            console.error('Failed to fetch suppliers:', err);
        }
    };

    const fetchSites = async () => {
        try {
            const response = await fetch('/api/sites');
            if (!response.ok) {
                throw new Error('Failed to fetch sites');
            }
            const data = await response.json();
            setSites(data);
        } catch (err) {
            console.error('Failed to fetch sites:', err);
        }
    };

    useEffect(() => {
        if (isAuthReady && isAuthenticated) {
            fetchLowStockItems(selectedSiteId);
            fetchSuppliers();
            fetchSites();
        }
    }, [isAuthReady, isAuthenticated, selectedSiteId]);

    const handleSiteClick = (siteId: string) => {
        setSelectedSiteId(siteId);
    };

    const handleScroll = (direction: 'left' | 'right') => {
        if (sitesContainerRef.current) {
            const scrollAmount = 200;
            const container = sitesContainerRef.current;
            if (direction === 'left') {
                container.scrollLeft -= scrollAmount;
            } else {
                container.scrollLeft += scrollAmount;
            }
        }
    };

    const updateOrderQuantity = (itemId: string, quantity: number) => {
        setLowStockItems(prev => prev.map(item =>
            item._id === itemId ? { ...item, orderQuantity: quantity } : item
        ));
    };

    const handleOpenOrderModal = () => {
        const items = lowStockItems.filter(item => item.selected);
        if (items.length === 0) {
            toast({
                title: 'No items selected',
                description: 'Please select at least one item to create a purchase order.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        setSelectedItems(items);
        onOpen();
    };

    const handleCreateOrders = async (items: OrderItem[]) => {
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
                    site: selectedSiteId,
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

                // Get the IDs of the items that were just ordered
                const orderedItemIds = items.map(item => item.stockItem);

                // Filter out the items that were just ordered from the lowStockItems state
                setLowStockItems(prev => prev.filter(item => !orderedItemIds.includes(item._id)));

                // Clear the selected items state
                setSelectedItems([]);

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

    const columns: Column[] = [
        {
            accessorKey: 'name',
            header: 'Item Name',
            isSortable: true,
        },
        {
            accessorKey: 'sku',
            header: 'SKU',
            isSortable: true,
        },
        {
            accessorKey: 'currentStock',
            header: 'Current Stock',
            isSortable: true,
            cell: (row) => (
                <Text color={row.currentStock <= row.minimumStockLevel ? 'red.500' : 'inherit'}>
                    {row.currentStock}
                </Text>
            ),
        },
        {
            accessorKey: 'minimumStockLevel',
            header: 'Min Level',
            isSortable: true,
        },
        {
            accessorKey: 'unitOfMeasure',
            header: 'Unit',
            isSortable: true,
        },
        {
            accessorKey: 'siteName',
            header: 'Site',
            isSortable: true,
        },
        {
            accessorKey: 'binName',
            header: 'Bin',
            isSortable: true,
        },
        {
            accessorKey: 'orderQuantity',
            header: 'Order Qty',
            cell: (row) => (
                <NumberInput
                    size="sm"
                    value={row.orderQuantity}
                    onChange={(value) => updateOrderQuantity(row._id, parseInt(value) || 1)}
                    min={1}
                    max={1000}
                    width="100px"
                >
                    <NumberInputField />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
            ),
            isSortable: false,
        },
    ];

    const handleSelectionChange = (updatedItems: LowStockItem[]) => {
        setLowStockItems(prev => prev.map(item => ({
            ...item,
            selected: updatedItems.some(updated => updated._id === item._id)
        })));
        setSelectedItems(updatedItems);
    };

    if (!isAuthReady) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <Box p={8}>
            <HStack justifyContent="space-between" mb={6}>
                <Heading as="h1" size="xl">
                    Low Stock Items
                </Heading>
                <Button
                    colorScheme="blue"
                    leftIcon={<FiPlusCircle />}
                    onClick={handleOpenOrderModal}
                    isDisabled={selectedItems.length === 0}
                >
                    Create Purchase Order ({selectedItems.length})
                </Button>
            </HStack>

            {/* Sites Section */}
            <Flex justify="space-between" align="center" mb={4}>
                <Heading as="h2" size="md">Sites</Heading>
                <HStack>
                    <IconButton
                        aria-label="Scroll left"
                        icon={<FiArrowLeft />}
                        onClick={() => handleScroll('left')}
                    />
                    <IconButton
                        aria-label="Scroll right"
                        icon={<FiArrowRight />}
                        onClick={() => handleScroll('right')}
                    />
                </HStack>
            </Flex>

            {sites.length > 0 ? (
                <Flex
                    ref={sitesContainerRef}
                    overflowX="auto"
                    whiteSpace="nowrap"
                    pb={4}
                    sx={{
                        '::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                    }}
                >
                    {sites.map(site => (
                        <Button
                            key={site._id}
                            onClick={() => handleSiteClick(site._id)}
                            mx={2}
                            variant={selectedSiteId === site._id ? 'solid' : 'outline'}
                            colorScheme={selectedSiteId === site._id ? 'blue' : 'gray'}
                            minW="120px"
                        >
                            {site.name}
                        </Button>
                    ))}
                </Flex>
            ) : (
                <Text color="gray.500" mb={6}>No sites found for your account.</Text>
            )}

            {error ? (
                <Flex justifyContent="center" alignItems="center" minH="100px" direction="column">
                    <Text fontSize="lg" color="red.500">
                        {error}
                    </Text>
                    <Button onClick={() => fetchLowStockItems(selectedSiteId)} mt={4}>
                        Try Again
                    </Button>
                </Flex>
            ) : lowStockItems.length === 0 && !isLoading ? (
                <Text fontSize="lg" color="gray.500">
                    No items are currently below their minimum stock level.
                </Text>
            ) : (
                <DataTable
                    columns={columns}
                    data={lowStockItems}
                    loading={isLoading}
                    onSelectionChange={handleSelectionChange}
                />
            )}

            <CreatePurchaseOrderModal
                isOpen={isOpen}
                onClose={onClose}
                selectedItems={selectedItems}
                suppliers={suppliers}
                onSave={handleCreateOrders}
            />
        </Box>
    );
}