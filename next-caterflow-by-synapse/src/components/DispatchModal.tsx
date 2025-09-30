// src/components/DispatchModal.tsx
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
    useColorModeValue
} from '@chakra-ui/react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import StockItemSelectorModal from './StockItemSelectorModal';
import FileUploadModal from './FileUploadModal';
import { nanoid } from 'nanoid';
import { useSession } from 'next-auth/react';

interface DispatchedItem {
    _key: string;
    stockItem: {
        _id: string;
        name: string;
        sku?: string;
        unitOfMeasure?: string;
        currentStock?: number;
        unitPrice?: number;
    };
    dispatchedQuantity: number;
    unitPrice?: number;
    totalCost?: number;
    notes?: string;
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

interface DispatchType {
    _id: string;
    name: string;
    description?: string;
    defaultTime: string;
}

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    associatedSite?: Site;
}

interface Dispatch {
    _id: string;
    dispatchNumber: string;
    dispatchDate: string;
    notes?: string;
    dispatchType: {
        _id: string;
        name: string;
    };
    dispatchedItems: DispatchedItem[];
    sourceBin: Bin;
    dispatchedBy: User;
    peopleFed?: number;
    evidenceStatus?: 'pending' | 'partial' | 'complete';
    status?: string;
    attachments?: { _id: string; url?: string; name?: string }[];
}

interface DispatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    dispatch?: Dispatch | null;
    onSave: () => void;
}

export default function DispatchModal({ isOpen, onClose, dispatch, onSave }: DispatchModalProps) {
    const [loading, setLoading] = useState(false);
    const [dispatchTypes, setDispatchTypes] = useState<DispatchType[]>([]);
    const [allBins, setAllBins] = useState<Bin[]>([]);
    const [sourceBin, setSourceBin] = useState<Bin | null>(null);
    const [dispatchDate, setDispatchDate] = useState('');
    const [dispatchType, setDispatchType] = useState('');
    const [dispatchedItems, setDispatchedItems] = useState<DispatchedItem[]>([]);
    const [notes, setNotes] = useState('');
    const [peopleFed, setPeopleFed] = useState<number | undefined>(undefined);
    const [isStockItemModalOpen, setIsStockItemModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [itemsLoading, setItemsLoading] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [savedDispatchId, setSavedDispatchId] = useState<string>('');

    const toast = useToast();
    const { data: session, status: sessionStatus } = useSession();
    const user = session?.user as unknown as User;
    const userSite = user?.associatedSite;
    const userRole = user?.role;

    const tableHeaderColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const tableBorderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const tableBg = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const textSecondaryColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const tableBoxShadow = useColorModeValue('md', 'dark-md');

    const existingItemIds = dispatchedItems.filter(item => item.stockItem).map(item => item.stockItem._id);

    // Safe number conversion helper function
    const safeNumber = (value: string | number): number => {
        if (typeof value === 'number') return isNaN(value) ? 0 : value;
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    // Safe number input handler
    const handleNumberInput = (value: string): number => {
        // Allow empty string, but convert to 0 for calculations
        if (value === '' || value === '-') return 0;
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    // load dispatch types and bins when modal opens
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [dispatchTypesRes, binsRes] = await Promise.all([
                    fetch('/api/dispatch-types'),
                    fetch('/api/bins')
                ]);

                if (!dispatchTypesRes.ok) throw new Error('Failed to fetch dispatch types');
                if (!binsRes.ok) throw new Error('Failed to fetch bins');

                const dispatchTypesData = await dispatchTypesRes.json();
                const binsData = await binsRes.json();

                setDispatchTypes(dispatchTypesData);
                setAllBins(binsData);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast({
                    title: 'Error fetching data.',
                    description: 'Please try again later.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchData();
        }
    }, [isOpen, toast]);

    // initialize form from dispatch prop (edit) or defaults (new)
    useEffect(() => {
        if (dispatch) {
            setDispatchDate(dispatch.dispatchDate ? dispatch.dispatchDate.split('T')[0] : '');
            setDispatchType(dispatch.dispatchType?._id || '');
            setSourceBin(dispatch.sourceBin || null);
            setDispatchedItems(dispatch.dispatchedItems || []);
            setNotes(dispatch.notes || '');
            setPeopleFed(dispatch.peopleFed);
            setSavedDispatchId(dispatch._id || '');
        } else {
            const today = new Date().toISOString().split('T')[0];
            setDispatchDate(today);
            setDispatchType('');
            setSourceBin(null);
            setDispatchedItems([]);
            setNotes('');
            setPeopleFed(undefined);
            setEditingIndex(null);
            setSavedDispatchId('');
        }
    }, [dispatch, isOpen]);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        const fetchDefaultBin = async () => {
            if (!dispatch && sessionStatus === 'authenticated' && user?.associatedSite?._id) {
                setLoading(true);
                try {
                    const binRes = await fetch(
                        `/api/sites/${encodeURIComponent(user.associatedSite._id)}/main-bin`,
                        { signal: controller.signal }
                    );
                    if (!binRes.ok) throw new Error('Failed to fetch main bin');
                    const mainBin = await binRes.json();

                    if (mounted) {
                        setSourceBin(mainBin);
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') return;
                    console.log('Error fetching main bin:', error);
                    if (mounted) {
                        console.log('Error Setting Default Bin - ', error);
                    }
                } finally {
                    if (mounted) setLoading(false);
                }
            }
        };

        fetchDefaultBin();

        return () => {
            mounted = false;
            controller.abort();
        };
    }, [dispatch, sessionStatus, user?.associatedSite?._id, toast]);

    const isNew = !dispatch || dispatch._id?.startsWith?.('temp-');
    const isEditable = !(dispatch?.evidenceStatus === 'complete' || dispatch?.status === 'completed');

    // Update the handler functions:
    const handleUnitPriceChange = (key: string, value: string) => {
        // If current value is 0 and user starts typing, replace the 0
        const currentItem = dispatchedItems.find(item => item._key === key);
        const currentValue = currentItem?.unitPrice || 0;

        // If current value is 0 and user types a new digit, replace the 0
        if (currentValue === 0 && value !== '0' && value !== '' && !value.includes('.')) {
            // User is typing a new number, use the new value directly
            const valueAsNumber = handleNumberInput(value);
            setDispatchedItems(prevItems =>
                prevItems.map(item => {
                    if (item._key === key) {
                        const unitPrice = valueAsNumber;
                        const totalCost = unitPrice * (item.dispatchedQuantity || 0);
                        return {
                            ...item,
                            unitPrice,
                            totalCost
                        };
                    }
                    return item;
                })
            );
        } else {
            // Normal handling for other cases
            const valueAsNumber = handleNumberInput(value);
            setDispatchedItems(prevItems =>
                prevItems.map(item => {
                    if (item._key === key) {
                        const unitPrice = valueAsNumber;
                        const totalCost = unitPrice * (item.dispatchedQuantity || 0);
                        return {
                            ...item,
                            unitPrice,
                            totalCost
                        };
                    }
                    return item;
                })
            );
        }
    };

    const handleQuantityChange = (key: string, value: string) => {
        const currentItem = dispatchedItems.find(item => item._key === key);
        const currentValue = currentItem?.dispatchedQuantity || 0;

        // If current value is 0 and user starts typing a new number
        if (currentValue === 0 && value !== '0' && value !== '' && !value.includes('.')) {
            const valueAsNumber = handleNumberInput(value);
            setDispatchedItems(prevItems =>
                prevItems.map(item => {
                    if (item._key === key) {
                        const unitPrice = item.unitPrice || 0;
                        const totalCost = unitPrice * valueAsNumber;
                        return {
                            ...item,
                            dispatchedQuantity: valueAsNumber,
                            totalCost
                        };
                    }
                    return item;
                })
            );
        } else {
            const valueAsNumber = handleNumberInput(value);
            setDispatchedItems(prevItems =>
                prevItems.map(item => {
                    if (item._key === key) {
                        const unitPrice = item.unitPrice || 0;
                        const totalCost = unitPrice * valueAsNumber;
                        return {
                            ...item,
                            dispatchedQuantity: valueAsNumber,
                            totalCost
                        };
                    }
                    return item;
                })
            );
        }
    };
    // Updated people fed handler with decimal support and NaN protection
    const handlePeopleFedChange = (valueAsString: string) => {
        const valueAsNumber = handleNumberInput(valueAsString);
        setPeopleFed(valueAsNumber);
    };

    const calculateGrandTotal = (): number => {
        return dispatchedItems.reduce((total, item) => {
            return total + (item.totalCost || 0);
        }, 0);
    };

    const calculateCostPerPerson = (): number => {
        const grandTotal = calculateGrandTotal();
        return peopleFed && peopleFed > 0 ? grandTotal / peopleFed : 0;
    };

    // Stock item selection
    const handleStockItemSelect = (item: any) => {
        const unitPrice = safeNumber(item.unitPrice || 0);
        const newItem: DispatchedItem = {
            _key: nanoid(),
            stockItem: {
                _id: item._id,
                name: item.name,
                sku: item.sku,
                unitOfMeasure: item.unitOfMeasure,
                currentStock: item.currentStock,
                unitPrice: unitPrice,
            },
            dispatchedQuantity: 1,
            unitPrice: unitPrice,
            totalCost: unitPrice * 1,
            notes: '',
        };

        setDispatchedItems(prevItems => {
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

    const handleRemoveItem = (key: string) => {
        setDispatchedItems(prevItems => prevItems.filter(item => item._key !== key));
    };

    const handleNotesChange = (key: string, value: string) => {
        setDispatchedItems(prevItems =>
            prevItems.map(item =>
                item._key === key ? { ...item, notes: value } : item
            )
        );
    };

    const handleEditItem = (index: number) => {
        setEditingIndex(index);
        setIsStockItemModalOpen(true);
    };

    const isSubmitDisabled = !dispatchDate || !dispatchType || !sourceBin || dispatchedItems.length === 0 || !isEditable;

    // Save dispatch (create or update)
    const saveDispatch = async (status: string = 'draft') => {
        setIsSaving(true);
        try {
            if (!dispatchType || !sourceBin) {
                toast({
                    title: 'Missing Information',
                    description: 'Please select a dispatch type and source bin.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                });
                throw new Error('Missing dispatch type or source bin');
            }

            const payload: any = {
                dispatchDate: new Date(dispatchDate).toISOString(),
                dispatchType: { _type: 'reference', _ref: dispatchType },
                sourceBin: { _type: 'reference', _ref: sourceBin?._id },
                dispatchedItems: dispatchedItems.map(item => ({
                    _type: 'DispatchedItem',
                    _key: item._key || nanoid(),
                    stockItem: {
                        _type: 'reference',
                        _ref: item.stockItem._id
                    },
                    dispatchedQuantity: safeNumber(item.dispatchedQuantity),
                    unitPrice: safeNumber(item.unitPrice || 0),
                    totalCost: safeNumber(item.totalCost || 0),
                    notes: item.notes || '',
                })),
                notes,
                peopleFed: safeNumber(peopleFed || 0),
                evidenceStatus: dispatch?.evidenceStatus || 'pending',
                status,
                dispatchedBy: { _type: 'reference', _ref: (session?.user as any)?.id || (session?.user as any)?._id || undefined }
            };

            let url = '/api/dispatches';
            let method: 'POST' | 'PATCH' = 'POST';

            if (!isNew && dispatch?._id) {
                url = `/api/dispatches/${dispatch._id}`;
                method = 'PATCH';
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to save dispatch');
            }

            const result = await res.json();
            const id = result._id || result.id || dispatch?._id;
            setSavedDispatchId(id);

            toast({
                title: status === 'draft' ? 'Draft saved' : 'Dispatch saved',
                status: 'success',
                duration: 2500,
                isClosable: true,
            });

            return result;
        } catch (error: any) {
            console.error('Save dispatch error:', error);
            toast({
                title: 'Error saving dispatch',
                description: error?.message || 'An error occurred',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            throw error;
        } finally {
            setIsSaving(false);
        }
    };

    // Submit handler for the form (create/update without completing)
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            const result = await saveDispatch('draft');
            setSavedDispatchId(result._id || result.id); // Ensure ID is set
            onSave();
            onClose();
        } catch {
            // saveDispatch already shows toast
        }
    };

    // Check all items dispatched (used to enable complete action)
    const isFullyDispatched = dispatchedItems.length > 0 && dispatchedItems.every(item => item.dispatchedQuantity > 0);

    // Trigger the complete flow: ensure saved, then open upload modal
    const handleCompleteDispatch = async () => {
        if (!isFullyDispatched) {
            toast({
                title: 'Incomplete dispatch',
                description: 'You must set dispatched quantities for all items before completing.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        try {
            setIsSaving(true);
            if (isNew || !dispatch?._id) {
                const saved = await saveDispatch('draft');
                const id = saved._id || saved.id;
                setSavedDispatchId(id);
            } else {
                setSavedDispatchId(dispatch._id);
            }

            setIsUploadModalOpen(true);
        } catch (err) {
            // errors handled in saveDispatch
        } finally {
            setIsSaving(false);
        }
    };

    // Called by FileUploadModal when upload completes
    const handleFinalizeDispatch = async (attachmentIds: string[]) => {
        setIsUploadModalOpen(false);
        setIsSaving(true);

        try {
            const idToUse = savedDispatchId || dispatch?._id;
            if (!idToUse) throw new Error('No dispatch ID available to finalize');

            if (attachmentIds.length === 0) {
                throw new Error('No attachments uploaded');
            }

            const body: any = {
                evidenceStatus: 'complete',
                status: 'completed',
                completedAt: new Date().toISOString(),
                attachments: attachmentIds.map(id => ({ _type: 'reference', _ref: id })),
            };

            const res = await fetch(`/api/dispatches/${idToUse}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to finalize dispatch');
            }

            toast({
                title: 'Dispatch completed',
                description: `Evidence uploaded (${attachmentIds.length} files) and dispatch marked as complete.`,
                status: 'success',
                duration: 4000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Finalize error:', error);
            toast({
                title: 'Error finalizing dispatch',
                description: error?.message || 'Failed to finalize dispatch',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredBins = userRole === 'admin'
        ? allBins
        : allBins.filter(bin => bin.site._id === userSite?._id);

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={() => {
                    // Refresh if a draft was saved during this session
                    if (savedDispatchId) {
                        onSave();
                    }
                    onClose();
                }}
                size={{ base: 'full', md: '4xl' }}
                closeOnOverlayClick={!isSaving && !isUploadModalOpen}
                scrollBehavior="inside"
            >
                <ModalOverlay />
                <ModalContent maxH="100vh">
                    <ModalHeader>{dispatch ? 'Update Dispatch' : 'Create New Dispatch'}</ModalHeader>
                    <ModalCloseButton isDisabled={isSaving} />
                    {loading && !dispatch ? (
                        <Box p={8} textAlign="center">
                            <Spinner size="xl" />
                            <Text mt={4}>Loading form...</Text>
                        </Box>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <ModalBody maxHeight="80vh" overflowY="auto">
                                <VStack spacing={4} align="stretch">
                                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                                        <GridItem>
                                            <FormControl isRequired>
                                                <FormLabel>Dispatch Type</FormLabel>
                                                <Select
                                                    placeholder="Select dispatch type"
                                                    value={dispatchType}
                                                    onChange={(e) => setDispatchType(e.target.value)}
                                                    isDisabled={!isEditable || loading}
                                                >
                                                    {dispatchTypes.map((type) => (
                                                        <option key={type._id} value={type._id}>
                                                            {type.name}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </GridItem>
                                        <GridItem>
                                            <FormControl isRequired>
                                                <FormLabel>Source Bin</FormLabel>
                                                <Select
                                                    placeholder={filteredBins.length === 0 ? "No bins available" : "Select source bin"}
                                                    value={sourceBin?._id || ''}
                                                    onChange={(e) => {
                                                        const selectedBin = filteredBins.find(bin => bin._id === e.target.value);
                                                        if (selectedBin) {
                                                            setSourceBin(selectedBin);
                                                        }
                                                    }}
                                                    isDisabled={!isEditable || loading || filteredBins.length === 0 || !!dispatch}
                                                >
                                                    {filteredBins.map((bin) => (
                                                        <option key={bin._id} value={bin._id}>
                                                            {bin.name} ({bin.site.name})
                                                        </option>
                                                    ))}
                                                </Select>
                                                {dispatch ? (
                                                    <Text fontSize="sm" color={textSecondaryColor} mt={1}>
                                                        Source bin cannot be changed for existing dispatches
                                                    </Text>
                                                ) : (
                                                    <>
                                                        {userSite && userRole !== 'admin' && (
                                                            <Text fontSize="sm" color={textSecondaryColor} mt={1}>
                                                                Your site: {userSite.name}
                                                            </Text>
                                                        )}
                                                        {userRole === 'admin' && (
                                                            <Text fontSize="sm" color={textSecondaryColor} mt={1}>
                                                                Admin: All bins available
                                                            </Text>
                                                        )}
                                                        {filteredBins.length === 0 && (
                                                            <Text fontSize="sm" color="red.500" mt={1}>
                                                                No bins available for your site
                                                            </Text>
                                                        )}
                                                    </>
                                                )}
                                            </FormControl>
                                        </GridItem>
                                    </Grid>

                                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                                        <GridItem>
                                            <FormControl isRequired>
                                                <FormLabel>Dispatch Date</FormLabel>
                                                <Input
                                                    type="date"
                                                    value={dispatchDate}
                                                    onChange={(e) => setDispatchDate(e.target.value)}
                                                    isDisabled={!isEditable || loading}
                                                />
                                            </FormControl>
                                        </GridItem>
                                        <GridItem>
                                            <FormControl>
                                                <FormLabel>People Fed</FormLabel>
                                                <NumberInput
                                                    value={peopleFed || 0}
                                                    min={0}
                                                    onChange={handlePeopleFedChange}
                                                    isDisabled={!isEditable || loading}
                                                    precision={2}
                                                    step={1}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                        </GridItem>
                                    </Grid>

                                    <FormControl>
                                        <FormLabel>Notes</FormLabel>
                                        <Textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add any notes about this dispatch..."
                                            isDisabled={!isEditable || loading}
                                        />
                                    </FormControl>

                                    <Divider />

                                    <VStack spacing={4} align="stretch">
                                        <HStack justify="space-between" align="center">
                                            <FormLabel mb={0}>Dispatched Items</FormLabel>
                                            {itemsLoading && (
                                                <Spinner size="sm" />
                                            )}
                                        </HStack>

                                        {dispatchedItems.length === 0 ? (
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
                                                            <Th color={tableHeaderColor} borderColor={tableBorderColor}>Unit Price</Th>
                                                            <Th color={tableHeaderColor} borderColor={tableBorderColor}>Quantity</Th>
                                                            <Th color={tableHeaderColor} borderColor={tableBorderColor}>Total Cost</Th>
                                                            <Th color={tableHeaderColor} borderColor={tableBorderColor}>Unit</Th>
                                                            <Th color={tableHeaderColor} borderColor={tableBorderColor}> </Th>
                                                        </Tr>
                                                    </Thead>
                                                    <Tbody>
                                                        {dispatchedItems.map((item, index) => (
                                                            <Tr key={item._key}>
                                                                <Td borderColor={tableBorderColor}>{item.stockItem.name}</Td>
                                                                <Td borderColor={tableBorderColor}>
                                                                    <Input
                                                                        value={item.unitPrice || 0}
                                                                        onChange={(e) => handleUnitPriceChange(item._key, e.target.value)}
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        size="sm"
                                                                        width="100px"
                                                                        isDisabled={!isEditable}
                                                                    />
                                                                </Td>

                                                                <Td borderColor={tableBorderColor}>
                                                                    <Input
                                                                        value={item.dispatchedQuantity}
                                                                        onChange={(e) => handleQuantityChange(item._key, e.target.value)}
                                                                        type="number"
                                                                        step="0.1"
                                                                        min="0"
                                                                        size="sm"
                                                                        width="100px"
                                                                        isDisabled={!isEditable}
                                                                    />
                                                                </Td>
                                                                <Td borderColor={tableBorderColor}>
                                                                    <Text fontWeight="medium">
                                                                        E {(item.totalCost || 0).toFixed(2)}
                                                                    </Text>
                                                                </Td>
                                                                <Td borderColor={tableBorderColor}>{item.stockItem.unitOfMeasure}</Td>
                                                                <Td borderColor={tableBorderColor}>
                                                                    <HStack>
                                                                        <IconButton
                                                                            aria-label="Remove item"
                                                                            icon={<FiTrash2 />}
                                                                            size="sm"
                                                                            onClick={() => handleRemoveItem(item._key)}
                                                                            isDisabled={!isEditable}
                                                                        />
                                                                    </HStack>
                                                                </Td>
                                                            </Tr>
                                                        ))}
                                                    </Tbody>
                                                </Table>
                                            </TableContainer>
                                        )}

                                        {/* Cost Summary Section */}
                                        {dispatchedItems.length > 0 && (
                                            <VStack align="stretch" mt={4} p={4} borderRadius="md">
                                                <HStack justify="space-between">
                                                    <Text fontWeight="bold">Grand Total Cost:</Text>
                                                    <Text fontWeight="bold" fontSize="lg">
                                                        E{calculateGrandTotal().toFixed(2)}
                                                    </Text>
                                                </HStack>

                                                {peopleFed && peopleFed > 0 ? (
                                                    <>
                                                        <HStack justify="space-between">
                                                            <Text>Cost per Person:</Text>
                                                            <Text fontWeight="medium">
                                                                E {calculateCostPerPerson().toFixed(2)}
                                                            </Text>
                                                        </HStack>
                                                        <Text fontSize="sm" color="gray.600">
                                                            Based on {peopleFed} people fed
                                                        </Text>
                                                    </>
                                                ) : (
                                                    <Text fontSize="sm" color="gray.600" fontStyle="italic">
                                                        No people fed specified
                                                    </Text>
                                                )}
                                            </VStack>
                                        )}

                                        <Button
                                            leftIcon={<FiPlus />}
                                            onClick={() => setIsStockItemModalOpen(true)}
                                            variant="outline"
                                            isDisabled={loading || !sourceBin || !isEditable}
                                            alignSelf="flex-start"
                                        >
                                            Add Item
                                        </Button>
                                    </VStack>
                                </VStack>
                            </ModalBody>

                            <ModalFooter>
                                <Button variant="outline" mr={3} onClick={onClose} isDisabled={isSaving || loading}>
                                    Cancel
                                </Button>
                                {isEditable ? (
                                    <>
                                        <Button
                                            colorScheme="blue"
                                            type="submit"
                                            isLoading={isSaving}
                                            isDisabled={isSubmitDisabled}
                                            loadingText={dispatch ? "Updating..." : "Creating..."}
                                            mr={3}
                                        >
                                            {dispatch ? 'Update Dispatch' : 'Create Dispatch'}
                                        </Button>

                                        <Button
                                            colorScheme="green"
                                            onClick={handleCompleteDispatch}
                                            isLoading={isSaving}
                                            isDisabled={!isFullyDispatched || dispatchedItems.length === 0 || isSaving}
                                        >
                                            {isNew ? 'Save & Upload Evidence' : 'Upload Evidence & Complete'}
                                        </Button>
                                    </>
                                ) : (
                                    <Text color={textSecondaryColor} fontSize="sm">Dispatch is completed — read-only.</Text>
                                )}
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
                existingItemIds={existingItemIds}
                sourceBinId={sourceBin?._id}
            />

            <FileUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    setIsUploadModalOpen(false);
                    // Refresh and close main modal when upload is cancelled
                    onSave();
                    onClose();
                }}
                onUploadComplete={handleFinalizeDispatch}
                relatedToId={savedDispatchId || dispatch?._id || ''}
                fileType="other"
                title="Upload Dispatch Evidence"
                description="Please upload photos or documents as evidence before completing the dispatch."
            />
        </>
    );
}