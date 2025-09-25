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
import { FiPlus, FiSearch, FiEdit, FiEye, FiFilter, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
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
        case 'draft':
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
    const [viewMode, setViewMode] = useState<'all' | 'pending' | 'completed'>('all'); // New state for filtering

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const bgPrimary = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const bgCard = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const accentColor = useColorModeValue('brand.500', 'brand.300');

    const handleFetchTransfers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/transfers');
            if (!response.ok) {
                throw new Error('Failed to fetch transfers');
            }
            const data: any[] = await response.json();

            const transformedData: Transfer[] = data.map(transfer => ({
                ...transfer,
                transferredItems: transfer.items || transfer.transferredItems || [],
                fromBin: typeof transfer.fromBin === 'object' ? transfer.fromBin : { _id: transfer.fromBin, name: 'Loading...', site: { _id: '', name: '' } },
                toBin: typeof transfer.toBin === 'object' ? transfer.toBin : { _id: transfer.toBin, name: 'Loading...', site: { _id: '', name: '' } }
            }));

            setTransfers(transformedData);
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

    useEffect(() => {
        let tempFiltered = transfers;
        if (viewMode === 'pending') {
            tempFiltered = tempFiltered.filter(t => t.status === 'draft' || t.status === 'pending-approval');
        } else if (viewMode === 'completed') {
            tempFiltered = tempFiltered.filter(t => t.status === 'completed');
        }

        if (searchTerm) {
            const lowercasedValue = searchTerm.toLowerCase();
            tempFiltered = tempFiltered.filter(transfer =>
                transfer.transferNumber.toLowerCase().includes(lowercasedValue) ||
                (typeof transfer.fromBin === 'object' && transfer.fromBin.name.toLowerCase().includes(lowercasedValue)) ||
                (typeof transfer.toBin === 'object' && transfer.toBin.name.toLowerCase().includes(lowercasedValue))
            );
        }

        setFilteredTransfers(tempFiltered);
        setCurrentPage(1); // Reset to first page on filter/search change
    }, [transfers, searchTerm, viewMode]);

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

    const columns = [
        {
            header: 'Actions',
            accessorKey: 'actions',
            cell: (row: any) => {
                if (!row) return null;
                const isEditable = row.status === 'draft' || row.status === 'pending-approval';
                const isApproved = row.status === 'approved';
                return (
                    <HStack spacing={2}>
                        <Button
                            aria-label="View/Edit"
                            leftIcon={isEditable || isApproved ? <FiEdit /> : <FiEye />}
                            size="sm"
                            onClick={() => handleEditTransfer(row)}
                            colorScheme={isEditable ? "brand" : isApproved ? "yellow" : "gray"}
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
                    <Badge colorScheme={badgeColorScheme(row.status)} variant="subtle">
                        {row.status.replace('-', ' ').toUpperCase()}
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
                    <Text fontWeight="bold" color={primaryTextColor} _hover={{ color: accentColor, cursor: 'pointer' }} onClick={() => handleEditTransfer(row)}>
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
                return <Text color={secondaryTextColor}>{new Date(row.transferDate).toLocaleDateString()}</Text>;
            },
        },
        {
            header: 'From Bin',
            accessorKey: 'fromBin',
            cell: (row: any) => {
                if (!row || !row.fromBin) return <Text color={secondaryTextColor}>N/A</Text>;
                if (typeof row.fromBin === 'object') {
                    return <Text color={primaryTextColor}>{`${row.fromBin.name} (${row.fromBin.site?.name || 'No Site'})`}</Text>;
                }
                return <Text color={secondaryTextColor}>Loading...</Text>;
            },
        },
        {
            header: 'To Bin',
            accessorKey: 'toBin',
            cell: (row: any) => {
                if (!row || !row.toBin) return <Text color={secondaryTextColor}>N/A</Text>;
                if (typeof row.toBin === 'object') {
                    return <Text color={primaryTextColor}>{`${row.toBin.name} (${row.toBin.site?.name || 'No Site'})`}</Text>;
                }
                return <Text color={secondaryTextColor}>Loading...</Text>;
            },
        },
        {
            header: 'Total Items',
            accessorKey: 'totalItems',
            cell: (row: any) => {
                if (!row || !row.transferredItems) return <Text color={secondaryTextColor}>0</Text>;
                return <Text color={secondaryTextColor}>{row.transferredItems.length}</Text>;
            },
        },
    ];

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredTransfers.slice(startIndex, endIndex);

    const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);

    return (
        <Box p={{ base: 4, md: 8 }} bg={bgPrimary} minH="100vh">
            <Flex
                justifyContent="space-between"
                alignItems={{ base: 'flex-start', md: 'center' }}
                py={4}
                mb={6}
                flexDirection={{ base: 'column', md: 'row' }}
                gap={{ base: 4, md: 3 }}
            >
                <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color={primaryTextColor}>
                    Transfers
                </Heading>
                <HStack spacing={3} flexWrap="wrap">
                    <InputGroup maxW={{ base: 'full', md: '300px' }}>
                        <InputLeftElement
                            pointerEvents="none"
                            children={<FiSearch color={secondaryTextColor} />}
                        />
                        <Input
                            type="text"
                            placeholder="Search transfers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            borderColor={borderColor}
                            bg={bgCard}
                            _hover={{ borderColor: accentColor }}
                            _focus={{ borderColor: accentColor, boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                            color={primaryTextColor}
                            _placeholder={{ color: secondaryTextColor }}
                        />
                    </InputGroup>
                    <Button
                        leftIcon={<FiFilter />}
                        colorScheme="brand"
                        variant={viewMode === 'pending' ? 'solid' : 'outline'}
                        onClick={() => setViewMode(viewMode === 'pending' ? 'all' : 'pending')}
                    >
                        Action Required
                    </Button>
                    <Button
                        leftIcon={<FiEye />}
                        colorScheme="brand"
                        variant={viewMode === 'completed' ? 'solid' : 'outline'}
                        onClick={() => setViewMode(viewMode === 'completed' ? 'all' : 'completed')}
                    >
                        View Completed
                    </Button>
                    <Button leftIcon={<FiPlus />} colorScheme="brand" onClick={handleCreateTransfer}>
                        New Transfer
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
                <Text fontSize="lg" color={secondaryTextColor} textAlign="center" py={10}>
                    No transfers found.
                </Text>
            ) : (
                <Card bg={bgCard} border="1px" borderColor={borderColor} borderRadius="md">
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
                    <Text fontSize="sm" color={secondaryTextColor} mb={{ base: 2, md: 0 }}>
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredTransfers.length)} of {filteredTransfers.length} entries
                    </Text>
                    <HStack>
                        <Button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            isDisabled={currentPage === 1}
                            leftIcon={<FiArrowLeft />}
                            size="sm"
                            variant="outline"
                            colorScheme="brand"
                        >
                            Previous
                        </Button>
                        <Button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            isDisabled={currentPage === totalPages}
                            rightIcon={<FiArrowRight />}
                            size="sm"
                            variant="outline"
                            colorScheme="brand"
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