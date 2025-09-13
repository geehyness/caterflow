// src/app/actions/PurchaseOrderModal.tsx
'use client';

import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Button, Box, Text, VStack, HStack, Flex, Heading, Table, Thead, Tbody,
    Tr, Th, Td, TableContainer, NumberInput, NumberInputField, NumberInputStepper,
    NumberIncrementStepper, NumberDecrementStepper, Icon, Spinner, Badge,
    useColorModeValue, AlertDialog, AlertDialogBody, AlertDialogFooter,
    AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useToast, ModalCloseButton,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaBoxes, FaCheck, FaSave } from 'react-icons/fa';
import { Dispatch, SetStateAction, useMemo, useRef, useState } from 'react';
import { usePOMutations } from '@/hooks/useMutations';

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
    onApprove: () => void;
    onRemoveItem: (itemKey: string) => void;
    onSaveSuccess: () => void; // Add this prop
}

export default function PurchaseOrderModal({
    isOpen, onClose, poDetails, editedPrices, setEditedPrices,
    editedQuantities, setEditedQuantities, isSaving, onApprove,
    onRemoveItem, onSaveSuccess, // Add this prop
}: PurchaseOrderModalProps) {
    console.log('🚪 MODAL RENDERED:', {
        isOpen,
        hasPoDetails: !!poDetails,
        poDetailsId: poDetails?._id,
        editedPricesCount: Object.keys(editedPrices).length,
        editedQuantitiesCount: Object.keys(editedQuantities).length
    });

    // Theme-based colors
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');

    // Local state...
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [isZeroPriceDialogOpen, setIsZeroPriceDialogOpen] = useState(false);
    const [hasZeroPriceItems, setHasZeroPriceItems] = useState<string[]>([]);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const toast = useToast();

    // Get query client
    const queryClient = useQueryClient();


    // Mutation for approving PO
    const approvePOMutation = useMutation({
        mutationFn: async (poId: string) => {
            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: poId,
                    status: 'pending-approval',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit for approval');
            }
            return response.json();
        },
        onMutate: async (poId) => {
            // Optimistically update the PO status
            queryClient.setQueryData(['purchaseOrders'], (old: PurchaseOrderDetails[] | undefined) =>
                old?.map(po => po._id === poId ? { ...po, status: 'pending-approval' } : po)
            );
        },
        onError: (err, poId, context) => {
            toast({ title: 'Error approving PO', description: err.message, status: 'error' });
        },
        onSuccess: () => {
            toast({
                title: 'Order Submitted',
                description: 'The purchase order has been submitted for approval.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            onClose();
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            queryClient.invalidateQueries({ queryKey: ['pendingActions'] });
        },
    });

    const proceedWithApproval = () => {
        if (poDetails?._id) {
            approvePOMutation.mutate(poDetails._id);
        }
        setIsConfirmDialogOpen(false);
        setIsZeroPriceDialogOpen(false);
    };

    // Mutation hook for approving a purchase order
    const approvePurchaseOrderMutation = useMutation({
        mutationFn: async (poId: string) => {
            const res = await fetch(`/api/purchase-orders/${poId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' }),
            });
            if (!res.ok) {
                throw new Error('Failed to approve purchase order');
            }
            return res.json();
        },
        onMutate: async (poId: string) => {
            // Cancel any outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: ['purchaseOrders'] });
            // Snapshot the previous value
            const previousPOs = queryClient.getQueryData(['purchaseOrders']);
            // Optimistically update to the new value
            queryClient.setQueryData(['purchaseOrders'], (old: PurchaseOrderDetails[] | undefined) =>
                old?.map(po => po._id === poId ? { ...po, status: 'approved' } : po)
            );
            // Return a context object with the snapshotted value
            return { previousPOs };
        },
        onError: (err, poId, context) => {
            // Roll back the optimistic update on failure
            if (context?.previousPOs) queryClient.setQueryData(['purchaseOrders'], context.previousPOs);
            toast({ title: 'Error approving PO', description: err.message, status: 'error' });
        },
        onSettled: () => {
            // Invalidate the cache to ensure the server state is refetched
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
        },
    });

    const isEditable = poDetails?.status === 'draft';

    const hasIncompleteItems = useMemo(() => {
        if (!poDetails?.orderedItems) return false;
        return poDetails.orderedItems.some(item =>
            !item.stockItem || !item.supplier || item.orderedQuantity <= 0
        );
    }, [poDetails]);

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

    const handlePriceChange = (itemKey: string, newPrice: number | undefined) => {
        console.log('💰 Price change:', {
            itemKey,
            newPrice,
            oldPrice: editedPrices[itemKey]
        });

        setEditedPrices(prev => ({
            ...prev,
            [itemKey]: newPrice,
        }));
    };

    const handleQuantityChange = (valueAsString: string, itemKey: string) => {
        const value = parseInt(valueAsString, 10);
        console.log('📦 Quantity change:', {
            itemKey,
            newValue: value,
            oldValue: editedQuantities[itemKey],
            inputValue: valueAsString
        });

        setEditedQuantities(prev => ({
            ...prev,
            [itemKey]: isNaN(value) ? undefined : value,
        }));
    };

    // ADD this mutation for saving order items with optimistic updates
    const { updatePOItems } = usePOMutations();

    // UPDATED handleSaveOrder function with logging
    // Replace the handleSaveOrder function with this:
    const handleSaveOrder = async () => {
        if (!poDetails) return;

        try {
            const updates = poDetails.orderedItems
                ?.filter(item => {
                    const newPrice = editedPrices[item._key];
                    const newQuantity = editedQuantities[item._key];
                    const hasPriceChange = newPrice !== undefined && newPrice !== item.unitPrice;
                    const hasQuantityChange = newQuantity !== undefined && newQuantity !== item.orderedQuantity;
                    return hasPriceChange || hasQuantityChange;
                })
                .map(item => ({
                    itemKey: item._key,
                    newPrice: editedPrices[item._key],
                    newQuantity: editedQuantities[item._key],
                })) || [];

            console.log('Modal saving updates:', updates);
            console.log('PO ID:', poDetails._id);

            if (updates.length > 0) {
                await updatePOItems.mutateAsync({
                    poId: poDetails._id,
                    updates,
                });

                toast({
                    title: 'Order Saved',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: 'No changes to save',
                    status: 'info',
                    duration: 3000,
                    isClosable: true,
                });
            }

            onClose();
        } catch (error: any) {
            console.error('Modal save failed:', error);
            console.error('Error details:', error.response?.data || error.message);

            toast({
                title: 'Save Failed',
                description: error.message || 'Failed to save order changes',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
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
                                                        <Th isNumeric>Qty</Th>
                                                        <Th isNumeric>Unit Price</Th>
                                                        <Th isNumeric>Subtotal</Th>
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
                                    <Button
                                        colorScheme="brand"
                                        variant="outline"
                                        onClick={handleSaveOrder}
                                        isLoading={updatePOItems.isPending}
                                        loadingText="Saving..."
                                        leftIcon={<FaSave />}
                                    >
                                        Save Draft
                                    </Button>
                                    <Button
                                        colorScheme="green"
                                        onClick={handleApproveWithValidation}
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
        </>
    );
}