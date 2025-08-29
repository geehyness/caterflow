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

interface PurchaseOrderItem {
    stockItem: string;
    orderedQuantity: number;
    unitPrice: number;
}

interface PurchaseOrder {
    _id: string;
    poNumber: string;
    orderDate: string;
    status: string;
    supplier: string;
    items: PurchaseOrderItem[];
}

interface PurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: PurchaseOrder | null;
    onSave: () => void;
}

export default function PurchaseOrderModal({ isOpen, onClose, order, onSave }: PurchaseOrderModalProps) {
    const [poNumber, setPoNumber] = useState('');
    const [orderDate, setOrderDate] = useState('');
    const [status, setStatus] = useState('draft');
    const [supplier, setSupplier] = useState('');
    const [items, setItems] = useState<PurchaseOrderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (order) {
            setPoNumber(order.poNumber || '');
            setOrderDate(order.orderDate || '');
            setStatus(order.status || 'draft');
            setSupplier(order.supplier || '');
            setItems(order.items || []);
        } else {
            setPoNumber('');
            setOrderDate(new Date().toISOString().split('T')[0]);
            setStatus('draft');
            setSupplier('');
            setItems([]);
        }
    }, [order]);

    const handleAddItem = () => {
        setItems([...items, { stockItem: '', orderedQuantity: 0, unitPrice: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = '/api/purchase-orders';
            const method = order ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    _id: order?._id,
                    poNumber,
                    orderDate,
                    status,
                    supplier,
                    items,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save purchase order');
            }

            toast({
                title: order ? 'Order updated.' : 'Order created.',
                description: `Purchase order "${poNumber}" has been ${order ? 'updated' : 'created'}.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Failed to save purchase order:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save purchase order. Please try again.',
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
                <ModalHeader>{order ? 'Edit Purchase Order' : 'Create Purchase Order'}</ModalHeader>
                <ModalCloseButton />
                <form onSubmit={handleSave}>
                    <ModalBody pb={6}>
                        <VStack spacing={4} align="stretch">
                            <HStack>
                                <FormControl isRequired>
                                    <FormLabel>PO Number</FormLabel>
                                    <Input
                                        value={poNumber}
                                        onChange={(e) => setPoNumber(e.target.value)}
                                        placeholder="e.g., PO-001"
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Order Date</FormLabel>
                                    <Input
                                        type="date"
                                        value={orderDate}
                                        onChange={(e) => setOrderDate(e.target.value)}
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Status</FormLabel>
                                    <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                                        <option value="draft">Draft</option>
                                        <option value="pending">Pending</option>
                                        <option value="partially-received">Partially Received</option>
                                        <option value="received">Received</option>
                                        <option value="cancelled">Cancelled</option>
                                    </Select>
                                </FormControl>
                            </HStack>

                            <FormControl isRequired>
                                <FormLabel>Supplier</FormLabel>
                                <Input
                                    value={supplier}
                                    onChange={(e) => setSupplier(e.target.value)}
                                    placeholder="Supplier ID or name"
                                />
                            </FormControl>

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
                                            value={item.orderedQuantity}
                                            onChange={(value) => handleItemChange(index, 'orderedQuantity', Number(value))}
                                            min={0}
                                        >
                                            <NumberInputField />
                                            <NumberInputStepper>
                                                <NumberIncrementStepper />
                                                <NumberDecrementStepper />
                                            </NumberInputStepper>
                                        </NumberInput>
                                    </FormControl>
                                    <FormControl isRequired>
                                        <FormLabel>Unit Price</FormLabel>
                                        <NumberInput
                                            value={item.unitPrice}
                                            onChange={(value) => handleItemChange(index, 'unitPrice', Number(value))}
                                            min={0}
                                            step={0.01}
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
                            {order ? 'Update Order' : 'Create Order'}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
}