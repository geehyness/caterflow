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
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiSearch } from 'react-icons/fi';
import BinSelectorModal from './BinSelectorModal';
import StockItemSelectorModal from './StockItemSelectorModal';

interface DispatchedItem {
    stockItem: string;
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

// Fixed StockItem interface - removed categoryId to match StockItemSelectorModal
interface StockItem {
    _id: string;
    name: string;
    sku: string;
    unitOfMeasure: string;
    itemType: 'food' | 'nonFood';
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
    const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
    const [stockItemsCache, setStockItemsCache] = useState<Map<string, StockItem>>(new Map());

    useEffect(() => {
        if (dispatch) {
            setDispatchNumber(dispatch.dispatchNumber || '');
            setDispatchDate(dispatch.dispatchDate || '');
            setStatus(dispatch.status || 'pending');
            setSourceBin(dispatch.sourceBin || null);
            setDestinationSite(dispatch.destinationSite || null);
            setNotes(dispatch.notes || '');
            setItems(dispatch.items || []);

            const fetchItemDetails = async (itemId: string) => {
                if (!stockItemsCache.has(itemId)) {
                    try {
                        const res = await fetch(`/api/stock-items/${itemId}`);
                        if (res.ok) {
                            const itemData: StockItem = await res.json();
                            setStockItemsCache(prev => new Map(prev).set(itemId, itemData));
                        }
                    } catch (error) {
                        console.error(`Failed to fetch stock item ${itemId}`, error);
                    }
                }
            };

            dispatch.items.forEach(item => {
                if (item.stockItem) {
                    fetchItemDetails(item.stockItem);
                }
            });

        } else {
            setDispatchNumber('');
            setDispatchDate(new Date().toISOString().split('T')[0]);
            setStatus('pending');
            setSourceBin(null);
            setDestinationSite(null);
            setNotes('');
            setItems([]);
        }

        fetchSites();
    }, [dispatch, stockItemsCache]);

    const fetchSites = async () => {
        try {
            const response = await fetch('/api/sites');
            if (response.ok) {
                const data = await response.json();
                setSites(data);
            }
        } catch (error) {
            console.error('Failed to fetch sites:', error);
        }
    };

    const handleAddItem = () => {
        setItems([...items, { stockItem: '', dispatchedQuantity: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof DispatchedItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleBinSelect = (bin: Bin) => {
        setSourceBin(bin);
        setIsBinModalOpen(false);
    };

    const openStockItemModal = (index: number) => {
        setCurrentItemIndex(index);
        setIsStockItemModalOpen(true);
    };

    const handleStockItemSelect = (item: StockItem) => {
        if (currentItemIndex !== null) {
            setStockItemsCache(prev => new Map(prev).set(item._id, item));
            handleItemChange(currentItemIndex, 'stockItem', item._id);
        }
        setIsStockItemModalOpen(false);
    };

    const getStockItemName = (id: string): string => {
        return stockItemsCache.get(id)?.name || id;
    };

    const getStockItemSKU = (id: string): string => {
        return stockItemsCache.get(id)?.sku || '';
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = '/api/dispatches';
            const method = dispatch ? 'PATCH' : 'POST';

            if (!sourceBin) throw new Error('Please select a source bin');
            if (!destinationSite) throw new Error('Please select a destination site');

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    _id: dispatch?._id,
                    dispatchNumber,
                    dispatchDate,
                    status,
                    sourceBin: sourceBin._id,
                    destinationSite: destinationSite._id,
                    notes: notes || undefined,
                    items,
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

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{dispatch ? 'Edit Dispatch' : 'Create Dispatch'}</ModalHeader>
                    <ModalCloseButton />
                    <form onSubmit={handleSave}>
                        <ModalBody pb={6}>
                            <VStack spacing={4} align="stretch">
                                <HStack>
                                    <FormControl isRequired>
                                        <FormLabel>Dispatch Number</FormLabel>
                                        <Input
                                            value={dispatchNumber}
                                            onChange={(e) => setDispatchNumber(e.target.value)}
                                            placeholder="e.g., DISP-001"
                                        />
                                    </FormControl>
                                    <FormControl isRequired>
                                        <FormLabel>Dispatch Date</FormLabel>
                                        <Input
                                            type="date"
                                            value={dispatchDate}
                                            onChange={(e) => setDispatchDate(e.target.value)}
                                        />
                                    </FormControl>
                                    <FormControl isRequired>
                                        <FormLabel>Status</FormLabel>
                                        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                                            <option value="pending">Pending</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </Select>
                                    </FormControl>
                                </HStack>

                                <HStack>
                                    <FormControl isRequired>
                                        <FormLabel>Source Bin</FormLabel>
                                        <Input
                                            value={sourceBin ? `${sourceBin.name} (${sourceBin.site.name})` : ''}
                                            placeholder="Select a bin"
                                            readOnly
                                            onClick={() => setIsBinModalOpen(true)}
                                            cursor="pointer"
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
                                        >
                                            {sites.map(site => (
                                                <option key={site._id} value={site._id}>
                                                    {site.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </HStack>

                                <FormControl>
                                    <FormLabel>Notes</FormLabel>
                                    <Input
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Additional notes or comments"
                                    />
                                </FormControl>

                                <Text fontSize="lg" fontWeight="bold">Dispatched Items</Text>
                                {items.map((item, index) => (
                                    <HStack key={index} align="flex-end" spacing={4}>
                                        <FormControl isRequired>
                                            <FormLabel>Stock Item</FormLabel>
                                            <Box
                                                as="button"
                                                type="button"
                                                onClick={() => openStockItemModal(index)}
                                                borderWidth="1px"
                                                borderColor="inherit"
                                                borderRadius="md"
                                                px={3}
                                                h={10}
                                                width="100%"
                                                textAlign="left"
                                            >
                                                <Flex justify="space-between" align="center" h="100%">
                                                    {item.stockItem ? (
                                                        <Text>
                                                            {getStockItemName(item.stockItem)} ({getStockItemSKU(item.stockItem)})
                                                        </Text>
                                                    ) : (
                                                        <Text color="gray.500">Select a stock item</Text>
                                                    )}
                                                    <Icon as={FiSearch} color="gray.500" />
                                                </Flex>
                                            </Box>
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>Quantity</FormLabel>
                                            <NumberInput
                                                value={item.dispatchedQuantity}
                                                onChange={(valStr, valNum) => handleItemChange(index, 'dispatchedQuantity', valNum)}
                                                min={0}
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
                                                onChange={(valStr, valNum) => handleItemChange(index, 'totalCost', valNum)}
                                                min={0}
                                                step={0.01}
                                                precision={2}
                                            >
                                                <NumberInputField />
                                                <NumberInputStepper>
                                                    <NumberIncrementStepper />
                                                    <NumberDecrementStepper />
                                                </NumberInputStepper>
                                            </NumberInput>
                                        </FormControl>
                                        <IconButton
                                            aria-label="Remove item"
                                            icon={<FiTrash2 />}
                                            colorScheme="red"
                                            onClick={() => handleRemoveItem(index)}
                                        />
                                    </HStack>
                                ))}
                                <Button leftIcon={<FiPlus />} onClick={handleAddItem} alignSelf="start">
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
            />
        </>
    );
}