// Please replace the entire file content with this code block
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    FormControl,
    FormLabel,
    Input,
    Select,
    useToast,
    VStack,
    HStack,
    Text,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Badge,
    Spinner,
    Flex,
    Box,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    Icon,
    InputGroup,
    InputRightElement,
    Checkbox,
    useColorModeValue,
} from '@chakra-ui/react';
<<<<<<< HEAD
import { FiCheck, FiSave, FiUpload, FiX, FiCheckCircle } from 'react-icons/fi';
import FileUploadModal from '@/components/FileUploadModal';
import { Reference } from 'sanity';

import BinSelectorModal from '@/components/BinSelectorModal';
=======
import { FiCheck, FiX } from 'react-icons/fi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PurchaseOrder } from './types';
import DataTable, { Column } from './DataTable';
>>>>>>> dev

// Interfaces for the data received from the API endpoint
interface ReceivedItemData {
    _key: string;
    stockItem: {
        _id: string;
        name: string;
        sku?: string;
        unitOfMeasure?: string;
    };
    orderedQuantity?: number;
    receivedQuantity: number;
    batchNumber?: string;
    expiryDate?: string;
    condition: string;
}

// Interface for the goods receipt data object
interface GoodsReceiptData {
    _id: string;
    receiptNumber: string;
    receiptDate: string;
    status: string;
    notes?: string;
    purchaseOrder?: {
        _id: string;
        poNumber: string;
        status: string;
        orderDate: string;
        supplier?: {
            _id: string;
            name: string;
        };
        site?: {
            _id: string;
            name: string;
        };
    };
    receivingBin?: {
        _id: string;
        name: string;
        site?: {
            _id: string;
            name: string;
        };
    };
    receivedItems: ReceivedItemData[];
    attachments?: any[];
}

// Define the component's props with the new interface
interface GoodsReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    receipt: GoodsReceiptData | null;
    onSave: () => void;
    approvedPurchaseOrders?: any[];
    preSelectedPO?: string | null;
}

// Interface for a bin location
interface Bin {
    _id: string;
    name: string;
    binType: string;
    site: {
        _id: string;
        name: string;
    };
}

export default function GoodsReceiptModal({
    isOpen,
    onClose,
    receipt,
    onSave,
    approvedPurchaseOrders = [],
    preSelectedPO = null
}: GoodsReceiptModalProps) {
<<<<<<< HEAD
    const toast = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const cancelRef = useRef<HTMLButtonElement>(null);

    const isNewReceipt = !receipt || receipt._id.startsWith('temp-');

    const [isBinSelectorOpen, setIsBinSelectorOpen] = useState(false);

    const [receivedItems, setReceivedItems] = useState<ReceivedItemData[]>([]);
    const [selectedPOId, setSelectedPOId] = useState<string | null>(preSelectedPO);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
=======
    const queryClient = useQueryClient();
>>>>>>> dev
    const [receiptNumber, setReceiptNumber] = useState('');
    const [receiptDate, setReceiptDate] = useState('');
    const [selectedBin, setSelectedBin] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [availableBins, setAvailableBins] = useState<Bin[]>([]);
    const [selectedItemsKeys, setSelectedItemsKeys] = useState<string[]>([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    useEffect(() => {
        if (receipt && !isNewReceipt) {
            setReceivedItems(receipt.receivedItems || []);
            setSelectedPOId(receipt.purchaseOrder?._id || null);
            setReceiptNumber(receipt.receiptNumber || '');
            setReceiptDate(receipt.receiptDate || '');
            setSelectedBin(receipt.receivingBin?._id || '');
            setNotes(receipt.notes || '');
        } else if (isNewReceipt && preSelectedPO) {
            setSelectedPOId(preSelectedPO);
            setReceiptDate(new Date().toISOString().split('T')[0]);
        }
    }, [receipt, isNewReceipt, preSelectedPO]);

    useEffect(() => {
        if (!receiptNumber && !receipt) {
            const timestamp = new Date().getTime();
            setReceiptNumber(`GR-${timestamp}`);
        }
    }, [receiptNumber, receipt]);

    useEffect(() => {
        const loadItemsFromPO = async () => {
            if (isNewReceipt && selectedPOId) {
                setIsLoadingItems(true);
                try {
                    const response = await fetch(`/api/purchase-orders?id=${selectedPOId}`);
                    if (response.ok) {
                        const poData = await response.json();

                        if (poData.orderedItems) {
                            const initialItems: ReceivedItemData[] = poData.orderedItems.map((item: any) => ({
                                _key: item._key || Math.random().toString(36).substr(2, 9),
                                stockItem: {
                                    _id: item.stockItem?._id || item.stockItem?._ref || '',
                                    name: item.stockItem?.name || 'Unknown Item',
                                    sku: item.stockItem?.sku,
                                    unitOfMeasure: item.stockItem?.unitOfMeasure
                                },
                                orderedQuantity: item.orderedQuantity || 0,
                                receivedQuantity: 0,
                                condition: 'good',
                                batchNumber: '',
                                expiryDate: ''
                            }));
                            setReceivedItems(initialItems);
                        }

                        if (poData.site?._id) {
                            const binsResponse = await fetch(`/api/bins?siteId=${poData.site._id}`);
                            if (binsResponse.ok) {
                                const bins: Bin[] = await binsResponse.json();
                                setAvailableBins(bins);
                            }
                        }
                    } else {
                        throw new Error('Failed to fetch purchase order details');
                    }
                } catch (error) {
                    toast({
                        title: 'Error',
                        description: 'Failed to load purchase order items',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                    setReceivedItems([]);
                } finally {
                    setIsLoadingItems(false);
                }
            } else if (isNewReceipt && !selectedPOId) {
                setReceivedItems([]);
                setAvailableBins([]);
                setSelectedBin('');
            }
        };

        loadItemsFromPO();
    }, [selectedPOId, isNewReceipt, toast]);


    const handleBinSelect = (bin: Bin) => {
        setSelectedBin(bin._id);
    };


    const handleQuantityChange = (key: string, valueAsString: string, valueAsNumber: number) => {
        setReceivedItems(items => items.map(item =>
            item._key === key ? { ...item, receivedQuantity: valueAsNumber } : item
        ));
    };

    const handleConditionChange = (key: string, newCondition: string) => {
        setReceivedItems(items => items.map(item =>
            item._key === key ? { ...item, condition: newCondition } : item
        ));
    };

    const handleUpdateBatchNumber = (key: string, value: string) => {
        setReceivedItems(items => items.map(item =>
            item._key === key ? { ...item, batchNumber: value } : item
        ));
    };

    const handleUpdateExpiryDate = (key: string, value: string) => {
        setReceivedItems(items => items.map(item =>
            item._key === key ? { ...item, expiryDate: value } : item
        ));
    };

    const markSelectedAsReceived = () => {
        const newItems = receivedItems.map(item => {
            if (selectedItemsKeys.includes(item._key)) {
                return {
                    ...item,
                    receivedQuantity: item.orderedQuantity || 0,
                    condition: 'good'
                };
            }
            return item;
        });
        setReceivedItems(newItems);
        setSelectedItemsKeys([]);
    };

    const markSelectedAsNotReceived = () => {
        const newItems = receivedItems.map(item => {
            if (selectedItemsKeys.includes(item._key)) {
                return {
                    ...item,
                    receivedQuantity: 0,
                    condition: 'good'
                };
            }
            return item;
        });
        setReceivedItems(newItems);
        setSelectedItemsKeys([]);
    };

    const handleSelectionChange = (selectedData: any[]) => {
        setSelectedItemsKeys(selectedData.map(item => item._key));
    };

    const determineStatus = () => {
        if (receivedItems.length === 0) return 'draft';

        const allReceived = receivedItems.every(item =>
            item.receivedQuantity === (item.orderedQuantity || 0) && item.condition === 'good'
        );
        const someReceived = receivedItems.some(item => item.receivedQuantity > 0);

        if (allReceived) return 'completed';
        if (someReceived) return 'partially-received';
        return 'draft';
    };

    const saveReceipt = async (status: string, attachmentId?: string) => {
        setIsSaving(true);
        if (!selectedPOId || !selectedBin) {
            toast({
                title: 'Missing Information',
                description: 'Please select a purchase order and a receiving bin.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            setIsSaving(false);
            return;
        }

<<<<<<< HEAD
=======
        await saveReceipt(finalStatus);
    };
    {/*}
    const saveReceipt = async (finalStatus: 'draft' | 'partial' | 'completed') => {
        setLoading(true);
>>>>>>> dev
        try {
            const itemsToSave = receivedItems.map(item => ({
                _key: item._key,
                stockItem: {
                    _type: 'reference',
                    _ref: item.stockItem._id,
                },
                orderedQuantity: item.orderedQuantity || 0,
                receivedQuantity: item.receivedQuantity,
                condition: item.condition,
                batchNumber: item.batchNumber || '',
                expiryDate: item.expiryDate || '',
            }));

            let url = '/api/goods-receipts';
            let method = 'POST';
            const payload: any = {
                receiptNumber,
                status,
                receiptDate: receiptDate || new Date().toISOString().split('T')[0],
                notes: notes,
                purchaseOrder: { _type: 'reference', _ref: selectedPOId },
                receivingBin: { _type: 'reference', _ref: selectedBin },
                receivedItems: itemsToSave,
            };

            if (!isNewReceipt && receipt?._id) {
                // This is an update, so use the dynamic route
                url = `/api/goods-receipts/${receipt._id}`;
                method = 'POST';
                payload._id = receipt._id;

                // Only send the fields that can be updated
                payload.status = status;
                payload.notes = notes;
                payload.receivingBin = { _type: 'reference', _ref: selectedBin };
                payload.receivedItems = itemsToSave;

                if (attachmentId) {
                    payload.attachments = [...(receipt?.attachments || []), { _type: 'reference', _ref: attachmentId }];
                }
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast({
                    title: `Receipt ${status === 'draft' ? 'saved' : 'completed'}`,
                    description: `Goods receipt has been ${status === 'draft' ? 'saved' : 'completed'} successfully.`,
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
                onSave();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save goods receipt');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast({
                title: 'Error',
                description: `Failed to save goods receipt. ${error instanceof Error ? error.message : ''}`,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDraft = () => {
        const status = determineStatus();
        if (status === 'completed') {
            setIsConfirmOpen(true);
        } else {
            saveReceipt(status);
        }
    };

    const handleCompleteReceipt = () => {
        if (!isFullyReceived) {
            toast({
                title: 'Incomplete Receipt',
                description: 'You must receive all items before completing the receipt.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return;
        }
        setIsUploadModalOpen(true);
    };

    const handleFinalizeReceipt = async (attachmentId: string) => {
        setIsUploadModalOpen(false);
        saveReceipt('completed', attachmentId);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'green';
            case 'partially-received': return 'orange';
            default: return 'gray';
        }
    };

    const getItemListForPO = (po: any) => {
        const itemNames = po.orderedItems?.map((item: any) => item.stockItem?.name);
        const maxItemsToShow = 2;
        if (itemNames && itemNames.length > 0) {
            if (itemNames.length <= maxItemsToShow) {
                return itemNames.join(', ');
            } else {
                return `${itemNames.slice(0, maxItemsToShow).join(', ')} +${itemNames.length - maxItemsToShow} more`;
            }
        }
        return '';
    };*/}

    // Add the missing function here
    const getItemListForPO = (po: PurchaseOrder) => {
        const itemNames = po.orderedItems?.map(item => item.stockItem?.name || 'Unknown Item');
        const maxItemsToShow = 2;
        if (itemNames && itemNames.length > 0) {
            if (itemNames.length <= maxItemsToShow) {
                return itemNames.join(', ');
            } else {
                return `${itemNames.slice(0, maxItemsToShow).join(', ')} +${itemNames.length - maxItemsToShow} more`;
            }
        }
        return '';
    };

    // Mutation for saving goods receipt
    const saveGoodsReceiptMutation = useMutation({
        mutationFn: async (receiptData: any) => {
            const url = '/api/goods-receipts';
            const method = receipt ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(receiptData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save goods receipt');
            }
            return response.json();
        },
        onMutate: async (receiptData) => {
            // Optimistically update the goods receipts list
            queryClient.setQueryData(['goodsReceipts'], (old: any[] | undefined) => {
                if (receipt) {
                    // Update existing receipt
                    return old?.map(r => r._id === receiptData._id ? { ...r, ...receiptData } : r);
                } else {
                    // Add new receipt
                    return [...(old || []), { ...receiptData, _id: `temp-${Date.now()}` }];
                }
            });
        },
        onError: (err) => {
            toast({
                title: 'Error',
                description: err.message || 'Failed to save goods receipt. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        },
        onSuccess: (savedReceipt) => {
            toast({
                title: receipt ? 'Receipt updated.' : 'Receipt created.',
                description: `Goods receipt "${savedReceipt.receiptNumber}" has been saved.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            // Update PO status if completed
            if (savedReceipt.status === 'completed' && savedReceipt.purchaseOrder) {
                updatePOStatusMutation.mutate({
                    poId: savedReceipt.purchaseOrder,
                    status: 'completed'
                });
            }

            onSave();
            onClose();
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['goodsReceipts'] });
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
        },
    });

    // Mutation for updating PO status
    const updatePOStatusMutation = useMutation({
        mutationFn: async ({ poId, status }: { poId: string; status: string }) => {
            const response = await fetch('/api/purchase-orders/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poId, status }),
            });

            if (!response.ok) {
                throw new Error('Failed to update purchase order status');
            }
            return response.json();
        },
        onMutate: async ({ poId, status }) => {
            // Optimistically update PO status
            queryClient.setQueryData(['purchaseOrders'], (old: any[] | undefined) =>
                old?.map(po => po._id === poId ? { ...po, status } : po)
            );
        },
        onError: (err) => {
            console.warn('Error updating purchase order status:', err);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
        },
    });

    const saveReceipt = async (finalStatus: 'draft' | 'partial' | 'completed') => {
        setLoading(true);

        const selectedOrder = approvedPurchaseOrders?.find(po => po._id === selectedPO);
        const receiptData = {
            ...(receipt && { _id: receipt._id }),
            receiptNumber: receiptNumber || `GR-${Date.now()}`,
            purchaseOrder: selectedPO,
            receivedItems: items,
            receivedDate: receiptDate,
            status: finalStatus,
            notes: notes,
            createdBy: receipt?.createdBy || user?._id,
        };

        try {
            await saveGoodsReceiptMutation.mutateAsync(receiptData);
        } catch (error) {
            console.error('Error saving goods receipt:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectedOrder = approvedPurchaseOrders.find(po => po._id === selectedPOId) || receipt?.purchaseOrder || null;
    const currentStatus = determineStatus();
    const isFullyReceived = receivedItems.every(item => item.receivedQuantity >= (item.orderedQuantity || 0));
    const modalTitle = receipt && !isNewReceipt ? `Goods Receipt: ${receipt.receiptNumber}` : 'New Goods Receipt';
    const isEditable = !receipt || receipt.status !== 'completed';

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent maxW="1200px" mx="auto" my={8} borderRadius="xl" boxShadow="xl" height="90vh">
                    <ModalHeader borderBottomWidth="1px">
                        {modalTitle}
                    </ModalHeader>
                    <ModalCloseButton position="absolute" right="12px" top="12px" />

                    <ModalBody pb={6} overflowY="auto" maxH="calc(90vh - 140px)">
                        <VStack spacing={4} align="stretch">
                            <HStack>
                                <FormControl isRequired>
                                    <FormLabel>Receipt Number</FormLabel>
                                    <Input
                                        value={receiptNumber}
                                        onChange={(e) => setReceiptNumber(e.target.value)}
                                        placeholder="e.g., GR-001"
                                        isReadOnly={!isNewReceipt}
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Receipt Date</FormLabel>
                                    <Input
                                        type="date"
                                        value={receiptDate}
                                        onChange={(e) => setReceiptDate(e.target.value)}
                                        isReadOnly={!isEditable}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Status</FormLabel>
                                    <Badge
                                        colorScheme={getStatusColor(currentStatus)}
                                        fontSize="md"
                                        px={3}
                                        py={1}
                                        borderRadius="full"
                                    >
                                        {currentStatus.toUpperCase()}
                                    </Badge>
                                </FormControl>
                            </HStack>

                            <HStack>
                                <FormControl isRequired>
                                    <FormLabel>Purchase Order</FormLabel>
                                    {isNewReceipt ? (
                                        <Select
                                            placeholder="Select a Purchase Order"
                                            value={selectedPOId || ''}
                                            onChange={(e) => setSelectedPOId(e.target.value)}
                                            isDisabled={isLoadingItems || !isEditable}
                                        >
                                            {approvedPurchaseOrders.map((po) => (
                                                <option key={po._id} value={po._id}>
                                                    {po.poNumber} - {po.supplier?.name}
                                                    {po.orderedItems && po.orderedItems.length > 0 && (
                                                        ` (${getItemListForPO(po)})`
                                                    )}
                                                </option>
                                            ))}
                                        </Select>
                                    ) : (
                                        <Input value={receipt?.purchaseOrder?.poNumber || 'N/A'} isReadOnly />
                                    )}
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Receiving Bin</FormLabel>
                                    <HStack>
                                        <Select
                                            value={selectedBin}
                                            onChange={(e) => setSelectedBin(e.target.value)}
                                            placeholder="Select Bin"
                                            isDisabled={isLoadingItems || !isEditable}
                                        >
                                            {availableBins.map(bin => (
                                                <option key={bin._id} value={bin._id}>
                                                    {bin.name} ({bin.binType})
                                                </option>
                                            ))}
                                        </Select>
                                        <Button
                                            onClick={() => setIsBinSelectorOpen(true)}
                                            isDisabled={isLoadingItems || !isEditable}
                                            variant="outline"
                                        >
                                            Browse Bins
                                        </Button>
                                        {isLoadingItems && (
                                            <Spinner size="sm" />
                                        )}
                                    </HStack>
                                </FormControl>
                            </HStack>

                            {selectedOrder && (
                                <Box p={4} borderWidth={1} borderColor="gray.200" borderRadius="md" mt={2}>
                                    <VStack align="stretch" spacing={2}>
                                        <Text fontWeight="bold" fontSize="lg">Purchase Order Details</Text>
                                        <HStack justifyContent="space-between">
                                            <Text fontWeight="medium">PO Number:</Text>
                                            <Text>{selectedOrder.poNumber}</Text>
                                        </HStack>
                                        <HStack justifyContent="space-between">
                                            <Text fontWeight="medium">Supplier:</Text>
                                            <Text>{selectedOrder.supplier?.name}</Text>
                                        </HStack>
                                        <HStack justifyContent="space-between">
                                            <Text fontWeight="medium">Site:</Text>
                                            <Text>{selectedOrder.site?.name}</Text>
                                        </HStack>
                                    </VStack>
                                </Box>
                            )}

                            <FormControl>
                                <FormLabel>Notes</FormLabel>
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Additional notes or comments"
                                    isDisabled={isLoadingItems || !isEditable}
                                />
                            </FormControl>

                            {isLoadingItems ? (
                                <Flex justifyContent="center" alignItems="center" height="200px">
                                    <Spinner size="xl" />
                                </Flex>
                            ) : selectedOrder && (
                                <>
                                    <Box>
                                        <HStack justify="space-between" mb={4}>
                                            <Text fontSize="lg" fontWeight="bold">
                                                Received Items from PO: {selectedOrder.poNumber}
                                            </Text>
                                            {isEditable && (
                                                <HStack>
                                                    <Button size="sm" leftIcon={<FiCheck />} onClick={markSelectedAsReceived} isDisabled={selectedItemsKeys.length === 0}>
                                                        Mark Selected
                                                    </Button>
                                                    <Button size="sm" leftIcon={<FiX />} onClick={markSelectedAsNotReceived} isDisabled={selectedItemsKeys.length === 0}>
                                                        Clear Selected
                                                    </Button>
                                                </HStack>
                                            )}
                                        </HStack>

                                        <TableContainer w="100%">
                                            <Table variant="simple" size="sm">
                                                <Thead>
                                                    <Tr>
                                                        <Th>Item</Th>
                                                        <Th isNumeric>Ordered</Th>
                                                        <Th isNumeric>Received</Th>
                                                        <Th>Condition</Th>
                                                        <Th>Batch No.</Th>
                                                        <Th>Expiry Date</Th>
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {receivedItems.length === 0 ? (
                                                        <Tr>
                                                            <Td colSpan={6} textAlign="center">
                                                                No items found in this purchase order.
                                                            </Td>
                                                        </Tr>
                                                    ) : (
                                                        receivedItems.map(item => (
                                                            <Tr key={item._key}>
                                                                <Td>{item.stockItem?.name || 'Unknown Item'}</Td>
                                                                <Td isNumeric>{item.orderedQuantity || 0}</Td>
                                                                <Td>
                                                                    <NumberInput
                                                                        value={item.receivedQuantity}
                                                                        onChange={(valueAsString, valueAsNumber) =>
                                                                            handleQuantityChange(item._key, valueAsString, valueAsNumber)
                                                                        }
                                                                        size="sm"
                                                                        min={0}
                                                                        max={item.orderedQuantity}
                                                                        isDisabled={!isEditable}
                                                                    >
                                                                        <NumberInputField />
                                                                        <NumberInputStepper>
                                                                            <NumberIncrementStepper />
                                                                            <NumberDecrementStepper />
                                                                        </NumberInputStepper>
                                                                    </NumberInput>
                                                                </Td>
                                                                <Td>
                                                                    <Select
                                                                        value={item.condition}
                                                                        onChange={(e) => handleConditionChange(item._key, e.target.value)}
                                                                        size="sm"
                                                                        isDisabled={!isEditable}
                                                                    >
                                                                        <option value="good">Good</option>
                                                                        <option value="damaged">Damaged</option>
                                                                        <option value="short-shipped">Short-Shipped</option>
                                                                        <option value="over-shipped">Over-Shipped</option>
                                                                    </Select>
                                                                </Td>
                                                                <Td>
                                                                    <Input
                                                                        type="text"
                                                                        value={item.batchNumber || ''}
                                                                        onChange={(e) => handleUpdateBatchNumber(item._key, e.target.value)}
                                                                        size="sm"
                                                                        isDisabled={!isEditable}
                                                                    />
                                                                </Td>
                                                                <Td>
                                                                    <Input
                                                                        type="date"
                                                                        value={item.expiryDate || ''}
                                                                        onChange={(e) => handleUpdateExpiryDate(item._key, e.target.value)}
                                                                        size="sm"
                                                                        isDisabled={!isEditable}
                                                                    />
                                                                </Td>
                                                            </Tr>
                                                        ))
                                                    )}
                                                </Tbody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                </>
                            )}
                        </VStack>
                    </ModalBody>

                    <ModalFooter borderTopWidth="1px">
                        <Button
                            colorScheme="gray"
                            mr={3}
                            onClick={onClose}
                            isDisabled={isSaving || isLoadingItems}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        {isEditable && (
                            <>
                                <Button
                                    colorScheme="blue"
                                    variant="outline"
                                    onClick={handleSaveDraft}
                                    isLoading={isSaving}
                                    leftIcon={<FiSave />}
                                    isDisabled={!selectedPOId || receivedItems.length === 0 || !selectedBin}
                                >
                                    Save Draft
                                </Button>
                                <Button
                                    colorScheme="green"
                                    onClick={handleCompleteReceipt}
                                    isLoading={isSaving}
                                    isDisabled={!isFullyReceived || !selectedPOId || receivedItems.length === 0 || !selectedBin}
                                    leftIcon={<FiCheckCircle />}
                                >
                                    Complete Receipt
                                </Button>
                            </>
                        )}
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <FileUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadComplete={handleFinalizeReceipt}
                relatedToId={receipt?._id || ''}
                fileType="receipt"
                title="Upload Receipt Photos"
                description="Please upload photos of the received goods for verification."
            />

            <BinSelectorModal
                isOpen={isBinSelectorOpen}
                onClose={() => setIsBinSelectorOpen(false)}
                onSelect={handleBinSelect}
            />

            {/* Confirmation Dialog */}
            <AlertDialog
                isOpen={isConfirmOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => setIsConfirmOpen(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Confirm Complete Receipt
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure you want to mark this receipt as complete? This will also mark the associated purchase order as completed and cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setIsConfirmOpen(false)}>
                                Cancel
                            </Button>
                            <Button colorScheme="green" onClick={() => saveReceipt('completed')} ml={3}>
                                Confirm Complete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </>
    );
}