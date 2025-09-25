'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import {
    Box,
    Heading,
    Button,
    Flex,
    useDisclosure,
    useToast,
    useColorModeValue,
    Card,
    CardBody,
    Input,
    InputGroup,
    InputLeftElement,
    Badge,
    Icon,
    HStack,
    Spinner,
    Text,
    IconButton,
    Select,
    VStack,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiFilter, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import DataTable from '@/app/actions/DataTable';
import { useSession } from 'next-auth/react';
import TransferModal from '@/components/TransferModal';

// Standardized interfaces to match TransferModal.tsx
interface Site {
    _id: string;
    name: string;
}

interface Bin {
    _id: string;
    name: string;
    site: Site;
}

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

interface Transfer {
    _id: string;
    transferNumber: string;
    transferDate: string;
    status: 'draft' | 'pending-approval' | 'approved' | 'completed' | 'cancelled';
    fromBin: {
        _id: string;
        name: string;
        site: {
            _id: string;
            name: string;
        };
    };
    toBin: {
        _id: string;
        name: string;
        site: {
            _id: string;
            name: string;
        };
    };
    transferredItems: TransferredItem[];
    notes?: string;
    transferredBy?: {
        _id: string;
        name: string;
    };
    approvedBy?: {
        _id: string;
        name: string;
    };
    approvedAt?: string;
}

const badgeColorScheme = (status: Transfer['status']) => {
    switch (status) {
        case 'completed':
            return 'green';
        case 'draft': // Added draft status
            return 'gray';
        case 'pending-approval':
            return 'yellow';
        case 'approved':
            return 'blue';
        case 'cancelled':
            return 'red';
        default:
            return 'gray';
    }
};

export default function TransfersPage() {
    const { data: session, status } = useSession();
    const user = session?.user;

    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Replace the handleFetchTransfers function:
    const handleFetchTransfers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/transfers');
            if (!response.ok) {
                throw new Error('Failed to fetch transfers');
            }
            const data: any[] = await response.json();

            // Ensure bins are properly populated
            const transformedData: Transfer[] = data.map(transfer => ({
                ...transfer,
                transferredItems: transfer.items || transfer.transferredItems || [],
                // Make sure fromBin and toBin are objects, not just IDs
                fromBin: typeof transfer.fromBin === 'object' ? transfer.fromBin : { _id: transfer.fromBin, name: 'Loading...', site: { _id: '', name: '' } },
                toBin: typeof transfer.toBin === 'object' ? transfer.toBin : { _id: transfer.toBin, name: 'Loading...', site: { _id: '', name: '' } }
            }));

            setTransfers(transformedData);
            setFilteredTransfers(transformedData);
        } catch (err: any) {
            console.error('Failed to fetch transfers:', err);
            setError('Failed to load transfers. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        handleFetchTransfers();
    }, [handleFetchTransfers]);

    const handleSaveSuccess = () => {
        onClose();
        handleFetchTransfers();
        toast({
            title: 'Transfer Saved',
            description: 'The transfer has been updated successfully.',
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
    };

    const handleCreateTransfer = () => {
        setSelectedTransfer(null);
        onOpen();
    };

    const handleEditTransfer = (transfer: Transfer) => {
        setSelectedTransfer(transfer);
        onOpen();
    };

    const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchTerm(value);
        if (value === '') {
            setFilteredTransfers(transfers);
        } else {
            const lowercasedValue = value.toLowerCase();
            const filtered = transfers.filter(transfer =>
                transfer.transferNumber.toLowerCase().includes(lowercasedValue) ||
                (typeof transfer.fromBin === 'object' && transfer.fromBin.name.toLowerCase().includes(lowercasedValue)) ||
                (typeof transfer.toBin === 'object' && transfer.toBin.name.toLowerCase().includes(lowercasedValue))
            );
            setFilteredTransfers(filtered);
        }
    };

    const columns = [
        {
            header: 'Actions',
            accessorKey: 'actions',
            cell: (row: any) => {
                if (!row) return null;
                const isEditable = row.status === 'draft' || row.status === 'approved';
                return (
                    <HStack spacing={2}>
                        <Button
                            aria-label="View/Edit"
                            leftIcon={isEditable ? <FiEdit /> : <FiEye />}
                            size="sm"
                            onClick={() => handleEditTransfer(row)}
                            colorScheme={isEditable ? "blue" : "gray"}
                        >
                            {isEditable ? 'Edit' : 'View'}
                        </Button>
                    </HStack>
                );
            },
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row: any) => {
                if (!row) return null;
                return (
                    <Badge colorScheme={badgeColorScheme(row.status)}>
                        {row.status}
                    </Badge>
                );
            },
        },
        {
            header: 'Transfer #',
            accessorKey: 'transferNumber',
            cell: (row: any) => {
                if (!row) return null;
                return (
                    <Text
                        fontWeight="medium"
                        _hover={{ color: 'blue.500', cursor: 'pointer' }}
                        onClick={() => handleEditTransfer(row)}
                    >
                        {row.transferNumber}
                    </Text>
                );
            },
        },
        {
            header: 'Date',
            accessorKey: 'transferDate',
            cell: (row: any) => {
                if (!row) return null;
                return new Date(row.transferDate).toLocaleDateString();
            },
        },
        {
            header: 'From Bin',
            accessorKey: 'fromBin',
            cell: (row: any) => {
                if (!row) return null;
                // Handle both string reference and populated object
                if (typeof row.fromBin === 'object' && row.fromBin !== null) {
                    return `${row.fromBin.name} (${row.fromBin.site?.name || 'No Site'})`;
                }
                return 'Loading...';
            },
        },
        {
            header: 'To Bin',
            accessorKey: 'toBin',
            cell: (row: any) => {
                if (!row) return null;
                if (typeof row.toBin === 'object' && row.toBin !== null) {
                    return `${row.toBin.name} (${row.toBin.site?.name || 'No Site'})`;
                }
                return 'Loading...';
            },
        },
        {
            header: 'Total Items',
            accessorKey: 'totalItems',
            cell: (row: any) => {
                if (!row) return null;
                return row.totalItems || 0;
            },
        },

    ];

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredTransfers.slice(startIndex, endIndex);

    const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);

    const inputBg = useColorModeValue('white', 'gray.700');
    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    return (
        <Box p={{ base: 4, md: 8 }} bg={useColorModeValue('gray.50', 'gray.800')} minH="100vh">
            <Flex justifyContent="space-between" alignItems="center" mb={6} direction={{ base: 'column', md: 'row' }}>
                <Heading as="h1" size="xl" mb={{ base: 4, md: 0 }}>Transfers</Heading>
                <HStack>
                    <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={handleCreateTransfer}>
                        Create New Transfer
                    </Button>
                </HStack>
            </Flex>

            {isLoading ? (
                <Flex justifyContent="center" alignItems="center" minH="100px">
                    <Spinner size="xl" />
                </Flex>
            ) : error ? (
                <Flex justifyContent="center" alignItems="center" minH="100px" direction="column">
                    <Text fontSize="lg" color="red.500">
                        {error}
                    </Text>
                    <Button onClick={handleFetchTransfers} mt={4}>
                        Try Again
                    </Button>
                </Flex>
            ) : filteredTransfers.length === 0 ? (
                <Text fontSize="lg" color="gray.500" textAlign="center" py={10}>
                    No transfers found.
                </Text>
            ) : (
                <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md">
                    <CardBody p={0}>
                        <DataTable
                            columns={columns}
                            data={paginatedData}
                            loading={false}
                        />
                    </CardBody>
                </Card>
            )}

            {filteredTransfers.length > 0 && (
                <Flex justifyContent="space-between" alignItems="center" mt={4} direction={{ base: 'column', md: 'row' }}>
                    <Text fontSize="sm" color="gray.600" mb={{ base: 2, md: 0 }}>
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredTransfers.length)} of {filteredTransfers.length} entries
                    </Text>
                    <HStack>
                        <Button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            isDisabled={currentPage === 1}
                            leftIcon={<FiArrowLeft />}
                            size="sm"
                        >
                            Previous
                        </Button>
                        <Button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            isDisabled={currentPage === totalPages}
                            rightIcon={<FiArrowRight />}
                            size="sm"
                        >
                            Next
                        </Button>
                    </HStack>
                </Flex>
            )}

            <TransferModal
                isOpen={isOpen}
                onClose={onClose}
                transfer={selectedTransfer}
                onSave={handleSaveSuccess}
            />
        </Box>
    );
}