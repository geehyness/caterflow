// src/components/CreatePurchaseOrderModal.tsx
import React, { useState, useEffect } from 'react';
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
    useColorModeValue,
    Tag,
    useBreakpointValue,
    FormControl,
    FormLabel,
    CardBody,
} from '@chakra-ui/react';
import { FiPlus, FiX } from 'react-icons/fi';
import { StockItem, Supplier, Site } from '@/lib/sanityTypes';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

interface OrderItem {
    stockItem: string;
    supplier: string;
    orderedQuantity: number;
    unitPrice: number;
    _key?: string;
}

interface StockItemWithExpandedCategory {
    _id: string;
    name: string;
    sku: string;
    unitOfMeasure: string;
    unitPrice: number;
    primarySupplier?: { _id: string; name: string };
    suppliers?: { _id: string; name: string }[];
    category?: { _id: string; title: string };
}

interface PurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedItems: StockItem[];
    suppliers: Supplier[];
    onSave: (items: OrderItem[], siteId?: string) => void;
    selectedSiteId?: string | null;
    sites?: Site[];
}

interface Category {
    _id: string;
    title: string;
}

export default function CreatePurchaseOrderModal({
    isOpen,
    onClose,
    selectedItems,
    suppliers,
    onSave,
    selectedSiteId,
    sites = [],
}: PurchaseOrderModalProps) {
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [availableItems, setAvailableItems] = useState<StockItemWithExpandedCategory[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loadingItems, setLoadingItems] = useState(false);
    const [selectedSite, setSelectedSite] = useState<string>(selectedSiteId || '');
    const toast = useToast();

    const mainModalBg = useColorModeValue('neutral.light.bg-secondary', 'neutral.dark.bg-secondary');
    const itemCardBg = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const hoverBg = useColorModeValue('neutral.light.bg-card-hover', 'neutral.dark.bg-card-hover');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const searchInputBg = useColorModeValue('neutral.light.bg-input', 'neutral.dark.bg-input');
    const searchInputColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const modalSize = useBreakpointValue({ base: 'full', md: '5xl' });

    useEffect(() => {
        if (isOpen && selectedItems.length > 0) {
            const initialItems = selectedItems.map(item => ({
                stockItem: item._id,
                supplier: (item.primarySupplier as any)?._ref || ((item.suppliers as any) && (item.suppliers as any)[0]?._ref) || '',
                orderedQuantity: 1,
                unitPrice: item.unitPrice || 0,
                _key: item._id, // Using _id as key here
            }));
            setOrderItems(initialItems);
        } else if (!isOpen) {
            setOrderItems([]);
        }
    }, [isOpen, selectedItems]);

    useEffect(() => {
        const fetchCategoriesAndItems = async () => {
            setLoadingItems(true);
            try {
                const query = groq`{
          "categories": *[_type == "category"]{_id, title},
          "stockItems": *[_type == "StockItem"]{
            _id, name, sku, unitOfMeasure, unitPrice,
            primarySupplier->{_id, name},
            suppliers[]->{_id, name},
            category->{_id, title}
          }
        }`;
                const data = await client.fetch(query);
                setCategories(data.categories);
                setAvailableItems(data.stockItems);
            } catch (error) {
                console.error('Failed to fetch data:', error);
                toast({
                    title: 'Error.',
                    description: 'Failed to load stock items and categories.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setLoadingItems(false);
            }
        };
        if (isAddItemModalOpen) {
            fetchCategoriesAndItems();
        }
    }, [isAddItemModalOpen, toast]);

    const handleSave = () => {
        if (orderItems.length === 0) {
            toast({
                title: 'No items to order.',
                description: 'Please add at least one item to the purchase order.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        const itemsWithSuppliers = orderItems.filter(item => item.supplier);
        if (itemsWithSuppliers.length < orderItems.length) {
            toast({
                title: 'Missing supplier.',
                description: 'Please select a supplier for all items before saving.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        onSave(orderItems, selectedSite);
        onClose();
    };

    const handleQuantityChange = (key: string, valueAsNumber: number) => {
        if (isNaN(valueAsNumber) || valueAsNumber <= 0) return;
        setOrderItems(orderItems.map(item =>
            item._key === key ? { ...item, orderedQuantity: valueAsNumber } : item
        ));
    };

    const handleUnitPriceChange = (key: string, valueAsNumber: number) => {
        if (isNaN(valueAsNumber) || valueAsNumber <= 0) return;
        setOrderItems(orderItems.map(item =>
            item._key === key ? { ...item, unitPrice: valueAsNumber } : item
        ));
    };

    const handleSupplierChange = (key: string, supplierId: string) => {
        setOrderItems(orderItems.map(item =>
            item._key === key ? { ...item, supplier: supplierId } : item
        ));
    };

    const handleRemoveItem = (key: string) => {
        setOrderItems(orderItems.filter(item => item._key !== key));
    };

    const handleAddItems = (itemsToAdd: { item: StockItemWithExpandedCategory, quantity: number, price: number }[]) => {
        const newItems: OrderItem[] = itemsToAdd.map(({ item, quantity, price }) => ({
            stockItem: item._id,
            supplier: item.primarySupplier?._id || item.suppliers?.[0]?._id || '',
            orderedQuantity: quantity,
            unitPrice: price,
            _key: `${item._id}-${Date.now()}`,
        }));
        setOrderItems(prevItems => [...prevItems, ...newItems]);
        setIsAddItemModalOpen(false);
    };

    const filteredItems = availableItems.filter(item => {
        const matchesSearch = searchTerm === '' ||
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === '' || item.category?._id === selectedCategory;
        const isNotAlreadySelected = !orderItems.some(oi => oi.stockItem === item._id);
        return matchesSearch && matchesCategory && isNotAlreadySelected;
    });

    const totalCost = orderItems.reduce((total, item) => total + (item.orderedQuantity * item.unitPrice), 0);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size={modalSize} scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent
                    bg={mainModalBg}
                    rounded={{ base: 'none', md: 'md' }}
                    sx={{ _dark: { boxShadow: 'dark-lg' } }}
                >
                    <ModalHeader borderBottomWidth="1px" borderColor={borderColor}>Create Purchase Order</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4} align="stretch" py={4}>
                            {sites.length > 1 && (
                                <FormControl>
                                    <FormLabel>Select Site</FormLabel>
                                    <Select
                                        value={selectedSite}
                                        onChange={(e) => setSelectedSite(e.target.value)}
                                        placeholder="Select a site"
                                        bg={searchInputBg}
                                    >
                                        {sites.map(site => (
                                            <option key={site._id} value={site._id}>{site.name}</option>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}

                            <Text fontSize="md" fontWeight="bold">Ordered Items</Text>
                            <VStack spacing={3} align="stretch">
                                {orderItems.map((item, index) => {
                                    const stockItemDetails = selectedItems.find(si => si._id === item.stockItem);
                                    if (!stockItemDetails) return null;

                                    return (
                                        <Card
                                            key={item._key || index}
                                            variant="outline"
                                            bg={itemCardBg}
                                            borderLeftColor="brand.500"
                                            borderLeftWidth="4px"
                                            boxShadow="sm"
                                            sx={{ _dark: { boxShadow: 'dark-sm' } }}
                                        >
                                            <CardBody py={3} px={4}>
                                                <HStack justifyContent="space-between" alignItems="center">
                                                    <VStack align="flex-start" spacing={0}>
                                                        <Text fontWeight="bold">{stockItemDetails.name}</Text>
                                                        <Text fontSize="sm" color={secondaryTextColor}>
                                                            {stockItemDetails.sku}
                                                        </Text>
                                                    </VStack>
                                                    <IconButton
                                                        aria-label="Remove item"
                                                        icon={<FiX />}
                                                        onClick={() => handleRemoveItem(item._key || index.toString())}
                                                        size="sm"
                                                        variant="ghost"
                                                        colorScheme="red"
                                                    />
                                                </HStack>
                                                <Flex direction={{ base: 'column', md: 'row' }} mt={2} alignItems="flex-start" gap={3}>
                                                    <Box flex="1" width={{ base: 'full', md: 'auto' }}>
                                                        <Text fontSize="sm" mb={1}>Supplier</Text>
                                                        <Select
                                                            value={item.supplier}
                                                            onChange={(e) => handleSupplierChange(item._key || index.toString(), e.target.value)}
                                                            bg={searchInputBg}
                                                        >
                                                            <option value="">Select Supplier</option>
                                                            {suppliers.map(sup => (
                                                                <option key={sup._id} value={sup._id}>{sup.name}</option>
                                                            ))}
                                                        </Select>
                                                    </Box>
                                                    <Box flex="1" width={{ base: 'full', md: 'auto' }}>
                                                        <Text fontSize="sm" mb={1}>Quantity ({stockItemDetails.unitOfMeasure})</Text>
                                                        <NumberInput
                                                            value={item.orderedQuantity}
                                                            min={1}
                                                            onChange={(_, valueAsNumber) => handleQuantityChange(item._key || index.toString(), valueAsNumber)}
                                                            bg={searchInputBg}
                                                        >
                                                            <NumberInputField />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper />
                                                                <NumberDecrementStepper />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Box>
                                                    <Box flex="1" width={{ base: 'full', md: 'auto' }}>
                                                        <Text fontSize="sm" mb={1}>Unit Price</Text>
                                                        <NumberInput
                                                            value={item.unitPrice}
                                                            min={0}
                                                            onChange={(_, valueAsNumber) => handleUnitPriceChange(item._key || index.toString(), valueAsNumber)}
                                                            bg={searchInputBg}
                                                        >
                                                            <NumberInputField />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper />
                                                                <NumberDecrementStepper />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Box>
                                                </Flex>
                                            </CardBody>
                                        </Card>
                                    );
                                })}
                            </VStack>

                            <HStack mt={4} justifyContent="space-between" alignItems="center" flexWrap="wrap">
                                <Text fontSize="lg" fontWeight="bold">Total: E {totalCost.toFixed(2)}</Text>
                                <Button
                                    size="sm"
                                    colorScheme="brand"
                                    onClick={() => setIsAddItemModalOpen(true)}
                                    leftIcon={<FiPlus />}
                                    flexShrink={0}
                                >
                                    Add More Items
                                </Button>
                            </HStack>
                        </VStack>
                    </ModalBody>
                    <ModalFooter borderTopWidth="1px" borderColor={borderColor}>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button colorScheme="brand" onClick={handleSave}>
                            Create PO
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add Item Modal */}
            <Modal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} size={{ base: 'full', md: 'lg' }} scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent
                    bg={mainModalBg}
                    rounded={{ base: 'none', md: 'md' }}
                    sx={{ _dark: { boxShadow: 'dark-lg' } }}
                >
                    <ModalHeader borderBottomWidth="1px" borderColor={borderColor}>Add Stock Items</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            <Input
                                placeholder="Search by name or SKU"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                bg={searchInputBg}
                                color={searchInputColor}
                                borderColor={borderColor}
                                _hover={{ borderColor: useColorModeValue('gray.300', 'gray.600') }}
                                _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px token(colors.brand.500)' }}
                            />
                            <Select
                                placeholder="Filter by category"
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                bg={searchInputBg}
                                color={searchInputColor}
                                borderColor={borderColor}
                            >
                                {categories.map(cat => (
                                    <option key={cat._id} value={cat._id}>{cat.title}</option>
                                ))}
                            </Select>

                            {loadingItems ? (
                                <Flex justify="center" align="center" py={10}>
                                    <Spinner size="lg" />
                                </Flex>
                            ) : (
                                <Box borderTopWidth="1px" pt={4} borderColor={borderColor}>
                                    <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto" pr={2}>
                                        {filteredItems.length === 0 ? (
                                            <Text textAlign="center" color={secondaryTextColor}>No items found.</Text>
                                        ) : filteredItems.map(item => (
                                            <Flex
                                                key={item._id}
                                                borderWidth="1px"
                                                p={3}
                                                rounded="md"
                                                bg={itemCardBg}
                                                alignItems="center"
                                                justifyContent="space-between"
                                                _hover={{
                                                    bg: hoverBg,
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => handleAddItems([{ item, quantity: 1, price: item.unitPrice || 0 }])}
                                                direction={{ base: 'column', sm: 'row' }}
                                                textAlign={{ base: 'center', sm: 'left' }}
                                            >
                                                <Box flex="1" mb={{ base: 2, sm: 0 }} mr={{ base: 0, sm: 2 }}>
                                                    <Text fontWeight="bold">{item.name}</Text>
                                                    <HStack spacing={2} fontSize="sm" color={secondaryTextColor} justifyContent={{ base: 'center', sm: 'flex-start' }}>
                                                        <Text>SKU: {item.sku}</Text>
                                                        {item.category?.title && <Tag size="sm" colorScheme="gray" flexShrink={0}>{item.category.title}</Tag>}
                                                    </HStack>
                                                </Box>
                                                <Button size="sm" colorScheme="brand" flexShrink={0}>Add</Button>
                                            </Flex>
                                        ))}
                                    </VStack>
                                </Box>
                            )}
                        </VStack>
                    </ModalBody>
                    <ModalFooter borderTopWidth="1px" borderColor={borderColor}>
                        <Button variant="ghost" mr={3} onClick={() => setIsAddItemModalOpen(false)}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}