// Updated StockItemSelectorModal.tsx
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
    useColorModeValue,
    Checkbox,
    Flex,
    Icon,
} from '@chakra-ui/react';
import { FiSearch, FiCheck } from 'react-icons/fi';

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
    onSelect: (items: StockItem[]) => void; // Updated to accept array
    existingItemIds: string[];
    sourceBinId?: string;
    multiSelect?: boolean; // New prop to enable multi-select
}

export default function StockItemSelectorModal({ 
    isOpen, 
    onClose, 
    onSelect, 
    existingItemIds, 
    sourceBinId,
    multiSelect = true // Default to true for better UX
}: StockItemSelectorModalProps) {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<StockItem[]>([]); // New state for multi-select
    const toast = useToast();

    // Theme-aware colors
    const searchIconColor = useColorModeValue('neutral.light.icon-color', 'neutral.dark.icon-color');
    const noItemsTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const listItemHoverBg = useColorModeValue('neutral.light.bg-secondary', 'neutral.dark.bg-card-hover');
    const listItemBorderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const footerBorderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const selectedItemBg = useColorModeValue('blue.50', 'blue.900');

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
            setSelectedItems([]); // Reset selection when modal opens
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
        if (multiSelect) {
            setSelectedItems(prev => {
                const isAlreadySelected = prev.some(selected => selected._id === item._id);
                if (isAlreadySelected) {
                    return prev.filter(selected => selected._id !== item._id);
                } else {
                    return [...prev, item];
                }
            });
        } else {
            onSelect([item]);
            onClose();
        }
    };

    const handleConfirmSelection = () => {
        if (selectedItems.length === 0) {
            toast({
                title: 'No items selected',
                description: 'Please select at least one item.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        onSelect(selectedItems);
        onClose();
    };

    const isItemSelected = (itemId: string) => {
        return selectedItems.some(item => item._id === itemId);
    };

    const getItemTypeColor = (itemType: 'food' | 'nonFood') => {
        return itemType === 'food' ? 'orange' : 'teal';
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <VStack align="start" spacing={2}>
                        <Text>Select Stock Items</Text>
                        {multiSelect && (
                            <Text fontSize="sm" color="gray.600">
                                {selectedItems.length} item(s) selected
                            </Text>
                        )}
                    </VStack>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <InputGroup>
                            <InputLeftElement pointerEvents="none">
                                <FiSearch color={searchIconColor} />
                            </InputLeftElement>
                            <Input
                                placeholder="Search items by name, SKU, or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                        
                        <HStack spacing={3}>
                            <Select
                                placeholder="All Categories"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                flex="1"
                            >
                                {categories.map(category => (
                                    <option key={category._id} value={category._id}>
                                        {category.title}
                                    </option>
                                ))}
                            </Select>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={clearFilters}
                                isDisabled={!searchTerm && !selectedCategory}
                            >
                                Clear
                            </Button>
                        </HStack>

                        <Box maxHeight="400px" overflowY="auto">
                            {loading ? (
                                <Box textAlign="center" py={10}>
                                    <Spinner size="xl" />
                                </Box>
                            ) : filteredItems.length === 0 ? (
                                <Text textAlign="center" color={noItemsTextColor} mt={4}>
                                    {searchTerm || selectedCategory ? 'No items match your search.' : 'No stock items available.'}
                                </Text>
                            ) : (
                                <List spacing={2}>
                                    {filteredItems.map((item) => {
                                        const isSelected = isItemSelected(item._id);
                                        return (
                                            <ListItem
                                                key={item._id}
                                                p={3}
                                                borderWidth="1px"
                                                borderColor={listItemBorderColor}
                                                borderRadius="md"
                                                bg={isSelected ? selectedItemBg : 'transparent'}
                                                _hover={{ bg: isSelected ? selectedItemBg : listItemHoverBg, cursor: 'pointer' }}
                                                onClick={() => handleItemSelect(item)}
                                            >
                                                <HStack align="start" spacing={3}>
                                                    {multiSelect && (
                                                        <Checkbox
                                                            isChecked={isSelected}
                                                            onChange={() => handleItemSelect(item)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )}
                                                    <VStack align="start" spacing={1} flex="1">
                                                        <HStack>
                                                            <Text fontWeight="bold">{item.name}</Text>
                                                            <Badge colorScheme={getItemTypeColor(item.itemType)} size="sm">
                                                                {item.itemType}
                                                            </Badge>
                                                        </HStack>
                                                        <Text fontSize="sm">SKU: {item.sku}</Text>
                                                        <Text fontSize="sm">Unit: {item.unitOfMeasure}</Text>
                                                        {item.description && (
                                                            <Text fontSize="sm" noOfLines={2}>
                                                                {item.description}
                                                            </Text>
                                                        )}
                                                        {sourceBinId && (
                                                            <Text fontSize="sm" color="gray.600">
                                                                Current stock: {item.currentStock}
                                                            </Text>
                                                        )}
                                                    </VStack>
                                                    {isSelected && multiSelect && (
                                                        <Icon as={FiCheck} color="green.500" />
                                                    )}
                                                </HStack>
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter
                    borderTop="1px solid"
                    borderColor={footerBorderColor}
                >
                    <HStack spacing={3}>
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        {multiSelect && (
                            <Button
                                colorScheme="blue"
                                onClick={handleConfirmSelection}
                                isDisabled={selectedItems.length === 0}
                                leftIcon={<FiCheck />}
                            >
                                Add {selectedItems.length} Item(s)
                            </Button>
                        )}
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}