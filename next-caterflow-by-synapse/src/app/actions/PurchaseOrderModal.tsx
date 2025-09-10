// src/app/actions/PurchaseOrderModal.tsx
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Box,
    Text,
    VStack,
    HStack,
    Flex,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Icon,
    Spinner,
    Badge,
    useColorModeValue,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    Input,
    Select,
    useToast,
    ModalCloseButton,
} from '@chakra-ui/react';
import { FaBoxes, FaCheck, FaSave } from 'react-icons/fa';
import { FiPlus } from 'react-icons/fi';
import { OrderedItem } from './types';
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

// Define the shape of the data received from the API route
export interface PurchaseOrderDetails {
    _id: string;
    _type: string;
    poNumber: string;
    site?: { name: string; _id: string; };
    orderedBy?: { name: string; };
    orderDate?: string;
    status: string;
    orderedItems?: OrderedItem[];
    supplierNames: string;
    totalAmount: number;
    // Make these properties required
    title: string;
    description: string;
    createdAt: string;
    priority: 'high' | 'medium' | 'low';
    siteName: string;
    actionType: string;
    evidenceRequired: boolean;
    workflow?: any[];
    completedSteps?: number;
    supplierName?: string;
}

interface PurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    poDetails: PurchaseOrderDetails | null;
    editedPrices: { [key: string]: number | undefined };
    setEditedPrices: Dispatch<SetStateAction<{ [key: string]: number | undefined }>>;
    editedQuantities: { [key: string]: number | undefined };
    setEditedQuantities: Dispatch<SetStateAction<{ [key: string]: number | undefined }>>;
    isSaving: boolean;
    onSave: () => void;
    onApprove: () => void;
    onAddItem: (items: any[]) => void;
    onRemoveItem: (itemKey: string) => void;
}

interface StockItem {
    _id: string;
    name: string;
    sku: string;
    unitOfMeasure: string;
    unitPrice: number;
    primarySupplier?: { _id: string; name: string };
    suppliers?: { _id: string; name: string }[];
    category?: { _id: string; title: string };
}

interface Category {
    _id: string;
    title: string;
}

export default function PurchaseOrderModal({
    isOpen,
    onClose,
    poDetails,
    editedPrices,
    setEditedPrices,
    editedQuantities,
    setEditedQuantities,
    isSaving,
    onSave,
    onApprove,
    onAddItem,
    onRemoveItem,
}: PurchaseOrderModalProps) {
    // Use theme-based colors
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const modalBgColor = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const toast = useToast();

    // State for add item modal
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [availableItems, setAvailableItems] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loadingItems, setLoadingItems] = useState(false);

    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [isZeroPriceDialogOpen, setIsZeroPriceDialogOpen] = useState(false);
    const [hasZeroPriceItems, setHasZeroPriceItems] = useState<string[]>([]);
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen && poDetails) {
            // Reset edited values when modal opens
            setEditedPrices({});
            setEditedQuantities({});

            // Optionally: Fetch the latest data when modal opens
            const fetchLatestData = async () => {
                try {
                    const response = await fetch(`/api/purchase-orders?id=${poDetails._id}`);
                    if (response.ok) {
                        const latestData = await response.json();
                        // Update the parent component with latest data
                        // You might need to pass a callback prop for this
                    }
                } catch (error) {
                    console.error('Failed to fetch latest data:', error);
                }
            };
            fetchLatestData();
        }
    }, [isOpen, poDetails, setEditedPrices, setEditedQuantities]); // Add the missing dependencies

    const hasIncompleteItems = useMemo(() => {
        if (!poDetails?.orderedItems) return false;
        return poDetails.orderedItems.some(item =>
            !item.stockItem ||
            !item.supplier ||
            item.orderedQuantity <= 0
        );
    }, [poDetails]);

    const fetchAvailableItems = async () => {
        setLoadingItems(true);
        try {
            const query = groq`*[_type == "StockItem"] {
                _id,
                name,
                sku,
                unitOfMeasure,
                unitPrice,
                primarySupplier->{_id, name},
                suppliers[]->{_id, name},
                category->{_id, title}
            }`;
            const items = await client.fetch(query);
            setAvailableItems(items);
        } catch (error) {
            console.error('Failed to fetch stock items:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch available items',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoadingItems(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const query = groq`*[_type == "Category"] { _id, title }`;
            const categories = await client.fetch(query);
            setCategories(categories);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const handleOpenAddItemModal = async () => {
        await Promise.all([fetchAvailableItems(), fetchCategories()]);
        setIsAddItemModalOpen(true);
    };

    const handleAddItems = (items: any[]) => {
        onAddItem(items);
        setIsAddItemModalOpen(false);
        setSearchTerm('');
        setSelectedCategory('');
    };

    const handlePriceChange = (itemKey: string, newPrice: number | undefined) => {
        setEditedPrices(prev => ({
            ...prev,
            [itemKey]: newPrice,
        }));
    };

    const handleQuantityChange = (valueAsString: string, itemKey: string) => {
        const value = parseInt(valueAsString, 10);
        setEditedQuantities(prev => ({
            ...prev,
            [itemKey]: isNaN(value) ? undefined : value,
        }));
    };

    const formatOrderDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (e) {
            return 'N/A';
        }
    };

    const validatePrices = () => {
        const zeroPriceItems: string[] = [];

        poDetails?.orderedItems?.forEach(item => {
            const price = editedPrices[item._key] ?? item.unitPrice;
            if (price === 0) {
                zeroPriceItems.push(item.stockItem?.name || 'Unknown Item');
            }
        });

        return zeroPriceItems;
    };

    const handleApproveWithValidation = () => {
        const zeroPriceItems = validatePrices();

        if (zeroPriceItems.length > 0) {
            setHasZeroPriceItems(zeroPriceItems);
            setIsZeroPriceDialogOpen(true);
        } else {
            setIsConfirmDialogOpen(true);
        }
    };

    const proceedWithApproval = () => {
        setIsConfirmDialogOpen(false);
        setIsZeroPriceDialogOpen(false);
        onApprove();
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                size="3xl"
                closeOnOverlayClick={false}
                scrollBehavior="inside"
            >
                <ModalOverlay />
                <ModalContent
                    bg={modalBgColor}
                    boxShadow="lg"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={borderColor}
                >
                    <ModalHeader>
                        <Heading size="md" color={primaryTextColor}>Purchase Order Details</Heading>
                        <Badge colorScheme={poDetails?.status === 'draft' ? 'purple' : 'green'} mt={2}>
                            {poDetails?.status}
                        </Badge>
                    </ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" wrap="wrap">
                                <Box flex="1" minW="200px">
                                    <Text fontWeight="bold" color={primaryTextColor}>PO Number:</Text>
                                    <Text color={secondaryTextColor}>{poDetails?.poNumber || 'N/A'}</Text>
                                </Box>
                                <Box flex="1" minW="200px">
                                    <Text fontWeight="bold" color={primaryTextColor}>Supplier:</Text>
                                    <Text color={secondaryTextColor}>
                                        {poDetails?.supplierNames || 'N/A'}
                                    </Text>
                                </Box>
                                <Box flex="1" minW="200px">
                                    <Text fontWeight="bold" color={primaryTextColor}>Ordered By:</Text>
                                    <Text color={secondaryTextColor}>
                                        {poDetails?.orderedBy?.name || 'N/A'}
                                    </Text>
                                </Box>
                                <Box flex="1" minW="200px">
                                    <Text fontWeight="bold" color={primaryTextColor}>Site:</Text>
                                    <Text color={secondaryTextColor}>
                                        {poDetails?.site?.name || 'N/A'}
                                    </Text>
                                </Box>
                                <Box flex="1" minW="200px">
                                    <Text fontWeight="bold" color={primaryTextColor}>Order Date:</Text>
                                    <Text color={secondaryTextColor}>{formatOrderDate(poDetails?.orderDate)}</Text>
                                </Box>
                            </Flex>
                            {poDetails?.orderedItems && (
                                <VStack spacing={4} align="stretch" mt={4}>
                                    <Flex justify="space-between" align="center">
                                        <HStack spacing={2}>
                                            <Icon as={FaBoxes} color={primaryTextColor} />
                                            <Heading size="sm" color={primaryTextColor}>Ordered Items</Heading>
                                        </HStack>
                                        {/*<Button
                                            size="sm"
                                            onClick={handleOpenAddItemModal}
                                            leftIcon={<FiPlus />}
                                            colorScheme="blue"
                                        >
                                            Add Item
                                        </Button>*/}
                                    </Flex>
                                    <TableContainer>
                                        <Table variant="simple" size="sm">
                                            <Thead>
                                                <Tr>
                                                    <Th>Item</Th>
                                                    <Th isNumeric>Qty</Th>
                                                    <Th isNumeric>Unit Price</Th>
                                                    <Th isNumeric>Subtotal</Th>
                                                    <Th></Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {poDetails.orderedItems.map((item: any) => {
                                                    const price = editedPrices[item._key] ?? item.unitPrice;
                                                    const quantity = editedQuantities[item._key] ?? item.orderedQuantity;

                                                    return (
                                                        <Tr key={item._key}>
                                                            <Td>
                                                                <VStack align="start" spacing={0}>
                                                                    <Text fontWeight="bold" color={primaryTextColor}>{item.stockItem?.name || 'N/A'}</Text>
                                                                    <Text fontSize="sm" color={secondaryTextColor}>{item.supplier?.name || 'N/A'}</Text>
                                                                </VStack>
                                                            </Td>
                                                            <Td isNumeric>
                                                                <NumberInput
                                                                    size="sm"
                                                                    value={quantity}
                                                                    onChange={(valueAsString) => handleQuantityChange(valueAsString, item._key)}
                                                                    min={1}
                                                                >
                                                                    <NumberInputField />
                                                                    <NumberInputStepper>
                                                                        <NumberIncrementStepper />
                                                                        <NumberDecrementStepper />
                                                                    </NumberInputStepper>
                                                                </NumberInput>
                                                            </Td>
                                                            <Td isNumeric>
                                                                <NumberInput
                                                                    size="sm"
                                                                    value={typeof price === 'number' ? price.toFixed(2) : price}
                                                                    onChange={(valueString) => {
                                                                        const value = parseFloat(valueString.replace(/[^0-9.]/g, ''));
                                                                        if (!isNaN(value)) {
                                                                            handlePriceChange(item._key, value);
                                                                        }
                                                                    }}
                                                                    min={0}
                                                                    precision={2}
                                                                >
                                                                    <NumberInputField
                                                                        onBlur={(e) => {
                                                                            const value = parseFloat(e.target.value);
                                                                            if (!isNaN(value)) {
                                                                                handlePriceChange(item._key, parseFloat(value.toFixed(2)));
                                                                            }
                                                                        }}
                                                                    />
                                                                </NumberInput>
                                                            </Td>
                                                            <Td isNumeric>
                                                                <Text fontWeight="bold" color={primaryTextColor}>
                                                                    E{(quantity * price).toFixed(2)}
                                                                </Text>
                                                            </Td>
                                                            <Td>
                                                                <Button
                                                                    size="sm"
                                                                    colorScheme="red"
                                                                    onClick={() => onRemoveItem(item._key)}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </Td>
                                                        </Tr>
                                                    );
                                                })}
                                            </Tbody>
                                        </Table>
                                    </TableContainer>
                                    <Flex justify="flex-end" w="full">
                                        <Text fontWeight="bold" fontSize="xl" color={primaryTextColor}>
                                            Total: E{(poDetails.orderedItems.reduce((acc, item) => {
                                                const quantity = editedQuantities[item._key] ?? item.orderedQuantity;
                                                const price = editedPrices[item._key] ?? item.unitPrice;
                                                return acc + (quantity * price);
                                            }, 0)).toFixed(2)}
                                        </Text>
                                    </Flex>
                                </VStack>
                            )}
                            {!poDetails?.orderedItems && (
                                <Flex justify="center" align="center" direction="column" py={8}>
                                    <Spinner size="xl" color="blue.500" />
                                    <Text mt={4}>Loading items...</Text>
                                </Flex>
                            )}
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <HStack spacing={4}>
                            <Button
                                colorScheme="blue"
                                onClick={onSave}
                                isLoading={isSaving}
                                loadingText="Saving"
                                isDisabled={isSaving}
                                leftIcon={<Icon as={FaSave} />}
                            >
                                Save
                            </Button>
                            <Button
                                colorScheme="green"
                                onClick={handleApproveWithValidation}
                                isLoading={isSaving}
                                loadingText="Approving"
                                isDisabled={isSaving || !poDetails?.orderedItems?.length || hasIncompleteItems}
                                leftIcon={<Icon as={FaCheck} />}
                            >
                                Confirm PO
                            </Button>
                            <Button variant="ghost" ml={3} onClick={onClose}>
                                Cancel
                            </Button>
                        </HStack>
                    </ModalFooter>

                    {/* Confirmation Dialog */}
                    <AlertDialog
                        isOpen={isConfirmDialogOpen}
                        leastDestructiveRef={cancelRef}
                        onClose={() => setIsConfirmDialogOpen(false)}
                    >
                        <AlertDialogOverlay>
                            <AlertDialogContent>
                                <AlertDialogHeader fontSize="lg" fontWeight="bold">
                                    Confirm Submission
                                </AlertDialogHeader>

                                <AlertDialogBody>
                                    Are you sure you want to submit this Purchase Order for approval?
                                    This action cannot be undone.
                                </AlertDialogBody>

                                <AlertDialogFooter>
                                    <Button ref={cancelRef} onClick={() => setIsConfirmDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button colorScheme="blue" onClick={proceedWithApproval} ml={3}>
                                        Confirm Submit
                                    </Button>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialogOverlay>
                    </AlertDialog>

                    {/* Zero Price Confirmation Dialog */}
                    <AlertDialog
                        isOpen={isZeroPriceDialogOpen}
                        leastDestructiveRef={cancelRef}
                        onClose={() => setIsZeroPriceDialogOpen(false)}
                    >
                        <AlertDialogOverlay>
                            <AlertDialogContent>
                                <AlertDialogHeader fontSize="lg" fontWeight="bold">
                                    Zero Price Warning
                                </AlertDialogHeader>

                                <AlertDialogBody>
                                    <Text mb={3}>The following items have a price of $0:</Text>
                                    <VStack align="start" spacing={1} mb={3}>
                                        {hasZeroPriceItems.map((itemName, index) => (
                                            <Text key={index} fontSize="sm">• {itemName}</Text>
                                        ))}
                                    </VStack>
                                    <Text>Are you sure you want to proceed with zero prices?</Text>
                                </AlertDialogBody>

                                <AlertDialogFooter>
                                    <Button ref={cancelRef} onClick={() => setIsZeroPriceDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button colorScheme="orange" onClick={proceedWithApproval} ml={3}>
                                        Proceed Anyway
                                    </Button>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialogOverlay>
                    </AlertDialog>
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

                            {loadingItems ? (
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
                                                const isAlreadyInOrder = poDetails?.orderedItems?.some(
                                                    orderItem => orderItem.stockItem?._id === item._id
                                                );

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