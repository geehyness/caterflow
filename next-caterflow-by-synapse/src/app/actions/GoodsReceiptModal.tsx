// Please replace the entire file content with this code block
'use client';

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

// Interfaces for the data
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
    };
    receivedItems: ReceivedItemData[];
    attachments?: any[];
}

interface GoodsReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    receipt: GoodsReceiptData | null;
    onSave: () => void;
    approvedPurchaseOrders?: any[];
    preSelectedPO?: string | null;
}

interface Bin {
    _id: string;
    name: string;
    binType: string;
    site: {
        _id: string;
        name: string;
    };
}

// Initial state for a new receipt
const initialFormData = {
    receiptNumber: '',
    receiptDate: new Date().toISOString().split('T')[0],
    status: 'draft',
    notes: '',
    purchaseOrder: undefined,
    receivingBin: undefined,
    receivedItems: [],
};

export default function GoodsReceiptModal({
    isOpen,
    onClose,
    receipt,
    onSave,
    approvedPurchaseOrders = [],
    preSelectedPO = null,
}: GoodsReceiptModalProps) {
    const toast = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isBinSelectorOpen, setIsBinSelectorOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<GoodsReceiptData>>(initialFormData);
    const [availableBins, setAvailableBins] = useState<Bin[]>([]);
    const [savedReceiptId, setSavedReceiptId] = useState<string>('');

    const isNewReceipt = !receipt || receipt._id.startsWith('temp-');

    const fetchBinsForSite = useCallback(async (siteId: string) => {
        if (!siteId) {
            setAvailableBins([]);
            return;
        }
        try {
            const binsResponse = await fetch(`/api/bins?siteId=${siteId}`);
            if (binsResponse.ok) {
                const bins: Bin[] = await binsResponse.json();
                setAvailableBins(bins);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load receiving bins for the site.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [toast]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!isOpen) {
                setFormData(initialFormData);
                setAvailableBins([]);
                setSavedReceiptId('');
                return;
            }

            setIsLoading(true);

            // Editing an existing receipt
            if (receipt && !isNewReceipt) {
                try {
                    const response = await fetch(`/api/goods-receipts/${receipt._id}`);
                    if (!response.ok) throw new Error('Failed to fetch receipt details');
                    const fullReceiptData: GoodsReceiptData = await response.json();
                    setFormData(fullReceiptData);
                    setSavedReceiptId(fullReceiptData._id);
                    if (fullReceiptData.purchaseOrder?.site?._id) {
                        await fetchBinsForSite(fullReceiptData.purchaseOrder.site._id);
                    }
                } catch (error) {
                    toast({
                        title: 'Error',
                        description: `Could not load receipt details. ${error instanceof Error ? error.message : ''}`,
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                    onClose();
                }
            }
            // Creating a new receipt with a pre-selected PO
            else if (preSelectedPO) {
                try {
                    const poResponse = await fetch(`/api/purchase-orders?id=${preSelectedPO}`);
                    if (!poResponse.ok) throw new Error('Failed to fetch PO details');
                    const poData = await poResponse.json();

                    const initialItems: ReceivedItemData[] = (poData.orderedItems || []).map((item: any) => ({
                        _key: item._key || Math.random().toString(36).substr(2, 9),
                        stockItem: {
                            _id: item.stockItem?._id || '',
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

                    setFormData({
                        ...initialFormData,
                        purchaseOrder: poData,
                        receivedItems: initialItems,
                    });

                    if (poData.site?._id) {
                        await fetchBinsForSite(poData.site._id);
                    }
                } catch (error) {
                    toast({
                        title: 'Error',
                        description: `Could not load PO details. ${error instanceof Error ? error.message : ''}`,
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                }
            }
            // Creating a new receipt without a pre-selected PO
            else {
                setFormData(initialFormData);
            }

            setIsLoading(false);
        };

        loadInitialData();
    }, [isOpen, receipt, preSelectedPO, toast, onClose, fetchBinsForSite, isNewReceipt]); // ADD isNewReceipt to dependencies

    const handleFieldChange = (field: keyof GoodsReceiptData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleItemChange = (key: string, field: keyof ReceivedItemData, value: any) => {
        setFormData(prev => ({
            ...prev,
            receivedItems: (prev.receivedItems || []).map(item =>
                item._key === key ? { ...item, [field]: value } : item
            ),
        }));
    };

    const handleBinSelect = (bin: Bin) => {
        // Set the receivingBin as a reference object
        handleFieldChange('receivingBin', { _id: bin._id, name: bin.name });
    };

    const saveReceipt = async (status: string = 'draft'): Promise<any> => {
        setIsSaving(true);
        if (!formData.purchaseOrder?._id || !formData.receivingBin?._id) {
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
            const itemsToSave = (formData.receivedItems || []).map(item => ({
                _key: item._key,
                stockItem: { _type: 'reference', _ref: item.stockItem._id },
                orderedQuantity: item.orderedQuantity || 0,
                receivedQuantity: item.receivedQuantity,
                condition: item.condition,
                batchNumber: item.batchNumber || '',
                expiryDate: item.expiryDate || '',
            }));

            const payload = {
                receiptDate: formData.receiptDate || new Date().toISOString().split('T')[0],
                status,
                notes: formData.notes,
                purchaseOrder: { _type: 'reference', _ref: formData.purchaseOrder._id },
                receivingBin: { _type: 'reference', _ref: formData.receivingBin._id },
                receivedItems: itemsToSave,
            };

            let response;
            if (isNewReceipt) {
                response = await fetch('/api/goods-receipts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                response = await fetch(`/api/goods-receipts/${formData._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to save goods receipt`);
            }

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
            onClose();
        }).catch(() => {
            // Error handling is already done in saveReceipt
        });
    };

    const isFullyReceived = (formData.receivedItems || []).every(item => item.receivedQuantity >= (item.orderedQuantity || 0));

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
            let finalReceiptId = formData._id;

            if (isNewReceipt) {
                const savedReceipt = await saveReceipt('draft');
                finalReceiptId = savedReceipt._id;
                // Ensure finalReceiptId is a string before setting state
                if (finalReceiptId) {
                    setSavedReceiptId(finalReceiptId);
                }
                setFormData(prev => ({ ...prev, _id: savedReceipt._id, receiptNumber: savedReceipt.receiptNumber }));
            } else if (finalReceiptId) {
                setSavedReceiptId(finalReceiptId);
            }

            if (!finalReceiptId) throw new Error('Could not determine receipt ID');

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

    // Replace the current handleFinalizeReceipt function with this:

    const handleFinalizeReceipt = async (attachmentIds: string[]) => {
        setIsUploadModalOpen(false);
        try {
            setIsSaving(true);
            const receiptIdToUse = savedReceiptId || formData._id;

            if (!receiptIdToUse) throw new Error('No receipt ID available for completion');

            const completeResponse = await fetch('/api/complete-goods-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiptId: receiptIdToUse,
                    poId: formData.purchaseOrder?._id,
                    attachmentIds // Changed from attachmentId to attachmentIds (array)
                }),
            });

            if (!completeResponse.ok) {
                const errorData = await completeResponse.json();
                throw new Error(errorData.error || 'Failed to complete goods receipt transaction');
            }

            toast({
                title: 'Receipt Completed',
                description: `Goods receipt has been completed successfully with ${attachmentIds.length} evidence file(s).`,
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

    const modalTitle = !isNewReceipt ? `Goods Receipt: ${formData.receiptNumber}` : 'New Goods Receipt';
    const isEditable = formData.status !== 'completed';

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent maxW="1200px" mx="auto" my={8} borderRadius="xl" boxShadow="xl" height="90vh">
                    <ModalHeader borderBottomWidth="1px">{modalTitle}</ModalHeader>
                    <ModalCloseButton position="absolute" right="12px" top="12px" />
                    <ModalBody pb={6} overflowY="auto" maxH="calc(90vh - 140px)">
                        {isLoading ? (
                            <Flex justifyContent="center" alignItems="center" height="100%">
                                <Spinner size="xl" />
                            </Flex>
                        ) : (
                            <VStack spacing={4} align="stretch">
                                <HStack>
                                    <FormControl isRequired>
                                        <FormLabel>Receipt Number</FormLabel>
                                        <Input value={formData.receiptNumber || ''} isReadOnly />
                                    </FormControl>
                                    <FormControl isRequired>
                                        <FormLabel>Receipt Date</FormLabel>
                                        <Input
                                            type="date"
                                            value={formData.receiptDate || ''}
                                            onChange={(e) => handleFieldChange('receiptDate', e.target.value)}
                                            isReadOnly={!isEditable}
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>Status</FormLabel>
                                        <Badge
                                            colorScheme={getStatusColor(formData.status || 'draft')}
                                            fontSize="md" px={3} py={1} borderRadius="full"
                                        >
                                            {(formData.status || 'draft').toUpperCase()}
                                        </Badge>
                                    </FormControl>
                                </HStack>

                                <HStack>
                                    <FormControl isRequired>
                                        <FormLabel>Purchase Order</FormLabel>
                                        <Input value={formData.purchaseOrder?.poNumber || 'N/A'} isReadOnly />
                                    </FormControl>
                                    <FormControl isRequired>
                                        <FormLabel>Receiving Bin</FormLabel>
                                        <HStack>
                                            <Select
                                                value={formData.receivingBin?._id || ''}
                                                onChange={(e) => handleBinSelect(availableBins.find(b => b._id === e.target.value)!)}
                                                placeholder="Select Bin"
                                                isDisabled={!isEditable || availableBins.length === 0}
                                            >
                                                {availableBins.map(bin => (
                                                    <option key={bin._id} value={bin._id}>
                                                        {bin.name} ({bin.binType})
                                                    </option>
                                                ))}
                                            </Select>
                                            <Button
                                                onClick={() => setIsBinSelectorOpen(true)}
                                                isDisabled={!isEditable}
                                                variant="outline"
                                            >
                                                Browse Bins
                                            </Button>
                                        </HStack>
                                    </FormControl>
                                </HStack>

                                {formData.purchaseOrder && (
                                    <Box p={4} borderWidth={1} borderColor="gray.200" borderRadius="md" mt={2}>
                                        <VStack align="stretch" spacing={2}>
                                            <Text fontWeight="bold" fontSize="lg">Purchase Order Details</Text>
                                            <HStack justifyContent="space-between">
                                                <Text fontWeight="medium">PO Number:</Text>
                                                <Text>{formData.purchaseOrder.poNumber}</Text>
                                            </HStack>
                                            <HStack justifyContent="space-between">
                                                <Text fontWeight="medium">Supplier:</Text>
                                                <Text>{formData.purchaseOrder.supplier?.name}</Text>
                                            </HStack>
                                            <HStack justifyContent="space-between">
                                                <Text fontWeight="medium">Site:</Text>
                                                <Text>{formData.purchaseOrder.site?.name}</Text>
                                            </HStack>
                                        </VStack>
                                    </Box>
                                )}

                                <FormControl>
                                    <FormLabel>Notes</FormLabel>
                                    <Input
                                        value={formData.notes || ''}
                                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                                        placeholder="Additional notes or comments"
                                        isDisabled={!isEditable}
                                    />
                                </FormControl>

                                <Box>
                                    <HStack justify="space-between" mb={4}>
                                        <Text fontSize="lg" fontWeight="bold">
                                            Received Items
                                        </Text>
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
                                                {(formData.receivedItems || []).map(item => (
                                                    <Tr key={item._key}>
                                                        <Td>{item.stockItem?.name || 'Unknown Item'}</Td>
                                                        <Td isNumeric>{item.orderedQuantity || 0}</Td>
                                                        <Td>
                                                            <NumberInput
                                                                value={item.receivedQuantity}
                                                                onChange={(_, valueAsNumber) =>
                                                                    handleItemChange(item._key, 'receivedQuantity', valueAsNumber)
                                                                }
                                                                size="sm" min={0}
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
                                                                onChange={(e) => handleItemChange(item._key, 'condition', e.target.value)}
                                                                size="sm" isDisabled={!isEditable}
                                                            >
                                                                <option value="good">Good</option>
                                                                <option value="damaged">Damaged</option>
                                                            </Select>
                                                        </Td>
                                                        <Td>
                                                            <Input
                                                                type="text"
                                                                value={item.batchNumber || ''}
                                                                onChange={(e) => handleItemChange(item._key, 'batchNumber', e.target.value)}
                                                                size="sm" isDisabled={!isEditable}
                                                            />
                                                        </Td>
                                                        <Td>
                                                            <Input
                                                                type="date"
                                                                value={item.expiryDate || ''}
                                                                onChange={(e) => handleItemChange(item._key, 'expiryDate', e.target.value)}
                                                                size="sm" isDisabled={!isEditable}
                                                            />
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            </VStack>
                        )}
                    </ModalBody>
                    <ModalFooter borderTopWidth="1px">
                        <Button colorScheme="gray" mr={3} onClick={onClose} isDisabled={isSaving || isLoading} variant="outline">
                            Cancel
                        </Button>
                        {isEditable && (
                            <>
                                <Button
                                    colorScheme="blue" variant="outline" onClick={handleSaveDraft}
                                    isLoading={isSaving} leftIcon={<FiSave />}
                                    isDisabled={!formData.purchaseOrder || (formData.receivedItems || []).length === 0 || !formData.receivingBin}
                                >
                                    Save Draft
                                </Button>
                                <Button
                                    colorScheme="green" onClick={handleCompleteReceipt}
                                    isLoading={isSaving}
                                    isDisabled={!isFullyReceived || !formData.purchaseOrder || (formData.receivedItems || []).length === 0 || !formData.receivingBin}
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
                relatedToId={savedReceiptId || formData._id || ''}
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