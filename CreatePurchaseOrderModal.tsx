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
    VStack,
    Text,
    useToast,
    Flex,
    Spinner,
} from '@chakra-ui/react';

interface Supplier {
    _id: string;
    name: string;
}

interface Site {
    _id: string;
    name: string;
}

interface CreatePurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function CreatePurchaseOrderModal({ isOpen, onClose, onSave }: CreatePurchaseOrderModalProps) {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        poNumber: '',
        supplierId: '',
        siteId: '',
        orderDate: new Date().toISOString().split('T')[0],
    });
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchSuppliers();
            fetchSites();
            // Generate a default PO number
            setFormData(prev => ({
                ...prev,
                poNumber: `PO-${Date.now().toString().slice(-6)}`
            }));
        }
    }, [isOpen]);

    const fetchSuppliers = async () => {
        try {
            const response = await fetch('/api/suppliers');
            if (response.ok) {
                const data = await response.json();
                setSuppliers(data);
            }
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        }
    };

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

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCreateOrder = async () => {
        if (!formData.poNumber || !formData.supplierId || !formData.siteId) {
            toast({
                title: 'Missing required fields',
                description: 'Please fill in all required fields.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    poNumber: formData.poNumber,
                    orderDate: formData.orderDate,
                    supplier: { _type: 'reference', _ref: formData.supplierId },
                    site: { _type: 'reference', _ref: formData.siteId },
                    status: 'draft',
                    totalAmount: 0,
                    orderedItems: [],
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create purchase order');
            }

            toast({
                title: 'Purchase order created',
                description: 'The purchase order has been created successfully.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error) {
            console.error('Error creating purchase order:', error);
            toast({
                title: 'Error',
                description: 'Failed to create purchase order. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            poNumber: '',
            supplierId: '',
            siteId: '',
            orderDate: new Date().toISOString().split('T')[0],
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="md">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Create New Purchase Order</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl isRequired>
                            <FormLabel>PO Number</FormLabel>
                            <Input
                                value={formData.poNumber}
                                onChange={(e) => handleInputChange('poNumber', e.target.value)}
                                placeholder="Enter PO number"
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>Supplier</FormLabel>
                            <Select
                                value={formData.supplierId}
                                onChange={(e) => handleInputChange('supplierId', e.target.value)}
                                placeholder="Select supplier"
                            >
                                {suppliers.map(supplier => (
                                    <option key={supplier._id} value={supplier._id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>Site</FormLabel>
                            <Select
                                value={formData.siteId}
                                onChange={(e) => handleInputChange('siteId', e.target.value)}
                                placeholder="Select site"
                            >
                                {sites.map(site => (
                                    <option key={site._id} value={site._id}>
                                        {site.name}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Order Date</FormLabel>
                            <Input
                                type="date"
                                value={formData.orderDate}
                                onChange={(e) => handleInputChange('orderDate', e.target.value)}
                            />
                        </FormControl>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={handleClose} isDisabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleCreateOrder}
                        isLoading={loading}
                        loadingText="Creating..."
                    >
                        Create Order
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}