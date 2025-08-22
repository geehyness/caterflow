// src/components/StockItemModal.tsx
'use client'

import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    Select,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    useToast,
    VStack,
    HStack,
    Tag,
    TagLabel,
    TagCloseButton,
    Box,
    Text,
    useDisclosure,
    Checkbox,
    InputGroup,
    InputRightElement,
    IconButton,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { AddIcon } from '@chakra-ui/icons';

interface StockItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any;
    onSave: () => void;
}

interface Category {
    _id: string;
    title: string;
}

interface Supplier {
    _id: string;
    name: string;
}

// Supplier Selection Modal Component
function SupplierSelectionModal({
    isOpen,
    onClose,
    allSuppliers,
    selectedSuppliers,
    onSupplierToggle,
    onAddNewSupplier
}: {
    isOpen: boolean;
    onClose: () => void;
    allSuppliers: Supplier[];
    selectedSuppliers: string[];
    onSupplierToggle: (supplierId: string) => void;
    onAddNewSupplier: (supplierName: string) => Promise<void>;
}) {
    const [newSupplierName, setNewSupplierName] = useState('');
    const [addingSupplier, setAddingSupplier] = useState(false);

    const handleAddSupplier = async () => {
        if (newSupplierName.trim()) {
            setAddingSupplier(true);
            await onAddNewSupplier(newSupplierName.trim());
            setNewSupplierName('');
            setAddingSupplier(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Select Suppliers</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    {/* Add New Supplier Input */}
                    <FormControl mb={6}>
                        <FormLabel>Add New Supplier</FormLabel>
                        <InputGroup>
                            <Input
                                value={newSupplierName}
                                onChange={(e) => setNewSupplierName(e.target.value)}
                                placeholder="Enter supplier name"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSupplier();
                                    }
                                }}
                            />
                            <InputRightElement>
                                <IconButton
                                    aria-label="Add supplier"
                                    icon={<AddIcon />}
                                    size="sm"
                                    colorScheme="blue"
                                    onClick={handleAddSupplier}
                                    isLoading={addingSupplier}
                                    isDisabled={!newSupplierName.trim()}
                                />
                            </InputRightElement>
                        </InputGroup>
                    </FormControl>

                    {/* Existing Suppliers List */}
                    <FormControl>
                        <FormLabel>Select Existing Suppliers</FormLabel>
                        <VStack align="start" spacing={3} maxH="300px" overflowY="auto">
                            {allSuppliers.map((supplier) => (
                                <Checkbox
                                    key={supplier._id}
                                    isChecked={selectedSuppliers.includes(supplier._id)}
                                    onChange={() => onSupplierToggle(supplier._id)}
                                >
                                    {supplier.name}
                                </Checkbox>
                            ))}
                            {allSuppliers.length === 0 && (
                                <Text color="gray.500" fontSize="sm">
                                    No suppliers found. Add a new supplier above.
                                </Text>
                            )}
                        </VStack>
                    </FormControl>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>
                        Done
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

export default function StockItemModal({ isOpen, onClose, item, onSave }: StockItemModalProps) {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [minimumStockLevel, setMinimumStockLevel] = useState(0);
    const [category, setCategory] = useState('');
    const [suppliers, setSuppliers] = useState<string[]>([]);
    const [primarySupplier, setPrimarySupplier] = useState('');
    const [unitOfMeasure, setUnitOfMeasure] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    // Supplier selection modal
    const {
        isOpen: isSupplierModalOpen,
        onOpen: onOpenSupplierModal,
        onClose: onCloseSupplierModal
    } = useDisclosure();

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            fetchAllSuppliers();

            if (item) {
                // Editing existing item
                setName(item.name || '');
                setSku(item.sku || '');
                setMinimumStockLevel(item.minimumStockLevel || 0);
                setCategory(item.category?._id || '');
                setUnitOfMeasure(item.unitOfMeasure || '');

                // Handle suppliers array
                const supplierIds = item.suppliers?.map((sup: any) => sup._ref || sup._id) || [];
                setSuppliers(supplierIds);

                // Handle primary supplier
                setPrimarySupplier(item.primarySupplier?._ref || item.primarySupplier?._id || '');
            } else {
                // Creating new item
                setName('');
                setSku('');
                setMinimumStockLevel(0);
                setCategory('');
                setSuppliers([]);
                setPrimarySupplier('');
                setUnitOfMeasure('');
            }
        }
    }, [isOpen, item]);

    const fetchCategories = async () => {
        const query = groq`*[_type == "Category"]{_id, title}`;
        const data = await client.fetch(query);
        setCategories(data);
    };

    const fetchAllSuppliers = async () => {
        const query = groq`*[_type == "Supplier"]{_id, name} | order(name asc)`;
        const data = await client.fetch(query);
        setAllSuppliers(data);
    };

    const handleAddNewSupplier = async (supplierName: string) => {
        try {
            // Create new supplier
            const newSupplier = await writeClient.create({
                _type: 'Supplier',
                name: supplierName,
            });

            // Add the new supplier to the list
            setAllSuppliers(prev => [...prev, newSupplier]);

            // Automatically select the new supplier
            setSuppliers(prev => [...prev, newSupplier._id]);

            toast({
                title: 'Supplier added.',
                description: `${supplierName} has been added successfully.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error('Error adding supplier:', error);
            toast({
                title: 'Error.',
                description: 'There was an error adding the supplier.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleSupplierToggle = (supplierId: string) => {
        setSuppliers(prev => {
            if (prev.includes(supplierId)) {
                // Remove supplier
                const newSuppliers = prev.filter(id => id !== supplierId);
                // If primary supplier was removed, clear it
                if (primarySupplier === supplierId) {
                    setPrimarySupplier('');
                }
                return newSuppliers;
            } else {
                // Add supplier
                return [...prev, supplierId];
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const document = {
                _type: 'StockItem',
                name,
                sku,
                minimumStockLevel,
                unitOfMeasure,
                category: category ? { _type: 'reference', _ref: category } : undefined,
                suppliers: suppliers.map(supplierId => ({
                    _type: 'reference',
                    _ref: supplierId,
                })),
                primarySupplier: primarySupplier ? {
                    _type: 'reference',
                    _ref: primarySupplier
                } : undefined,
            };

            if (item) {
                // Update existing item
                await writeClient.patch(item._id).set(document).commit();
                toast({
                    title: 'Item updated.',
                    description: `${name} has been updated successfully.`,
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                // Create new item
                await writeClient.create(document);
                toast({
                    title: 'Item created.',
                    description: `${name} has been created successfully.`,
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving stock item:', error);
            toast({
                title: 'Error.',
                description: 'There was an error saving the item.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const getSupplierName = (supplierId: string) => {
        const supplier = allSuppliers.find(s => s._id === supplierId);
        return supplier ? supplier.name : 'Unknown Supplier';
    };

    const availableSuppliersForPrimary = allSuppliers.filter(s => suppliers.includes(s._id));

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <form onSubmit={handleSubmit}>
                        <ModalHeader>{item ? 'Edit Stock Item' : 'Add New Stock Item'}</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody pb={6}>
                            <FormControl isRequired mb={4}>
                                <FormLabel>Item Name</FormLabel>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter item name"
                                />
                            </FormControl>

                            <FormControl isRequired mb={4}>
                                <FormLabel>SKU</FormLabel>
                                <Input
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    placeholder="Enter SKU"
                                />
                            </FormControl>

                            <FormControl isRequired mb={4}>
                                <FormLabel>Unit of Measure</FormLabel>
                                <Select
                                    value={unitOfMeasure}
                                    onChange={(e) => setUnitOfMeasure(e.target.value)}
                                    placeholder="Select unit of measure"
                                >
                                    <option value="kg">Kilogram (kg)</option>
                                    <option value="g">Gram (g)</option>
                                    <option value="l">Liter (l)</option>
                                    <option value="ml">Milliliter (ml)</option>
                                    <option value="each">Each</option>
                                    <option value="box">Box</option>
                                    <option value="case">Case</option>
                                    <option value="bag">Bag</option>
                                </Select>
                            </FormControl>

                            <FormControl isRequired mb={4}>
                                <FormLabel>Minimum Stock Level</FormLabel>
                                <NumberInput
                                    value={minimumStockLevel}
                                    onChange={(_, value) => setMinimumStockLevel(value)}
                                    min={0}
                                >
                                    <NumberInputField />
                                    <NumberInputStepper>
                                        <NumberIncrementStepper />
                                        <NumberDecrementStepper />
                                    </NumberInputStepper>
                                </NumberInput>
                            </FormControl>

                            <FormControl mb={4}>
                                <FormLabel>Category</FormLabel>
                                <Select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="Select category"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.title}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl mb={4}>
                                <FormLabel>Suppliers</FormLabel>
                                <Box mb={3}>
                                    <Button
                                        size="sm"
                                        colorScheme="blue"
                                        variant="outline"
                                        onClick={onOpenSupplierModal}
                                    >
                                        {suppliers.length > 0 ? 'Edit Suppliers' : 'Select Suppliers'}
                                    </Button>
                                </Box>

                                {suppliers.length > 0 && (
                                    <Box>
                                        <Text fontSize="sm" fontWeight="medium" mb={2}>
                                            Selected Suppliers:
                                        </Text>
                                        <HStack spacing={2} flexWrap="wrap">
                                            {suppliers.map(supplierId => (
                                                <Tag key={supplierId} colorScheme="blue" size="md">
                                                    <TagLabel>{getSupplierName(supplierId)}</TagLabel>
                                                    <TagCloseButton
                                                        onClick={() => handleSupplierToggle(supplierId)}
                                                    />
                                                </Tag>
                                            ))}
                                        </HStack>
                                    </Box>
                                )}
                            </FormControl>

                            <FormControl mb={4}>
                                <FormLabel>Primary Supplier</FormLabel>
                                <Select
                                    value={primarySupplier}
                                    onChange={(e) => setPrimarySupplier(e.target.value)}
                                    placeholder="Select primary supplier"
                                    isDisabled={suppliers.length === 0}
                                >
                                    {availableSuppliersForPrimary.map((supplier) => (
                                        <option key={supplier._id} value={supplier._id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </Select>
                                {suppliers.length === 0 && (
                                    <Text fontSize="sm" color="gray.500" mt={1}>
                                        Select suppliers first to choose a primary supplier
                                    </Text>
                                )}
                            </FormControl>
                        </ModalBody>

                        <ModalFooter>
                            <Button variant="outline" mr={3} onClick={onClose}>
                                Cancel
                            </Button>
                            <Button colorScheme="blue" type="submit" isLoading={loading}>
                                {item ? 'Update' : 'Create'}
                            </Button>
                        </ModalFooter>
                    </form>
                </ModalContent>
            </Modal>

            {/* Supplier Selection Modal */}
            <SupplierSelectionModal
                isOpen={isSupplierModalOpen}
                onClose={onCloseSupplierModal}
                allSuppliers={allSuppliers}
                selectedSuppliers={suppliers}
                onSupplierToggle={handleSupplierToggle}
                onAddNewSupplier={handleAddNewSupplier}
            />
        </>
    );
}