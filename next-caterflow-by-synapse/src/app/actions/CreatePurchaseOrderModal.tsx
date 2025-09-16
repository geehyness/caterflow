// src/components/CreatePurchaseOrderModal.tsx
import React, { useState, useMemo } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    Select,
    useToast,
    VStack,
    HStack,
    Text,
    Card,
    IconButton,
    Box,
    Input,
    Flex,
    Spinner,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
} from '@chakra-ui/react';
import { FiPlus, FiX } from 'react-icons/fi';
import { StockItem, Supplier, Site } from '@/lib/sanityTypes';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { useQuery } from '@tanstack/react-query';

// Define the OrderItem interface here instead of importing it
interface OrderItem {
    stockItem: string;
    supplier: string;
    orderedQuantity: number;
    unitPrice: number;
    _key?: string;
}

// In CreatePurchaseOrderModal.tsx
interface StockItemWithExpandedCategory {
    _id: string;
    name: string;
    sku: string;
    unitOfMeasure: string;
    unitPrice: number;
    primarySupplier?: { _id: string; name: string };
    suppliers?: { _id: string; name: string }[];
    category?: { _id: string; title: string }; // This is the expanded category
}

interface PurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedItems: StockItem[];
    suppliers: Supplier[];
    onSave: (items: OrderItem[], siteId?: string) => void;
    // New props for site selection
    selectedSiteId?: string | null;
    sites?: Site[];
}

interface Category {
    _id: string;
    title: string;
}

// GROQ queries
const allStockItemsQuery = groq`*[_type == "StockItem"] {
    _id,
    name,
    sku,
    unitOfMeasure,
    unitPrice,
    primarySupplier->{_id, name},
    suppliers[]->{_id, name},
    category->{_id, title}
}`;

const allCategoriesQuery = groq`*[_type == "Category"] { _id, title }`;

export default function CreatePurchaseOrderModal({
    isOpen,
    onClose,
    selectedItems,
    suppliers,
    onSave,
    selectedSiteId,
    sites = []
}: PurchaseOrderModalProps) {
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSite, setSelectedSite] = useState<string>(selectedSiteId || '');
    const toast = useToast();

    // Fetch all stock items using react-query
    const { data: availableItems = [], isLoading: isLoadingItems } = useQuery<StockItemWithExpandedCategory[]>({
        queryKey: ['stockItems'],
        queryFn: async () => {
            const items = await client.fetch(allStockItemsQuery);
            return items;
        },
    });

    // Fetch all categories using react-query
    const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const categories = await client.fetch(allCategoriesQuery);
            return categories;
        },
    });

    // Use useMemo to initialize orderItems only when selectedItems change
    useMemo(() => {
        if (isOpen && selectedItems.length > 0) {
            const initialItems = selectedItems.map(item => ({
                stockItem: item._id,
                supplier: item.primarySupplier?._ref ||
                    (item.suppliers && item.suppliers.length > 0 ? item.suppliers[0]._ref : ''),
                orderedQuantity: (item as any).orderQuantity || 1,
                unitPrice: item.unitPrice || 0,
                _key: Math.random().toString(36).substr(2, 9)
            }));
            setOrderItems(initialItems);
        }
    }, [isOpen, selectedItems]);

    // Handle site selection reset
    React.useEffect(() => {
        if (isOpen && !selectedSiteId) {
            setSelectedSite('');
        }
    }, [isOpen, selectedSiteId]);

    const handleOpenAddItemModal = () => {
        setIsAddItemModalOpen(true);
    };

    const handleAddItems = (items: any[]) => {
        const newOrderItems: OrderItem[] = items.map(item => ({
            stockItem: item.item._id,
            supplier: item.item.primarySupplier?._ref ||
                (item.item.suppliers && item.item.suppliers.length > 0 ? item.item.suppliers[0]._ref : ''),
            orderedQuantity: item.quantity,
            unitPrice: item.price,
            _key: Math.random().toString(36).substr(2, 9)
        }));

        setOrderItems(prev => [...prev, ...newOrderItems]);
        setIsAddItemModalOpen(false);
    };

    const updateItemSupplier = (index: number, supplierId: string) => {
        setOrderItems(prev => prev.map((item, i) =>
            i === index ? { ...item, supplier: supplierId } : item
        ));
    };

    const updateItemQuantity = (index: number, quantity: number) => {
        setOrderItems(prev => prev.map((item, i) =>
            i === index ? { ...item, orderedQuantity: quantity } : item
        ));
    };

    const updateItemPrice = (index: number, price: number) => {
        setOrderItems(prev => prev.map((item, i) =>
            i === index ? { ...item, unitPrice: price } : item
        ));
    };

    const removeItem = (index: number) => {
        setOrderItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        // Validate all items have suppliers
        const itemsWithoutSuppliers = orderItems.filter(item => !item.supplier);
        if (itemsWithoutSuppliers.length > 0) {
            toast({
                title: 'Missing suppliers',
                description: 'Please select a supplier for all items',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        // If site selection is required but not provided
        if (!selectedSiteId && !selectedSite) {
            toast({
                title: 'Site required',
                description: 'Please select a site for this purchase order',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        const siteIdToUse = selectedSiteId || selectedSite;
        onSave(orderItems, siteIdToUse);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Create Purchase Order</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {!selectedSiteId && (
                            <Box mb={4}>
                                <Text fontWeight="medium" mb={2}>Select Site</Text>
                                <Select
                                    placeholder="Select a site"
                                    value={selectedSite}
                                    onChange={(e) => setSelectedSite(e.target.value)}
                                    isRequired
                                >
                                    {sites.map(site => (
                                        <option key={site._id} value={site._id}>
                                            {site.name}
                                        </option>
                                    ))}
                                </Select>
                            </Box>
                        )}

                        <Button
                            leftIcon={<FiPlus />}
                            onClick={handleOpenAddItemModal}
                            mb={4}
                            colorScheme="blue"
                            variant="outline"
                            isDisabled={!selectedSiteId && !selectedSite}
                        >
                            Add More Items
                        </Button>

                        <VStack spacing={4} align="stretch">
                            {orderItems.map((item, index) => {
                                const stockItem = [...selectedItems, ...availableItems].find(si => si._id === item.stockItem);
                                return (
                                    <Card key={item._key || index} p={4} variant="outline" position="relative">
                                        <IconButton
                                            aria-label="Remove item"
                                            icon={<FiX />}
                                            size="sm"
                                            position="absolute"
                                            top={2}
                                            right={2}
                                            onClick={() => removeItem(index)}
                                            variant="ghost"
                                        />
                                        <VStack align="stretch" spacing={2}>
                                            <HStack justifyContent="space-between" alignItems="center">
                                                <Text fontWeight="bold" fontSize="lg">{stockItem?.name}</Text>
                                                <Text fontSize="sm" color="gray.600">SKU: {stockItem?.sku}</Text>
                                            </HStack>
                                            <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} flexWrap="wrap">
                                                <Box flex="1 1 200px">
                                                    <Text fontWeight="medium" mb={1}>Supplier</Text>
                                                    <Select
                                                        value={item.supplier}
                                                        onChange={(e) => updateItemSupplier(index, e.target.value)}
                                                        size="sm"
                                                    >
                                                        <option value="">Select Supplier</option>
                                                        {suppliers.map(supplier => (
                                                            <option key={supplier._id} value={supplier._id}>
                                                                {supplier.name}
                                                            </option>
                                                        ))}
                                                    </Select>
                                                </Box>
                                                <Box flex="1 1 80px">
                                                    <Text fontWeight="medium" mb={1}>Quantity</Text>
                                                    <NumberInput
                                                        value={item.orderedQuantity}
                                                        onChange={(value) => updateItemQuantity(index, parseInt(value) || 1)}
                                                        min={1}
                                                        size="sm"
                                                    >
                                                        <NumberInputField />
                                                        <NumberInputStepper>
                                                            <NumberIncrementStepper />
                                                            <NumberDecrementStepper />
                                                        </NumberInputStepper>
                                                    </NumberInput>
                                                </Box>
                                                <Box flex="1 1 100px">
                                                    <Text fontWeight="medium" mb={1}>Unit Price</Text>
                                                    <NumberInput
                                                        value={item.unitPrice}
                                                        onChange={(value) => updateItemPrice(index, parseFloat(value) || 0)}
                                                        min={0}
                                                        precision={2}
                                                        step={0.01}
                                                        size="sm"
                                                    >
                                                        <NumberInputField />
                                                        <NumberInputStepper>
                                                            <NumberIncrementStepper />
                                                            <NumberDecrementStepper />
                                                        </NumberInputStepper>
                                                    </NumberInput>
                                                </Box>
                                            </Flex>
                                        </VStack>
                                    </Card>
                                );
                            })}
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            colorScheme="blue"
                            isDisabled={!selectedSiteId && !selectedSite}
                        >
                            Create Purchase Order
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add Item Modal */}
            <Modal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} size="4xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Add Items to Purchase Order</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            <HStack>
                                <Input
                                    placeholder="Search by name or SKU"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Select
                                    placeholder="Filter by Category"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    {categories.map(category => (
                                        <option key={category._id} value={category.title}>
                                            {category.title}
                                        </option>
                                    ))}
                                </Select>
                            </HStack>

                            {(isLoadingItems || isLoadingCategories) ? (
                                <Flex justifyContent="center" alignItems="center" h="200px">
                                    <Spinner />
                                </Flex>
                            ) : availableItems.length === 0 ? (
                                <Text>No items to display.</Text>
                            ) : (
                                <Box overflowY="auto" maxH="300px">
                                    <VStack spacing={2} align="stretch">
                                        {availableItems
                                            .filter(item => {
                                                const matchesSearch = searchTerm === '' ||
                                                    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    item.sku.toLowerCase().includes(searchTerm.toLowerCase());
                                                const matchesCategory = selectedCategory === '' ||
                                                    (item.category && item.category.title === selectedCategory);
                                                const isAlreadyInOrder = orderItems.some(orderItem => orderItem.stockItem === item._id);

                                                return matchesSearch && matchesCategory && !isAlreadyInOrder;
                                            })
                                            .map(item => (
                                                <Flex
                                                    key={item._id}
                                                    alignItems="center"
                                                    justifyContent="space-between"
                                                    p={2}
                                                    _hover={{ bg: 'gray.100' }}
                                                    cursor="pointer"
                                                    onClick={() => handleAddItems([{ item, quantity: 1, price: item.unitPrice || 0 }])}
                                                >
                                                    <Box>
                                                        <Text fontWeight="bold">{item.name}</Text>
                                                        <Text fontSize="sm">SKU: {item.sku}</Text>
                                                        <Text fontSize="sm">Current Price: ${item.unitPrice?.toFixed(2) || '0.00'}</Text>
                                                    </Box>
                                                    <Button size="sm" colorScheme="blue">Add</Button>
                                                </Flex>
                                            ))}
                                    </VStack>
                                </Box>
                            )}
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" ml={3} onClick={() => setIsAddItemModalOpen(false)}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}