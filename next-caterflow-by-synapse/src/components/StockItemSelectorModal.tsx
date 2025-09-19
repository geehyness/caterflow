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
    Spinner,
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';

interface StockItem {
    _id: string;
    name: string;
    sku: string;
    itemType: 'food' | 'nonFood';
    unitOfMeasure: string;
    description?: string;
    category?: {
        _id: string;
        title: string;
    };
    currentStock: number;
}

interface Category {
    _id: string;
    title: string;
}

interface StockItemSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: StockItem) => void;
    existingItemIds: string[];
    sourceBinId?: string;
}

export default function StockItemSelectorModal({ isOpen, onClose, onSelect, existingItemIds, sourceBinId }: StockItemSelectorModalProps) {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const fetchStockItems = useCallback(async () => {
        setLoading(true);
        try {
            const url = sourceBinId ? `/api/stock-items?binId=${sourceBinId}` : '/api/stock-items';
            const [itemsRes, categoriesRes] = await Promise.all([
                fetch(url),
                fetch('/api/categories'),
            ]);

            if (!itemsRes.ok || !categoriesRes.ok) {
                throw new Error('Failed to fetch data');
            }

            const itemsData = await itemsRes.json();
            const categoriesData = await categoriesRes.json();

            setStockItems(itemsData);
            setCategories(categoriesData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching stock items:', error);
            toast({
                title: 'Error fetching stock items.',
                description: 'Failed to load stock items and categories.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            setLoading(false);
        }
    }, [sourceBinId, toast]);

    useEffect(() => {
        if (isOpen) {
            fetchStockItems();
        }
    }, [isOpen, fetchStockItems]);

    useEffect(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const newFilteredItems = stockItems.filter(item =>
            !existingItemIds.includes(item._id) &&
            (selectedCategory === '' || item.category?._id === selectedCategory) &&
            (item.name.toLowerCase().includes(lowercasedSearchTerm) ||
                item.sku.toLowerCase().includes(lowercasedSearchTerm) ||
                (item.description && item.description.toLowerCase().includes(lowercasedSearchTerm)))
        );
        setFilteredItems(newFilteredItems);
    }, [searchTerm, selectedCategory, stockItems, existingItemIds]);

    const handleItemSelect = (item: StockItem) => {
        onSelect(item);
        onClose();
    };

    const getItemTypeColor = (itemType: 'food' | 'nonFood') => {
        return itemType === 'food' ? 'orange' : 'teal';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Select Stock Item</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
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
                        <Select
                            placeholder="Filter by Category"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(category => (
                                <option key={category._id} value={category._id}>
                                    {category.title}
                                </option>
                            ))}
                        </Select>
                        <Box maxHeight="400px" overflowY="auto">
                            {loading ? (
                                <Box textAlign="center" py={10}>
                                    <Spinner size="xl" />
                                </Box>
                            ) : filteredItems.length === 0 ? (
                                <Text textAlign="center" color="gray.500" mt={4}>
                                    No stock items found.
                                </Text>
                            ) : (
                                <List spacing={3}>
                                    {filteredItems.map((item) => (
                                        <ListItem
                                            key={item._id}
                                            p={3}
                                            borderWidth="1px"
                                            borderRadius="md"
                                            _hover={{ bg: 'gray.100', cursor: 'pointer' }}
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
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}