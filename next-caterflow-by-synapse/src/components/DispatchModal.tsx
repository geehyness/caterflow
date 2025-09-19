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
    Flex,
    Icon,
    Spinner,
    Grid,
    GridItem,
    Textarea,
    InputGroup,
    Divider
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiSearch, FiEdit } from 'react-icons/fi';
import BinSelectorModal from './BinSelectorModal';
import StockItemSelectorModal from './StockItemSelectorModal';
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
    };
    dispatchedQuantity: number;
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
    evidenceStatus: 'pending' | 'partial' | 'complete';
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
    const [sourceBin, setSourceBin] = useState<Bin | null>(null);
    const [dispatchDate, setDispatchDate] = useState('');
    const [dispatchType, setDispatchType] = useState('');
    const [dispatchedItems, setDispatchedItems] = useState<DispatchedItem[]>([]);
    const [notes, setNotes] = useState('');
    const [peopleFed, setPeopleFed] = useState<number | undefined>(undefined);
    const [isBinModalOpen, setIsBinModalOpen] = useState(false);
    const [isStockItemModalOpen, setIsStockItemModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const toast = useToast();
    const { data: session, status: sessionStatus } = useSession();

    const existingItemIds = dispatchedItems.filter(item => item.stockItem).map(item => item.stockItem._id);

    useEffect(() => {
        const fetchDispatchTypes = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/dispatch-types');
                if (!res.ok) throw new Error('Failed to fetch dispatch types');
                const data = await res.json();
                setDispatchTypes(data);
            } catch (error) {
                console.error('Error fetching dispatch types:', error);
                toast({
                    title: 'Error fetching dispatch types.',
                    description: 'Please try again later.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDispatchTypes();
    }, [toast]);

    useEffect(() => {
        if (dispatch) {
            setDispatchDate(dispatch.dispatchDate.split('T')[0]);
            setDispatchType(dispatch.dispatchType._id);
            setSourceBin(dispatch.sourceBin);
            setDispatchedItems(dispatch.dispatchedItems);
            setNotes(dispatch.notes || '');
            setPeopleFed(dispatch.peopleFed);
        } else {
            const today = new Date().toISOString().split('T')[0];
            setDispatchDate(today);
            setDispatchType('');
            setSourceBin(null);
            setDispatchedItems([]);
            setNotes('');
            setPeopleFed(undefined);
            setEditingIndex(null);
        }
    }, [dispatch]);

    // New useEffect to handle default site and bin
    useEffect(() => {
        const fetchDefaultBin = async () => {
            // Only run if creating a new dispatch and the session is loaded
            if (!dispatch && sessionStatus === 'authenticated' && session?.user?.id) {
                setLoading(true);
                try {
                    // Fetch the user's details to get their assigned site
                    const userRes = await fetch(`/api/users/${session.user.id}`);
                    if (!userRes.ok) throw new Error('Failed to fetch user data');
                    const user = await userRes.json();

                    if (user.assignedSite?._id) {
                        // Fetch the main bin for the user's assigned site
                        const binRes = await fetch(`/api/sites/${user.assignedSite._id}/main-bin`);
                        if (!binRes.ok) throw new Error('Failed to fetch main bin');
                        const mainBin = await binRes.json();
                        setSourceBin(mainBin);
                    }
                } catch (error) {
                    console.error('Error setting default bin:', error);
                    toast({
                        title: 'Error setting default bin.',
                        description: 'Please select a bin manually.',
                        status: 'warning',
                        duration: 5000,
                        isClosable: true,
                    });
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchDefaultBin();
    }, [dispatch, sessionStatus, session, toast]);

    const handleBinSelect = (bin: Bin) => {
        setSourceBin(bin);
        setIsBinModalOpen(false);
    };

    const handleStockItemSelect = (item: any) => {
        const newItem: DispatchedItem = {
            _key: nanoid(),
            stockItem: {
                _id: item._id,
                name: item.name,
                sku: item.sku,
                unitOfMeasure: item.unitOfMeasure,
                currentStock: item.currentStock,
            },
            dispatchedQuantity: 0,
            totalCost: 0,
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

    const handleQuantityChange = (key: string, valueAsString: string, valueAsNumber: number) => {
        setDispatchedItems(prevItems =>
            prevItems.map(item =>
                item._key === key ? { ...item, dispatchedQuantity: valueAsNumber } : item
            )
        );
    };

    const handleCostChange = (key: string, valueAsString: string, valueAsNumber: number) => {
        setDispatchedItems(prevItems =>
            prevItems.map(item =>
                item._key === key ? { ...item, totalCost: valueAsNumber } : item
            )
        );
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

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);

        const dispatchData = {
            ...dispatch,
            dispatchDate,
            dispatchType: {
                _type: 'reference',
                _ref: dispatchType,
            },
            sourceBin: {
                _type: 'reference',
                _ref: sourceBin?._id,
            },
            dispatchedItems,
            notes,
            peopleFed,
            dispatchedBy: {
                _type: 'reference',
                _ref: session?.user?.id,
            },
        };

        try {
            const method = 'POST'; // We will always use POST
            const url = dispatch ? `/api/dispatches/${dispatch._id}` : '/api/dispatches';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dispatchData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Failed to ${dispatch ? 'update' : 'create'} dispatch`);
            }

            toast({
                title: `Dispatch ${dispatch ? 'updated' : 'created'}.`,
                description: `Successfully ${dispatch ? 'updated' : 'created'} the dispatch record.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Submission error:', error);
            toast({
                title: `Error ${dispatch ? 'updating' : 'creating'} dispatch.`,
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const isSubmitDisabled = !dispatchDate || !dispatchType || !sourceBin || dispatchedItems.length === 0;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="3xl" closeOnOverlayClick={!loading}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{dispatch ? 'Update Dispatch' : 'Create New Dispatch'}</ModalHeader>
                    <ModalCloseButton isDisabled={loading} />
                    {loading && !dispatch ? (
                        <Box p={8} textAlign="center">
                            <Spinner size="xl" />
                            <Text mt={4}>Loading form...</Text>
                        </Box>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <ModalBody>
                                <VStack spacing={4} align="stretch">
                                    <FormControl isRequired>
                                        <FormLabel>Dispatch Type</FormLabel>
                                        <Select
                                            placeholder="Select dispatch type"
                                            value={dispatchType}
                                            onChange={(e) => setDispatchType(e.target.value)}
                                            isDisabled={loading}
                                        >
                                            {dispatchTypes.map((type) => (
                                                <option key={type._id} value={type._id}>
                                                    {type.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl isRequired>
                                        <FormLabel>Source Bin</FormLabel>
                                        <InputGroup>
                                            <Input
                                                value={sourceBin ? `${sourceBin.name} (${sourceBin.site.name})` : ''}
                                                placeholder="Select a source bin"
                                                readOnly
                                                isDisabled={loading}
                                            />
                                            <IconButton
                                                aria-label="Select source bin"
                                                icon={<FiSearch />}
                                                onClick={() => setIsBinModalOpen(true)}
                                                ml={2}
                                                isDisabled={loading}
                                            />
                                        </InputGroup>
                                    </FormControl>

                                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                                        <GridItem>
                                            <FormControl isRequired>
                                                <FormLabel>Dispatch Date</FormLabel>
                                                <Input
                                                    type="date"
                                                    value={dispatchDate}
                                                    onChange={(e) => setDispatchDate(e.target.value)}
                                                    isDisabled={loading}
                                                />
                                            </FormControl>
                                        </GridItem>
                                        <GridItem>
                                            <FormControl>
                                                <FormLabel>People Fed</FormLabel>
                                                <NumberInput
                                                    value={peopleFed || 0}
                                                    min={0}
                                                    onChange={(valueAsString, valueAsNumber) => setPeopleFed(valueAsNumber)}
                                                    isDisabled={loading}
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
                                            isDisabled={loading}
                                        />
                                    </FormControl>

                                    <Divider />

                                    <VStack spacing={4} align="stretch" key={dispatchedItems.length}>
                                        <FormLabel>Dispatched Items</FormLabel>
                                        {dispatchedItems.length === 0 && (
                                            <Text textAlign="center" color="gray.500">
                                                No items added yet.
                                            </Text>
                                        )}
                                        {dispatchedItems.filter(item => item.stockItem).map((item, index) => (
                                            <Box
                                                key={item._key}
                                                p={4}
                                                borderWidth="1px"
                                                borderRadius="md"
                                            >
                                                <HStack justifyContent="space-between" mb={2}>
                                                    <Text fontWeight="bold" fontSize="lg">{item.stockItem?.name}</Text>
                                                    <HStack>
                                                        <IconButton
                                                            aria-label="Remove item"
                                                            icon={<FiTrash2 />}
                                                            onClick={() => handleRemoveItem(item._key)}
                                                            colorScheme="red"
                                                            size="sm"
                                                            variant="ghost"
                                                            isDisabled={loading}
                                                        />
                                                    </HStack>
                                                </HStack>
                                                <FormControl isRequired>
                                                    <FormLabel>Quantity ({item.stockItem.unitOfMeasure})</FormLabel>
                                                    <NumberInput
                                                        value={item.dispatchedQuantity || 0}
                                                        min={0}
                                                        onChange={(valueAsString, valueAsNumber) =>
                                                            handleQuantityChange(item._key, valueAsString, valueAsNumber)
                                                        }
                                                        isDisabled={loading}
                                                    >
                                                        <NumberInputField />
                                                        <NumberInputStepper>
                                                            <NumberIncrementStepper />
                                                            <NumberDecrementStepper />
                                                        </NumberInputStepper>
                                                    </NumberInput>
                                                </FormControl>
                                            </Box>
                                        ))}
                                    </VStack>

                                    <Button
                                        leftIcon={<FiPlus />}
                                        onClick={() => setIsStockItemModalOpen(true)}
                                        variant="outline"
                                        isDisabled={loading || !sourceBin}
                                    >
                                        Add Item
                                    </Button>
                                </VStack>
                            </ModalBody>

                            <ModalFooter>
                                <Button variant="outline" mr={3} onClick={onClose} isDisabled={loading}>
                                    Cancel
                                </Button>
                                <Button colorScheme="brand" type="submit" isLoading={loading} isDisabled={isSubmitDisabled}>
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
                selectedSiteId={sourceBin?.site?._id}
            />

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
        </>
    );
}