import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    VStack,
    HStack,
    Input,
    Select,
    Box,
    Text,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    useColorModeValue,
    Flex,
    Spinner,
    Checkbox,
    Divider,
    IconButton,
} from '@chakra-ui/react';
import { useState, Dispatch, SetStateAction } from 'react';
import { FaTrash } from 'react-icons/fa';
import { StockItem, Category } from '@/lib/sanityTypes'; // Assuming these interfaces exist

// Interface for items selected in the modal
export interface SelectedItemData {
    item: StockItem;
    quantity: number;
    price: number;
}

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableItems: StockItem[];
    categories: Category[];
    onAddItems: (items: SelectedItemData[]) => void;
    searchTerm: string;
    setSearchTerm: Dispatch<SetStateAction<string>>;
    selectedCategory: string;
    setSelectedCategory: Dispatch<SetStateAction<string>>;
    loadingItems: boolean;
}

export default function AddItemModal({
    isOpen,
    onClose,
    availableItems,
    categories,
    onAddItems,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    loadingItems,
}: AddItemModalProps) {
    const [selectedItems, setSelectedItems] = useState<SelectedItemData[]>([]);
    const cardBg = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');

    const handleCheckboxChange = (item: StockItem, isChecked: boolean) => {
        setSelectedItems(prevItems => {
            if (isChecked) {
                // Check if the item is already in the list
                if (!prevItems.find(i => i.item._id === item._id)) {
                    return [...prevItems, { item, quantity: 1, price: item.unitPrice }];
                }
            } else {
                return prevItems.filter(i => i.item._id !== item._id);
            }
            return prevItems;
        });
    };

    const handleQuantityChange = (itemId: string, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setSelectedItems(prevItems =>
                prevItems.map(item =>
                    item.item._id === itemId ? { ...item, quantity: numValue } : item
                )
            );
        }
    };

    const handlePriceChange = (itemId: string, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setSelectedItems(prevItems =>
                prevItems.map(item =>
                    item.item._id === itemId ? { ...item, price: numValue } : item
                )
            );
        }
    };

    const handleAddSelectedItems = () => {
        const itemsToAdd = selectedItems.filter(item => item.quantity > 0 && item.price >= 0);
        onAddItems(itemsToAdd);
        setSelectedItems([]); // Reset selection after adding
        onClose();
    };

    const handleClose = () => {
        setSelectedItems([]);
        setSearchTerm('');
        setSelectedCategory('');
        onClose();
    };

    const filteredItems = availableItems.filter(item => {
        const matchesSearch = searchTerm === '' ||
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === '' || item.category?.title === selectedCategory;
        const isAlreadySelected = selectedItems.some(selected => selected.item._id === item._id);

        return matchesSearch && matchesCategory && !isAlreadySelected;
    });

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="4xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Add Items to Purchase Order</ModalHeader>
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

                        {loadingItems ? (
                            <Flex justifyContent="center" alignItems="center" h="200px">
                                <Spinner />
                            </Flex>
                        ) : filteredItems.length === 0 && selectedItems.length === 0 ? (
                            <Text color={primaryTextColor}>No items to display.</Text>
                        ) : (
                            <>
                                {selectedItems.length > 0 && (
                                    <Box
                                        p={4}
                                        bg={cardBg}
                                        borderRadius="md"
                                        border="1px solid"
                                        borderColor="neutral.light.border-color"
                                    >
                                        <Heading size="sm" mb={2} color={primaryTextColor}>Selected Items</Heading>
                                        <VStack spacing={3} align="stretch">
                                            {selectedItems.map((selected, index) => (
                                                <Box key={selected.item._id}>
                                                    <HStack justifyContent="space-between">
                                                        <Text color={primaryTextColor} fontWeight="bold">{selected.item.name}</Text>
                                                        <HStack>
                                                            <NumberInput
                                                                size="sm"
                                                                value={selected.quantity}
                                                                onChange={(value) => handleQuantityChange(selected.item._id, value)}
                                                                min={1}
                                                                max={99999}
                                                            >
                                                                <NumberInputField />
                                                                <NumberInputStepper>
                                                                    <NumberIncrementStepper />
                                                                    <NumberDecrementStepper />
                                                                </NumberInputStepper>
                                                            </NumberInput>
                                                            <NumberInput
                                                                size="sm"
                                                                value={selected.price}
                                                                onChange={(value) => handlePriceChange(selected.item._id, value)}
                                                                min={0.01}
                                                                precision={2}
                                                            >
                                                                <NumberInputField />
                                                                <NumberInputStepper>
                                                                    <NumberIncrementStepper />
                                                                    <NumberDecrementStepper />
                                                                </NumberInputStepper>
                                                            </NumberInput>
                                                            <IconButton
                                                                aria-label="Remove item"
                                                                icon={<FaTrash />}
                                                                size="sm"
                                                                variant="ghost"
                                                                colorScheme="red"
                                                                onClick={() => handleCheckboxChange(selected.item, false)}
                                                            />
                                                        </HStack>
                                                    </HStack>
                                                </Box>
                                            ))}
                                        </VStack>
                                    </Box>
                                )}
                                <Divider />
                                <Box overflowY="auto" maxH="300px">
                                    <VStack spacing={2} align="stretch">
                                        {filteredItems.map(item => (
                                            <Flex key={item._id} alignItems="center" justifyContent="space-between" p={2} _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}>
                                                <HStack>
                                                    <Checkbox
                                                        isChecked={selectedItems.some(i => i.item._id === item._id)}
                                                        onChange={(e) => handleCheckboxChange(item, e.target.checked)}
                                                    />
                                                    <Box>
                                                        <Text fontWeight="bold" color={primaryTextColor}>{item.name}</Text>
                                                        <Text fontSize="sm" color={primaryTextColor}>SKU: {item.sku}</Text>
                                                        <Text fontSize="sm" color={primaryTextColor}>Current Price: E{item.unitPrice?.toFixed(2) || '0.00'}</Text>
                                                    </Box>
                                                </HStack>
                                            </Flex>
                                        ))}
                                    </VStack>
                                </Box>
                            </>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        colorScheme="blue"
                        onClick={handleAddSelectedItems}
                        isDisabled={selectedItems.length === 0}
                    >
                        Add {selectedItems.length || ''} Item(s)
                    </Button>
                    <Button variant="ghost" ml={3} onClick={handleClose}>
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}