// src/components/TransferModal.tsx
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
import { FiPlus, FiTrash2, FiSearch, FiCheckCircle, FiSave, FiUpload } from 'react-icons/fi';
import BinSelectorModal from './BinSelectorModal';
import StockItemSelectorModal from './StockItemSelectorModal';
import { nanoid } from 'nanoid';
import FileUploadModal from './FileUploadModal';
import { useSession } from 'next-auth/react';

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
    _id?: string;
    transferNumber?: string;
    transferDate?: string;
    status?: string;
    fromBin?: Bin | string;
    toBin?: Bin | string;
    items?: TransferredItem[];
    notes?: string;
}

interface StockItem {
    _id: string;
    name: string;
    sku?: string;
    unitOfMeasure?: string;
    currentStock?: number;
}

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    transfer: Transfer | null;
    onSave: () => void;
}

const getBinId = (bin: Bin | string | undefined): string => {
    if (!bin) return '';
    if (typeof bin === 'object') return bin._id;
    return String(bin);
};

const getBinName = (bin: Bin | string | undefined): string => {
    if (!bin) return '';
    if (typeof bin === 'object') return `${bin.name} (${bin.site?.name || ''})`;
    return String(bin);
};

export default function TransferModal({ isOpen, onClose, transfer, onSave }: TransferModalProps) {
    const { data: session } = useSession();
    const [transferNumber, setTransferNumber] = useState('');
    const [transferDate, setTransferDate] = useState('');
    const [status, setStatus] = useState('pending');
    const [fromBin, setFromBin] = useState('');
    const [toBin, setToBin] = useState('');
    const [fromBinName, setFromBinName] = useState('');
    const [toBinName, setToBinName] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<TransferredItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [sites, setSites] = useState<Site[]>([]);
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

    // File upload modal control
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [fileModalTitle, setFileModalTitle] = useState('Upload Evidence');
    const [evidenceType, setEvidenceType] = useState<'delivery-note' | 'photo' | 'receipt' | 'other'>('delivery-note');
    const [processing, setProcessing] = useState(false);

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

    useEffect(() => {
        if (isOpen) {
            setIsInitialLoading(true);
            (async () => {
                if (transfer && transfer._id) {
                    // Edit / view mode
                    setTransferNumber(transfer.transferNumber || '');
                    setTransferDate((transfer.transferDate || '').split('T')[0] || new Date().toISOString().split('T')[0]);
                    setStatus(transfer.status || 'pending');
                    setFromBin(getBinId(transfer.fromBin));
                    setToBin(getBinId(transfer.toBin));
                    setFromBinName(getBinName(transfer.fromBin));
                    setToBinName(getBinName(transfer.toBin));
                    setNotes(transfer.notes || '');
                    setItems((transfer.items || []).map(item => ({
                        _key: item._key || nanoid(),
                        stockItem: {
                            _id: item.stockItem?._id || item.stockItem || '',
                            name: item.stockItem?.name || '',
                            sku: item.stockItem?.sku || '',
                            unitOfMeasure: item.stockItem?.unitOfMeasure || '',
                            currentStock: item.stockItem?.currentStock || 0
                        },
                        transferredQuantity: item.transferredQuantity || 0,
                    })));
                    setIsInitialLoading(false);
                } else {
                    // Create mode
                    try {
                        const res = await fetch('/api/operations/transfers/next-number');
                        if (res.ok) {
                            const body = await res.json();
                            setTransferNumber(body.transferNumber || '');
                        }
                    } catch (err) {
                        console.warn('Could not fetch next transfer number', err);
                    }
                    setTransferDate(new Date().toISOString().split('T')[0]);
                    setStatus('pending');
                    setFromBin('');
                    setToBin('');
                    setFromBinName('');
                    setToBinName('');
                    setNotes('');
                    setItems([]);
                    setIsInitialLoading(false);
                }
            })();
        } else {
            // reset
            setIsInitialLoading(false);
            setCurrentEditingItemIndex(null);
        }
    }, [isOpen, transfer]);

    const handleAddItem = () => {
        const newItem: TransferredItem = {
            _key: nanoid(),
            stockItem: { _id: '', name: 'Select a stock item', unitOfMeasure: '', currentStock: 0 },
            transferredQuantity: 0,
        };
        setItems(prev => [...prev, newItem]);
        setCurrentEditingItemIndex(items.length);
        setIsStockItemModalOpen(true);
    };

    const handleRemoveItem = (key: string) => {
        setItems(prev => prev.filter(i => i._key !== key));
    };

    const handleItemChange = (key: string, field: keyof TransferredItem, value: any) => {
        setItems(prev => prev.map(it => it._key === key ? { ...it, [field]: value } : it));
    };

    const openStockItemModal = (index: number) => {
        setCurrentEditingItemIndex(index);
        setIsStockItemModalOpen(true);
    };

    const handleStockItemSelect = (item: StockItem) => {
        if (currentEditingItemIndex !== null) {
            setItems(prev => prev.map((it, idx) => idx === currentEditingItemIndex ? {
                ...it,
                stockItem: {
                    _id: item._id,
                    name: item.name,
                    sku: item.sku,
                    unitOfMeasure: item.unitOfMeasure,
                    currentStock: item.currentStock || 0
                }
            } : it));
            setStockItemsCache(prev => new Map(prev).set(item._id, item));
            setCurrentEditingItemIndex(null);
        }
        setIsStockItemModalOpen(false);
    };

    const isEditable = !transfer || status === 'pending';

    const validateForm = () => {
        if (!fromBin) { toast({ title: 'Error', description: 'Select a from bin', status: 'error' }); return false; }
        if (!toBin) { toast({ title: 'Error', description: 'Select a to bin', status: 'error' }); return false; }
        if (fromBin === toBin) { toast({ title: 'Error', description: 'From and to cannot be same', status: 'error' }); return false; }
        if (items.length === 0) { toast({ title: 'Error', description: 'Add at least one item', status: 'error' }); return false; }
        for (const it of items) {
            if (!it.stockItem?._id) { toast({ title: 'Error', description: 'Select stock item for all entries', status: 'error' }); return false; }
            if (!it.transferredQuantity || it.transferredQuantity <= 0) { toast({ title: 'Error', description: 'Enter valid quantity', status: 'error' }); return false; }
            if (it.stockItem.currentStock !== undefined && it.transferredQuantity > it.stockItem.currentStock) {
                toast({ title: 'Insufficient', description: `Not enough stock for ${it.stockItem.name}`, status: 'error' }); return false;
            }
        }
        return true;
    };

    const saveTransfer = async (): Promise<string | null> => {
        if (!validateForm()) return null;
        setLoading(true);
        try {
            const payload: any = {
                transferNumber,
                transferDate: new Date(transferDate).toISOString(),
                status,
                fromBin,
                toBin,
                notes: notes || '',
                items: items.map(it => ({ stockItem: it.stockItem._id, transferredQuantity: it.transferredQuantity })),
            };

            if (transfer && transfer._id) payload._id = transfer._id;

            const url = transfer && transfer._id ? `/api/operations/transfers` : `/api/operations/transfers`;
            const method = transfer && transfer._id ? 'PATCH' : 'POST';

            // For PATCH endpoint existing implementation expects _id in body
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to save transfer');
            }

            const resBody = await res.json();
            toast({ title: transfer ? 'Transfer updated' : 'Transfer created', status: 'success' });
            onSave();
            return resBody._id || resBody.id || (transfer && transfer._id) || null;
        } catch (err: any) {
            toast({ title: 'Error saving transfer', description: err.message || 'Unknown', status: 'error' });
            console.error(err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitForApproval = async () => {
        // ensure saved, then submit
        setProcessing(true);
        try {
            const id = await saveTransfer();
            if (!id) return;
            const res = await fetch(`/api/operations/transfers/${id}/submit`, { method: 'POST' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to submit for approval');
            }
            toast({ title: 'Submitted for approval', status: 'success' });
            onSave();
            onClose();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to submit', status: 'error' });
        } finally {
            setProcessing(false);
        }
    };

    const handleOpenUploadEvidence = () => {
        // only allowed when approved
        setFileModalTitle('Upload Transfer Evidence');
        setEvidenceType('delivery-note');
        setIsFileModalOpen(true);
    };

    // Called by FileUploadModal when upload completes. It sends attachmentId to complete route.
    const handleEvidenceUploadComplete = async (attachmentId: string) => {
        if (!transfer || !transfer._id) {
            toast({ title: 'Error', description: 'No transfer id available', status: 'error' });
            setIsFileModalOpen(false);
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch(`/api/operations/transfers/${transfer._id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attachmentId }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to complete transfer');
            }

            toast({ title: 'Transfer processed', description: 'Stock moved and transfer completed.', status: 'success' });
            onSave();
            onClose();
        } catch (err: any) {
            toast({ title: 'Error completing transfer', description: err.message || 'See console', status: 'error' });
        } finally {
            setProcessing(false);
            setIsFileModalOpen(false);
        }
    };

    const handleDirectComplete = async () => {
        // If operator prefers to complete without uploading (not recommended), call complete with no attachment
        if (!transfer || !transfer._id) {
            toast({ title: 'Error', description: 'No transfer id available', status: 'error' });
            return;
        }
        setProcessing(true);
        try {
            const res = await fetch(`/api/operations/transfers/${transfer._id}/complete`, { method: 'POST' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to complete transfer');
            }
            toast({ title: 'Transfer processed', status: 'success' });
            onSave();
            onClose();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to complete transfer', status: 'error' });
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmComplete = (e: React.MouseEvent) => {
        e.preventDefault();
        // open file upload modal to collect evidence (preferred)
        handleOpenUploadEvidence();
    };

    const existingItemIds = items.map(i => i.stockItem._id).filter(Boolean);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="6xl" closeOnOverlayClick={!loading && !processing}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{transfer ? 'Edit Transfer' : 'Create Transfer'}</ModalHeader>
                    <ModalCloseButton isDisabled={loading || processing} />
                    {isInitialLoading ? (
                        <ModalBody display="flex" justifyContent="center" alignItems="center" height="200px">
                            <VStack>
                                <Spinner size="xl" />
                                <Text mt={4}>Loading transfer data...</Text>
                            </VStack>
                        </ModalBody>
                    ) : (
                        <form onSubmit={async (e) => { e.preventDefault(); await saveTransfer(); }}>
                            <ModalBody pb={6}>
                                <VStack spacing={4} align="stretch">
                                    <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                                        <FormControl isRequired>
                                            <FormLabel>Transfer Number</FormLabel>
                                            <Input value={transferNumber} readOnly />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>Transfer Date</FormLabel>
                                            <Input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} isDisabled={!isEditable || loading} />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>Status</FormLabel>
                                            <Select value={status} onChange={(e) => setStatus(e.target.value)} isDisabled>
                                                <option value="pending">Pending</option>
                                                <option value="pending-approval">Pending Approval</option>
                                                <option value="approved">Approved</option>
                                                <option value="completed">Completed</option>
                                                <option value="rejected">Rejected</option>
                                                <option value="cancelled">Cancelled</option>
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                        <FormControl isRequired>
                                            <FormLabel>From Bin</FormLabel>
                                            <Input value={fromBinName} placeholder="Select a bin" readOnly onClick={() => isEditable && setIsFromBinModalOpen(true)} cursor={isEditable ? 'pointer' : 'default'} isDisabled={!isEditable} />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>To Bin</FormLabel>
                                            <Input value={toBinName} placeholder="Select a bin" readOnly onClick={() => isEditable && setIsToBinModalOpen(true)} cursor={isEditable ? 'pointer' : 'default'} isDisabled={!isEditable} />
                                        </FormControl>
                                    </Grid>

                                    <FormControl>
                                        <FormLabel>Notes</FormLabel>
                                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} isDisabled={!isEditable || loading} />
                                    </FormControl>

                                    <Text fontSize="lg" fontWeight="bold">Transferred Items</Text>

                                    {items.length === 0 ? (
                                        <Text color="gray.500" fontStyle="italic" textAlign="center" py={4}>No items added yet.</Text>
                                    ) : (
                                        <VStack spacing={3} align="stretch">
                                            {items.map((item, index) => (
                                                <Box key={item._key} p={3} borderWidth="1px" borderRadius="md">
                                                    <Grid templateColumns="1fr auto" gap={3} alignItems="center">
                                                        <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                                            <FormControl isRequired>
                                                                <FormLabel>Stock Item</FormLabel>
                                                                <Button variant="outline" justifyContent="space-between" onClick={() => isEditable && openStockItemModal(index)} px={3} h={10} width="100%" isDisabled={!isEditable}>
                                                                    <Flex justify="space-between" align="center" h="100%">
                                                                        <VStack align="start" spacing={0}>
                                                                            <Text fontSize="sm" fontWeight="medium">{item.stockItem.name || 'Select a stock item'}</Text>
                                                                            {item.stockItem.sku && <Text fontSize="xs" color="gray.500">SKU: {item.stockItem.sku}</Text>}
                                                                            {item.stockItem.currentStock !== undefined && <Text fontSize="xs" color="gray.500">Available: {item.stockItem.currentStock} {item.stockItem.unitOfMeasure}</Text>}
                                                                        </VStack>
                                                                    </Flex>
                                                                </Button>
                                                            </FormControl>

                                                            <FormControl isRequired>
                                                                <FormLabel>Quantity</FormLabel>
                                                                <NumberInput value={item.transferredQuantity} min={0} onChange={(vStr, vNum) => handleItemChange(item._key, 'transferredQuantity', vNum)} isDisabled={!isEditable || !item.stockItem._id}>
                                                                    <NumberInputField />
                                                                    <NumberInputStepper>
                                                                        <NumberIncrementStepper />
                                                                        <NumberDecrementStepper />
                                                                    </NumberInputStepper>
                                                                </NumberInput>
                                                            </FormControl>
                                                        </Grid>

                                                        <IconButton aria-label="Remove" icon={<FiTrash2 />} colorScheme="red" onClick={() => isEditable && handleRemoveItem(item._key)} isDisabled={!isEditable} />
                                                    </Grid>
                                                </Box>
                                            ))}
                                        </VStack>
                                    )}

                                    <Button leftIcon={<FiPlus />} onClick={handleAddItem} alignSelf="start" isDisabled={!isEditable || loading}>Add Item</Button>
                                </VStack>
                            </ModalBody>

                            <ModalFooter>
                                <Button variant="outline" mr={3} onClick={onClose} isDisabled={loading || processing}>Cancel</Button>

                                {isEditable ? (
                                    <>
                                        <Button colorScheme="blue" type="submit" isLoading={loading}> {transfer ? 'Save Changes' : 'Create Transfer'} </Button>
                                        <Button colorScheme="orange" ml={3} onClick={handleSubmitForApproval} isLoading={processing || loading} leftIcon={<FiUpload> </FiUpload>}>
                                            Submit for Approval
                                        </Button>
                                    </>
                                ) : status === 'pending-approval' ? (
                                    <Button colorScheme="gray" isDisabled>Pending approval</Button>
                                ) : status === 'approved' ? (
                                    <>
                                        <Button colorScheme="green" ml={3} onClick={handleConfirmComplete} isLoading={processing} leftIcon={<FiCheckCircle />}>
                                            Upload Evidence & Complete
                                        </Button>
                                        <Button colorScheme="teal" ml={3} onClick={handleDirectComplete} isLoading={processing}>
                                            Complete without evidence
                                        </Button>
                                    </>
                                ) : (
                                    <Button isDisabled>View</Button>
                                )}
                            </ModalFooter>
                        </form>
                    )}
                </ModalContent>
            </Modal>

            <BinSelectorModal isOpen={isFromBinModalOpen} onClose={() => setIsFromBinModalOpen(false)} onSelect={(b: any) => { setFromBin(b._id); setFromBinName(`${b.name} (${b.site?.name})`); setIsFromBinModalOpen(false); }} />
            <BinSelectorModal isOpen={isToBinModalOpen} onClose={() => setIsToBinModalOpen(false)} onSelect={(b: any) => { setToBin(b._id); setToBinName(`${b.name} (${b.site?.name})`); setIsToBinModalOpen(false); }} />

            <StockItemSelectorModal isOpen={isStockItemModalOpen} onClose={() => { setIsStockItemModalOpen(false); setCurrentEditingItemIndex(null); }} onSelect={handleStockItemSelect} existingItemIds={existingItemIds} />

            <FileUploadModal
                isOpen={isFileModalOpen}
                onClose={() => setIsFileModalOpen(false)}
                onUploadComplete={handleEvidenceUploadComplete}
                relatedToId={transfer?._id || ''}
                fileType={evidenceType}
                title={fileModalTitle}
                description="Upload an image or document that proves the transfer happened (e.g., delivery note, photo)."
            />

            <AlertDialog isOpen={isConfirmOpen} leastDestructiveRef={cancelRef} onClose={() => setIsConfirmOpen(false)}>
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">Confirm Complete Transfer</AlertDialogHeader>
                        <AlertDialogBody>Are you sure you want to mark this transfer as complete? This will move stock from the source bin to the destination bin.</AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
                            <Button colorScheme="green" onClick={handleDirectComplete} ml={3}>Confirm Complete</Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </>
    );
}
