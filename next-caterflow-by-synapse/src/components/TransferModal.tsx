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
    IconButton,
    Text,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Box,
    Flex,
    Icon,
    Spinner,
    Grid,
    GridItem,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiSearch, FiCheckCircle, FiSave } from 'react-icons/fi';
import BinSelectorModal from './BinSelectorModal';
import StockItemSelectorModal from './StockItemSelectorModal';
import { nanoid } from 'nanoid';

interface TransferredItem {
    _key: string;
    stockItem: {
        _id: string;
        name: string;
        sku?: string;
        unitOfMeasure?: string;
        currentStock?: number;
    };
    transferredQuantity: number;
}

interface Site {
    _id: string;
    name: string;
}

interface Bin {
    _id: string;
    name: string;
    site: Site;
}

interface Transfer {
    _id: string;
    transferNumber: string;
    transferDate: string;
    status: string;
    fromBin: Bin | string;
    toBin: Bin | string;
    items: TransferredItem[];
    notes?: string;
}

interface StockItem {
    _id: string;
    name: string;
    sku: string;
    unitOfMeasure: string;
    itemType: 'food' | 'nonFood';
    currentStock?: number;
}

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    transfer: Transfer | null;
    onSave: () => void;
}

// Helper function to get bin name
const getBinName = (bin: Bin | string): string => {
    if (typeof bin === 'object') {
        return `${bin.name} (${bin.site.name})`;
    }
    return bin;
};

// Helper function to get bin ID
const getBinId = (bin: Bin | string): string => {
    if (typeof bin === 'object') {
        return bin._id;
    }
    return bin;
};

export default function TransferModal({ isOpen, onClose, transfer, onSave }: TransferModalProps) {
    const [transferNumber, setTransferNumber] = useState('');
    const [transferDate, setTransferDate] = useState('');
    const [status, setStatus] = useState('pending');
    const [fromBin, setFromBin] = useState<Bin | null>(null);
    const [toBin, setToBin] = useState<Bin | null>(null);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<TransferredItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFromBinModalOpen, setIsFromBinModalOpen] = useState(false);
    const [isToBinModalOpen, setIsToBinModalOpen] = useState(false);
    const toast = useToast();

    const [isStockItemModalOpen, setIsStockItemModalOpen] = useState(false);
    const [currentEditingItemIndex, setCurrentEditingItemIndex] = useState<number | null>(null);
    const [stockItemsCache, setStockItemsCache] = useState<Map<string, StockItem>>(new Map());
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [availableBins, setAvailableBins] = useState<Bin[]>([]);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const cancelRef = useRef<HTMLButtonElement>(null);

    // Fetch bins on component mount
    useEffect(() => {
        const fetchBins = async () => {
            try {
                const response = await fetch('/api/bins');
                if (response.ok) {
                    const data = await response.json();
                    setAvailableBins(data);
                }
            } catch (error) {
                console.error('Failed to fetch bins:', error);
            }
        };

        fetchBins();
    }, []);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setIsInitialLoading(true);
            const initializeForm = async () => {
                if (transfer) {
                    // Edit mode
                    setTransferNumber(transfer.transferNumber || '');
                    setTransferDate(transfer.transferDate.split('T')[0] || '');
                    setStatus(transfer.status || 'pending');

                    // Handle both string and object types for bins
                    const fromBinId = getBinId(transfer.fromBin);
                    const toBinId = getBinId(transfer.toBin);

                    // Find bin objects from available bins
                    const fromBinObj = availableBins.find(bin => bin._id === fromBinId);
                    const toBinObj = availableBins.find(bin => bin._id === toBinId);

                    setFromBin(fromBinObj || null);
                    setToBin(toBinObj || null);

                    setNotes(transfer.notes || '');

                    // Update the initialItems mapping to ensure _key exists
                    const initialItems = transfer.items.map((item) => ({
                        _key: item._key || nanoid(),
                        stockItem: {
                            _id: item.stockItem._id,
                            name: item.stockItem.name || '',
                            sku: item.stockItem.sku || '',
                            unitOfMeasure: '',
                            currentStock: 0
                        },
                        transferredQuantity: item.transferredQuantity,
                    }));
                    setItems(initialItems);

                    // Fetch details for each stock item
                    const fetchItemDetails = async (itemId: string) => {
                        if (!stockItemsCache.has(itemId)) {
                            try {
                                const res = await fetch(`/api/stock-items/${itemId}`);
                                if (res.ok) {
                                    const itemData: StockItem = await res.json();
                                    setStockItemsCache(prev => new Map(prev).set(itemId, itemData));
                                    setItems(prevItems => prevItems.map(item =>
                                        item.stockItem._id === itemId ?
                                            {
                                                ...item,
                                                stockItem: {
                                                    _id: itemData._id,
                                                    name: itemData.name,
                                                    sku: itemData.sku,
                                                    unitOfMeasure: itemData.unitOfMeasure,
                                                    currentStock: itemData.currentStock || 0
                                                }
                                            } :
                                            item
                                    ));
                                }
                            } catch (error) {
                                console.error(`Failed to fetch stock item ${itemId}`, error);
                            }
                        }
                    };

                    transfer.items.forEach(item => {
                        if (item.stockItem._id) {
                            fetchItemDetails(item.stockItem._id);
                        }
                    });

                } else {
                    // Create mode
                    const fetchTransferNumber = async () => {
                        try {
                            const res = await fetch('/api/transfers/next-number');
                            if (res.ok) {
                                const { transferNumber: newNumber } = await res.json();
                                setTransferNumber(newNumber);
                            } else {
                                throw new Error('Failed to fetch transfer number');
                            }
                        } catch (error) {
                            toast({
                                title: 'Error',
                                description: 'Failed to get a new transfer number. Please try again.',
                                status: 'error',
                                duration: 5000,
                                isClosable: true,
                            });
                            console.error('Failed to get new transfer number:', error);
                        }
                    };

                    fetchTransferNumber();
                    setTransferDate(new Date().toISOString().split('T')[0]);
                    setStatus('pending');
                    setFromBin(null);
                    setToBin(null);
                    setNotes('');
                    setItems([]);
                }
                setIsInitialLoading(false);
            };

            initializeForm();
        }
    }, [isOpen, transfer, stockItemsCache, toast, availableBins]);

    // Replace the existing useEffect hook in TransferModal.tsx
    useEffect(() => {
        if (isOpen) {
            setIsInitialLoading(true);
            const initializeForm = async () => {
                if (transfer) {
                    // Edit mode
                    setTransferNumber(transfer.transferNumber || '');
                    setTransferDate(transfer.transferDate.split('T')[0] || '');
                    setStatus(transfer.status || 'pending');

                    // Handle both string and object types for bins
                    const fromBinId = getBinId(transfer.fromBin);
                    const toBinId = getBinId(transfer.toBin);

                    const fromBinObj = availableBins.find(bin => bin._id === fromBinId);
                    const toBinObj = availableBins.find(bin => bin._id === toBinId);

                    setFromBin(fromBinObj || null);
                    setToBin(toBinObj || null);

                    setNotes(transfer.notes || '');

                    const initialItems = transfer.items.map((item) => ({
                        _key: item._key || nanoid(),
                        stockItem: {
                            _id: item.stockItem._id,
                            name: item.stockItem.name || '',
                            sku: item.stockItem.sku || '',
                            unitOfMeasure: '',
                            currentStock: 0
                        },
                        transferredQuantity: item.transferredQuantity,
                    }));
                    setItems(initialItems);

                    const fetchItemDetails = async (itemId: string) => {
                        if (!stockItemsCache.has(itemId)) {
                            try {
                                const res = await fetch(`/api/stock-items/${itemId}`);
                                if (res.ok) {
                                    const itemData: StockItem = await res.json();
                                    setStockItemsCache(prev => new Map(prev).set(itemId, itemData));
                                    setItems(prevItems => prevItems.map(item =>
                                        item.stockItem._id === itemId ?
                                            {
                                                ...item,
                                                stockItem: {
                                                    _id: itemData._id,
                                                    name: itemData.name,
                                                    sku: itemData.sku,
                                                    unitOfMeasure: itemData.unitOfMeasure,
                                                    currentStock: itemData.currentStock || 0
                                                }
                                            } :
                                            item
                                    ));
                                }
                            } catch (error) {
                                console.error(`Failed to fetch stock item ${itemId}`, error);
                            }
                        }
                    };

                    transfer.items.forEach(item => {
                        if (item.stockItem._id) {
                            fetchItemDetails(item.stockItem._id);
                        }
                    });

                } else {
                    // Create mode - Use the new API endpoint
                    const fetchTransferNumber = async () => {
                        try {
                            const res = await fetch('/api/transfers/next-number');
                            if (res.ok) {
                                const { transferNumber: newNumber } = await res.json();
                                setTransferNumber(newNumber);
                            } else {
                                throw new Error('Failed to fetch transfer number');
                            }
                        } catch (error) {
                            toast({
                                title: 'Error',
                                description: 'Failed to get a new transfer number. Please try again.',
                                status: 'error',
                                duration: 5000,
                                isClosable: true,
                            });
                            console.error('Failed to get new transfer number:', error);
                        }
                    };

                    fetchTransferNumber();
                    setTransferDate(new Date().toISOString().split('T')[0]);
                    setStatus('pending');
                    setFromBin(null);
                    setToBin(null);
                    setNotes('');
                    setItems([]);
                }
                setIsInitialLoading(false);
            };
            initializeForm();
        }
    }, [isOpen, transfer, stockItemsCache, toast, availableBins]);

    const handleAddItem = () => {
        if (!fromBin) {
            toast({
                title: 'Select From Bin First',
                description: 'Please select a from bin before adding items.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        const newItem = {
            _key: nanoid(),
            stockItem: {
                _id: '',
                name: 'Select a stock item',
                sku: '',
                unitOfMeasure: '',
                currentStock: 0
            },
            transferredQuantity: 0,
        };
        setItems(prevItems => [...prevItems, newItem]);
        setCurrentEditingItemIndex(items.length);
        setIsStockItemModalOpen(true);
    };

    const handleRemoveItem = (key: string) => {
        setItems(prevItems => prevItems.filter(item => item._key !== key));
    };

    const handleItemChange = (key: string, field: keyof TransferredItem, value: any) => {
        setItems(prevItems => prevItems.map(item =>
            item._key === key ? { ...item, [field]: value } : item
        ));
    };

    const handleFromBinSelect = (bin: Bin) => {
        setFromBin(bin);
        setIsFromBinModalOpen(false);
    };

    const handleToBinSelect = (bin: Bin) => {
        setToBin(bin);
        setIsToBinModalOpen(false);
    };

    const handleStockItemSelect = async (item: StockItem) => {
        if (currentEditingItemIndex !== null) {
            // Fetch current stock for this item in the from bin
            let currentStock = 0;
            if (fromBin) {
                try {
                    const response = await fetch(`/api/stock-items/${item._id}/in-bin/${fromBin._id}`);
                    if (response.ok) {
                        const { inStock } = await response.json();
                        currentStock = inStock || 0;
                    }
                } catch (error) {
                    console.error('Failed to fetch current stock:', error);
                }
            }

            setItems(prevItems => prevItems.map((prevItem, index) =>
                index === currentEditingItemIndex ?
                    {
                        ...prevItem,
                        stockItem: {
                            _id: item._id,
                            name: item.name,
                            sku: item.sku,
                            unitOfMeasure: item.unitOfMeasure,
                            currentStock: currentStock
                        }
                    }
                    : prevItem
            ));
            setStockItemsCache(prev => new Map(prev).set(item._id, item));
        }
        setIsStockItemModalOpen(false);
    };

    const openStockItemModal = (index: number) => {
        if (!fromBin) {
            toast({
                title: 'Select From Bin First',
                description: 'Please select a from bin before selecting items.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        setCurrentEditingItemIndex(index);
        setIsStockItemModalOpen(true);
    };

    const validateForm = () => {
        if (!fromBin) {
            toast({
                title: 'Error',
                description: 'Please select a from bin',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        if (!toBin) {
            toast({
                title: 'Error',
                description: 'Please select a to bin',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        if (fromBin._id === toBin._id) {
            toast({
                title: 'Error',
                description: 'From bin and to bin cannot be the same',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        if (items.length === 0) {
            toast({
                title: 'Error',
                description: 'Please add at least one item',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        for (const item of items) {
            if (!item.stockItem._id) {
                toast({
                    title: 'Error',
                    description: 'Please select a stock item for all entries',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                return false;
            }

            if (item.transferredQuantity <= 0) {
                toast({
                    title: 'Error',
                    description: `Please enter a valid quantity for ${item.stockItem.name}`,
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                return false;
            }

            // Check if transferred quantity exceeds available stock
            if (item.stockItem.currentStock !== undefined &&
                item.transferredQuantity > item.stockItem.currentStock) {
                toast({
                    title: 'Insufficient Stock',
                    description: `Not enough stock available for ${item.stockItem.name}. Available: ${item.stockItem.currentStock}`,
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
                return false;
            }
        }

        return true;
    };

    const handleSave = async (finalStatus?: string) => {
        if (!fromBin || !toBin) {
            toast({
                title: 'Missing Bins',
                description: 'Please select both a "From Bin" and a "To Bin" before saving.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (items.length === 0) {
            toast({
                title: 'No Items',
                description: 'Please add at least one item to the transfer.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);

        try {
            const url = transfer ? `/api/transfers` : '/api/transfers';
            const method = transfer ? 'PATCH' : 'POST';

            const itemsForApi = items.map(item => ({
                _key: item._key,
                stockItem: { _id: item.stockItem._id },
                transferredQuantity: item.transferredQuantity,
            }));

            const payload = {
                ...(transfer?._id && { _id: transfer._id }), // Add _id for PATCH requests
                transferNumber,
                transferDate,
                status: finalStatus || status,
                fromBin: fromBin._id,
                toBin: toBin._id,
                notes: notes || undefined,
                items: itemsForApi,
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save transfer');
            }

            toast({
                title: transfer ? 'Transfer updated.' : 'Transfer created.',
                description: `Transfer "${transferNumber}" has been successfully saved.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save transfer. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
            setIsConfirmOpen(false);
        }
    };

    const handleComplete = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsConfirmOpen(true);
    };

    const existingItemIds = items.map(item => item.stockItem._id).filter(id => id);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="6xl" closeOnOverlayClick={!loading}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{transfer ? 'Edit Transfer' : 'Create Transfer'}</ModalHeader>
                    <ModalCloseButton isDisabled={loading} />
                    {isInitialLoading ? (
                        <ModalBody display="flex" justifyContent="center" alignItems="center" height="200px">
                            <VStack>
                                <Spinner size="xl" />
                                <Text mt={4}>Loading transfer data...</Text>
                            </VStack>
                        </ModalBody>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                            <ModalBody pb={6}>
                                <VStack spacing={4} align="stretch">
                                    <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                                        <FormControl isRequired>
                                            <FormLabel>Transfer Number</FormLabel>
                                            {transfer ? (
                                                <Text
                                                    p={3}
                                                    borderRadius="md"
                                                    bg="gray.100"
                                                    fontWeight="bold"
                                                    _dark={{ bg: 'gray.700' }}
                                                >
                                                    {transferNumber}
                                                </Text>
                                            ) : (
                                                <Input
                                                    value={transferNumber}
                                                    onChange={(e) => setTransferNumber(e.target.value)}
                                                    placeholder="e.g., TRF-001"
                                                    isReadOnly
                                                />
                                            )}
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>Transfer Date</FormLabel>
                                            <Input
                                                type="date"
                                                value={transferDate}
                                                onChange={(e) => setTransferDate(e.target.value)}
                                                isDisabled={loading}
                                            />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>Status</FormLabel>
                                            <Select
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value)}
                                                isDisabled={loading || !!transfer}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                        <FormControl isRequired>
                                            <FormLabel>From Bin</FormLabel>
                                            <Input
                                                value={fromBin ? `${fromBin.name} (${fromBin.site.name})` : ''}
                                                placeholder="Select a bin"
                                                readOnly
                                                onClick={() => setIsFromBinModalOpen(true)}
                                                cursor="pointer"
                                                isDisabled={loading}
                                            />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>To Bin</FormLabel>
                                            <Input
                                                value={toBin ? `${toBin.name} (${toBin.site.name})` : ''}
                                                placeholder="Select a bin"
                                                readOnly
                                                onClick={() => setIsToBinModalOpen(true)}
                                                cursor="pointer"
                                                isDisabled={loading}
                                            />
                                        </FormControl>
                                    </Grid>

                                    <FormControl>
                                        <FormLabel>Notes</FormLabel>
                                        <Input
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Additional notes or comments"
                                            isDisabled={loading}
                                        />
                                    </FormControl>

                                    <Text fontSize="lg" fontWeight="bold">Transferred Items</Text>

                                    {items.length === 0 ? (
                                        <Text color="gray.500" fontStyle="italic" textAlign="center" py={4}>
                                            {fromBin ? 'No items added yet. Click "Add Item" to get started.' : 'Please select a from bin first to add items.'}
                                        </Text>
                                    ) : (
                                        <Grid templateColumns="1fr" gap={3}>
                                            {items.map((item, index) => (
                                                <GridItem
                                                    key={item._key}
                                                    p={3}
                                                    borderWidth="1px"
                                                    borderRadius="md"
                                                    borderColor="gray.200"
                                                    _dark={{ borderColor: "gray.600" }}
                                                >
                                                    <Grid templateColumns="1fr auto" gap={2} alignItems="center">
                                                        <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                                            <FormControl isRequired>
                                                                <FormLabel>Stock Item</FormLabel>
                                                                <Button
                                                                    variant="outline"
                                                                    justifyContent="space-between"
                                                                    onClick={() => openStockItemModal(index)}
                                                                    px={3}
                                                                    h={10}
                                                                    width="100%"
                                                                    textAlign="left"
                                                                    isDisabled={loading}
                                                                    rightIcon={<Icon as={FiSearch} color="gray.500" />}
                                                                >
                                                                    <Flex justify="space-between" align="center" h="100%">
                                                                        {item.stockItem.name && item.stockItem.name !== 'Select a stock item' ? (
                                                                            <VStack align="start" spacing={0}>
                                                                                <Text fontSize="sm" fontWeight="medium">{item.stockItem.name}</Text>
                                                                                {item.stockItem.sku && (
                                                                                    <Text fontSize="xs" color="gray.500">SKU: {item.stockItem.sku}</Text>
                                                                                )}
                                                                                {item.stockItem.currentStock !== undefined && (
                                                                                    <Text fontSize="xs" color="gray.500">
                                                                                        Available: {item.stockItem.currentStock} {item.stockItem.unitOfMeasure}
                                                                                    </Text>
                                                                                )}
                                                                            </VStack>
                                                                        ) : (
                                                                            <Text color="gray.500">Select a stock item</Text>
                                                                        )}
                                                                        <Icon as={FiSearch} color="gray.500" />
                                                                    </Flex>
                                                                </Button>
                                                            </FormControl>
                                                            <FormControl isRequired>
                                                                <FormLabel>Quantity</FormLabel>
                                                                <NumberInput
                                                                    value={item.transferredQuantity}
                                                                    onChange={(valStr, valNum) => handleItemChange(item._key, 'transferredQuantity', valNum)}
                                                                    min={0}
                                                                    max={item.stockItem.currentStock || undefined}
                                                                    isDisabled={loading || !item.stockItem._id}
                                                                >
                                                                    <NumberInputField />
                                                                    <NumberInputStepper>
                                                                        <NumberIncrementStepper />
                                                                        <NumberDecrementStepper />
                                                                    </NumberInputStepper>
                                                                </NumberInput>
                                                            </FormControl>
                                                        </Grid>
                                                        <IconButton
                                                            aria-label="Remove item"
                                                            icon={<FiTrash2 />}
                                                            colorScheme="red"
                                                            onClick={() => handleRemoveItem(item._key)}
                                                            isDisabled={loading}
                                                            mt={6}
                                                        />
                                                    </Grid>
                                                </GridItem>
                                            ))}
                                        </Grid>
                                    )}

                                    <Button
                                        leftIcon={<FiPlus />}
                                        onClick={handleAddItem}
                                        alignSelf="start"
                                        isDisabled={loading || !fromBin}
                                    >
                                        Add Item
                                    </Button>
                                </VStack>
                            </ModalBody>

                            <ModalFooter>
                                <Button colorScheme="gray" mr={3} onClick={onClose} isDisabled={loading}>
                                    Cancel
                                </Button>
                                <Button colorScheme="blue" type="submit" isLoading={loading} leftIcon={<FiSave />}>
                                    {transfer ? 'Save Changes' : 'Create Transfer'}
                                </Button>
                                {transfer && transfer.status === 'pending' && (
                                    <Button
                                        colorScheme="green"
                                        onClick={handleComplete}
                                        isLoading={loading}
                                        ml={3}
                                        leftIcon={<FiCheckCircle />}
                                    >
                                        Complete Transfer
                                    </Button>
                                )}
                            </ModalFooter>
                        </form>
                    )}
                </ModalContent>
            </Modal>

            <BinSelectorModal
                isOpen={isFromBinModalOpen}
                onClose={() => setIsFromBinModalOpen(false)}
                onSelect={handleFromBinSelect}
            />

            <BinSelectorModal
                isOpen={isToBinModalOpen}
                onClose={() => setIsToBinModalOpen(false)}
                onSelect={handleToBinSelect}
            />

            <StockItemSelectorModal
                isOpen={isStockItemModalOpen}
                onClose={() => setIsStockItemModalOpen(false)}
                onSelect={handleStockItemSelect}
                existingItemIds={existingItemIds}
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
                            Confirm Complete Transfer
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure you want to mark this transfer as complete? This action cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setIsConfirmOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="green"
                                onClick={() => handleSave('completed')}
                                ml={3}
                                isLoading={loading}
                            >
                                Confirm Complete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </>
    );
}