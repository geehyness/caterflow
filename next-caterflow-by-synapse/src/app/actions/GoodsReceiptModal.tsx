// Please replace the entire file content with this code block
'use client';

import React, { useState, useEffect } from 'react';
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
} from '@chakra-ui/react';
import { FiCheck, FiSave, FiX, FiCheckCircle } from 'react-icons/fi';
import FileUploadModal from '@/components/FileUploadModal';

import BinSelectorModal from '@/components/BinSelectorModal';

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
    const toast = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const isNewReceipt = !receipt || receipt._id.startsWith('temp-');

    const [isBinSelectorOpen, setIsBinSelectorOpen] = useState(false);

    const [receivedItems, setReceivedItems] = useState<ReceivedItemData[]>([]);
    const [selectedPOId, setSelectedPOId] = useState<string | null>(preSelectedPO);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [receiptNumber, setReceiptNumber] = useState('');
    const [receiptDate, setReceiptDate] = useState('');
    const [selectedBin, setSelectedBin] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [availableBins, setAvailableBins] = useState<Bin[]>([]);
    const [selectedItemsKeys, setSelectedItemsKeys] = useState<string[]>([]);
    const [savedReceiptId, setSavedReceiptId] = useState<string>('');

    useEffect(() => {
        if (receipt && !isNewReceipt) {
            setReceivedItems(receipt.receivedItems || []);
            setSelectedPOId(receipt.purchaseOrder?._id || null);
            setReceiptNumber(receipt.receiptNumber || '');
            setReceiptDate(receipt.receiptDate || '');
            setSelectedBin(receipt.receivingBin?._id || '');
            setNotes(receipt.notes || '');
            setSavedReceiptId(receipt._id); // Set saved receipt ID for existing receipts
        } else if (isNewReceipt && preSelectedPO) {
            setSelectedPOId(preSelectedPO);
            setReceiptDate(new Date().toISOString().split('T')[0]);
            setSavedReceiptId(''); // Reset saved receipt ID for new receipts
        }
    }, [receipt, isNewReceipt, preSelectedPO]);

    useEffect(() => {
        if (!receiptNumber && !receipt) {
            const timestamp = new Date().getTime();
            setReceiptNumber(`GR-${timestamp}`);
        }
    }, [receiptNumber, receipt]);

    useEffect(() => {
        // Reset savedReceiptId when modal closes
        if (!isOpen) {
            setSavedReceiptId('');
        }
    }, [isOpen]);

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

    const saveReceipt = async (status: string = 'draft'): Promise<any> => {
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
            throw new Error('Missing purchase order or bin');
        }

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
                url = `/api/goods-receipts/${receipt._id}`;
                method = 'PUT';
                payload._id = receipt._id;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const result = await response.json();

                if (status === 'draft') {
                    toast({
                        title: 'Draft Saved',
                        description: 'Goods receipt has been saved as draft.',
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                }

                return result;
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
            throw error;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDraft = () => {
        saveReceipt('draft').then(() => {
            onSave();
        }).catch(() => {
            // Error handling is already done in saveReceipt
        });
    };

    const handleCompleteReceipt = async () => {
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

        try {
            setIsSaving(true);

            // For new receipts, save first to get a real ID
            let finalReceiptId = receipt?._id;
            if (isNewReceipt) {
                const savedReceipt = await saveReceipt('draft');
                finalReceiptId = savedReceipt._id;
                if (finalReceiptId && typeof finalReceiptId === 'string') {
                    setSavedReceiptId(finalReceiptId); // Store the real ID
                }

                // Update the local receipt state with the saved receipt
                setReceiptNumber(savedReceipt.receiptNumber);
            } else {
                if (finalReceiptId && typeof finalReceiptId === 'string') {
                    setSavedReceiptId(finalReceiptId); // Store the existing ID
                }
            }

            if (!finalReceiptId) {
                throw new Error('Could not determine receipt ID');
            }

            // Now open the upload modal
            setIsUploadModalOpen(true);

        } catch (error) {
            console.error('Failed to prepare receipt for completion:', error);
            toast({
                title: 'Error',
                description: `Failed to prepare receipt for completion. ${error instanceof Error ? error.message : ''}`,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalizeReceipt = async (attachmentId: string) => {
        setIsUploadModalOpen(false);

        try {
            setIsSaving(true);

            // Use the saved receipt ID (either from props or from the save operation)
            const receiptIdToUse = savedReceiptId || receipt?._id;

            if (!receiptIdToUse) {
                throw new Error('No receipt ID available for completion');
            }

            // Use the transaction API to complete both receipt and PO
            const completeResponse = await fetch('/api/complete-goods-receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    receiptId: receiptIdToUse,
                    poId: selectedPOId,
                    attachmentId
                }),
            });

            if (!completeResponse.ok) {
                const errorData = await completeResponse.json();
                throw new Error(errorData.error || 'Failed to complete goods receipt transaction');
            }

            toast({
                title: 'Receipt Completed',
                description: 'Goods receipt has been completed successfully with evidence.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error) {
            console.error('Completion error:', error);
            toast({
                title: 'Error',
                description: `Failed to complete goods receipt. ${error instanceof Error ? error.message : ''}`,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
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
                                    {isNewReceipt ? 'Save & Upload Evidence' : 'Upload Evidence & Complete'}
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
                relatedToId={savedReceiptId || receipt?._id || ''} // Use the saved ID if available
                fileType="receipt"
                title="Upload Receipt Evidence"
                description="Please upload photos or documents as evidence before completing the receipt. This will also mark the purchase order as completed."
            />

            <BinSelectorModal
                isOpen={isBinSelectorOpen}
                onClose={() => setIsBinSelectorOpen(false)}
                onSelect={handleBinSelect}
            />
        </>
    );
}