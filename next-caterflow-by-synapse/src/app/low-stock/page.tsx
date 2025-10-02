'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
    useColorModeValue,
    Checkbox,
    Badge,
    Card,
    CardBody,
    VStack,
    InputGroup,
    InputLeftElement,
    Input,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react'
import { FiPlusCircle, FiArrowLeft, FiArrowRight, FiSearch, FiRefreshCw } from 'react-icons/fi';
import DataTable, { Column } from '@/components/DataTable';
import CreatePurchaseOrderModal from '@/app/actions/CreatePurchaseOrderModal';
import { Site, Supplier, StockItem } from '@/lib/sanityTypes';
import { calculateBulkStock } from '@/lib/stockCalculations';

interface LowStockItem extends StockItem {
    currentStock: number;
    siteName: string;
    binName: string;
    minimumStockLevel: number;
    reorderQuantity: number;
    unitOfMeasure: "kg" | "g" | "l" | "ml" | "each" | "box" | "case" | "bag";
    stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
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
    const { data: session, status } = useSession();
    const user = session?.user;
    const isAuthenticated = status === 'authenticated';
    const isAuthReady = status !== 'loading';

    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<LowStockItem[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<LowStockItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const sitesContainerRef = useRef<HTMLDivElement>(null);

    // Theming props
    const bgPrimary = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const errorColor = useColorModeValue('red.500', 'red.300');
    const bgCard = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');

    // Calculate stock for low stock items using the same logic as Current Stock page
    const calculateStockForSite = useCallback(async (siteId: string | null) => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('🔄 Starting low stock calculation for site:', siteId || 'All sites');

            // Fetch all stock items
            console.log('📦 Fetching all stock items...');
            const stockItemsResponse = await fetch('/api/stock-items');
            if (!stockItemsResponse.ok) {
                throw new Error('Failed to fetch stock items');
            }
            const stockItems: any[] = await stockItemsResponse.json();
            console.log('✅ Stock items fetched:', stockItems.length, 'items');

            if (stockItems.length === 0) {
                console.log('⚠️ No stock items found');
                setLowStockItems([]);
                setIsLoading(false);
                return;
            }

            // Fetch bins for the selected site (or all bins if no site selected)
            const binsEndpoint = siteId ? `/api/bins?siteId=${siteId}` : '/api/bins';
            console.log('🗄️ Fetching bins from:', binsEndpoint);
            const binsResponse = await fetch(binsEndpoint);
            if (!binsResponse.ok) {
                throw new Error('Failed to fetch bins');
            }
            const bins = await binsResponse.json();
            const binIds = bins.map((bin: any) => bin._id);
            console.log('✅ Bins fetched:', bins.length, 'bins, IDs:', binIds);

            if (binIds.length === 0) {
                console.log('⚠️ No bins found for site:', siteId);
                setLowStockItems([]);
                setIsLoading(false);
                return;
            }

            // Get all stock item IDs
            const stockItemIds = stockItems.map(item => item._id);
            console.log('🔢 Calculating stock for', stockItemIds.length, 'items across', binIds.length, 'bins');

            // Calculate current stock for all items in all bins in one go
            console.log('🧮 Starting bulk stock calculation...');
            const stockResults = await calculateBulkStock(stockItemIds, binIds);
            console.log('✅ Bulk stock calculation complete. Results:', Object.keys(stockResults).length, 'item-bin pairs');

            // Process results and aggregate stock by item (sum across all bins)
            console.log('📊 Processing results and aggregating stock by item...');
            const itemsWithCalculatedStock: LowStockItem[] = [];
            const itemStockMap: { [itemId: string]: { totalStock: number, bins: any[] } } = {};

            // Aggregate stock for each item across all bins
            stockItems.forEach(item => {
                let totalStock = 0;
                const itemBins: any[] = [];

                bins.forEach((bin: any) => {
                    const key = `${item._id}-${bin._id}`;
                    const quantity = stockResults[key] || 0;
                    if (quantity > 0) {
                        totalStock += quantity;
                        itemBins.push({
                            ...bin,
                            quantity
                        });
                    }
                });

                if (totalStock > 0 || item.minimumStockLevel > 0) {
                    itemStockMap[item._id] = {
                        totalStock,
                        bins: itemBins
                    };
                }
            });

            // Create LowStockItem entries for items that are below minimum stock level
            stockItems.forEach(item => {
                const stockInfo = itemStockMap[item._id];
                const currentStock = stockInfo?.totalStock || 0;

                // Only include items that are below minimum stock level
                if (currentStock <= item.minimumStockLevel) {
                    // For low stock items, we'll show the primary bin or first bin with stock
                    const primaryBin = stockInfo?.bins?.[0] || bins[0];

                    let stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock' = 'low-stock';
                    if (currentStock === 0) {
                        stockStatus = 'out-of-stock';
                    } else if (currentStock > item.minimumStockLevel) {
                        stockStatus = 'in-stock';
                    }

                    itemsWithCalculatedStock.push({
                        ...item,
                        currentStock,
                        stockStatus,
                        siteName: primaryBin?.site?.name || "Unknown site",
                        binName: primaryBin?.name || "Unknown bin",
                        orderQuantity: item.reorderQuantity || 1,
                        selected: false,
                    });
                }
            });

            console.log('✅ Low stock calculation complete. Low stock items found:', itemsWithCalculatedStock.length);
            setLowStockItems(itemsWithCalculatedStock);

        } catch (err: any) {
            console.error('❌ Error calculating low stock:', err);
            setError(err.message);
            toast({
                title: 'Error',
                description: 'Failed to calculate low stock items',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            console.log('🏁 Low stock calculation finished');
        }
    }, [toast]);

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
            console.log('🌐 Fetching sites...');
            const response = await fetch('/api/sites');
            if (!response.ok) {
                throw new Error('Failed to fetch sites');
            }
            const data = await response.json();
            console.log('✅ Sites fetched:', data.length, 'sites');
            setSites(data);
        } catch (err) {
            console.error('❌ Failed to fetch sites:', err);
        }
    };

    useEffect(() => {
        if (isAuthReady && isAuthenticated) {
            calculateStockForSite(selectedSiteId);
            fetchSuppliers();
            fetchSites();
        }
    }, [isAuthReady, isAuthenticated, selectedSiteId, calculateStockForSite]);

    // Filter items based on search term
    useEffect(() => {
        let filtered = lowStockItems.filter(item => {
            if (!searchTerm) return true;

            const term = searchTerm.toLowerCase();
            return (
                item.name.toLowerCase().includes(term) ||
                item.sku.toLowerCase().includes(term) ||
                item.binName.toLowerCase().includes(term) ||
                item.siteName.toLowerCase().includes(term)
            );
        });

        setFilteredItems(filtered);
    }, [lowStockItems, searchTerm]);

    const handleSiteClick = (siteId: string) => {
        console.log('📍 Site selected:', siteId);
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

    const handleRefresh = () => {
        console.log('🔄 Manual refresh triggered');
        setIsRefreshing(true);
        calculateStockForSite(selectedSiteId);
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
                    orderedBy: user?.id,
                    orderedItems: items,
                    totalAmount,
                    status: 'draft',
                    site: siteId || selectedSiteId,
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

                // Clear checkboxes after successful order creation
                setLowStockItems(prev => prev.map(item => ({
                    ...item,
                    selected: false
                })));
                setSelectedItems([]);
                onClose();

                // Refresh the low stock list
                calculateStockForSite(selectedSiteId);
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

    // Handle individual checkbox selection
    const handleCheckboxChange = (itemId: string, isSelected: boolean) => {
        setLowStockItems(prev => prev.map(item =>
            item._id === itemId ? { ...item, selected: isSelected } : item
        ));

        if (isSelected) {
            setSelectedItems(prev => [...prev, lowStockItems.find(item => item._id === itemId)!]);
        } else {
            setSelectedItems(prev => prev.filter(item => item._id !== itemId));
        }
    };

    // Handle select all/none
    const handleSelectAll = (isSelected: boolean) => {
        setLowStockItems(prev => prev.map(item => ({ ...item, selected: isSelected })));
        setSelectedItems(isSelected ? [...lowStockItems] : []);
    };

    const getStockStatusColor = (currentStock: number, minimumStockLevel: number) => {
        if (currentStock === 0) return 'red';
        if (currentStock <= minimumStockLevel) return 'orange';
        return 'green';
    };

    const getStockStatusText = (currentStock: number, minimumStockLevel: number) => {
        if (currentStock === 0) return 'Out of Stock';
        if (currentStock <= minimumStockLevel) return 'Low Stock';
        return 'In Stock';
    };

    const columns: Column[] = [
        {
            accessorKey: 'selected',
            header: (
                <Checkbox
                    isChecked={lowStockItems.length > 0 && lowStockItems.every(item => item.selected)}
                    isIndeterminate={lowStockItems.some(item => item.selected) && !lowStockItems.every(item => item.selected)}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    colorScheme="brand"
                />
            ),
            isSortable: false,
            cell: (row: LowStockItem) => (
                <Checkbox
                    isChecked={row.selected}
                    onChange={(e) => handleCheckboxChange(row._id, e.target.checked)}
                    colorScheme="brand"
                />
            ),
        },
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
                <Flex align="center">
                    <Badge
                        colorScheme={getStockStatusColor(row.currentStock, row.minimumStockLevel)}
                        mr={2}
                    >
                        {getStockStatusText(row.currentStock, row.minimumStockLevel)}
                    </Badge>
                    <Text fontWeight="bold">{row.currentStock}</Text>
                </Flex>
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
            header: 'Order Quantity',
            isSortable: true,
            cell: (row: LowStockItem) => (
                <NumberInput
                    value={row.orderQuantity}
                    onChange={(value) => updateOrderQuantity(row._id, parseInt(value) || 0)}
                    min={1}
                    max={1000}
                    size="sm"
                    width="100px"
                >
                    <NumberInputField />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
            ),
        },
    ];

    if (status === 'loading') {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh" bg={bgPrimary}>
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <Box p={{ base: 4, md: 8 }} bg={bgPrimary} minH="100vh">
            <VStack spacing={6} align="stretch">
                <HStack justifyContent="space-between" flexWrap="wrap" gap={4}>
                    <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color={primaryTextColor}>
                        Low Stock Items
                    </Heading>
                    <HStack>
                        <Button
                            leftIcon={<FiRefreshCw />}
                            onClick={handleRefresh}
                            isLoading={isRefreshing}
                            variant="outline"
                            colorScheme="brand"
                            size="sm"
                        >
                            Refresh
                        </Button>
                        <Button
                            colorScheme="brand"
                            leftIcon={<FiPlusCircle />}
                            onClick={handleOpenOrderModal}
                            isDisabled={selectedItems.length === 0}
                            size="md"
                        >
                            Create Purchase Order ({selectedItems.length})
                        </Button>
                    </HStack>
                </HStack>

                {/* Search Input */}
                <InputGroup>
                    <InputLeftElement pointerEvents="none">
                        <FiSearch color={secondaryTextColor} />
                    </InputLeftElement>
                    <Input
                        placeholder="Search by item name, SKU, bin, or site..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        borderColor={borderColor}
                        _placeholder={{ color: secondaryTextColor }}
                    />
                </InputGroup>

                {/* Sites Section */}
                {(user?.role === 'admin' || user?.role === 'auditor') && (
                    <>
                        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                            <Heading as="h2" size="lg" color={primaryTextColor}>Sites</Heading>
                            {sites.length > 3 && (
                                <HStack>
                                    <IconButton
                                        aria-label="Scroll left"
                                        icon={<FiArrowLeft />}
                                        onClick={() => handleScroll('left')}
                                        variant="ghost"
                                        colorScheme="brand"
                                    />
                                    <IconButton
                                        aria-label="Scroll right"
                                        icon={<FiArrowRight />}
                                        onClick={() => handleScroll('right')}
                                        variant="ghost"
                                        colorScheme="brand"
                                    />
                                </HStack>
                            )}
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
                                        colorScheme="brand"
                                        minW="120px"
                                        _first={{ ml: 0 }}
                                    >
                                        {site.name}
                                    </Button>
                                ))}
                            </Flex>
                        ) : (
                            <Text color={secondaryTextColor} mb={6}>No sites found for your account.</Text>
                        )}
                    </>
                )}

                {/* For site managers, show their associated site */}
                {user?.role === 'siteManager' && user.associatedSite && (
                    <Card bg={bgCard} borderColor={borderColor} borderWidth="1px">
                        <CardBody>
                            <Text fontWeight="bold" color={primaryTextColor}>Your Associated Site:</Text>
                            <Text color={secondaryTextColor}>{user.associatedSite.name}</Text>
                        </CardBody>
                    </Card>
                )}

                {/* Low Stock Summary */}
                {!isLoading && lowStockItems.length > 0 && (
                    <Flex gap={4} wrap="wrap">
                        <Badge colorScheme="orange" p={2} borderRadius="md" variant="subtle">
                            Low Stock Items: {lowStockItems.filter(item => item.stockStatus === 'low-stock').length}
                        </Badge>
                        <Badge colorScheme="red" p={2} borderRadius="md" variant="subtle">
                            Out of Stock: {lowStockItems.filter(item => item.stockStatus === 'out-of-stock').length}
                        </Badge>
                        <Badge colorScheme="blue" p={2} borderRadius="md" variant="subtle">
                            Selected: {selectedItems.length}
                        </Badge>
                    </Flex>
                )}

                {/* Data Table */}
                {error ? (
                    <Flex justifyContent="center" alignItems="center" minH="100px" direction="column">
                        <Text fontSize="lg" color={errorColor}>
                            {error}
                        </Text>
                        <Button onClick={() => calculateStockForSite(selectedSiteId)} mt={4}>
                            Try Again
                        </Button>
                    </Flex>
                ) : filteredItems.length === 0 && !isLoading ? (
                    <Text fontSize="lg" color={secondaryTextColor} textAlign="center" py={8}>
                        No low stock items found {selectedSiteId ? "for this site." : "for your account."}
                    </Text>
                ) : (
                    <DataTable
                        columns={columns}
                        data={filteredItems}
                        loading={isLoading}
                        onSelectionChange={setSelectedItems}
                    />
                )}

                <CreatePurchaseOrderModal
                    isOpen={isOpen}
                    onClose={onClose}
                    selectedItems={selectedItems}
                    suppliers={suppliers}
                    onSave={handleCreateOrders}
                    selectedSiteId={selectedSiteId}
                    sites={sites}
                />
            </VStack>
        </Box>
    );
}