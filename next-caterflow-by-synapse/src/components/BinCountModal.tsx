// src/components/BinCountModal.tsx
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
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Badge,
    Heading,
    Card,
    CardBody,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiSearch, FiCheck, FiSave } from 'react-icons/fi';
import BinSelectorModal from './BinSelectorModal';
import StockItemSelectorModal from './StockItemSelectorModal';
import { useSession } from 'next-auth/react';
import { nanoid } from 'nanoid';
import { StockItem } from '@/lib/sanityTypes';

interface CountedItem {
    stockItem: {
        _id: string;
        name: string;
        sku: string
    };
    countedQuantity: number;
    systemQuantityAtCountTime?: number; // Make sure this matches API field name
    variance?: number;
    _key?: string;
}

interface StockItemForSelector {
    _id: string;
    name: string;
    sku: string;
    itemType: 'food' | 'nonFood';
    unitOfMeasure: string;
    description?: string;
    category?: {
        _id: string;
        title: string;
    };
}

interface Bin {
    _id: string;
    name: string;
    site: {
        _id: string;
        name: string;
    };
}

interface BinCount {
    _id: string;
    countNumber: string;
    countDate: string;
    status: 'draft' | 'in-progress' | 'completed' | 'adjusted';
    bin: Bin;
    countedBy?: {
        _id: string;
        name: string;
    };
    countedItems: CountedItem[];
    notes?: string;
}

interface BinCountModalProps {
    isOpen: boolean;
    onClose: () => void;
    binCount: BinCount | null;
    onSave: () => void;
}

export default function BinCountModal({ isOpen, onClose, binCount, onSave }: BinCountModalProps) {
    const { data: session } = useSession();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [isBinModalOpen, setIsBinModalOpen] = useState(false);
    const [isStockItemModalOpen, setIsStockItemModalOpen] = useState(false);
    const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
    const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [countedItems, setCountedItems] = useState<CountedItem[]>([]);

    const isViewMode = binCount?.status === 'completed' || binCount?.status === 'adjusted';

    const countedItemIds = useMemo(() => {
        return countedItems.map(item => item.stockItem._id);
    }, [countedItems]);

    useEffect(() => {
        console.log('BinCountModal props:', { isOpen, binCount });
    }, [isOpen, binCount]);


    // Debug useEffect to see what data is being received
    useEffect(() => {
        console.log('BinCountModal received binCount:', binCount);
        console.log('Calculated isViewMode:', isViewMode);
    }, [binCount, isViewMode]);

    useEffect(() => {
        if (binCount) {
            console.log('Setting up bin count data:', binCount);
            setSelectedBin(binCount.bin || null);
            setCountDate(new Date(binCount.countDate).toISOString().split('T')[0]);
            setNotes(binCount.notes || '');

            // Debug: Log the countedItems from the API response
            console.log('Counted items from API:', binCount.countedItems);
            console.log('First counted item structure:', binCount.countedItems?.[0]);

            // Ensure countedItems have proper _key values and valid stockItem references
            const validCountedItems = (binCount.countedItems || [])
                .filter(item => {
                    // Check if item exists
                    if (!item) return false;

                    // Check if stockItem exists and has either _id or _ref
                    if (!item.stockItem) return false;

                    // Allow both expanded stockItem (_id, name, sku) and reference (_ref)
                    const hasId = item.stockItem._id;

                    return hasId;
                })
                .map(item => {
                    // If stockItem is just a reference, we need to handle it differently
                    if (item.stockItem._id) {
                        console.warn('Stock item is a reference, not expanded:', item.stockItem);
                        // For now, create a placeholder until we can fetch the actual item
                        return {
                            ...item,
                            _key: item._key || nanoid(),
                            stockItem: {
                                _id: item.stockItem._id,
                                name: 'Loading...',
                                sku: 'Loading...'
                            }
                        };
                    }

                    // Stock item is already expanded
                    return {
                        ...item,
                        _key: item._key || nanoid(),
                        stockItem: {
                            _id: item.stockItem._id,
                            name: item.stockItem.name || 'Unknown Item',
                            sku: item.stockItem.sku || 'N/A'
                        }
                    };
                });

            console.log('Valid counted items after processing:', validCountedItems);
            setCountedItems(validCountedItems);
        } else {
            console.log('Setting up new bin count');
            setSelectedBin(null);
            setCountDate(new Date().toISOString().split('T')[0]);
            setNotes('');
            setCountedItems([]);
        }
    }, [binCount, isOpen]);

    useEffect(() => {
        if (binCount && binCount.countedItems && binCount.countedItems.length > 0) {
            console.log('Detailed analysis of counted items:');
            binCount.countedItems.forEach((item, index) => {
                console.log(`Item ${index}:`, item);
                console.log(`Item ${index} stockItem:`, item.stockItem);
                console.log(`Item ${index} stockItem type:`, typeof item.stockItem);
                console.log(`Item ${index} stockItem keys:`, Object.keys(item.stockItem || {}));
            });
        }
    }, [binCount]);

    const fixBrokenBinCount = async (countId: string) => {
        try {
            // Fetch the broken count using the main GET endpoint and find it
            const response = await fetch('/api/bin-counts');
            if (!response.ok) throw new Error('Failed to fetch bin counts');

            const allCounts = await response.json();
            const brokenCount = allCounts.find((count: any) => count._id === countId);

            if (!brokenCount) {
                toast({
                    title: 'Bin Count Not Found',
                    description: 'The bin count you are trying to fix was not found.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                });
                return;
            }

            // Construct a clean, valid payload for the Sanity PUT request
            const fixedPayload = {
                countNumber: brokenCount.countNumber,
                countDate: brokenCount.countDate,
                bin: brokenCount.bin._id, // Use the bin's ID
                notes: brokenCount.notes,
                status: brokenCount.status,
                countedItems: (brokenCount.countedItems || [])
                    .filter((item: any) => item && item.stockItem) // Ensure items and stockItems exist
                    .map((item: any) => ({
                        _key: item._key,
                        stockItem: item.stockItem._id, // Use the stock item's ID
                        countedQuantity: item.countedQuantity,
                        systemQuantityAtCountTime: item.systemQuantityAtCountTime,
                        variance: item.variance,
                    })),
            };

            // Save the fixed count
            const saveResponse = await fetch('/api/bin-counts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ _id: countId, ...fixedPayload }),
            });

            if (!saveResponse.ok) {
                const errorData = await saveResponse.json();
                throw new Error(errorData.error || 'Failed to save fixed count');
            }

            toast({
                title: 'Count Fixed',
                description: 'The bin count has been fixed successfully.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            onSave(); // Refresh the list
        } catch (error: any) {
            console.error('Error fixing bin count:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to fix the bin count.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };


    // Also, update the handleStockItemsSelect function to ensure proper structure
    const handleStockItemsSelect = async (item: StockItemForSelector) => {
        setIsStockItemModalOpen(false);
        setLoading(true);

        if (!selectedBin) {
            toast({
                title: "No Bin Selected",
                description: "Please select a bin before adding items.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            setLoading(false);
            return;
        }

        try {
            const existingItemIds = new Set(countedItems.map(i => i.stockItem._id));

            if (existingItemIds.has(item._id)) {
                toast({
                    title: "Item already added",
                    description: `${item.name} is already in your bin count.`,
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
                setLoading(false);
                return;
            }

            try {
                // Fetch the current system quantity for the item in the specific bin
                const systemQuantityRes = await fetch(`/api/stock-items/${item._id}/in-bin/${selectedBin._id}`);
                const { inStock } = await systemQuantityRes.json();

                if (!systemQuantityRes.ok) {
                    const errorData = await systemQuantityRes.json().catch(() => ({}));
                    //console.error(`No stock records found for ${item.name} in bin ${selectedBin.name}. This is normal for new items.`, errorData);

                    toast({
                        title: "New Item in Bin",
                        description: `${item.name} has no previous stock records in ${selectedBin.name}. Starting with 0 system quantity.`,
                        status: "info",
                        duration: 5000,
                        isClosable: true,
                    });

                    setCountedItems(prev => [...prev, {
                        _key: nanoid(),
                        stockItem: {
                            _id: item._id,
                            name: item.name,
                            sku: item.sku || 'N/A'
                        },
                        countedQuantity: 0,
                        systemQuantityAtCountTime: inStock || 0,
                    }]);
                    return;
                }

                setCountedItems(prev => [...prev, {
                    _key: nanoid(),
                    stockItem: {
                        _id: item._id,
                        name: item.name,
                        sku: item.sku || 'N/A'
                    },
                    countedQuantity: 0,
                    systemQuantityAtCountTime: inStock || 0,
                }]);
            } catch (itemError) {
                console.error(`Error processing item ${item.name}:`, itemError);
                toast({
                    title: "Warning",
                    description: `Error processing ${item.name}. Using 0 as default system quantity.`,
                    status: "warning",
                    duration: 5000,
                    isClosable: true,
                });

                setCountedItems(prev => [...prev, {
                    _key: nanoid(),
                    stockItem: {
                        _id: item._id,
                        name: item.name,
                        sku: item.sku || 'N/A'
                    },
                    countedQuantity: 0,
                    systemQuantityAtCountTime: 0,
                }]);
            }
        } catch (error: any) {
            console.error("Error in stock item selection:", error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to add item. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchSystemQuantities = async () => {
            if (binCount && !isViewMode && selectedBin) {
                setLoading(true);
                try {
                    // Create a copy of countedItems to avoid modifying state directly
                    const itemsToUpdate = [...countedItems];
                    let needsUpdate = false;

                    // Check which items need system quantities
                    const itemsWithMissingQuantities = itemsToUpdate.filter(item =>
                        typeof item.systemQuantityAtCountTime === 'undefined' ||
                        item.systemQuantityAtCountTime === null
                    );

                    if (itemsWithMissingQuantities.length === 0) {
                        setLoading(false);
                        return;
                    }

                    // Fetch quantities for items that need them
                    const updatedItems = await Promise.all(
                        itemsToUpdate.map(async (item) => {
                            // Only fetch if systemQuantityAtCountTime is missing
                            if (typeof item.systemQuantityAtCountTime === 'undefined' || item.systemQuantityAtCountTime === null) {
                                needsUpdate = true;
                                try {
                                    const systemQuantityRes = await fetch(`/api/stock-items/${item.stockItem._id}/in-bin/${selectedBin._id}`);
                                    if (systemQuantityRes.ok) {
                                        const { inStock } = await systemQuantityRes.json();
                                        return { ...item, systemQuantityAtCountTime: inStock || 0 };
                                    } else {
                                        console.warn(`Failed to fetch system quantity for ${item.stockItem.name}`);
                                        return { ...item, systemQuantityAtCountTime: 0 };
                                    }
                                } catch (error) {
                                    console.error(`Error fetching quantity for ${item.stockItem.name}:`, error);
                                    return { ...item, systemQuantityAtCountTime: 0 };
                                }
                            }
                            return item; // Return the item as is if it already has the quantity
                        })
                    );

                    // Only update state if we actually made changes
                    if (needsUpdate) {
                        setCountedItems(updatedItems);
                    }
                } catch (error) {
                    console.error("Error fetching system quantities on load:", error);
                    toast({
                        title: 'Error',
                        description: 'Failed to load system quantities for existing items.',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchSystemQuantities();
        // Add countedItems to dependencies but use a ref or callback if it causes infinite loops
        // Alternatively, restructure the logic to avoid the dependency
    }, [binCount, isViewMode, selectedBin, toast, countedItems]);

    const handleBinSelect = (bin: Bin) => {
        setSelectedBin(bin);
        setIsBinModalOpen(false);
    };

    useEffect(() => {
        if (binCount) {
            console.log('Setting up bin count data:', binCount);
            setSelectedBin(binCount.bin || null);
            setCountDate(new Date(binCount.countDate).toISOString().split('T')[0]);
            setNotes(binCount.notes || '');

            // Filter out items with null stockItem and create placeholders
            const validCountedItems = (binCount.countedItems || [])
                .filter(item => item && item.stockItem) // Only items with stockItem
                .map(item => ({
                    ...item,
                    _key: item._key || nanoid(),
                    stockItem: {
                        _id: item.stockItem._id,
                        name: item.stockItem.name || 'Unknown Item',
                        sku: item.stockItem.sku || 'N/A'
                    }
                }));

            console.log('Valid counted items after processing:', validCountedItems);
            setCountedItems(validCountedItems);
        } else {
            console.log('Setting up new bin count');
            setSelectedBin(null);
            setCountDate(new Date().toISOString().split('T')[0]);
            setNotes('');
            setCountedItems([]);
        }
    }, [binCount, isOpen]);

    const handleCountedQuantityChange = (key: string, valueAsString: string, valueAsNumber: number) => {
        setCountedItems(prev => prev.map(item =>
            item._key === key ? { ...item, countedQuantity: valueAsNumber } : item
        ));
    };

    const handleRemoveItem = (key: string) => {
        setCountedItems(prev => prev.filter(item => item._key !== key));
    };

    const totalVariance = useMemo(() => {
        return countedItems.reduce((sum, item) => {
            const counted = item.countedQuantity || 0;
            const system = item.systemQuantityAtCountTime || 0;
            return sum + (counted - system);
        }, 0);
    }, [countedItems]);

    const handleSave = async (isFinalize: boolean = false) => {
        // Check if any counted items have invalid stockItem references
        const hasInvalidStockItems = countedItems.some(item =>
            !item.stockItem || !item.stockItem._id
        );

        if (hasInvalidStockItems) {
            toast({
                title: 'Invalid Items',
                description: 'Some items have invalid references. Please remove and re-add them.',
                status: 'error',
                duration: 3000,
            });
            return;
        }

        const hasInvalidQuantities = countedItems.some(item =>
            isNaN(item.countedQuantity) || item.countedQuantity < 0
        );

        if (hasInvalidQuantities) {
            toast({
                title: 'Invalid Quantities',
                description: 'Please enter valid counted quantities',
                status: 'error',
                duration: 3000,
            });
            return;
        }
        if (!selectedBin) {
            toast({
                title: 'No Bin Selected',
                description: 'Please select a bin before saving.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (countedItems.length === 0) {
            toast({
                title: 'No Items Counted',
                description: 'Please add at least one item to the bin count.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);

        const itemsWithVariance = countedItems.map(item => {
            console.log('Saving item:', item);

            // Extract the stock item ID regardless of format
            const stockItemId = typeof item.stockItem === 'string'
                ? item.stockItem
                : item.stockItem?._id;

            if (!stockItemId) {
                throw new Error(`Invalid stock item for ${item.stockItem?.name || 'unknown item'}`);
            }

            return {
                _key: item._key,
                stockItem: stockItemId, // Send just the ID string
                countedQuantity: item.countedQuantity || 0,
                systemQuantityAtCountTime: item.systemQuantityAtCountTime || 0,
                variance: (item.countedQuantity || 0) - (item.systemQuantityAtCountTime || 0),
            };
        });


        const payload = {
            countDate: new Date(countDate).toISOString(),
            bin: selectedBin._id,
            countedBy: session?.user?.id,
            notes,
            countedItems: itemsWithVariance,
            status: isFinalize ? 'completed' : binCount?.status || 'draft',
            ...(binCount && { countNumber: binCount.countNumber }),
        };

        console.log('Saving payload:', payload);


        try {
            const method = binCount ? 'PUT' : 'POST';
            const url = '/api/bin-counts';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(binCount ? { _id: binCount._id, ...payload } : payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save bin count');
            }

            toast({
                title: `Count ${isFinalize ? 'Finalized' : 'Saved'}`,
                description: `The bin count has been successfully ${isFinalize ? 'finalized' : 'saved'}.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            onClose();
            onSave();
        } catch (error: any) {
            console.error('Error saving bin count:', error);
            toast({
                title: 'Error',
                description: error.message || 'An unexpected error occurred.',
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
            <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{binCount ? `Bin Count ${binCount.countNumber}` : 'New Bin Count'}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            <FormControl id="bin-name" isRequired>
                                <FormLabel>Bin</FormLabel>
                                <HStack>
                                    <Input
                                        placeholder="Select a Bin"
                                        value={selectedBin?.name || ''}
                                        readOnly
                                    />
                                    <Button
                                        onClick={() => setIsBinModalOpen(true)}
                                        isDisabled={isViewMode || !!binCount}
                                    >
                                        Select Bin
                                    </Button>
                                </HStack>
                            </FormControl>
                            <FormControl id="count-date" isRequired>
                                <FormLabel>Count Date</FormLabel>
                                <Input
                                    type="date"
                                    value={countDate}
                                    onChange={(e) => setCountDate(e.target.value)}
                                    isReadOnly={isViewMode}
                                />
                            </FormControl>
                            <FormControl id="notes">
                                <FormLabel>Notes</FormLabel>
                                <Input
                                    placeholder="Add any notes about the count"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    isReadOnly={isViewMode}
                                />
                            </FormControl>

                            <Box w="100%" mt={8}>
                                <Heading size="md" mb={4}>Counted Items</Heading>
                                <Card>
                                    <CardBody p={0}>
                                        <TableContainer>
                                            <Table variant="simple" size="sm">
                                                <Thead>
                                                    <Tr>
                                                        <Th>Item</Th>
                                                        <Th>System Qty</Th>
                                                        <Th isNumeric>Counted Qty</Th>
                                                        <Th isNumeric>Variance</Th>
                                                        {!isViewMode && <Th>Actions</Th>}
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {countedItems.map((item) => (
                                                        <Tr key={item._key}>
                                                            <Td>
                                                                <VStack align="start" spacing={0}>
                                                                    <Text fontWeight="bold">{item.stockItem.name}</Text>
                                                                    <Text fontSize="xs" color="gray.500">{item.stockItem.sku}</Text>
                                                                </VStack>
                                                            </Td>
                                                            <Td>{item.systemQuantityAtCountTime}</Td>
                                                            <Td>
                                                                <NumberInput
                                                                    value={item.countedQuantity}
                                                                    onChange={(valStr, valNum) => handleCountedQuantityChange(item._key!, valStr, valNum)}
                                                                    min={0}
                                                                    isDisabled={isViewMode}
                                                                >
                                                                    <NumberInputField />
                                                                    <NumberInputStepper>
                                                                        <NumberIncrementStepper />
                                                                        <NumberDecrementStepper />
                                                                    </NumberInputStepper>
                                                                </NumberInput>
                                                            </Td>
                                                            <Td isNumeric>
                                                                <Badge
                                                                    colorScheme={(item.countedQuantity - (item.systemQuantityAtCountTime || 0)) === 0 ? 'green' : 'red'}
                                                                >
                                                                    {item.countedQuantity - (item.systemQuantityAtCountTime || 0)}
                                                                </Badge>
                                                            </Td>
                                                            {!isViewMode && (
                                                                <Td>
                                                                    <IconButton
                                                                        aria-label="Remove item"
                                                                        icon={<FiTrash2 />}
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        colorScheme="red"
                                                                        onClick={() => handleRemoveItem(item._key!)}
                                                                    />
                                                                </Td>
                                                            )}
                                                        </Tr>
                                                    ))}
                                                </Tbody>
                                            </Table>
                                        </TableContainer>
                                    </CardBody>
                                </Card>
                            </Box>

                            {!isViewMode && (
                                <HStack w="100%" justifyContent="space-between" mt={4}>
                                    <Button
                                        leftIcon={<FiPlus />}
                                        onClick={() => {
                                            if (!selectedBin) {
                                                toast({
                                                    title: "Bin Required",
                                                    description: "Please select a bin before adding items.",
                                                    status: "warning",
                                                    duration: 3000,
                                                    isClosable: true,
                                                });
                                                return;
                                            }
                                            setIsStockItemModalOpen(true);
                                        }}
                                        isDisabled={isViewMode}
                                    >
                                        Add Item
                                    </Button>

                                    <Text fontWeight="bold">
                                        Total Variance: <Badge colorScheme={totalVariance !== 0 ? 'red' : 'green'}>{totalVariance}</Badge>
                                    </Text>
                                </HStack>
                            )}
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme="gray" mr={3} onClick={onClose} isDisabled={loading}>
                            Cancel
                        </Button>
                        {!isViewMode && (

                            <HStack>

                                {binCount && binCount.countedItems.some((item: any) => !item.stockItem) && (
                                    <Button
                                        colorScheme="orange"
                                        onClick={() => fixBrokenBinCount(binCount._id)}
                                        isLoading={loading}
                                        leftIcon={<FiCheck />}
                                    >
                                        Fix Broken Count
                                    </Button>
                                )}
                                <Button
                                    colorScheme="brand"
                                    onClick={() => handleSave(false)}
                                    isLoading={loading}
                                    leftIcon={<FiSave />}
                                >
                                    Save Draft
                                </Button>
                                <Button
                                    colorScheme="green"
                                    onClick={() => handleSave(true)}
                                    isLoading={loading}
                                    isDisabled={countedItems.length === 0}
                                    leftIcon={<FiCheck />}
                                >
                                    Finalize Count
                                </Button>
                            </HStack>
                        )}
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
                onSelect={handleStockItemsSelect}
                existingItemIds={countedItemIds}
            />
        </>
    );
}