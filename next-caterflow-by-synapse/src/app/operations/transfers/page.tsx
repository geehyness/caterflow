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
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiFilter } from 'react-icons/fi';
import DataTable from '@/components/DataTable';
import { useSession } from 'next-auth/react'
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
    status: 'pending' | 'completed' | 'cancelled';
    fromBin: Bin | string;
    toBin: Bin | string;
    items: TransferredItem[];
    totalItems: number;
}

export default function TransfersPage() {
    const { data: session, status } = useSession();
    const user = session?.user;

    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
    const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'all' | 'actionRequired'>('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();

    // Chakra UI theming
    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const searchIconColor = useColorModeValue('gray.400', 'gray.500');
    const inputBg = useColorModeValue('gray.50', 'gray.600');
    const badgeColorScheme = (status: Transfer['status']) => {
        switch (status) {
            case 'completed':
                return 'green';
            case 'pending':
                return 'orange';
            case 'cancelled':
                return 'red';
            default:
                return 'gray';
        }
    };

    const fetchTransfers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/operations/transfers');
            if (!response.ok) {
                throw new Error('Failed to fetch transfers');
            }
            const data: Transfer[] = await response.json();
            setTransfers(data);
            setFilteredTransfers(data);
        } catch (error) {
            console.error('Error fetching transfers:', error);
            toast({
                title: 'Error fetching transfers.',
                description: 'Failed to load transfer data. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchTransfers();
    }, [fetchTransfers]);

    useEffect(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();

        let results = transfers;

        if (viewMode === 'actionRequired') {
            results = results.filter(transfer => transfer.status === 'pending');
        }

        results = results.filter(transfer =>
            transfer.transferNumber.toLowerCase().includes(lowercasedSearchTerm) ||
            getSiteName(transfer.fromBin).toLowerCase().includes(lowercasedSearchTerm) ||
            getSiteName(transfer.toBin).toLowerCase().includes(lowercasedSearchTerm)
        );

        setFilteredTransfers(results);
        setCurrentPage(1); // Reset to first page on new search/filter
    }, [searchTerm, transfers, viewMode]);

    const handleAddTransfer = () => {
        setSelectedTransfer(null);
        onOpen();
    };

    const handleEditTransfer = (transfer: Transfer) => {
        setSelectedTransfer(transfer);
        onOpen();
    };

    const handleSaveSuccess = () => {
        fetchTransfers();
        onClose();
        toast({
            title: 'Transfer saved.',
            description: 'The transfer has been saved successfully.',
            status: 'success',
            duration: 5000,
            isClosable: true,
        });
    };

    // Helper to get site name from a Bin object or a string
    const getSiteName = (bin: Bin | string): string => {
        if (typeof bin === 'object' && bin.site) {
            return bin.site.name;
        }
        return 'N/A';
    };

    const columns = [
        {
            header: 'Transfer #',
            accessorKey: 'transferNumber',
            cell: (row: any) => (
                <Text
                    fontWeight="medium"
                    _hover={{ color: 'blue.500', cursor: 'pointer' }}
                    onClick={() => handleEditTransfer(row.original)}
                >
                    {row.original.transferNumber}
                </Text>
            ),
        },
        {
            header: 'Date',
            accessorKey: 'transferDate',
            cell: (row: any) => new Date(row.original.transferDate).toLocaleDateString(),
        },
        {
            header: 'From Bin',
            accessorKey: 'fromBin',
            cell: (row: any) => getSiteName(row.original.fromBin),
        },
        {
            header: 'To Bin',
            accessorKey: 'toBin',
            cell: (row: any) => getSiteName(row.original.toBin),
        },
        {
            header: 'Total Items',
            accessorKey: 'totalItems',
            cell: (row: any) => row.original.totalItems,
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row: any) => (
                <Badge colorScheme={badgeColorScheme(row.original.status)}>
                    {row.original.status}
                </Badge>
            ),
        },
        {
            header: 'Actions',
            accessorKey: 'actions',
            cell: (row: any) => (
                <HStack spacing={2}>
                    <IconButton
                        aria-label="View/Edit"
                        icon={<FiEdit />}
                        size="sm"
                        onClick={() => handleEditTransfer(row.original)}
                        colorScheme="blue"
                    />
                </HStack>
            ),
        },
    ];

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredTransfers.slice(startIndex, startIndex + itemsPerPage);

    if (isLoading) {
        return (
            <Flex justifyContent="center" alignItems="center" height="100vh">
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <Box p={4} maxW="container.xl" mx="auto">
            <Flex
                justifyContent="space-between"
                alignItems={{ base: 'flex-start', md: 'center' }}
                py={4}
                mb={6}
                flexDirection={{ base: 'column', md: 'row' }}
                gap={{ base: 4, md: 3 }}
            >
                <Heading as="h1" size="xl">
                    Transfers
                </Heading>
                <HStack spacing={3} flexWrap="wrap">
                    <Button
                        leftIcon={<FiEye />}
                        colorScheme={viewMode === 'all' ? 'brand' : 'gray'}
                        onClick={() => setViewMode('all')}
                        variant="outline"
                    >
                        View All
                    </Button>

                    <Button
                        leftIcon={<FiFilter />}
                        colorScheme={viewMode === 'actionRequired' ? 'brand' : 'gray'}
                        onClick={() => setViewMode('actionRequired')}
                        variant="outline"
                    >
                        Action Required
                    </Button>
                    <Button
                        leftIcon={<FiPlus />}
                        colorScheme="brand"
                        variant="solid"
                        onClick={handleAddTransfer}
                    >
                        New Transfer
                    </Button>
                </HStack>
            </Flex>

            <Flex direction={{ base: 'column', md: 'row' }} mb={4} justifyContent="space-between" alignItems="center" gap={{ base: 4, md: 8 }} py={4} px={0}>
                <InputGroup maxW="100%">
                    <InputLeftElement pointerEvents="none">
                        <Icon as={FiSearch} color={searchIconColor} />
                    </InputLeftElement>
                    <Input
                        type="text"
                        placeholder="Search transfers..."
                        value={searchTerm}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        flex="1"
                        bg={inputBg}
                    />
                </InputGroup>
                <HStack alignItems="center" mt={{ base: 4, md: 0 }}>
                    <Text mr={2} width={{ base: '120px', md: '160px' }} fontSize="sm" color="gray.600">
                        Items per page:
                    </Text>
                    <Select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1); // Reset to first page
                        }}
                        maxW="100px"
                        size="sm"
                        bg={inputBg}
                    >
                        {[5, 10, 25, 50].map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </Select>
                </HStack>
            </Flex>

            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md">
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={paginatedData}
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