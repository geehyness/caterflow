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
    InputGroup,
    InputRightElement,
    Flex,
    useColorModeValue,
    Checkbox,
    Box,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
} from '@chakra-ui/react';
import { FiCheck, FiX } from 'react-icons/fi';

import { PurchaseOrder } from './types';
import DataTable, { Column } from './DataTable';

// Define the interface for an item within the goods receipt
interface ReceivedItem {
    stockItem: string;
    stockItemName: string;
    orderedQuantity: number;
    receivedQuantity: number;
    batchNumber?: string;
    expiryDate?: string;
    condition: 'good' | 'damaged' | 'short-shipped' | 'over-shipped';
    _key: string;
}

// Define the interface for the goods receipt document
interface GoodsReceipt {
    _id: string;
    receiptNumber: string;
    receiptDate: string;
    purchaseOrder: string;
    purchaseOrderNumber: string;
    receivingBin: string;
    receivingBinName: string;
    items: ReceivedItem[];
    status: 'draft' | 'partial' | 'completed';
    notes?: string;
}

// Define the interface for a bin location
interface Bin {
    _id: string;
    name: string;
    binType: string;
    site: {
        _id: string;
        name: string;
    };
}

// Define the component props
interface GoodsReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    receipt: GoodsReceipt | null;
    onSave: () => void;
    approvedPurchaseOrders: PurchaseOrder[];
    preSelectedPO?: string | null;
}

// The main GoodsReceiptModal component
export default function GoodsReceiptModal({
    isOpen,
    onClose,
    receipt,
    onSave,
    approvedPurchaseOrders,
    preSelectedPO
}: GoodsReceiptModalProps) {
    const [receiptNumber, setReceiptNumber] = useState('');
    const [receiptDate, setReceiptDate] = useState('');
    const [selectedPO, setSelectedPO] = useState<string>('');
    const [selectedBin, setSelectedBin] = useState<string>('');
    const [status, setStatus] = useState<'draft' | 'partial' | 'completed'>('draft');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<ReceivedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [poDataLoading, setPoDataLoading] = useState(false);
    const [availableBins, setAvailableBins] = useState<Bin[]>([]);
    const [selectedItemsKeys, setSelectedItemsKeys] = useState<string[]>([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const cancelRef = React.useRef<HTMLButtonElement>(null);
    const toast = useToast();

    // Effect to preselect the PO if a value is passed
    useEffect(() => {
        if (preSelectedPO) {
            setSelectedPO(preSelectedPO);
        }
    }, [preSelectedPO, isOpen]);

    // Effect to populate the form when editing an existing receipt
    useEffect(() => {
        if (receipt) {
            setReceiptNumber(receipt.receiptNumber || '');
            setReceiptDate(receipt.receiptDate || '');
            setSelectedPO(receipt.purchaseOrder || '');
            setSelectedBin(receipt.receivingBin || '');
            setStatus(receipt.status || 'draft');
            setNotes(receipt.notes || '');
            setItems(receipt.items || []);
        } else {
            setReceiptNumber('');
            setReceiptDate(new Date().toISOString().split('T')[0]);
            setSelectedPO('');
            setSelectedBin('');
            setStatus('draft');
            setNotes('');
            setItems([]);
        }
    }, [receipt]);

    // Effect to generate a new receipt number for new receipts
    useEffect(() => {
        if (!receiptNumber && !receipt) {
            const timestamp = new Date().getTime();
            setReceiptNumber(`GR-${timestamp}`);
        }
    }, [receiptNumber, receipt]);

    // Effect to fetch bins and PO items when a purchase order is selected
    useEffect(() => {
        const fetchBins = async () => {
            if (selectedPO) {
                setPoDataLoading(true);
                const selectedOrder = approvedPurchaseOrders?.find(po => po._id === selectedPO);

                if (selectedOrder) {
                    try {
                        // Fetch bins for the selected PO's site
                        const response = await fetch(`/api/bins?siteName=${selectedOrder.site?.name || ''}`);
                        if (response.ok) {
                            const bins: Bin[] = await response.json();
                            setAvailableBins(bins);
                            const mainBin = bins.find(bin => bin.binType === 'main-storage');
                            if (mainBin) {
                                setSelectedBin(mainBin._id);
                            } else if (bins.length > 0) {
                                setSelectedBin(bins[0]._id);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to fetch bins:', error);
                        toast({
                            title: 'Error',
                            description: 'Failed to fetch bin information.',
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                        });
                    }

                    // Populate items for the goods receipt based on the selected PO
                    if (selectedOrder.orderedItems) {
                        const receiptItems: ReceivedItem[] = selectedOrder.orderedItems.map(item => ({
                            stockItem: item.stockItem._id,
                            stockItemName: item.stockItem.name,
                            orderedQuantity: item.orderedQuantity,
                            receivedQuantity: 0, // Initialize received quantity to 0
                            condition: 'good' as const, // Explicitly type as 'good'
                            _key: item._key || Math.random().toString(36).substr(2, 9)
                        }));
                        setItems(receiptItems);
                    }
                }
                setPoDataLoading(false);
            }
        };

        // Only fetch bins and items if it's a new receipt, not when editing
        if (!receipt) {
            fetchBins();
        }
    }, [selectedPO, approvedPurchaseOrders, toast, receipt]);

    // Handler for changing an individual item's details
    const handleItemChange = (index: number, field: keyof ReceivedItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    // Handler for marking selected items as fully received
    const markSelectedAsReceived = () => {
        const newItems = items.map(item => {
            if (selectedItemsKeys.includes(item._key)) {
                return {
                    ...item,
                    receivedQuantity: item.orderedQuantity,
                    condition: 'good' as const // Explicitly type as 'good'
                };
            }
            return item;
        });
        setItems(newItems);
        setSelectedItemsKeys([]);
    };

    // Handler for marking selected items as not received
    const markSelectedAsNotReceived = () => {
        const newItems = items.map(item => {
            if (selectedItemsKeys.includes(item._key)) {
                return {
                    ...item,
                    receivedQuantity: 0,
                    condition: 'good' as const // Explicitly type as 'good'
                };
            }
            return item;
        });
        setItems(newItems);
        setSelectedItemsKeys([]);
    };

    const handleSelectionChange = (selectedData: any[]) => {
        setSelectedItemsKeys(selectedData.map(item => item._key));
    };

    // Determine status based on received items
    const determineStatus = () => {
        if (items.length === 0) return 'draft';

        const allReceived = items.every(item => item.receivedQuantity === item.orderedQuantity && item.condition === 'good');
        const someReceived = items.some(item => item.receivedQuantity > 0);

        if (allReceived) return 'completed';
        if (someReceived) return 'partial';
        return 'draft';
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const finalStatus = determineStatus();

        // Show confirmation if all items are received
        if (finalStatus === 'completed') {
            setIsConfirmOpen(true);
            return;
        }

        await saveReceipt(finalStatus);
    };

    const saveReceipt = async (finalStatus: 'draft' | 'partial' | 'completed') => {
        setLoading(true);
        try {
            const url = '/api/goods-receipts';
            const method = receipt ? 'PATCH' : 'POST';
            const selectedOrder = approvedPurchaseOrders?.find(po => po._id === selectedPO);
            const selectedBinObj = availableBins.find(bin => bin._id === selectedBin);

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    _id: receipt?._id,
                    receiptNumber,
                    receiptDate,
                    purchaseOrder: selectedPO,
                    purchaseOrderNumber: selectedOrder?.poNumber || '',
                    supplierName: selectedOrder?.supplier?.name || '',
                    siteName: selectedOrder?.site?.name || '',
                    receivingBin: selectedBin,
                    receivingBinName: selectedBinObj?.name || '',
                    status: finalStatus,
                    notes: notes || undefined,
                    items,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save goods receipt');
            }

            // If goods receipt is completed, update the purchase order status
            if (finalStatus === 'completed' && selectedPO) {
                try {
                    const poResponse = await fetch('/api/purchase-orders/update-status', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            poId: selectedPO,
                            status: 'completed',
                        }),
                    });

                    if (!poResponse.ok) {
                        console.warn('Failed to update purchase order status, but goods receipt was saved');
                    }
                } catch (poError) {
                    console.warn('Error updating purchase order status:', poError);
                    // Don't throw error here - goods receipt was saved successfully
                }
            }

            toast({
                title: receipt ? 'Receipt updated.' : 'Receipt created.',
                description: `Goods receipt "${receiptNumber}" has been saved with status: ${finalStatus}.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            onSave();
            onClose();
        } catch (error: any) {
            console.error('Failed to save goods receipt:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save goods receipt. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
            setIsConfirmOpen(false);
        }
    };

    // Helper to generate a truncated list of items for the dropdown
    const getItemListForPO = (po: PurchaseOrder) => {
        const itemNames = po.orderedItems?.map(item => item.stockItem.name);
        const maxItemsToShow = 2;
        if (itemNames != null) {
            if (itemNames.length <= maxItemsToShow) {
                return itemNames.join(', ');
            } else {
                return `${itemNames.slice(0, maxItemsToShow).join(', ')} +${itemNames.length - maxItemsToShow} more`;
            }
        }
        return '';
    };

    // Helper to get a color for the status badge
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'green';
            case 'partial': return 'orange';
            default: return 'gray';
        }
    };

    const isComplete = items.every(item => item.receivedQuantity === item.orderedQuantity && item.condition === 'good');

    const columns: Column[] = [
        {
            accessorKey: 'stockItemName',
            header: 'Item',
            isSortable: true,
        },
        {
            accessorKey: 'orderedQuantity',
            header: 'Ordered',
            cell: (row) => (
                <NumberInput value={row.orderedQuantity} isReadOnly width="80px" size="sm">
                    <NumberInputField />
                </NumberInput>
            ),
        },
        {
            accessorKey: 'receivedQuantity',
            header: 'Received',
            cell: (row, index) => (
                <NumberInput
                    value={row.receivedQuantity}
                    onChange={(_, valueAsNumber) => {
                        if (index !== undefined) {
                            handleItemChange(index, 'receivedQuantity', valueAsNumber);
                        }
                    }}
                    min={0}
                    max={row.orderedQuantity * 2}
                    width="80px"
                    size="sm"
                >
                    <NumberInputField />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
            ),
        },
        {
            accessorKey: 'condition',
            header: 'Condition',
            cell: (row, index) => (
                <Select
                    value={row.condition}
                    onChange={(e) => {
                        if (index !== undefined) {
                            handleItemChange(index, 'condition', e.target.value as 'good' | 'damaged' | 'short-shipped' | 'over-shipped');
                        }
                    }}
                    width="120px"
                    size="sm"
                >
                    <option value="good">Good</option>
                    <option value="damaged">Damaged</option>
                    <option value="short-shipped">Short</option>
                    <option value="over-shipped">Over</option>
                </Select>
            ),
        },
        {
            accessorKey: 'batchNumber',
            header: 'Batch #',
            cell: (row, index) => (
                <Input
                    value={row.batchNumber || ''}
                    onChange={(e) => {
                        if (index !== undefined) {
                            handleItemChange(index, 'batchNumber', e.target.value);
                        }
                    }}
                    placeholder="Batch #"
                    width="80px"
                    size="sm"
                />
            ),
        },
    ];

    const selectedOrder = approvedPurchaseOrders?.find(po => po._id === selectedPO) || null;
    const currentStatus = determineStatus();

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent maxW="1200px" mx="auto" my={8} borderRadius="xl" boxShadow="xl" height="90vh">
                    <ModalHeader
                        bg={useColorModeValue('brand.50', 'brand.900')}
                        borderTopRadius="xl"
                        py={4}
                        position="sticky"
                        top={0}
                        zIndex={10}
                    >
                        {receipt ? 'Edit Goods Receipt' : 'Create Goods Receipt'}
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
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Receipt Date</FormLabel>
                                    <Input
                                        type="date"
                                        value={receiptDate}
                                        onChange={(e) => setReceiptDate(e.target.value)}
                                    />
                                </FormControl>
                            </HStack>

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

                            <HStack>
                                <FormControl isRequired>
                                    <FormLabel>Purchase Order</FormLabel>
                                    <Select
                                        value={selectedPO}
                                        onChange={(e) => setSelectedPO(e.target.value)}
                                        placeholder="Select Purchase Order"
                                        width="100%"
                                        isDisabled={poDataLoading || !!receipt}
                                    >
                                        {approvedPurchaseOrders?.map(po => (
                                            <option key={po._id} value={po._id}>
                                                {po.poNumber} - {po.supplier?.name}
                                                {po.orderedItems && po.orderedItems.length > 0 && (
                                                    ` (${getItemListForPO(po)})`
                                                )}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Receiving Bin</FormLabel>
                                    <InputGroup>
                                        <Select
                                            value={selectedBin}
                                            onChange={(e) => setSelectedBin(e.target.value)}
                                            placeholder="Select Bin"
                                            isDisabled={poDataLoading}
                                        >
                                            {availableBins.map(bin => (
                                                <option key={bin._id} value={bin._id}>
                                                    {bin.name} ({bin.binType})
                                                </option>
                                            ))}
                                        </Select>
                                        {poDataLoading && (
                                            <InputRightElement>
                                                <Spinner size="sm" />
                                            </InputRightElement>
                                        )}
                                    </InputGroup>
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
                                    isDisabled={poDataLoading}
                                />
                            </FormControl>

                            {poDataLoading ? (
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
                                            <HStack>
                                                <Button size="sm" leftIcon={<FiCheck />} onClick={markSelectedAsReceived} isDisabled={selectedItemsKeys.length === 0}>
                                                    Mark Selected
                                                </Button>
                                                <Button size="sm" leftIcon={<FiX />} onClick={markSelectedAsNotReceived} isDisabled={selectedItemsKeys.length === 0}>
                                                    Clear Selected
                                                </Button>
                                            </HStack>
                                        </HStack>

                                        <Box overflowX="auto" maxW="100%">
                                            <DataTable
                                                columns={columns}
                                                data={items}
                                                loading={false}
                                                onSelectionChange={handleSelectionChange}
                                                actionType='GoodsReceipt'
                                            />
                                        </Box>

                                        <Text fontSize="sm" color="gray.500" mt={2}>
                                            Expiry dates can be added after receiving items.
                                        </Text>
                                    </Box>
                                </>
                            )}
                        </VStack>
                    </ModalBody>

                    <ModalFooter
                        bg={useColorModeValue('gray.50', 'gray.800')}
                        borderBottomRadius="xl"
                        position="sticky"
                        bottom={0}
                        zIndex={10}
                    >
                        <Button
                            colorScheme="gray"
                            mr={3}
                            onClick={onClose}
                            isDisabled={loading || poDataLoading}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
                            onClick={handleSave}
                            isLoading={loading}
                            isDisabled={!selectedPO || items.length === 0 || poDataLoading || !selectedBin}
                        >
                            Save Receipt
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

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