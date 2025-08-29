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
    Badge,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import DataTable from '@/components/DataTable';
import { useAuth } from '@/context/AuthContext';
import DispatchModal from '@/components/DispatchModal';

// Rename the interface to avoid conflict with React's Dispatch type
interface DispatchRecord {
    _id: string;
    dispatchNumber: string;
    dispatchDate: string;
    status: 'pending' | 'completed' | 'cancelled';
    sourceBin: {
        _id: string;
        name: string;
        site: {
            _id: string; // Added _id to match expected type
            name: string;
        };
    };
    destinationSite: {
        _id: string;
        name: string;
    };
    totalItems: number;
    // Add items property
    items: Array<{
        stockItem: string;
        dispatchedQuantity: number;
        totalCost?: number;
    }>;
}

export default function DispatchesPage() {
    const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
    const [filteredDispatches, setFilteredDispatches] = useState<DispatchRecord[]>([]);
    const [selectedDispatch, setSelectedDispatch] = useState<DispatchRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const { user } = useAuth();

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const inputBg = useColorModeValue('white', 'gray.800');

    // Wrap fetchDispatches in useCallback to memoize it
    const fetchDispatches = useCallback(async () => {
        try {
            const response = await fetch('/api/dispatches');
            if (response.ok) {
                const data = await response.json();
                setDispatches(data);
            } else {
                throw new Error('Failed to fetch dispatches');
            }
        } catch (error) {
            console.error('Error fetching dispatches:', error);
            toast({
                title: 'Error',
                description: 'Failed to load dispatches. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]); // Include toast in dependencies if it's used inside

    // FIX: Add fetchDispatches to the dependency array
    useEffect(() => {
        fetchDispatches();
    }, [fetchDispatches]);

    useEffect(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            setFilteredDispatches(
                dispatches.filter(dispatch =>
                    dispatch.dispatchNumber.toLowerCase().includes(term) ||
                    dispatch.sourceBin.name.toLowerCase().includes(term) ||
                    dispatch.destinationSite.name.toLowerCase().includes(term)
                )
            );
        } else {
            setFilteredDispatches(dispatches);
        }
    }, [dispatches, searchTerm]);

    const handleAddDispatch = () => {
        setSelectedDispatch(null);
        onOpen();
    };

    const handleEditDispatch = (dispatch: DispatchRecord) => {
        setSelectedDispatch(dispatch);
        onOpen();
    };

    const handleViewDispatch = (dispatch: DispatchRecord) => {
        // Navigate to detail page or open a view modal
        console.log('View dispatch:', dispatch);
    };

    const handleDeleteDispatch = async (dispatchId: string) => {
        if (window.confirm('Are you sure you want to delete this dispatch?')) {
            try {
                const response = await fetch(`/api/dispatches?id=${dispatchId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete dispatch');
                }

                setDispatches(dispatches.filter(dispatch => dispatch._id !== dispatchId));
                toast({
                    title: 'Dispatch deleted.',
                    description: 'The dispatch has been successfully deleted.',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } catch (error) {
                console.error('Error deleting dispatch:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to delete dispatch. Please try again.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };

    const handleSaveSuccess = () => {
        fetchDispatches();
        onClose();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'yellow';
            case 'completed': return 'green';
            case 'cancelled': return 'red';
            case 'N/A': return 'gray';
            default: return 'gray';
        }
    };

    const columns = [
        {
            accessorKey: 'actions',
            header: 'Actions',
            cell: (row: DispatchRecord) => (
                <Flex>
                    <IconButton
                        aria-label="View dispatch"
                        icon={<FiEye />}
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        mr={2}
                        onClick={() => handleViewDispatch(row)}
                    />
                    <IconButton
                        aria-label="Edit dispatch"
                        icon={<FiEdit />}
                        size="sm"
                        colorScheme="green"
                        variant="ghost"
                        mr={2}
                        onClick={() => handleEditDispatch(row)}
                    />
                    <IconButton
                        aria-label="Delete dispatch"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleDeleteDispatch(row._id)}
                    />
                </Flex>
            ),
        },
        {
            accessorKey: 'dispatchNumber',
            header: 'Dispatch Number',
            isSortable: true,
        },
        {
            accessorKey: 'dispatchDate',
            header: 'Dispatch Date',
            isSortable: true,
            cell: (row: DispatchRecord) => new Date(row.dispatchDate).toLocaleDateString(),
        },
        {
            accessorKey: 'sourceBin.name',
            header: 'Source Bin',
            isSortable: true,
            cell: (row: DispatchRecord) => `${row.sourceBin.name} (${row.sourceBin.site.name})`,
        },
        {
            accessorKey: 'destinationSite.name',
            header: 'Destination Site',
            isSortable: true,
        },
        {
            accessorKey: 'totalItems',
            header: 'Total Items',
            isSortable: true,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            isSortable: true,
            cell: (row: DispatchRecord) => (
                <Badge colorScheme={getStatusColor(row.status || '')}>
                    {(row.status || 'N/A').toUpperCase()}
                </Badge>
            ),
        },
    ];

    if (loading) {
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
                <Heading as="h1" size="lg">Dispatches</Heading>
                <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={handleAddDispatch}
                >
                    New Dispatch
                </Button>
            </Flex>

            {/* Search */}
            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" mb={4} p={4}>
                <InputGroup>
                    <InputLeftElement pointerEvents="none">
                        <FiSearch color="gray.300" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search dispatches..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        bg={inputBg}
                    />
                </InputGroup>
            </Card>

            {/* Dispatches Table */}
            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md">
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={filteredDispatches}
                        loading={false}
                    />
                </CardBody>
            </Card>

            <DispatchModal
                isOpen={isOpen}
                onClose={onClose}
                dispatch={selectedDispatch}
                onSave={handleSaveSuccess}
            />
        </Box>
    );
}