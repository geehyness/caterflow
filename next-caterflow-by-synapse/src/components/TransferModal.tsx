// components/TransferModal.tsx
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
    IconButton,
    Text,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Box,
    Spinner,
    Grid,
    GridItem,
    Textarea,
    Divider,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Badge,
    useColorModeValue
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiRefreshCw, FiSave, FiSend } from 'react-icons/fi';
import StockItemSelectorModal from './StockItemSelectorModal';
import { nanoid } from 'nanoid';
import { useSession } from 'next-auth/react';
import { getBinStock } from '@/lib/stockCalculations';

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
    notes?: string;
}

interface InternalTransfer {
    _id: string;
    transferNumber: string;
    transferDate: string;
    status: 'draft' | 'pending-approval' | 'approved' | 'completed' | 'cancelled';
    fromBin: {
        _id: string;
        name: string;
        site: {
            _id: string;
            name: string;
        };
    };
    toBin: {
        _id: string;
        name: string;
        site: {
            _id: string;
            name: string;
        };
    };
    transferredItems: TransferredItem[];
    notes?: string;
    transferredBy?: {
        _id: string;
        name: string;
    };
    approvedBy?: {
        _id: string;
        name: string;
    };
    approvedAt?: string;
}

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    transfer?: InternalTransfer | null;
    onSave: () => void;
}

export default function TransferModal({ isOpen, onClose, transfer, onSave }: TransferModalProps) {
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [allBins, setAllBins] = useState<any[]>([]);
    const [fromBin, setFromBin] = useState<any>(null);
    const [toBin, setToBin] = useState<any>(null);
    const [transferDate, setTransferDate] = useState('');
    const [transferredItems, setTransferredItems] = useState<TransferredItem[]>([]);
    const [notes, setNotes] = useState('');
    const [isStockItemModalOpen, setIsStockItemModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [stockLevels, setStockLevels] = useState<{ [key: string]: number }>({});
    const [refreshingStock, setRefreshingStock] = useState(false);

    const toast = useToast();
    const { data: session } = useSession();
    const user = session?.user as any;

    const isNew = !transfer;
    const isEditable = !transfer || transfer?.status === 'draft';
    const isPendingApproval = transfer?.status === 'pending-approval';
    const isApproved = transfer?.status === 'approved';
    const isCompleted = transfer?.status === 'completed';

    // Theme-aware colors
    const tableHeaderColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const tableBorderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const tableBg = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const textSecondaryColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const tableBoxShadow = useColorModeValue('md', 'dark-md');

    // Validation colors
    const positiveColor = useColorModeValue('green.500', 'green.300');
    const negativeColor = useColorModeValue('red.500', 'red.300');

    // Button colors
    const brandColorScheme = useColorModeValue('brand', 'brand');
    const neutralColorScheme = useColorModeValue('gray', 'gray');


    // This function is now memoized using useCallback
    const refreshStockLevels = useCallback(async (binId: string, itemIds?: string[]) => {
        if (!binId) return;
        setRefreshingStock(true);
        try {
            const idsToFetch = itemIds && itemIds.length > 0 ? itemIds : transferredItems.map(item => item.stockItem?._id).filter(Boolean); // Filter out any null or undefined IDs
            if (idsToFetch.length > 0) {
                const stockData = await getBinStock(idsToFetch, binId);
                setStockLevels(stockData);
            } else {
                setStockLevels({});
            }
        } catch (error) {
            console.error('Error refreshing stock levels:', error);
        } finally {
            setRefreshingStock(false);
        }
    }, [transferredItems]);

    // Fetch bins and initialize form data on modal open or transfer change
    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch bins
                const binsRes = await fetch('/api/bins');
                if (binsRes.ok) {
                    const binsData = await binsRes.json();
                    setAllBins(binsData);
                }

                // Initialize form data
                const today = new Date().toISOString().split('T')[0];
                let latestTransfer = transfer;

                if (transfer?._id) {
                    const res = await fetch(`/api/operations/transfers/${transfer._id}`);
                    if (res.ok) {
                        latestTransfer = await res.json();
                    }
                }

                setTransferDate(latestTransfer?.transferDate ? latestTransfer.transferDate.split('T')[0] : today);
                setFromBin(latestTransfer?.fromBin || null);
                setToBin(latestTransfer?.toBin || null);
                setTransferredItems(latestTransfer?.transferredItems || []);
                setNotes(latestTransfer?.notes || '');

            } catch (error) {
                console.error('Error fetching transfer data:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load transfer data.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, transfer, toast]);

    // Refresh stock levels when fromBin changes
    useEffect(() => {
        if (fromBin?._id && !isCompleted) {
            refreshStockLevels(fromBin._id);
        }
    }, [fromBin, isCompleted, refreshStockLevels]);

    const handleRefreshStock = async () => {
        if (fromBin?._id && !isCompleted) {
            await refreshStockLevels(fromBin._id);
            toast({
                title: 'Stock Levels Refreshed',
                status: 'success',
                duration: 2000,
                isClosable: true,
            });
        }
    };

    const handleStockItemSelect = (item: any) => {
        const newItem: TransferredItem = {
            _key: nanoid(),
            stockItem: {
                _id: item._id,
                name: item.name,
                sku: item.sku,
                unitOfMeasure: item.unitOfMeasure,
                currentStock: stockLevels[item._id] || 0,
            },
            transferredQuantity: 1,
            notes: '',
        };

        setTransferredItems(prevItems => {
            const updatedItems = [...prevItems];
            if (editingIndex !== null) {
                updatedItems[editingIndex] = newItem;
                setEditingIndex(null);
            } else {
                updatedItems.push(newItem);
            }
            return updatedItems;
        });

        setIsStockItemModalOpen(false);
    };

    const handleQuantityChange = (key: string, _valueAsString: string, valueAsNumber: number) => {
        setTransferredItems(prevItems =>
            prevItems.map(item => {
                if (item._key === key) {
                    return { ...item, transferredQuantity: valueAsNumber };
                }
                return item;
            })
        );
    };

    const handleRemoveItem = (key: string) => {
        setTransferredItems(prevItems => prevItems.filter(item => item._key !== key));
    };

    const handleEditItem = (index: number) => {
        setEditingIndex(index);
        setIsStockItemModalOpen(true);
    };

    const getAvailableStock = (itemId: string): number => {
        return stockLevels[itemId] || 0;
    };

    const isQuantityValid = (item: TransferredItem): boolean => {
        if (!item || !item.stockItem) return false;
        const availableStock = getAvailableStock(item.stockItem._id);
        return item.transferredQuantity > 0 && item.transferredQuantity <= availableStock;
    };

    const handleSave = async (newStatus: 'draft' | 'pending-approval' | 'approved' | 'completed') => {
        setIsSaving(true);
        try {
            // Validate required fields for non-draft status
            if (newStatus !== 'draft' && (!fromBin || !toBin || transferredItems.length === 0)) {
                toast({
                    title: 'Missing Information',
                    description: 'All fields are required when submitting for approval.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                });
                return;
            }

            // Validate quantities only for editable and approved transfers
            if (!isCompleted) {
                for (const item of transferredItems) {
                    if (!isQuantityValid(item)) {
                        toast({
                            title: 'Invalid Quantity',
                            description: `Quantity for ${item.stockItem.name} exceeds available stock.`,
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                        });
                        throw new Error('Invalid quantity');
                    }
                }
            }

            const payload: any = {
                transferDate: new Date(transferDate).toISOString(),
                fromBin: fromBin._id,
                toBin: toBin._id,
                transferredItems: transferredItems.map(item => ({
                    _key: item._key,
                    stockItem: item.stockItem._id,
                    transferredQuantity: item.transferredQuantity,
                })),
                notes,
            };

            let url = '';
            let method: 'POST' | 'PATCH' = 'POST';
            let message = 'Transfer saved successfully.';

            if (isNew) {
                // New transfer - always save as a draft first
                url = '/api/operations/transfers';
                payload.status = 'draft';
                message = 'Transfer saved as draft';
            } else {
                // Existing transfer, check the new status
                if (newStatus === 'pending-approval') {
                    url = `/api/operations/transfers/${transfer._id}/submit`;
                    message = 'Transfer submitted for approval';
                    method = 'PATCH';
                } else if (newStatus === 'approved') {
                    url = `/api/operations/transfers/${transfer._id}/approve`;
                    message = 'Transfer approved';
                    method = 'PATCH';
                } else if (newStatus === 'completed') {
                    url = `/api/operations/transfers/${transfer._id}/complete`;
                    message = 'Transfer completed';
                    method = 'PATCH';
                } else {
                    // Default to saving as draft or updating an existing draft
                    url = `/api/operations/transfers/${transfer._id}`;
                    payload.status = 'draft';
                    message = 'Transfer saved as draft';
                    method = 'PATCH';
                }
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save transfer');
            }

            toast({
                title: message,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Save transfer error:', error);
            toast({
                title: 'Error saving transfer',
                description: error?.message || 'An error occurred',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusBadge = (status: 'draft' | 'pending-approval' | 'approved' | 'completed' | 'cancelled') => {
        const colorSchemes = {
            draft: 'gray',
            'pending-approval': 'orange',
            approved: 'blue',
            completed: 'green',
            cancelled: 'red'
        };

        return (
            <Badge colorScheme={colorSchemes[status] || 'gray'} ml={2}>
                {status}
            </Badge>
        );
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="4xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        <HStack>
                            <Text>{transfer ? 'Edit Transfer' : 'Create New Transfer'}</Text>
                            {transfer && getStatusBadge(transfer.status)}
                        </HStack>
                        {fromBin && isEditable && (
                            <Button
                                size="sm"
                                leftIcon={<FiRefreshCw />}
                                onClick={handleRefreshStock}
                                isLoading={refreshingStock}
                                variant="outline"
                                ml={3}
                                mt={2}
                            >
                                Refresh Stock
                            </Button>
                        )}
                    </ModalHeader>
                    <ModalCloseButton isDisabled={isSaving} />

                    {loading ? (
                        <Box p={8} textAlign="center">
                            <Spinner size="xl" />
                            <Text mt={4}>Loading transfer data...</Text>
                        </Box>
                    ) : (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleSave(isEditable ? 'draft' : transfer?.status as any);
                        }}>
                            <ModalBody>
                                <VStack spacing={4} align="stretch">
                                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                                        <GridItem>
                                            <FormControl isRequired>
                                                <FormLabel>From Bin</FormLabel>
                                                <Select
                                                    placeholder="Select source bin"
                                                    value={fromBin?._id || ''}
                                                    onChange={(e) => {
                                                        const selectedBin = allBins.find(bin => bin._id === e.target.value);
                                                        setFromBin(selectedBin || null);
                                                    }}
                                                    isDisabled={!isEditable}
                                                >
                                                    {allBins.map((bin) => (
                                                        <option key={bin._id} value={bin._id}>
                                                            {bin.name} ({bin.site?.name})
                                                        </option>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </GridItem>
                                        <GridItem>
                                            <FormControl isRequired>
                                                <FormLabel>To Bin</FormLabel>
                                                <Select
                                                    placeholder="Select destination bin"
                                                    value={toBin?._id || ''}
                                                    onChange={(e) => {
                                                        const selectedBin = allBins.find(bin => bin._id === e.target.value);
                                                        setToBin(selectedBin || null);
                                                    }}
                                                    isDisabled={!isEditable}
                                                >
                                                    {allBins.map((bin) => (
                                                        <option key={bin._id} value={bin._id}>
                                                            {bin.name} ({bin.site?.name})
                                                        </option>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </GridItem>
                                    </Grid>

                                    <FormControl isRequired>
                                        <FormLabel>Transfer Date</FormLabel>
                                        <Input
                                            type="date"
                                            value={transferDate}
                                            onChange={(e) => setTransferDate(e.target.value)}
                                            isDisabled={!isEditable}
                                        />
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel>Notes</FormLabel>
                                        <Textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add any notes about this transfer..."
                                            isDisabled={!isEditable}
                                        />
                                    </FormControl>

                                    <Divider />

                                    <VStack spacing={4} align="stretch">
                                        <HStack justify="space-between" align="center">
                                            <FormLabel mb={0}>Transferred Items</FormLabel>
                                            {refreshingStock && <Spinner size="sm" />}
                                        </HStack>

                                        {transferredItems.length === 0 ? (
                                            <Box textAlign="center" py={4} color={textSecondaryColor}>
                                                No items added yet
                                            </Box>
                                        ) : (
                                            <TableContainer
                                                bg={tableBg}
                                                borderRadius="lg"
                                                boxShadow={tableBoxShadow}
                                                border="1px solid"
                                                borderColor={tableBorderColor}
                                            >
                                                <Table variant="simple" size="sm">
                                                    <Thead>
                                                        <Tr>
                                                            <Th color={tableHeaderColor} borderColor={tableBorderColor}>Item</Th>
                                                            {!isCompleted && <Th color={tableHeaderColor} borderColor={tableBorderColor}>Available Stock</Th>}
                                                            <Th color={tableHeaderColor} borderColor={tableBorderColor}>Quantity</Th>
                                                            <Th color={tableHeaderColor} borderColor={tableBorderColor}>Unit</Th>
                                                            {isEditable && <Th color={tableHeaderColor} borderColor={tableBorderColor}>Actions</Th>}
                                                        </Tr>
                                                    </Thead>
                                                    <Tbody>
                                                        {transferredItems.map((item, index) => {
                                                            // Add defensive check for item.stockItem
                                                            if (!item.stockItem) {
                                                                console.warn('Skipping item with missing stockItem:', item);
                                                                return null;
                                                            }

                                                            const availableStock = getAvailableStock(item.stockItem._id);
                                                            const isValid = isQuantityValid(item);
                                                            return (
                                                                <Tr key={item._key}>
                                                                    <Td borderColor={tableBorderColor}>{item.stockItem.name}</Td>
                                                                    {!isCompleted && (
                                                                        <Td borderColor={tableBorderColor}>
                                                                            <Text color={availableStock > 0 ? positiveColor : negativeColor}>
                                                                                {availableStock}
                                                                            </Text>
                                                                        </Td>
                                                                    )}
                                                                    <Td borderColor={tableBorderColor}>
                                                                        <NumberInput
                                                                            value={item.transferredQuantity}
                                                                            min={1}
                                                                            max={availableStock}
                                                                            onChange={(valueAsString, valueAsNumber) =>
                                                                                handleQuantityChange(item._key, valueAsString, valueAsNumber)
                                                                            }
                                                                            size="sm"
                                                                            width="100px"
                                                                            isDisabled={!isEditable}
                                                                            isInvalid={!isValid && !isCompleted}
                                                                        >
                                                                            <NumberInputField />
                                                                            <NumberInputStepper>
                                                                                <NumberIncrementStepper />
                                                                                <NumberDecrementStepper />
                                                                            </NumberInputStepper>
                                                                        </NumberInput>
                                                                        {!isValid && !isCompleted && (
                                                                            <Text fontSize="xs" color={negativeColor}>
                                                                                Exceeds available stock
                                                                            </Text>
                                                                        )}
                                                                    </Td>
                                                                    <Td borderColor={tableBorderColor}>{item.stockItem.unitOfMeasure}</Td>
                                                                    {isEditable && (
                                                                        <Td borderColor={tableBorderColor}>
                                                                            <HStack>
                                                                                <IconButton
                                                                                    aria-label="Edit item"
                                                                                    icon={<FiPlus />}
                                                                                    size="sm"
                                                                                    onClick={() => handleEditItem(index)}
                                                                                />
                                                                                <IconButton
                                                                                    aria-label="Remove item"
                                                                                    icon={<FiTrash2 />}
                                                                                    size="sm"
                                                                                    onClick={() => handleRemoveItem(item._key)}
                                                                                />
                                                                            </HStack>
                                                                        </Td>
                                                                    )}
                                                                </Tr>
                                                            );
                                                        })}
                                                    </Tbody>
                                                </Table>
                                            </TableContainer>
                                        )}

                                        {isEditable && (
                                            <Button
                                                leftIcon={<FiPlus />}
                                                onClick={() => setIsStockItemModalOpen(true)}
                                                variant="outline"
                                                isDisabled={!fromBin}
                                                alignSelf="flex-start"
                                            >
                                                Add Item
                                            </Button>
                                        )}
                                    </VStack>
                                </VStack>
                            </ModalBody>

                            <ModalFooter>
                                <Button variant="outline" mr={3} onClick={onClose} isDisabled={isSaving}>
                                    Cancel
                                </Button>

                                {isEditable ? (
                                    <>
                                        <Button
                                            leftIcon={<FiSave />}
                                            colorScheme={brandColorScheme}
                                            onClick={() => handleSave('draft')}
                                            isLoading={isSaving}
                                            loadingText="Saving..."
                                        >
                                            Save Draft
                                        </Button>
                                        <Button
                                            leftIcon={<FiSend />}
                                            colorScheme={brandColorScheme}
                                            onClick={() => handleSave('pending-approval')}
                                            isLoading={isSaving}
                                            ml={3}
                                            isDisabled={!fromBin || !toBin || transferredItems.length === 0}
                                        >
                                            Submit for Approval
                                        </Button>
                                    </>
                                ) : isPendingApproval ? (
                                    <Text color={neutralColorScheme} fontSize="sm">
                                        Waiting for approval - read only
                                    </Text>
                                ) : isApproved ? (
                                    <Button
                                        colorScheme={brandColorScheme}
                                        onClick={() => handleSave('completed')}
                                        isLoading={isSaving}
                                    >
                                        Complete Transfer
                                    </Button>
                                ) : isCompleted ? (
                                    <Text color={positiveColor} fontSize="sm">
                                        Transfer completed - read only
                                    </Text>
                                ) : null}
                            </ModalFooter>
                        </form>
                    )}
                </ModalContent>
            </Modal>

            <StockItemSelectorModal
                isOpen={isStockItemModalOpen}
                onClose={() => {
                    setIsStockItemModalOpen(false);
                    setEditingIndex(null);
                }}
                onSelect={handleStockItemSelect}
                sourceBinId={fromBin?._id}
                existingItemIds={transferredItems.map(item => item.stockItem._id)}
            />
        </>
    );
}