// components/StockItemModal.tsx
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
    useToast,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    useColorModeValue,
} from '@chakra-ui/react';

interface StockItem {
    _id: string;
    name: string;
    sku: string;
    minimumStockLevel: number;
    category: {
        _id: string;
        title: string;
    };
    primarySupplier: {
        _id: string;
        name: string;
    };
    unitOfMeasure: string;
}

interface Category {
    _id: string;
    title: string;
}

interface Supplier {
    _id: string;
    name: string;
}

interface StockItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: StockItem | null;
    onSave: () => void;
}

export default function StockItemModal({ isOpen, onClose, item, onSave }: StockItemModalProps) {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [minimumStockLevel, setMinimumStockLevel] = useState(0);
    const [category, setCategory] = useState('');
    const [primarySupplier, setPrimarySupplier] = useState('');
    const [unitOfMeasure, setUnitOfMeasure] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const toast = useToast();

    const brandColorScheme = useColorModeValue('brand', 'brand');
    const neutralColorScheme = useColorModeValue('gray', 'gray');

    // Fetch categories and suppliers
    useEffect(() => {
        const fetchData = async () => {
            setDataLoading(true);
            try {
                // Fetch categories from the correct endpoint
                const categoriesResponse = await fetch('/api/categories');
                const categoriesData = await categoriesResponse.json();
                setCategories(categoriesData || []);

                // Fetch suppliers from the correct endpoint
                const suppliersResponse = await fetch('/api/suppliers');
                const suppliersData = await suppliersResponse.json();
                setSuppliers(suppliersData || []);
            } catch (error) {
                console.error('Failed to fetch data:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load form data',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setDataLoading(false);
            }
        };

        if (isOpen) {
            fetchData();
        }
    }, [isOpen, toast]);

    useEffect(() => {
        if (item) {
            setName(item.name || '');
            setSku(item.sku || '');
            setMinimumStockLevel(item.minimumStockLevel || 0);
            setCategory(item.category?._id || '');
            setPrimarySupplier(item.primarySupplier?._id || '');
            setUnitOfMeasure(item.unitOfMeasure || '');
        } else {
            // Reset form for new item
            setName('');
            setSku('');
            setMinimumStockLevel(0);
            setCategory('');
            setPrimarySupplier('');
            setUnitOfMeasure('');
        }
    }, [item]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = '/api/stock-items';
            const method = item ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    _id: item?._id,
                    name,
                    sku,
                    minimumStockLevel,
                    category,
                    primarySupplier,
                    unitOfMeasure,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save stock item');
            }

            toast({
                title: item ? 'Item updated.' : 'Item created.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onSave();
            onClose();
        } catch (error) {
            console.error('Failed to save stock item:', error);
            toast({
                title: 'Error',
                description: 'Failed to save stock item. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{item ? 'Edit Stock Item' : 'Create Stock Item'}</ModalHeader>
                <ModalCloseButton />
                <form onSubmit={handleSave}>
                    <ModalBody pb={6}>
                        <VStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>Item Name</FormLabel>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter item name"
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>SKU</FormLabel>
                                <Input
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    placeholder="Enter SKU"
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Minimum Stock Level</FormLabel>
                                <NumberInput
                                    value={minimumStockLevel}
                                    onChange={(value) => setMinimumStockLevel(Number(value))}
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
                                <FormLabel>Category</FormLabel>
                                <Select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="Select category"
                                    isDisabled={dataLoading}
                                >
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.title}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl>
                                <FormLabel>Primary Supplier</FormLabel>
                                <Select
                                    value={primarySupplier}
                                    onChange={(e) => setPrimarySupplier(e.target.value)}
                                    placeholder="Select primary supplier"
                                    isDisabled={dataLoading}
                                >
                                    {suppliers.map((supplier) => (
                                        <option key={supplier._id} value={supplier._id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl isRequired>
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
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme={neutralColorScheme} mr={3} onClick={onClose} isDisabled={loading} variant="ghost">
                            Cancel
                        </Button>
                        <Button
                            colorScheme={brandColorScheme}
                            type="submit"
                            isLoading={loading}
                            isDisabled={dataLoading}
                        >
                            {item ? 'Update Item' : 'Create Item'}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
}