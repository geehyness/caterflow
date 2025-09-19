// src/app/actions/PurchaseOrderModal.tsx
'use client';

import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Button, Box, Text, VStack, HStack, Flex, Heading, Table, Thead, Tbody,
    Tr, Th, Td, TableContainer, NumberInput, NumberInputField, NumberInputStepper,
    NumberIncrementStepper, NumberDecrementStepper, Icon, Spinner, Badge,
    useColorModeValue, ModalCloseButton,
} from '@chakra-ui/react';
import { FaBoxes, FaCheck, FaSave } from 'react-icons/fa';
import { Dispatch, SetStateAction, useMemo } from 'react';

// Interfaces remain the same...
export interface OrderedItem {
    _key: string;
    stockItem: {
        _id: string;
        name: string;
        unitOfMeasure?: string;   // 👈 add this
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
    onApproveRequest: () => void; // Prop changed to reflect new purpose
    onRemoveItem: (itemKey: string) => void;
}

export default function PurchaseOrderModal({
    isOpen, onClose, poDetails, editedPrices, setEditedPrices,
    editedQuantities, setEditedQuantities, isSaving, onSave,
    onApproveRequest, onRemoveItem,
}: PurchaseOrderModalProps) {
    // Theme-based colors
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');

    const isEditable = poDetails?.status === 'draft';

    const hasIncompleteItems = useMemo(() => {
        if (!poDetails?.orderedItems) return false;
        return poDetails.orderedItems.some(item =>
            !item.stockItem || item.orderedQuantity <= 0
        );
    }, [poDetails]);

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
                                    </Flex>

                                    {/* RESPONSIVE: Box allows horizontal scrolling on small screens */}
                                    <Box overflowX="auto">
                                        <TableContainer minW="700px">
                                            <Table variant="simple" size="sm">
                                                <Thead>
                                                    <Tr>
                                                        <Th>Item</Th>
                                                        <Th isNumeric>Qty</Th>{/*}
                                                        <Th isNumeric>Unit Price</Th>
                                                        <Th isNumeric>Subtotal</Th>*/}
                                                        {isEditable && <Th></Th>}
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
                                                                        <Text fontSize="sm" color={secondaryTextColor}>{item.stockItem?._id || 'N/A'}</Text>
                                                                    </VStack>
                                                                </Td>
                                                                <Td isNumeric>
                                                                    <VStack align="end">
                                                                        <HStack>
                                                                            <Text>({item.stockItem?.unitOfMeasure || 'unit'})</Text>
                                                                            <NumberInput
                                                                                size="sm"
                                                                                value={quantity}
                                                                                onChange={(val) => handleQuantityChange(val, item._key)}
                                                                                min={1}
                                                                                isDisabled={!isEditable}
                                                                                w="100px"
                                                                            >
                                                                                <NumberInputField />
                                                                                <NumberInputStepper>
                                                                                    <NumberIncrementStepper />
                                                                                    <NumberDecrementStepper />
                                                                                </NumberInputStepper>
                                                                            </NumberInput>
                                                                        </HStack>
                                                                    </VStack>
                                                                </Td>

                                                                {/*
                                                                <Td isNumeric>
                                                                    <NumberInput size="sm" value={price?.toFixed(2)} onChange={(val) => handlePriceChange(item._key, parseFloat(val))} min={0} precision={2} isDisabled={!isEditable} w="120px">
                                                                        <NumberInputField />
                                                                    </NumberInput>
                                                                </Td>
                                                                <Td isNumeric>
                                                                    <Text fontWeight="bold" color={primaryTextColor}>E{(quantity * price).toFixed(2)}</Text>
                                                                </Td>
                                                                */}

                                                                {isEditable && (
                                                                    <Td>
                                                                        <Button size="sm" colorScheme="red" variant="ghost" onClick={() => onRemoveItem(item._key)}>
                                                                            Remove
                                                                        </Button>
                                                                    </Td>
                                                                )}
                                                            </Tr>
                                                        );
                                                    })}
                                                </Tbody>
                                            </Table>
                                        </TableContainer>
                                    </Box>

                                    {/*<Flex justify="flex-end" w="full" mt={4}>
                                        <Text fontWeight="bold" fontSize="xl" color={primaryTextColor}>
                                            Total: E{totalAmount.toFixed(2)}
                                        </Text>
                                    </Flex>*/}
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
                                    <Button
                                        colorScheme="brand"
                                        variant="outline"
                                        onClick={onSave}
                                        isLoading={isSaving}
                                        leftIcon={<FaSave />}
                                    >
                                        Save Draft
                                    </Button>
                                    <Button
                                        colorScheme="green"
                                        onClick={onApproveRequest} // Calls the new prop
                                        isLoading={isSaving}
                                        isDisabled={hasIncompleteItems}
                                        leftIcon={<FaCheck />}
                                    >
                                        Confirm PO
                                    </Button>
                                </>
                            )}
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}