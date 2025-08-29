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
import TransferModal from '@/components/TransferModal';

interface TransferItem {
    stockItem: string;
    transferredQuantity: number;
}

interface Transfer {
    _id: string;
    transferNumber: string;
    transferDate: string;
    status: 'pending' | 'completed' | 'cancelled';
    fromBin: string;
    toBin: string;
    items: TransferItem[];
    totalItems: number;
}

export default function TransfersPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
    const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const { user } = useAuth();

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const inputBg = useColorModeValue('white', 'gray.800');

    const fetchTransfers = useCallback(async () => {
        try {
            const response = await fetch('/api/transfers');
            if (response.ok) {
                const data = await response.json();
                // Transform the data to match the expected structure
                const transformedData = data.map((transfer: any) => ({
                    ...transfer,
                    fromBin: transfer.fromBin?._id || transfer.fromBin?.name || '',
                    toBin: transfer.toBin?._id || transfer.toBin?.name || '',
                    items: transfer.items || []
                }));
                setTransfers(transformedData);
            } else {
                throw new Error('Failed to fetch transfers');
            }
        } catch (error) {
            console.error('Error fetching transfers:', error);
            toast({
                title: 'Error',
                description: 'Failed to load transfers. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchTransfers();
    }, [fetchTransfers]);

    useEffect(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            setFilteredTransfers(
                transfers.filter(transfer =>
                    transfer.transferNumber.toLowerCase().includes(term) ||
                    transfer.fromBin.toLowerCase().includes(term) ||
                    transfer.toBin.toLowerCase().includes(term)
                )
            );
        } else {
            setFilteredTransfers(transfers);
        }
    }, [transfers, searchTerm]);

    const handleAddTransfer = () => {
        setSelectedTransfer(null);
        onOpen();
    };

    const handleEditTransfer = (transfer: Transfer) => {
        setSelectedTransfer(transfer);
        onOpen();
    };

    const handleViewTransfer = (transfer: Transfer) => {
        // Navigate to detail page or open a view modal
        console.log('View transfer:', transfer);
    };

    const handleDeleteTransfer = async (transferId: string) => {
        if (window.confirm('Are you sure you want to delete this transfer?')) {
            try {
                const response = await fetch(`/api/transfers?id=${transferId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete transfer');
                }

                setTransfers(transfers.filter(transfer => transfer._id !== transferId));
                toast({
                    title: 'Transfer deleted.',
                    description: 'The transfer has been successfully deleted.',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } catch (error) {
                console.error('Error deleting transfer:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to delete transfer. Please try again.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };

    const handleSaveSuccess = () => {
        fetchTransfers();
        onClose();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'yellow';
            case 'completed': return 'green';
            case 'cancelled': return 'red';
            default: return 'gray';
        }
    };

    const columns = [
        {
            accessorKey: 'actions',
            header: 'Actions',
            cell: (row: Transfer) => (
                <Flex>
                    <IconButton
                        aria-label="View transfer"
                        icon={<FiEye />}
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        mr={2}
                        onClick={() => handleViewTransfer(row)}
                    />
                    <IconButton
                        aria-label="Edit transfer"
                        icon={<FiEdit />}
                        size="sm"
                        colorScheme="green"
                        variant="ghost"
                        mr={2}
                        onClick={() => handleEditTransfer(row)}
                    />
                    <IconButton
                        aria-label="Delete transfer"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleDeleteTransfer(row._id)}
                    />
                </Flex>
            ),
        },
        {
            accessorKey: 'transferNumber',
            header: 'Transfer Number',
            isSortable: true,
        },
        {
            accessorKey: 'transferDate',
            header: 'Transfer Date',
            isSortable: true,
            cell: (row: Transfer) => new Date(row.transferDate).toLocaleDateString(),
        },
        {
            accessorKey: 'fromBin',
            header: 'From Bin',
            isSortable: true,
        },
        {
            accessorKey: 'toBin',
            header: 'To Bin',
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
            cell: (row: Transfer) => (
                <Badge colorScheme={getStatusColor(row.status)}>
                    {row.status.toUpperCase()}
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
                <Heading as="h1" size="lg">Internal Transfers</Heading>
                <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={handleAddTransfer}
                >
                    New Transfer
                </Button>
            </Flex>

            {/* Search */}
            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" mb={4} p={4}>
                <InputGroup>
                    <InputLeftElement pointerEvents="none">
                        <FiSearch color="gray.300" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search transfers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        bg={inputBg}
                    />
                </InputGroup>
            </Card>

            {/* Transfers Table */}
            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md">
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={filteredTransfers}
                        loading={false}
                    />
                </CardBody>
            </Card>

            <TransferModal
                isOpen={isOpen}
                onClose={onClose}
                transfer={selectedTransfer}
                onSave={handleSaveSuccess}
            />
        </Box>
    );
}