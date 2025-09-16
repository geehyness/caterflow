// src/app/operations/bin-counts/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Heading,
    Button,
    Flex,
    Spinner,
    useDisclosure,
    useToast,
    useColorModeValue,
    Card,
    CardBody,
    Input,
    InputGroup,
    InputLeftElement,
    Badge,
    IconButton,
    Icon,
    Text,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEdit, FiEye, FiClipboard, FiFilter } from 'react-icons/fi';
import DataTable from '@/components/DataTable';
import { useSession } from 'next-auth/react';
import BinCountModal from '@/components/BinCountModal';

interface CountedItem {
    _key: string;
    stockItem: {
        _id: string;
        name: string;
        sku: string;
    };
    countedQuantity: number;
    systemQuantityAtCountTime?: number;
    variance?: number;
}

interface BinCount {
    _id: string;
    countNumber: string;
    countDate: string;
    status: 'draft' | 'in-progress' | 'completed' | 'adjusted';
    bin: {
        _id: string;
        name: string;
        site: {
            _id: string;
            name: string;
        };
    };
    countedBy?: {
        _id: string;
        name: string;
    };
    countedItems: CountedItem[];
    totalItems: number;
    totalVariance?: number;
}

export default function BinCountsPage() {
    const { data: session, status } = useSession();
    const [binCounts, setBinCounts] = useState<BinCount[]>([]);
    const [filteredCounts, setFilteredCounts] = useState<BinCount[]>([]);
    const [selectedBinCount, setSelectedBinCount] = useState<BinCount | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const [viewMode, setViewMode] = useState<'actionRequired' | 'all'>('actionRequired');

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const inputBg = useColorModeValue('white', 'gray.800');
    const searchIconColor = useColorModeValue('gray.300', 'gray.500');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');

    const fetchBinCounts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/bin-counts');
            if (response.ok) {
                const data = await response.json();
                console.log('API response data:', data);
                setBinCounts(data);
            } else {
                throw new Error('Failed to fetch bin counts');
            }
        } catch (error) {
            console.error('Error fetching bin counts:', error);
            toast({
                title: 'Error',
                description: 'Failed to load bin counts. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchBinCounts();
    }, [fetchBinCounts]);

    useEffect(() => {
        let filtered = binCounts.filter(count => {
            const term = searchTerm.toLowerCase();
            const countNumberMatch = count.countNumber?.toLowerCase().includes(term) || false;
            const binMatch = count.bin?.name?.toLowerCase().includes(term) || false;
            const siteMatch = count.bin?.site?.name?.toLowerCase().includes(term) || false;
            return countNumberMatch || binMatch || siteMatch;
        });

        const countsToDisplay = viewMode === 'actionRequired'
            ? filtered.filter(count => count.status === 'draft' || count.status === 'in-progress')
            : filtered;

        // Sort the displayed counts by count number, highest first
        countsToDisplay.sort((a, b) => {
            const numA = parseInt(a.countNumber?.split('-')[1] || '0', 10);
            const numB = parseInt(b.countNumber?.split('-')[1] || '0', 10);
            return numB - numA; // Sort in descending order (highest number first)
        });

        setFilteredCounts(countsToDisplay);

    }, [binCounts, searchTerm, viewMode]);

    const handleAddBinCount = () => {
        setSelectedBinCount(null);
        onOpen();
    };

    const handleViewOrEdit = useCallback((count: BinCount) => {
        setSelectedBinCount(count);
        onOpen();
    }, [onOpen]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'gray';
            case 'in-progress': return 'orange';
            case 'completed': return 'green';
            case 'adjusted': return 'purple';
            default: return 'gray';
        }
    };

    const getItemList = (count: BinCount) => {
        if (!count.countedItems || count.countedItems.length === 0) return 'No items';
        const items = count.countedItems.slice(0, 3).map(item =>
            `${item.stockItem?.name || 'Unknown'}`
        );
        return items.join(', ') + (count.countedItems.length > 3 ? '...' : '');
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: 'workflowAction',
                header: 'Action',
                cell: (row: any) => (
                    <Button
                        size="sm"
                        colorScheme={row.status === 'draft' || row.status === 'in-progress' ? 'brand' : 'gray'}
                        variant={row.status === 'draft' || row.status === 'in-progress' ? 'solid' : 'outline'}
                        onClick={() => handleViewOrEdit(row)}
                        leftIcon={<Icon as={row.status === 'draft' || row.status === 'in-progress' ? FiEdit : FiEye} />}
                    >
                        {row.status === 'draft' || row.status === 'in-progress' ? 'Edit' : 'View'}
                    </Button>
                )
            },
            {
                accessorKey: 'countNumber',
                header: 'Count #',
            },
            {
                accessorKey: 'bin.name',
                header: 'Bin',
                cell: (row: any) => row.bin?.name || 'N/A'
            },
            {
                accessorKey: 'bin.site.name',
                header: 'Site',
                cell: (row: any) => row.bin?.site?.name || 'N/A'
            },
            {
                accessorKey: 'countDate',
                header: 'Count Date',
                cell: (row: any) => {
                    try {
                        return new Date(row.countDate).toLocaleDateString();
                    } catch {
                        return 'Invalid Date';
                    }
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: (row: any) => (
                    <Badge colorScheme={getStatusColor(row.status)} variant="subtle">
                        {row.status?.replace('-', ' ').toUpperCase() || 'UNKNOWN'}
                    </Badge>
                ),
            },
            {
                accessorKey: 'totalItems',
                header: 'Total Items',
                cell: (row: any) => row.totalItems || 0
            },
            {
                accessorKey: 'totalVariance',
                header: 'Total Variance',
                cell: (row: any) => {
                    const value = row.totalVariance || 0;
                    return (
                        <Badge colorScheme={value !== 0 ? 'red' : 'green'} variant="subtle">
                            {value}
                        </Badge>
                    );
                },
            },
        ],
        [handleViewOrEdit]
    );

    if (loading || status === 'loading') {
        return (
            <Box p={{ base: 2, md: 4 }}>
                <Flex justifyContent="center" alignItems="center" height="50vh">
                    <Spinner size="xl" />
                </Flex>
            </Box>
        );
    }

    function handleFinalizeCount(): void {
        throw new Error('Function not implemented.');
    }

    return (
        <Box p={{ base: 2, md: 4 }}>
            <Flex
                justifyContent="space-between"
                alignItems={{ base: 'flex-start', md: 'center' }}
                mb={6}
                flexDirection={{ base: 'column', md: 'row' }}
                gap={4}
            >
                <Heading as="h1" size="lg">Bin Counts</Heading>
                <Flex gap={3} flexWrap="wrap" justifyContent={{ base: 'flex-start', md: 'flex-end' }}>
                    <Button
                        leftIcon={<FiFilter />}
                        colorScheme={viewMode === 'actionRequired' ? 'brand' : 'gray'}
                        onClick={() => setViewMode('actionRequired')}
                    >
                        Action Required
                    </Button>
                    <Button
                        leftIcon={<FiEye />}
                        colorScheme={viewMode === 'all' ? 'brand' : 'gray'}
                        onClick={() => setViewMode('all')}
                    >
                        View All
                    </Button>
                    <Button
                        leftIcon={<FiPlus />}
                        colorScheme="brand"
                        onClick={handleAddBinCount}
                    >
                        New Count
                    </Button>
                </Flex>
            </Flex>

            {/* Search */}
            <Card mb={4}>
                <CardBody>
                    <InputGroup>
                        <InputLeftElement pointerEvents="none">
                            <Icon as={FiSearch} color={searchIconColor} />
                        </InputLeftElement>
                        <Input
                            placeholder="Search by count number, bin, or site..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </InputGroup>
                </CardBody>
            </Card>

            {/* Bin Counts Table */}
            <Card>
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={filteredCounts}
                        loading={false}
                    />
                </CardBody>
            </Card>

            <BinCountModal
                isOpen={isOpen}
                onClose={onClose}
                binCount={selectedBinCount}
                onSave={fetchBinCounts} // Just refresh the list after save/finalize
            //isViewMode={selectedBinCount?.status === 'completed' || selectedBinCount?.status === 'adjusted'}
            />
        </Box>
    );
}