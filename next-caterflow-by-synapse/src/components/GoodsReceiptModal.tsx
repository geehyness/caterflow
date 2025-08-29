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

interface ReceivedItem {
    stockItem: string;
    receivedQuantity: number;
    batchNumber?: string;
    expiryDate?: string;
    condition: 'good' | 'damaged' | 'short-shipped' | 'over-shipped';
}

interface GoodsReceipt {
    _id: string;
    receiptNumber: string;
    receiptDate: string;
    purchaseOrder: string;
    receivingBin: string;
    items: ReceivedItem[];
    status: string;
    notes?: string;
}

interface GoodsReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    receipt: GoodsReceipt | null;
    onSave: () => void;
}

export default function GoodsReceiptModal({ isOpen, onClose, receipt, onSave }: GoodsReceiptModalProps) {
    const [receiptNumber, setReceiptNumber] = useState('');
    const [receiptDate, setReceiptDate] = useState('');
    const [purchaseOrder, setPurchaseOrder] = useState('');
    const [receivingBin, setReceivingBin] = useState('');
    const [status, setStatus] = useState('draft');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<ReceivedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (receipt) {
            setReceiptNumber(receipt.receiptNumber || '');
            setReceiptDate(receipt.receiptDate || '');
            setPurchaseOrder(receipt.purchaseOrder || '');
            setReceivingBin(receipt.receivingBin || '');
            setStatus(receipt.status || 'draft');
            setNotes(receipt.notes || '');
            setItems(receipt.items || []);
        } else {
            setReceiptNumber('');
            setReceiptDate(new Date().toISOString().split('T')[0]);
            setPurchaseOrder('');
            setReceivingBin('');
            setStatus('draft');
            setNotes('');
            setItems([]);
        }
    }, [receipt]);

    const handleAddItem = () => {
        setItems([...items, { stockItem: '', receivedQuantity: 0, condition: 'good' }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof ReceivedItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = '/api/goods-receipts';
            const method = receipt ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    _id: receipt?._id,
                    receiptNumber,
                    receiptDate,
                    purchaseOrder,
                    receivingBin,
                    status,
                    notes: notes || undefined,
                    items,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save goods receipt');
            }

            toast({
                title: receipt ? 'Receipt updated.' : 'Receipt created.',
                description: `Goods receipt "${receiptNumber}" has been ${receipt ? 'updated' : 'created'}.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Failed to save goods receipt:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save goods receipt. Please try again.',
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
                <ModalHeader>{receipt ? 'Edit Goods Receipt' : 'Create Goods Receipt'}</ModalHeader>
                <ModalCloseButton />
                <form onSubmit={handleSave}>
                    <ModalBody pb={6}>
                        <VStack spacing={4} align="stretch">
                            <HStack>
                                <FormControl isRequired>
                                    <FormLabel>Receipt Number</FormLabel>
                                    <Input
                                        value={receiptNumber}
                                        onChange={(e) => setReceiptNumber(e.target.value)}
                                        placeholder="e.g., GR-001"
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Receipt Date</FormLabel>
                                    <Input
                                        type="date"
                                        value={receiptDate}
                                        onChange={(e) => setReceiptDate(e.target.value)}
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Status</FormLabel>
                                    <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                                        <option value="draft">Draft</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </Select>
                                </FormControl>
                            </HStack>

                            <HStack>
                                <FormControl isRequired>
                                    <FormLabel>Purchase Order</FormLabel>
                                    <Input
                                        value={purchaseOrder}
                                        onChange={(e) => setPurchaseOrder(e.target.value)}
                                        placeholder="Purchase Order ID or number"
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Receiving Bin</FormLabel>
                                    <Input
                                        value={receivingBin}
                                        onChange={(e) => setReceivingBin(e.target.value)}
                                        placeholder="Receiving Bin ID or name"
                                    />
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

                            <Text fontSize="lg" fontWeight="bold">Received Items</Text>
                            {items.map((item, index) => (
                                <HStack key={index} align="flex-end" spacing={4}>
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
                                            value={item.receivedQuantity}
                                            onChange={(value) => handleItemChange(index, 'receivedQuantity', Number(value))}
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
                                        <FormLabel>Batch Number</FormLabel>
                                        <Input
                                            value={item.batchNumber || ''}
                                            onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)}
                                            placeholder="Batch number"
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>Expiry Date</FormLabel>
                                        <Input
                                            type="date"
                                            value={item.expiryDate || ''}
                                            onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                                        />
                                    </FormControl>
                                    <FormControl isRequired>
                                        <FormLabel>Condition</FormLabel>
                                        <Select
                                            value={item.condition}
                                            onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                                        >
                                            <option value="good">Good</option>
                                            <option value="damaged">Damaged</option>
                                            <option value="short-shipped">Short Shipped</option>
                                            <option value="over-shipped">Over Shipped</option>
                                        </Select>
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
                            {receipt ? 'Update Receipt' : 'Create Receipt'}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
}