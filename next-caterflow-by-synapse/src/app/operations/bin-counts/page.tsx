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
    HStack,
    VStack,
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
    const [viewMode, setViewMode] = useState<'actionRequired' | 'all'>('all');

    // Theming props
    const bgPrimary = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const bgCard = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');

    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'draft': return 'orange';
            case 'in-progress': return 'blue';
            case 'completed': return 'green';
            case 'adjusted': return 'purple';
            default: return 'gray';
        }
    }, []);

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
        if (status === 'authenticated') {
            fetchBinCounts();
        }
    }, [fetchBinCounts, status]);

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

        countsToDisplay.sort((a, b) => {
            const numA = parseInt(a.countNumber?.split('-')[1] || '0', 10);
            const numB = parseInt(b.countNumber?.split('-')[1] || '0', 10);
            return numB - numA;
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

    const columns = useMemo(
        () => [
            {
                accessorKey: 'workflowAction',
                header: 'Action',
                cell: (row: any) => (
                    <Button
                        size="sm"
                        colorScheme="brand"
                        variant={row.status === 'completed' || row.status === 'adjusted' ? 'outline' : 'solid'}
                        onClick={() => handleViewOrEdit(row)}
                        leftIcon={<Icon as={row.status === 'completed' || row.status === 'adjusted' ? FiEye : FiEdit} />}
                    >
                        {row.status === 'completed' || row.status === 'adjusted' ? 'View' : 'Edit'}
                    </Button>
                )
            },
            {
                accessorKey: 'countNumber',
                header: 'Count #',
                isSortable: true,
            },
            {
                accessorKey: 'bin.name',
                header: 'Bin',
                isSortable: true,
                cell: (row: any) => row.bin?.name || 'N/A'
            },
            {
                accessorKey: 'bin.site.name',
                header: 'Site',
                isSortable: true,
                cell: (row: any) => row.bin?.site?.name || 'N/A'
            },
            {
                accessorKey: 'countDate',
                header: 'Count Date',
                isSortable: true,
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
                isSortable: true,
                cell: (row: any) => (
                    <Badge colorScheme={getStatusColor(row.status)} variant="subtle">
                        {row.status?.replace('-', ' ').toUpperCase() || 'UNKNOWN'}
                    </Badge>
                ),
            },
            {
                accessorKey: 'totalItems',
                header: 'Total Items',
                isSortable: true,
                cell: (row: any) => row.totalItems || 0
            },
            {
                accessorKey: 'totalVariance',
                header: 'Total Variance',
                isSortable: true,
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
        [handleViewOrEdit, getStatusColor]
    );

    if (loading || status === 'loading') {
        return (
            <Box p={{ base: 4, md: 8 }} bg={bgPrimary}>
                <Flex justifyContent="center" alignItems="center" height="50vh">
                    <Spinner size="xl" />
                </Flex>
            </Box>
        );
    }

    return (
        <Box p={{ base: 4, md: 8 }} bg={bgPrimary} minH="100vh">
            <VStack spacing={{ base: 4, md: 6 }} align="stretch">
                <Flex
                    justifyContent="space-between"
                    alignItems={{ base: 'flex-start', md: 'center' }}
                    flexDirection={{ base: 'column', md: 'row' }}
                    gap={{ base: 4, md: 3 }}
                >
                    <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color={primaryTextColor}>
                        Bin Counts
                    </Heading>
                    <HStack spacing={3} flexWrap="wrap">
                        <InputGroup maxW={{ base: 'full', md: '300px' }}>
                            <InputLeftElement
                                pointerEvents="none"
                                children={<FiSearch color={secondaryTextColor} />}
                            />
                            <Input
                                type="text"
                                placeholder="Search counts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                borderColor={borderColor}
                                bg={bgCard}
                                _hover={{ borderColor: 'brand.500' }}
                                _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                                color={primaryTextColor}
                                _placeholder={{ color: secondaryTextColor }}
                            />
                        </InputGroup>
                        <Button
                            leftIcon={<FiEye />}
                            colorScheme="brand"
                            variant={viewMode === 'all' ? 'solid' : 'outline'}
                            onClick={() => setViewMode('all')}
                        >
                            View All
                        </Button>

                        <Button
                            leftIcon={<FiFilter />}
                            colorScheme="brand"
                            variant={viewMode === 'actionRequired' ? 'solid' : 'outline'}
                            onClick={() => setViewMode('actionRequired')}
                        >
                            Action Required
                        </Button>
                        <Button
                            leftIcon={<FiPlus />}
                            colorScheme="brand"
                            onClick={handleAddBinCount}
                        >
                            New Count
                        </Button>
                    </HStack>
                </Flex>

                {/* Bin Counts Table */}
                <Card bg={bgCard} border="1px" borderColor={borderColor}>
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
                    onSave={fetchBinCounts}
                />
            </VStack>
        </Box>
    );
}