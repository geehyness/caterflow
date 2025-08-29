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
} from '@chakra-ui/react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

interface TransferItem {
    stockItem: string;
    transferredQuantity: number;
}

interface Transfer {
    _id: string;
    transferNumber: string;
    transferDate: string;
    status: string;
    fromBin: string;
    toBin: string;
    items: TransferItem[];
}

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    transfer: Transfer | null;
    onSave: () => void;
}

export default function TransferModal({ isOpen, onClose, transfer, onSave }: TransferModalProps) {
    const [transferNumber, setTransferNumber] = useState('');
    const [transferDate, setTransferDate] = useState('');
    const [status, setStatus] = useState('pending');
    const [fromBin, setFromBin] = useState('');
    const [toBin, setToBin] = useState('');
    const [items, setItems] = useState<TransferItem[]>([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (transfer) {
            setTransferNumber(transfer.transferNumber || '');
            setTransferDate(transfer.transferDate || '');
            setStatus(transfer.status || 'pending');
            setFromBin(transfer.fromBin || '');
            setToBin(transfer.toBin || '');
            setItems(transfer.items || []);
        } else {
            setTransferNumber('');
            setTransferDate(new Date().toISOString().split('T')[0]);
            setStatus('pending');
            setFromBin('');
            setToBin('');
            setItems([]);
        }
    }, [transfer]);

    const handleAddItem = () => {
        setItems([...items, { stockItem: '', transferredQuantity: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof TransferItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = '/api/transfers';
            const method = transfer ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    _id: transfer?._id,
                    transferNumber,
                    transferDate,
                    status,
                    fromBin,
                    toBin,
                    items,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save transfer');
            }

            toast({
                title: transfer ? 'Transfer updated.' : 'Transfer created.',
                description: `Transfer "${transferNumber}" has been ${transfer ? 'updated' : 'created'}.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Failed to save transfer:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save transfer. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{transfer ? 'Edit Transfer' : 'Create Transfer'}</ModalHeader>
                <ModalCloseButton />
                <form onSubmit={handleSave}>
                    <ModalBody pb={6}>
                        <VStack spacing={4} align="stretch">
                            <HStack>
                                <FormControl isRequired>
                                    <FormLabel>Transfer Number</FormLabel>
                                    <Input
                                        value={transferNumber}
                                        onChange={(e) => setTransferNumber(e.target.value)}
                                        placeholder="e.g., TRF-001"
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Transfer Date</FormLabel>
                                    <Input
                                        type="date"
                                        value={transferDate}
                                        onChange={(e) => setTransferDate(e.target.value)}
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
                                    <FormLabel>From Bin</FormLabel>
                                    <Input
                                        value={fromBin}
                                        onChange={(e) => setFromBin(e.target.value)}
                                        placeholder="Source Bin ID or name"
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>To Bin</FormLabel>
                                    <Input
                                        value={toBin}
                                        onChange={(e) => setToBin(e.target.value)}
                                        placeholder="Destination Bin ID or name"
                                    />
                                </FormControl>
                            </HStack>

                            <Text fontSize="lg" fontWeight="bold">Items</Text>
                            {items.map((item, index) => (
                                <HStack key={index} align="flex-end">
                                    <FormControl isRequired>
                                        <FormLabel>Stock Item</FormLabel>
                                        <Input
                                            value={item.stockItem}
                                            onChange={(e) => handleItemChange(index, 'stockItem', e.target.value)}
                                            placeholder="Stock Item ID or name"
                                        />
                                    </FormControl>
                                    <FormControl isRequired>
                                        <FormLabel>Quantity</FormLabel>
                                        <NumberInput
                                            value={item.transferredQuantity}
                                            onChange={(value) => handleItemChange(index, 'transferredQuantity', Number(value))}
                                            min={0}
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
                            {transfer ? 'Update Transfer' : 'Create Transfer'}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
}