// src/app/actions/PurchaseOrderModal.tsx
'use client';

import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Button, Box, Text, VStack, HStack, Flex, Heading, Table, Thead, Tbody,
    Tr, Th, Td, TableContainer, NumberInput, NumberInputField, NumberInputStepper,
    NumberIncrementStepper, NumberDecrementStepper, Icon, Spinner, Badge,
    useColorModeValue, AlertDialog, AlertDialogBody, AlertDialogFooter,
    AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, Input, Select,
    useToast, ModalCloseButton,
} from '@chakra-ui/react';
import { FaBoxes, FaCheck, FaSave } from 'react-icons/fa';
import { FiPlus } from 'react-icons/fi';
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

// Interfaces remain the same...
export interface OrderedItem {
    _key: string;
    stockItem: {
        _id: string;
        name: string;
    } | null;
    supplier: {
        _id: string;
        name: string;
    } | null;
    orderedQuantity: number;
    unitPrice: number;
}
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
    title: string;
    description: string;
    createdAt: string;
    priority: 'high' | 'medium' | 'low';
    siteName: string;
    actionType: string;
    evidenceRequired: boolean;
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
    isOpen, onClose, poDetails, editedPrices, setEditedPrices,
    editedQuantities, setEditedQuantities, isSaving, onSave,
    onApprove, onAddItem, onRemoveItem,
}: PurchaseOrderModalProps) {
    // Theme-based colors
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const hoverBg = useColorModeValue('neutral.light.tag-bg', 'neutral.dark.tag-bg');

    // Local state...
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
    const toast = useToast();

    const isEditable = poDetails?.status === 'draft';

    const hasIncompleteItems = useMemo(() => {
        if (!poDetails?.orderedItems) return false;
        return poDetails.orderedItems.some(item =>
            !item.stockItem || !item.supplier || item.orderedQuantity <= 0
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

    // UPDATED: Aligns with custom theme variants for Tags/Badges
    const getStatusColorScheme = (status?: string) => {
        switch (status) {
            case 'draft': return 'gray';
            case 'pending-approval': return 'orange';
            case 'approved': return 'purple';
            case 'received': return 'green';
            case 'partially-received': return 'orange';
            case 'cancelled':
            case 'rejected': return 'red';
            default: return 'gray';
        }
    };

    const totalAmount = useMemo(() => {
        return poDetails?.orderedItems?.reduce((acc, item) => {
            const quantity = editedQuantities[item._key] ?? item.orderedQuantity;
            const price = editedPrices[item._key] ?? item.unitPrice;
            return acc + (quantity * price);
        }, 0) || 0;
    }, [poDetails?.orderedItems, editedPrices, editedQuantities]);
    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: '3xl', lg: '4xl' }} closeOnOverlayClick={false} scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader borderBottomWidth="1px">
                        <Heading size="md" color={primaryTextColor}>Purchase Order Details</Heading>
                        {poDetails?.status && (
                            <Badge colorScheme={getStatusColorScheme(poDetails.status)} variant="subtle" mt={2}>
                                {poDetails.status.replace('-', ' ').toUpperCase()}
                            </Badge>
                        )}
                    </ModalHeader>
                    <ModalCloseButton />

                    <ModalBody py={6}>
                        <VStack spacing={6} align="stretch">
                            <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" wrap="wrap" gap={4}>
                                {[{ label: 'PO Number', value: poDetails?.poNumber }, { label: 'Supplier', value: poDetails?.supplierNames }, { label: 'Ordered By', value: poDetails?.orderedBy?.name }, { label: 'Site', value: poDetails?.site?.name }, { label: 'Order Date', value: formatOrderDate(poDetails?.orderDate) }].map(detail => (
                                    <Box key={detail.label} flex="1" minW="180px">
                                        <Text fontWeight="bold" color={primaryTextColor}>{detail.label}:</Text>
                                        <Text color={secondaryTextColor}>{detail.value || 'N/A'}</Text>
                                    </Box>
                                ))}
                            </Flex>

                            {poDetails?.orderedItems ? (
                                <VStack spacing={4} align="stretch" mt={4}>
                                    <Flex justify="space-between" align="center">
                                        <HStack spacing={3}>
                                            <Icon as={FaBoxes} color={primaryTextColor} boxSize={5} />
                                            <Heading size="sm" color={primaryTextColor}>Ordered Items</Heading>
                                        </HStack>
                                        <Button size="sm" onClick={handleOpenAddItemModal} leftIcon={<FiPlus />} colorScheme="brand" isDisabled={!isEditable}>
                                            Add Item
                                        </Button>
                                    </Flex>

                                    {/* RESPONSIVE: Box allows horizontal scrolling on small screens */}
                                    <Box overflowX="auto">
                                        <TableContainer minW="700px">
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
                                                    {poDetails.orderedItems.map((item) => {
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
                                                                    <NumberInput size="sm" value={quantity} onChange={(val) => handleQuantityChange(val, item._key)} min={1} isDisabled={!isEditable} w="100px">
                                                                        <NumberInputField />
                                                                        <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                                                                    </NumberInput>
                                                                </Td>
                                                                <Td isNumeric>
                                                                    <NumberInput size="sm" value={price?.toFixed(2)} onChange={(val) => handlePriceChange(item._key, parseFloat(val))} min={0} precision={2} isDisabled={!isEditable} w="120px">
                                                                        <NumberInputField />
                                                                    </NumberInput>
                                                                </Td>
                                                                <Td isNumeric>
                                                                    <Text fontWeight="bold" color={primaryTextColor}>E{(quantity * price).toFixed(2)}</Text>
                                                                </Td>
                                                                <Td>
                                                                    <Button size="sm" colorScheme="red" variant="ghost" onClick={() => onRemoveItem(item._key)} isDisabled={!isEditable}>
                                                                        Remove
                                                                    </Button>
                                                                </Td>
                                                            </Tr>
                                                        );
                                                    })}
                                                </Tbody>
                                            </Table>
                                        </TableContainer>
                                    </Box>

                                    <Flex justify="flex-end" w="full" mt={4}>
                                        <Text fontWeight="bold" fontSize="xl" color={primaryTextColor}>
                                            Total: E{totalAmount.toFixed(2)}
                                        </Text>
                                    </Flex>
                                </VStack>
                            ) : (
                                <Flex justify="center" align="center" direction="column" py={8}>
                                    <Spinner size="xl" color="brand.500" />
                                    <Text mt={4} color={secondaryTextColor}>Loading items...</Text>
                                </Flex>
                            )}
                        </VStack>
                    </ModalBody>

                    <ModalFooter borderTopWidth="1px">
                        <HStack spacing={3}>
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            {isEditable && (
                                <>
                                    <Button colorScheme="brand" variant="outline" onClick={onSave} isLoading={isSaving} leftIcon={<FaSave />}>
                                        Save Draft
                                    </Button>
                                    <Button colorScheme="green" onClick={handleApproveWithValidation} isLoading={isSaving} isDisabled={hasIncompleteItems} leftIcon={<FaCheck />}>
                                        Confirm PO
                                    </Button>
                                </>
                            )}
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
                                    Are you sure you want to submit this Purchase Order for approval? This action cannot be undone.
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

                            {loadingItems ?
                                (
                                    <Flex justifyContent="center" alignItems="center" h="200px">
                                        <Spinner />
                                    </Flex>
                                ) : availableItems.length === 0 ?
                                    (
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