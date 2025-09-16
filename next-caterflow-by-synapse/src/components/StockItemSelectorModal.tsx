import React, { useState, useEffect, useCallback } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    VStack,
    HStack,
    Input,
    Select,
    List,
    ListItem,
    Box,
    Text,
    Badge,
    useToast,
    InputGroup,
    InputLeftElement,
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';

interface StockItem {
    _id: string;
    name: string;
    sku: string;
    itemType: 'food' | 'nonFood';
    unitOfMeasure: string;
    description?: string;
    category?: { // Updated to match expected data structure
        _id: string;
        title: string;
    };
}

interface Category {
    _id: string;
    title: string;
}

interface StockItemSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: StockItem) => void;
    existingItemIds: string[]; // This is the new prop
}

export default function StockItemSelectorModal({ isOpen, onClose, onSelect, existingItemIds }: StockItemSelectorModalProps) {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedItemType, setSelectedItemType] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const fetchStockItemsAndCategories = useCallback(async () => {
        try {
            const [itemsResponse, categoriesResponse] = await Promise.all([
                fetch('/api/stock-items'),
                fetch('/api/categories')
            ]);

            if (!itemsResponse.ok || !categoriesResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            const itemsData = await itemsResponse.json();
            const categoriesData = await categoriesResponse.json();

            setStockItems(itemsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error fetching stock items and categories:', error);
            toast({
                title: 'Error',
                description: 'Failed to load stock items. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const filterItems = useCallback(() => {
        let filtered = stockItems;

        // Step 1: Filter out items that are already counted
        // Safely check if existingItemIds is an array and has items.
        // Use a defensive check to handle cases where the prop might be undefined.
        if (existingItemIds && existingItemIds.length > 0) {
            filtered = filtered.filter(item => !existingItemIds.includes(item._id));
        }

        // Step 2: Filter by category
        if (selectedCategory) {
            filtered = filtered.filter(item => item.category?._id === selectedCategory);
        }

        // Step 3: Filter by item type
        if (selectedItemType) {
            filtered = filtered.filter(item => item.itemType === selectedItemType);
        }

        // Step 4: Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(term) ||
                item.sku.toLowerCase().includes(term) ||
                item.description?.toLowerCase().includes(term)
            );
        }

        setFilteredItems(filtered);
    }, [stockItems, existingItemIds, selectedCategory, selectedItemType, searchTerm]);

    useEffect(() => {
        if (isOpen) {
            fetchStockItemsAndCategories();
        }
    }, [isOpen, fetchStockItemsAndCategories]);

    useEffect(() => {
        filterItems();
    }, [filterItems]);

    const handleItemSelect = (item: StockItem) => {
        onSelect(item);
        onClose();
    };

    const getItemTypeColor = (type: string) => {
        switch (type) {
            case 'food': return 'green';
            case 'nonFood': return 'blue';
            default: return 'gray';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Select a Stock Item</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <HStack>
                            <Select
                                placeholder="Filter by category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                {categories.map(category => (
                                    <option key={category._id} value={category._id}>
                                        {category.title}
                                    </option>
                                ))}
                            </Select>
                            <Select
                                placeholder="Filter by type"
                                value={selectedItemType}
                                onChange={(e) => setSelectedItemType(e.target.value)}
                            >
                                <option value="food">Food</option>
                                <option value="nonFood">Non-Food</option>
                            </Select>
                            <InputGroup>
                                <InputLeftElement pointerEvents="none">
                                    <FiSearch color="gray.300" />
                                </InputLeftElement>
                                <Input
                                    placeholder="Search items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </HStack>

                        <Box maxH="400px" overflowY="auto">
                            {loading ? (
                                <Text>Loading items...</Text>
                            ) : filteredItems.length === 0 ? (
                                <Text>No items found.</Text>
                            ) : (
                                <List spacing={3}>
                                    {filteredItems.map(item => (
                                        <ListItem
                                            key={item._id}
                                            p={3}
                                            borderWidth="1px"
                                            borderRadius="md"
                                            cursor="pointer"
                                            _hover={{ bg: 'gray.50' }}
                                            onClick={() => handleItemSelect(item)}
                                        >
                                            <VStack align="start" spacing={1}>
                                                <HStack>
                                                    <Text fontWeight="bold">{item.name}</Text>
                                                    <Badge colorScheme={getItemTypeColor(item.itemType)}>
                                                        {item.itemType}
                                                    </Badge>
                                                </HStack>
                                                <Text fontSize="sm">SKU: {item.sku}</Text>
                                                <Text fontSize="sm">Unit: {item.unitOfMeasure}</Text>
                                                {item.description && (
                                                    <Text fontSize="sm" isTruncated maxWidth="100%">
                                                        Description: {item.description}
                                                    </Text>
                                                )}
                                            </VStack>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}