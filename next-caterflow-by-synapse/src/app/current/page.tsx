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
    HStack,
    IconButton,
    useColorModeValue,
    Badge,
    Card,
    CardBody,
    VStack,
    InputGroup,
    InputLeftElement,
    Input,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { FiArrowLeft, FiArrowRight, FiSearch, FiRefreshCw } from 'react-icons/fi';
import DataTable, { Column } from './DataTable';
import { Site, StockItem } from '@/lib/sanityTypes';
import { calculateBulkStock } from '@/lib/stockCalculations';

interface CurrentStockItem extends StockItem {
    currentStock: number;
    siteName: string;
    binName: string;
    minimumStockLevel: number;
    reorderQuantity: number;
    unitOfMeasure: "kg" | "g" | "l" | "ml" | "each" | "box" | "case" | "bag";
    stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export default function CurrentStockPage() {
    const { data: session, status } = useSession();
    const user = session?.user;
    const isAuthenticated = status === 'authenticated';
    const isAuthReady = status !== 'loading';

    const [currentStockItems, setCurrentStockItems] = useState<CurrentStockItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<CurrentStockItem[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(0); // 0: All, 1: In Stock, 2: Low Stock, 3: Out of Stock
    const toast = useToast();
    const sitesContainerRef = useRef<HTMLDivElement>(null);

    // src/app/current/page.tsx (updated functions with logging)
    const calculateStockForSite = useCallback(async (siteId: string | null) => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('🔄 Starting stock calculation for site:', siteId || 'All sites');

            // Fetch all stock items (no site filtering)
            console.log('📦 Fetching all stock items...');
            const stockItemsResponse = await fetch('/api/stock-items');
            if (!stockItemsResponse.ok) {
                throw new Error('Failed to fetch stock items');
            }
            const stockItems: any[] = await stockItemsResponse.json();
            console.log('✅ Stock items fetched:', stockItems.length, 'items');

            if (stockItems.length === 0) {
                console.log('⚠️ No stock items found');
                setCurrentStockItems([]);
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
                setCurrentStockItems([]);
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

            // Process results and create a separate entry for each item-bin combination with stock
            console.log('📊 Processing results and creating individual entries for each bin...');
            const itemsWithCalculatedStock: CurrentStockItem[] = [];

            stockItems.forEach(item => {
                let foundStock = false;

                // Find all bins that contain this item
                const itemBins = bins.filter((bin: any) => {
                    const key = `${item._id}-${bin._id}`;
                    const quantity = stockResults[key] || 0;
                    if (quantity > 0) {
                        foundStock = true;
                        return true;
                    }
                    return false;
                });

                if (foundStock) {
                    // Create a separate entry for each bin that has stock
                    itemBins.forEach((bin: any) => {
                        const quantity = stockResults[`${item._id}-${bin._id}`];
                        let stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock' = 'in-stock';
                        if (quantity <= item.minimumStockLevel) {
                            stockStatus = 'low-stock';
                        }

                        itemsWithCalculatedStock.push({
                            ...item,
                            currentStock: quantity,
                            stockStatus,
                            siteName: bin.site?.name || "Unknown site",
                            binName: bin.name,
                        });
                    });
                }
            });

            console.log('✅ Stock calculation complete. Total items to display:', itemsWithCalculatedStock.length);
            setCurrentStockItems(itemsWithCalculatedStock);

        } catch (err: any) {
            console.error('❌ Error calculating stock:', err);
            setError(err.message);
            toast({
                title: 'Error',
                description: 'Failed to calculate current stock',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            console.log('🏁 Stock calculation finished');
        }
    }, [toast]);

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

    const handleSiteClick = (siteId: string) => {
        console.log('📍 Site selected:', siteId);
        setSelectedSiteId(siteId);
    };

    const handleRefresh = () => {
        console.log('🔄 Manual refresh triggered');
        setIsRefreshing(true);
        calculateStockForSite(selectedSiteId);
    };

    useEffect(() => {
        // Fetch sites immediately upon authentication
        if (isAuthReady && isAuthenticated && sites.length === 0) {
            fetchSites();
        }
        // Set associated site for site managers
        if (user?.associatedSite?._id) {
            setSelectedSiteId(user.associatedSite._id);
        }
        // Set default site for admins/auditors only if no site is selected and sites are available
        if ((user?.role === 'admin' || user?.role === 'auditor') && sites.length > 0 && !selectedSiteId) {
            setSelectedSiteId(sites[0]._id);
        }
    }, [isAuthReady, isAuthenticated, sites, user, selectedSiteId]);

    // Calculate stock when site selection changes
    useEffect(() => {
        if (isAuthReady && isAuthenticated) {
            calculateStockForSite(selectedSiteId);
        }
    }, [selectedSiteId, isAuthReady, isAuthenticated, calculateStockForSite]);

    // Filter items based on search term and active tab
    useEffect(() => {
        let filtered = currentStockItems.filter(item => {
            if (!searchTerm) return true;

            const term = searchTerm.toLowerCase();
            return (
                item.name.toLowerCase().includes(term) ||
                item.sku.toLowerCase().includes(term) ||
                item.binName.toLowerCase().includes(term) ||
                item.siteName.toLowerCase().includes(term)
            );
        });

        // Apply tab filter
        switch (activeTab) {
            case 1: // In Stock
                filtered = filtered.filter(item => item.stockStatus === 'in-stock');
                break;
            case 2: // Low Stock
                filtered = filtered.filter(item => item.stockStatus === 'low-stock');
                break;
            case 3: // Out of Stock
                filtered = filtered.filter(item => item.stockStatus === 'out-of-stock');
                break;
            default: // All
                break;
        }

        setFilteredItems(filtered);
    }, [currentStockItems, searchTerm, activeTab]);


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
            accessorKey: 'binName',
            header: 'Bin Location',
            isSortable: true,
        },
        {
            accessorKey: 'siteName',
            header: 'Site',
            isSortable: true,
        },
    ];

    // Theming props
    const bgPrimary = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const bgCard = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const borderCard = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');


    if (status === 'loading') {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <Box p={{ base: 3, md: 4 }} bg={bgPrimary} minH="100vh">
            <VStack spacing={6} align="stretch">
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                    <Heading as="h1" size={{ base: 'md', md: 'xl' }} color={primaryTextColor}>
                        Current Stock
                    </Heading>
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
                </Flex>

                {/* Search Input */}
                <InputGroup>
                    <InputLeftElement pointerEvents="none">
                        <FiSearch color={secondaryTextColor} />
                    </InputLeftElement>
                    <Input
                        placeholder="Search by item name, SKU, bin, or site..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        borderColor={borderCard}
                        _placeholder={{ color: secondaryTextColor }}
                    />
                </InputGroup>

                {/* Sites Section */}
                {(user?.role === 'admin' || user?.role === 'auditor') && (
                    <>
                        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                            <Heading as="h2" size="md" color={primaryTextColor}>Sites</Heading>
                            {sites.length > 3 && (
                                <HStack>
                                    <IconButton
                                        aria-label="Scroll left"
                                        icon={<FiArrowLeft />}
                                        onClick={() => handleScroll('left')}
                                        size="sm"
                                        variant="ghost"
                                        colorScheme="brand"
                                    />
                                    <IconButton
                                        aria-label="Scroll right"
                                        icon={<FiArrowRight />}
                                        onClick={() => handleScroll('right')}
                                        size="sm"
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
                                pb={2}
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
                                        mr={2}
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
                            <Text color={secondaryTextColor}>No sites found for your account.</Text>
                        )}
                    </>
                )}

                {/* For site managers, show their associated site */}
                {user?.role === 'siteManager' && user.associatedSite && (
                    <Card bg={bgCard} borderColor={borderCard} borderWidth="1px">
                        <CardBody>
                            <Text fontWeight="bold" color={primaryTextColor}>Your Associated Site:</Text>
                            <Text color={secondaryTextColor}>{user.associatedSite.name}</Text>
                        </CardBody>
                    </Card>
                )}

                {/* Stock Summary */}
                {!isLoading && currentStockItems.length > 0 && (
                    <Flex gap={4} wrap="wrap">
                        <Badge colorScheme="green" p={2} borderRadius="md" variant="subtle">
                            In Stock: {currentStockItems.filter(item => item.stockStatus === 'in-stock').length}
                        </Badge>
                        <Badge colorScheme="orange" p={2} borderRadius="md" variant="subtle">
                            Low Stock: {currentStockItems.filter(item => item.stockStatus === 'low-stock').length}
                        </Badge>
                        <Badge colorScheme="red" p={2} borderRadius="md" variant="subtle">
                            Out of Stock: {currentStockItems.filter(item => item.stockStatus === 'out-of-stock').length}
                        </Badge>
                    </Flex>
                )}

                {/* Filter Tabs */}
                <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed" colorScheme="brand">
                    <TabList>
                        <Tab>All</Tab>
                        <Tab>In Stock</Tab>
                        <Tab>Low Stock</Tab>
                        <Tab>Out of Stock</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel p={0} pt={4}>
                            {/* All items are shown by default */}
                        </TabPanel>
                        <TabPanel p={0} pt={4}>
                            {/* In Stock items */}
                        </TabPanel>
                        <TabPanel p={0} pt={4}>
                            {/* Low Stock items */}
                        </TabPanel>
                        <TabPanel p={0} pt={4}>
                            {/* Out of Stock items */}
                        </TabPanel>
                    </TabPanels>
                </Tabs>

                {/* Data Table */}
                {error ? (
                    <Flex justifyContent="center" alignItems="center" minH="100px" direction="column">
                        <Text fontSize="lg" color="red.500">
                            {error}
                        </Text>
                        <Button onClick={() => calculateStockForSite(selectedSiteId)} mt={4}>
                            Try Again
                        </Button>
                    </Flex>
                ) : filteredItems.length === 0 && !isLoading ? (
                    <Text fontSize="lg" color={secondaryTextColor} textAlign="center" py={8}>
                        No stock items found {activeTab > 0 ? 'matching the selected filter' : `for ${selectedSiteId ? "this site." : "your account."}`}
                    </Text>
                ) : (
                    <DataTable
                        columns={columns}
                        data={filteredItems}
                        loading={isLoading}
                    />
                )}
            </VStack>
        </Box>
    );
}