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
    GridItem
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiSearch } from 'react-icons/fi';
import BinSelectorModal from './BinSelectorModal';
import StockItemSelectorModal from './StockItemSelectorModal';
import { nanoid } from 'nanoid';

// Enhanced DispatchedItem interface to include the full stock item details and a unique key
interface DispatchedItem {
    _key: string;
    stockItem: {
        _id: string;
        name: string;
        sku?: string;
        unitOfMeasure?: string;
        currentStock?: number;
    };
    dispatchedQuantity: number;
    totalCost?: number;
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

interface Dispatch {
    _id: string;
    dispatchNumber: string;
    dispatchDate: string;
    status: string;
    sourceBin: Bin;
    destinationSite: Site;
    items: DispatchedItem[];
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

interface DispatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    dispatch: Dispatch | null;
    onSave: () => void;
}

export default function DispatchModal({ isOpen, onClose, dispatch, onSave }: DispatchModalProps) {
    const [dispatchNumber, setDispatchNumber] = useState('');
    const [dispatchDate, setDispatchDate] = useState('');
    const [status, setStatus] = useState('pending');
    const [sourceBin, setSourceBin] = useState<Bin | null>(null);
    const [destinationSite, setDestinationSite] = useState<Site | null>(null);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<DispatchedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [sites, setSites] = useState<Site[]>([]);
    const [isBinModalOpen, setIsBinModalOpen] = useState(false);
    const toast = useToast();

    const [isStockItemModalOpen, setIsStockItemModalOpen] = useState(false);
    const [currentEditingItemIndex, setCurrentEditingItemIndex] = useState<number | null>(null);
    const [stockItemsCache, setStockItemsCache] = useState<Map<string, StockItem>>(new Map());
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Fetch sites on component mount
    useEffect(() => {
        const fetchSites = async () => {
            try {
                const response = await fetch('/api/sites');
                if (response.ok) {
                    const data = await response.json();
                    setSites(data);
                }
            } catch (error) {
                console.error('Failed to fetch sites:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load sites. Please try again.',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
        };

        fetchSites();
    }, [toast]);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setIsInitialLoading(true);
            const initializeForm = async () => {
                if (dispatch) {
                    // Edit mode
                    setDispatchNumber(dispatch.dispatchNumber || '');
                    setDispatchDate(dispatch.dispatchDate.split('T')[0] || '');
                    setStatus(dispatch.status || 'pending');
                    setSourceBin(dispatch.sourceBin || null);
                    setDestinationSite(dispatch.destinationSite || null);
                    setNotes(dispatch.notes || '');

                    // Update the initialItems mapping to ensure _key exists
                    const initialItems = dispatch.items.map((item) => ({
                        _key: item._key || nanoid(),
                        stockItem: {
                            _id: item.stockItem._id,
                            name: item.stockItem.name || '',
                            sku: item.stockItem.sku || '',
                            unitOfMeasure: '',
                            currentStock: 0
                        },
                        dispatchedQuantity: item.dispatchedQuantity,
                        totalCost: item.totalCost || 0,
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

                    dispatch.items.forEach(item => {
                        if (item.stockItem._id) {
                            fetchItemDetails(item.stockItem._id);
                        }
                    });

                } else {
                    // Create mode
                    const fetchDispatchNumber = async () => {
                        try {
                            const res = await fetch('/api/dispatches/next-number');
                            if (res.ok) {
                                const { dispatchNumber: newNumber } = await res.json();
                                setDispatchNumber(newNumber);
                            } else {
                                throw new Error('Failed to fetch dispatch number');
                            }
                        } catch (error) {
                            toast({
                                title: 'Error',
                                description: 'Failed to get a new dispatch number. Please try again.',
                                status: 'error',
                                duration: 5000,
                                isClosable: true,
                            });
                            console.error('Failed to get new dispatch number:', error);
                        }
                    };

                    fetchDispatchNumber();
                    setDispatchDate(new Date().toISOString().split('T')[0]);
                    setStatus('pending');
                    setSourceBin(null);
                    setDestinationSite(null);
                    setNotes('');
                    setItems([]);
                }
                setIsInitialLoading(false);
            };

            initializeForm();
        }
    }, [isOpen, dispatch, stockItemsCache, toast]);

    const handleAddItem = () => {
        const newItem = {
            _key: nanoid(),
            stockItem: {
                _id: '',
                name: 'Select a stock item',
                sku: '',
                unitOfMeasure: '',
                currentStock: 0
            },
            dispatchedQuantity: 0,
            totalCost: 0
        };
        setItems(prevItems => [...prevItems, newItem]);
        setCurrentEditingItemIndex(items.length);
        setIsStockItemModalOpen(true);
    };

    const handleRemoveItem = (key: string) => {
        setItems(prevItems => prevItems.filter(item => item._key !== key));
    };

    const handleItemChange = (key: string, field: keyof DispatchedItem, value: any) => {
        setItems(prevItems => prevItems.map(item =>
            item._key === key ? { ...item, [field]: value } : item
        ));
    };

    const handleBinSelect = (bin: Bin) => {
        setSourceBin(bin);
        setIsBinModalOpen(false);
    };

    const handleStockItemSelect = (item: StockItem) => {
        if (currentEditingItemIndex !== null) {
            setItems(prevItems => prevItems.map((prevItem, index) =>
                index === currentEditingItemIndex ?
                    {
                        ...prevItem,
                        stockItem: {
                            _id: item._id,
                            name: item.name,
                            sku: item.sku,
                            unitOfMeasure: item.unitOfMeasure,
                            currentStock: item.currentStock || 0
                        }
                    }
                    : prevItem
            ));
            setStockItemsCache(prev => new Map(prev).set(item._id, item));
        }
        setIsStockItemModalOpen(false);
    };

    const openStockItemModal = (index: number) => {
        setCurrentEditingItemIndex(index);
        setIsStockItemModalOpen(true);
    };

    const validateForm = () => {
        if (!sourceBin) {
            toast({
                title: 'Error',
                description: 'Please select a source bin',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        if (!destinationSite) {
            toast({
                title: 'Error',
                description: 'Please select a destination site',
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

            if (item.dispatchedQuantity <= 0) {
                toast({
                    title: 'Error',
                    description: `Please enter a valid quantity for ${item.stockItem.name}`,
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                return false;
            }

            // Check if dispatched quantity exceeds available stock
            if (item.stockItem.currentStock !== undefined &&
                item.dispatchedQuantity > item.stockItem.currentStock) {
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);

        try {
            const url = dispatch ? `/api/dispatches/${dispatch._id}` : '/api/dispatches';
            const method = dispatch ? 'PATCH' : 'POST';

            const itemsForApi = items.map(item => ({
                stockItem: item.stockItem._id,
                dispatchedQuantity: item.dispatchedQuantity,
                totalCost: item.totalCost || 0,
            }));

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dispatchNumber,
                    dispatchDate,
                    status,
                    sourceBin: sourceBin?._id,
                    destinationSite: destinationSite?._id,
                    notes: notes || undefined,
                    items: itemsForApi,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save dispatch');
            }

            toast({
                title: dispatch ? 'Dispatch updated.' : 'Dispatch created.',
                description: `Dispatch "${dispatchNumber}" has been successfully saved.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save dispatch. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const existingItemIds = items.map(item => item.stockItem._id).filter(id => id);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="6xl" closeOnOverlayClick={!loading}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{dispatch ? 'Edit Dispatch' : 'Create Dispatch'}</ModalHeader>
                    <ModalCloseButton isDisabled={loading} />
                    {isInitialLoading ? (
                        <ModalBody display="flex" justifyContent="center" alignItems="center" height="200px">
                            <VStack>
                                <Spinner size="xl" />
                                <Text mt={4}>Loading dispatch data...</Text>
                            </VStack>
                        </ModalBody>
                    ) : (
                        <form onSubmit={handleSave}>
                            <ModalBody pb={6}>
                                <VStack spacing={4} align="stretch">
                                    <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                                        <FormControl isRequired>
                                            <FormLabel>Dispatch Number</FormLabel>
                                            {dispatch ? (
                                                <Text
                                                    p={3}
                                                    borderRadius="md"
                                                    bg="gray.100"
                                                    fontWeight="bold"
                                                    _dark={{ bg: 'gray.700' }}
                                                >
                                                    {dispatchNumber}
                                                </Text>
                                            ) : (
                                                <Input
                                                    value={dispatchNumber}
                                                    onChange={(e) => setDispatchNumber(e.target.value)}
                                                    placeholder="e.g., DISP-001"
                                                    isReadOnly
                                                />
                                            )}
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>Dispatch Date</FormLabel>
                                            <Input
                                                type="date"
                                                value={dispatchDate}
                                                onChange={(e) => setDispatchDate(e.target.value)}
                                                isDisabled={loading}
                                            />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>Status</FormLabel>
                                            <Select
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value)}
                                                isDisabled={loading}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                        <FormControl isRequired>
                                            <FormLabel>Source Bin</FormLabel>
                                            <Input
                                                value={sourceBin ? `${sourceBin.name} (${sourceBin.site.name})` : ''}
                                                placeholder="Select a bin"
                                                readOnly
                                                onClick={() => setIsBinModalOpen(true)}
                                                cursor="pointer"
                                                isDisabled={loading}
                                            />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>Destination Site</FormLabel>
                                            <Select
                                                value={destinationSite?._id || ''}
                                                onChange={(e) => {
                                                    const site = sites.find(s => s._id === e.target.value);
                                                    setDestinationSite(site || null);
                                                }}
                                                placeholder="Select destination site"
                                                isDisabled={loading}
                                            >
                                                {sites.map(site => (
                                                    <option key={site._id} value={site._id}>
                                                        {site.name}
                                                    </option>
                                                ))}
                                            </Select>
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

                                    <Text fontSize="lg" fontWeight="bold">Dispatched Items</Text>

                                    {items.length === 0 ? (
                                        <Text color="gray.500" fontStyle="italic" textAlign="center" py={4}>
                                            No items added yet. Click "Add Item" to get started.
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
                                                        <Grid templateColumns="repeat(3, 1fr)" gap={3}>
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
                                                                    value={item.dispatchedQuantity}
                                                                    onChange={(valStr, valNum) => handleItemChange(item._key, 'dispatchedQuantity', valNum)}
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
                                                            <FormControl>
                                                                <FormLabel>Total Cost</FormLabel>
                                                                <NumberInput
                                                                    value={item.totalCost || 0}
                                                                    onChange={(valStr, valNum) => handleItemChange(item._key, 'totalCost', valNum)}
                                                                    min={0}
                                                                    step={0.01}
                                                                    precision={2}
                                                                    isDisabled={loading}
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
                                        isDisabled={loading}
                                    >
                                        Add Item
                                    </Button>
                                </VStack>
                            </ModalBody>

                            <ModalFooter>
                                <Button colorScheme="gray" mr={3} onClick={onClose} isDisabled={loading}>
                                    Cancel
                                </Button>
                                <Button colorScheme="blue" type="submit" isLoading={loading}>
                                    {dispatch ? 'Update Dispatch' : 'Create Dispatch'}
                                </Button>
                            </ModalFooter>
                        </form>
                    )}
                </ModalContent>
            </Modal>

            <BinSelectorModal
                isOpen={isBinModalOpen}
                onClose={() => setIsBinModalOpen(false)}
                onSelect={handleBinSelect}
            />

            <StockItemSelectorModal
                isOpen={isStockItemModalOpen}
                onClose={() => setIsStockItemModalOpen(false)}
                onSelect={handleStockItemSelect}
                existingItemIds={existingItemIds}
            />
        </>
    );
}