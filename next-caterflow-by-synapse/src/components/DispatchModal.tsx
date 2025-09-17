import React, { useState, useEffect, useMemo } from 'react';
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
    sourceBin: Bin | null;
    destinationSite: Site | null;
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
    const [availableBins, setAvailableBins] = useState<Bin[]>([]);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const cancelRef = React.useRef<HTMLButtonElement>(null);

    // Memoize the existing item IDs like BinCountModal does
    const existingItemIds = useMemo(() => {
        return items.map(item => item.stockItem._id).filter(id => id !== '');
    }, [items]);

    // Fetch bins and sites on component mount
    useEffect(() => {
        const fetchBinsAndSites = async () => {
            try {
                const [binsResponse, sitesResponse] = await Promise.all([
                    fetch('/api/bins'),
                    fetch('/api/sites')
                ]);

                if (binsResponse.ok) {
                    const binsData = await binsResponse.json();
                    setAvailableBins(binsData);
                }

                if (sitesResponse.ok) {
                    const sitesData = await sitesResponse.json();
                    setSites(sitesData);
                }
            } catch (error) {
                console.error('Failed to fetch bins or sites:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load data. Please try again.',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
        };

        fetchBinsAndSites();
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

                    // Add null check for sourceBin
                    const sourceBinObj = dispatch.sourceBin
                        ? availableBins.find(bin => bin._id === dispatch.sourceBin!._id)
                        : null;
                    setSourceBin(sourceBinObj || null);

                    setDestinationSite(dispatch.destinationSite || null);
                    setNotes(dispatch.notes || '');

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
                    setDispatchNumber('New Dispatch');
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
    }, [isOpen, dispatch, stockItemsCache, toast, availableBins]);

    const handleBinSelect = (bin: Bin) => {
        setSourceBin(bin);
        setIsBinModalOpen(false);
    };

    const handleAddItem = () => {
        setItems([...items, { _key: nanoid(), stockItem: { _id: '', name: '' }, dispatchedQuantity: 0 }]);
    };

    const handleRemoveItem = (keyToRemove: string) => {
        setItems(items.filter(item => item._key !== keyToRemove));
    };

    const handleStockItemSelect = (stockItem: StockItem) => {
        if (currentEditingItemIndex !== null) {
            const updatedItems = [...items];
            const currentItem = updatedItems[currentEditingItemIndex];
            updatedItems[currentEditingItemIndex] = {
                ...currentItem,
                stockItem: {
                    _id: stockItem._id,
                    name: stockItem.name,
                    sku: stockItem.sku,
                    unitOfMeasure: stockItem.unitOfMeasure,
                    currentStock: stockItem.currentStock,
                },
            };
            setItems(updatedItems);
            setIsStockItemModalOpen(false);
            setCurrentEditingItemIndex(null);
        }
    };

    const handleQuantityChange = (key: string, value: number) => {
        setItems(items.map(item =>
            item._key === key ? { ...item, dispatchedQuantity: value } : item
        ));
    };

    const handleSave = async (finalStatus?: string) => {
        if (!sourceBin || !destinationSite) {
            toast({
                title: 'Missing Information',
                description: 'Please select both a Source Bin and a Destination Site.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (items.length === 0) {
            toast({
                title: 'No Items',
                description: 'Please add at least one item to the dispatch.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);

        const url = dispatch ? '/api/dispatches' : '/api/dispatches';
        const method = dispatch ? 'PATCH' : 'POST';

        const itemsForApi = items.map(item => ({
            _key: item._key,
            stockItem: { _id: item.stockItem._id },
            dispatchedQuantity: item.dispatchedQuantity,
            totalCost: item.totalCost,
        }));

        const payload = {
            ...(dispatch && { _id: dispatch._id }),
            dispatchDate,
            status: finalStatus || status,
            sourceBin: sourceBin._id,
            destinationSite: destinationSite._id,
            notes,
            items: itemsForApi,
        };

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save dispatch');
            }

            toast({
                title: dispatch ? 'Dispatch updated.' : 'Dispatch created.',
                description: `Dispatch has been successfully saved.`,
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
            setIsConfirmOpen(false);
        }
    };

    const handleClose = () => {
        onClose();
        // Reset all states
        setDispatchNumber('');
        setDispatchDate('');
        setStatus('pending');
        setSourceBin(null);
        setDestinationSite(null);
        setNotes('');
        setItems([]);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={handleClose} size="3xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{dispatch ? `Edit Dispatch ${dispatch.dispatchNumber}` : 'New Dispatch'}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {isInitialLoading && !dispatch ? (
                            <Flex justify="center" align="center" minH="200px">
                                <Spinner size="xl" />
                            </Flex>
                        ) : (
                            <VStack spacing={4}>
                                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} width="100%">
                                    <GridItem>
                                        <FormControl>
                                            <FormLabel>Dispatch Number</FormLabel>
                                            <Input value={dispatchNumber} isReadOnly />
                                        </FormControl>
                                    </GridItem>
                                    <GridItem>
                                        <FormControl>
                                            <FormLabel>Dispatch Date</FormLabel>
                                            <Input
                                                type="date"
                                                value={dispatchDate}
                                                onChange={(e) => setDispatchDate(e.target.value)}
                                                isReadOnly={!!dispatch}
                                            />
                                        </FormControl>
                                    </GridItem>
                                    <GridItem>
                                        <FormControl isRequired>
                                            <FormLabel>Source Bin</FormLabel>
                                            <Input
                                                value={sourceBin ? `${sourceBin.name} (${sourceBin.site.name})` : ''}
                                                isReadOnly
                                                placeholder="Select Source Bin"
                                                onClick={() => setIsBinModalOpen(true)}
                                            />
                                        </FormControl>
                                    </GridItem>
                                    <GridItem>
                                        <FormControl isRequired>
                                            <FormLabel>Destination Site</FormLabel>
                                            <Select
                                                placeholder="Select destination site"
                                                value={destinationSite?._id || ''}
                                                onChange={(e) => setDestinationSite(sites.find(s => s._id === e.target.value) || null)}
                                            >
                                                {sites.map(site => (
                                                    <option key={site._id} value={site._id}>{site.name}</option>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </GridItem>
                                </Grid>

                                <FormControl>
                                    <FormLabel>Notes</FormLabel>
                                    <Input
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add any relevant notes"
                                    />
                                </FormControl>

                                <Box width="100%">
                                    <HStack justifyContent="space-between" width="100%" mb={2}>
                                        <Text fontWeight="bold">Items</Text>
                                        <Button
                                            leftIcon={<FiPlus />}
                                            size="sm"
                                            onClick={handleAddItem}
                                            colorScheme="purple"
                                        >
                                            Add Item
                                        </Button>
                                    </HStack>
                                    <VStack spacing={3} align="stretch">
                                        {items.map((item, index) => (
                                            <HStack key={item._key} p={3} borderWidth="1px" borderRadius="md" bg="gray.50" _dark={{ bg: 'gray.700' }} spacing={4} align="center">
                                                <Box flex="1">
                                                    <Text fontWeight="semibold">{item.stockItem.name || 'Select a Stock Item'}</Text>
                                                    <Text fontSize="sm" color="gray.500">{item.stockItem.sku}</Text>
                                                </Box>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setCurrentEditingItemIndex(index);
                                                        setIsStockItemModalOpen(true);
                                                    }}
                                                    leftIcon={<FiSearch />}
                                                >
                                                    Select
                                                </Button>
                                                <FormControl width="120px">
                                                    <NumberInput
                                                        min={0}
                                                        value={item.dispatchedQuantity}
                                                        onChange={(valueAsString, valueAsNumber) => handleQuantityChange(item._key, valueAsNumber)}
                                                    >
                                                        <NumberInputField />
                                                        <NumberInputStepper>
                                                            <NumberIncrementStepper />
                                                            <NumberDecrementStepper />
                                                        </NumberInputStepper>
                                                    </NumberInput>
                                                </FormControl>
                                                <IconButton
                                                    icon={<FiTrash2 />}
                                                    aria-label="Remove item"
                                                    colorScheme="red"
                                                    size="sm"
                                                    onClick={() => handleRemoveItem(item._key)}
                                                />
                                            </HStack>
                                        ))}
                                    </VStack>
                                </Box>
                            </VStack>
                        )}
                    </ModalBody>

                    <ModalFooter>
                        <HStack spacing={4}>
                            <Button variant="ghost" onClick={handleClose}>
                                Cancel
                            </Button>
                            {dispatch && dispatch.status !== 'completed' && (
                                <Button
                                    colorScheme="green"
                                    leftIcon={<FiCheckCircle />}
                                    onClick={() => setIsConfirmOpen(true)}
                                    isLoading={loading}
                                    isDisabled={loading}
                                >
                                    Mark as Complete
                                </Button>
                            )}
                            <Button
                                colorScheme="blue"
                                leftIcon={<FiSave />}
                                onClick={() => handleSave()}
                                isLoading={loading}
                                isDisabled={loading}
                            >
                                Save Dispatch
                            </Button>
                        </HStack>
                    </ModalFooter>
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

            {/* Confirmation Dialog */}
            <AlertDialog
                isOpen={isConfirmOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => setIsConfirmOpen(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Confirm Complete Dispatch
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure you want to mark this dispatch as complete? This action cannot be undone.
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