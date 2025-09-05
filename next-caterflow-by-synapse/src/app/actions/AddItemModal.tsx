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

// Define the interfaces for props passed to the modal
interface StockItem {
    _id: string;
    name: string;
    sku: string;
    unitPrice: number;
    unitOfMeasure: string;
    category?: {
        _id: string;
        title: string;
    };
    itemType?: string;
}

interface Category {
    _id: string;
    title: string;
}

// Interface for items selected in the modal
interface SelectedItemData {
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

    const handleCheckboxChange = (item: StockItem) => {
        setSelectedItems(prevItems => {
            const isSelected = prevItems.find(i => i.item._id === item._id);
            if (isSelected) {
                // If item is already selected, remove it
                return prevItems.filter(i => i.item._id !== item._id);
            } else {
                // If not selected, add it with default values
                return [
                    ...prevItems,
                    {
                        item: item,
                        quantity: 1,
                        price: item.unitPrice ?? 0,
                    },
                ];
            }
        });
    };

    const handleQuantityChange = (itemId: string, value: number) => {
        setSelectedItems(prevItems =>
            prevItems.map(i =>
                i.item._id === itemId ? { ...i, quantity: value } : i
            )
        );
    };

    const handlePriceChange = (itemId: string, value: number) => {
        setSelectedItems(prevItems =>
            prevItems.map(i =>
                i.item._id === itemId ? { ...i, price: value } : i
            )
        );
    };

    const handleAddSelectedItems = () => {
        onAddItems(selectedItems);
        setSelectedItems([]); // Reset state
    };

    const handleClose = () => {
        setSelectedItems([]);
        onClose();
    };

    const filteredItems = availableItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || item.category?._id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const isItemChecked = (itemId: string) => selectedItems.some(i => i.item._id === itemId);

    const selectedItemBg = useColorModeValue('blue.50', 'blue.800');
    const unselectedItemBg = useColorModeValue('white', 'gray.700');

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Add Items to Purchase Order</ModalHeader>
                <ModalBody>
                    <VStack spacing={4}>
                        <HStack width="100%" spacing={4}>
                            <Input
                                placeholder="Search items by name or SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                flex={2}
                            />
                            <Select
                                placeholder="Filter by Category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                flex={1}
                            >
                                {categories.map((category) => (
                                    <option key={category._id} value={category._id}>
                                        {category.title}
                                    </option>
                                ))}
                            </Select>
                        </HStack>
                        <Box width="100%" maxH="300px" overflowY="auto" borderWidth={1} borderRadius="md" p={2}>
                            {loadingItems ? (
                                <Flex justifyContent="center" alignItems="center" height="100%">
                                    <Spinner size="xl" />
                                </Flex>
                            ) : filteredItems.length === 0 ? (
                                <Text textAlign="center" color="gray.500" py={4}>
                                    No items found matching your search and filters.
                                </Text>
                            ) : (
                                filteredItems.map((item) => (
                                    <HStack
                                        key={item._id}
                                        p={3}
                                        borderWidth={1}
                                        borderRadius="md"
                                        mb={2}
                                        cursor="pointer"
                                        bg={isItemChecked(item._id) ? selectedItemBg : unselectedItemBg}
                                        onClick={() => handleCheckboxChange(item)}
                                    >
                                        <Checkbox isChecked={isItemChecked(item._id)} onChange={() => handleCheckboxChange(item)} />
                                        <Box flex={1}>
                                            <Text fontWeight="bold">{item.name}</Text>
                                            <Text fontSize="sm">SKU: {item.sku}</Text>
                                        </Box>
                                        <Text fontSize="sm">E {item.unitPrice?.toFixed(2)}</Text>
                                    </HStack>
                                ))
                            )}
                        </Box>

                        {selectedItems.length > 0 && (
                            <>
                                <Divider my={4} />
                                <VStack width="100%" spacing={4} align="stretch">
                                    <Text fontWeight="bold" fontSize="md">Selected Items ({selectedItems.length})</Text>
                                    <Box width="100%" maxH="200px" overflowY="auto">
                                        {selectedItems.map((selectedItemData) => (
                                            <Box
                                                key={selectedItemData.item._id}
                                                p={3}
                                                borderWidth={1}
                                                borderRadius="md"
                                                mb={2}
                                            >
                                                <HStack justifyContent="space-between">
                                                    <VStack align="start" spacing={0}>
                                                        <Text fontWeight="bold">{selectedItemData.item.name}</Text>
                                                        <Text fontSize="sm" color="gray.500">{selectedItemData.item.unitOfMeasure}</Text>
                                                    </VStack>
                                                    <IconButton
                                                        aria-label="Remove item"
                                                        icon={<FaTrash />}
                                                        variant="ghost"
                                                        colorScheme="red"
                                                        size="sm"
                                                        onClick={() => handleCheckboxChange(selectedItemData.item)}
                                                    />
                                                </HStack>
                                                <HStack mt={2} spacing={4}>
                                                    <Box flex={1}>
                                                        <Text fontSize="sm" fontWeight="bold">Quantity:</Text>
                                                        <NumberInput
                                                            value={selectedItemData.quantity}
                                                            onChange={(_, value) => handleQuantityChange(selectedItemData.item._id, value)}
                                                            min={1}
                                                        >
                                                            <NumberInputField />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper />
                                                                <NumberDecrementStepper />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Box>
                                                    <Box flex={1}>
                                                        <Text fontSize="sm" fontWeight="bold">Unit Price:</Text>
                                                        <NumberInput
                                                            value={selectedItemData.price}
                                                            onChange={(_, value) => handlePriceChange(selectedItemData.item._id, value)}
                                                            min={0}
                                                            precision={2}
                                                        >
                                                            <NumberInputField />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper />
                                                                <NumberDecrementStepper />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Box>
                                                </HStack>
                                            </Box>
                                        ))}
                                    </Box>
                                </VStack>
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