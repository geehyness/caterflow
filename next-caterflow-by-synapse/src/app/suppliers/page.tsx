'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Heading,
    Button,
    Flex,
    Spinner,
    useDisclosure,
    useToast,
    IconButton,
    useColorModeValue,
    Card,
    CardBody,
    Input,
    InputGroup,
    InputLeftElement,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEdit, FiTrash2 } from 'react-icons/fi';
import DataTable from '@/components/DataTable';
import { useSession } from 'next-auth/react'
import SupplierModal from '@/components/SupplierModal';

interface Supplier {
    _id: string;
    name: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    terms?: string;
}

export default function SuppliersPage() {
    const { data: session, status } = useSession();
    const user = session?.user;

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const inputBg = useColorModeValue('white', 'gray.800');

    // FIX 1: Wrap fetchSuppliers in useCallback to memoize it
    const fetchSuppliers = useCallback(async () => {
        try {
            const response = await fetch('/api/suppliers');
            if (response.ok) {
                const data = await response.json();
                setSuppliers(data);
            } else {
                throw new Error('Failed to fetch suppliers');
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            toast({
                title: 'Error',
                description: 'Failed to load suppliers. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]); // Add toast to the dependency array of useCallback

    // FIX 2: Add fetchSuppliers to the useEffect dependency array
    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    useEffect(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            setFilteredSuppliers(
                suppliers.filter(supplier =>
                    supplier.name.toLowerCase().includes(term) ||
                    (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(term)) ||
                    (supplier.email && supplier.email.toLowerCase().includes(term))
                )
            );
        } else {
            setFilteredSuppliers(suppliers);
        }
    }, [suppliers, searchTerm]);

    const handleAddSupplier = () => {
        setSelectedSupplier(null);
        onOpen();
    };

    const handleEditSupplier = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        onOpen();
    };

    const handleDeleteSupplier = async (supplierId: string) => {
        if (window.confirm('Are you sure you want to delete this supplier?')) {
            try {
                const response = await fetch(`/api/suppliers?id=${supplierId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete supplier');
                }

                setSuppliers(suppliers.filter(s => s._id !== supplierId));
                toast({
                    title: 'Supplier deleted.',
                    description: 'The supplier has been successfully deleted.',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } catch (error) {
                console.error('Error deleting supplier:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to delete supplier. Please try again.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };

    const handleSaveSuccess = () => {
        fetchSuppliers();
        onClose();
    };

    const columns = [
        {
            accessorKey: 'actions',
            header: 'Actions',
            cell: (row: Supplier) => (
                <Flex>
                    <IconButton
                        aria-label="Edit supplier"
                        icon={<FiEdit />}
                        size="sm"
                        colorScheme="blue"
                        mr={2}
                        onClick={() => handleEditSupplier(row)}
                    />
                    <IconButton
                        aria-label="Delete supplier"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDeleteSupplier(row._id)}
                    />
                </Flex>
            ),
        },
        {
            accessorKey: 'name',
            header: 'Name',
            isSortable: true,
        },
        {
            accessorKey: 'contactPerson',
            header: 'Contact Person',
            isSortable: true,
        },
        {
            accessorKey: 'email',
            header: 'Email',
            isSortable: true,
        },
        {
            accessorKey: 'phoneNumber',
            header: 'Phone',
            isSortable: true,
        },
    ];

    if (loading || status === 'loading') {
        return (
            <Box p={4}>
                <Flex justifyContent="center" alignItems="center" height="50vh">
                    <Spinner size="xl" />
                </Flex>
            </Box>
        );
    }

    return (
        <Box p={4}>
            <Flex justifyContent="space-between" alignItems="center" mb={6}>
                <Heading as="h1" size="lg">Suppliers</Heading>
                <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={handleAddSupplier}
                >
                    Add Supplier
                </Button>
            </Flex>

            {/* Suppliers Table */}
            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md">
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={filteredSuppliers}
                        loading={false}
                    />
                </CardBody>
            </Card>

            <SupplierModal
                isOpen={isOpen}
                onClose={onClose}
                supplier={selectedSupplier}
                onSave={handleSaveSuccess}
            />
        </Box>
    );
}