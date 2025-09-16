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
    Text,
    Icon,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEye, FiFilter, FiEdit } from 'react-icons/fi';
import DataTable from '@/components/DataTable';
import { useSession } from 'next-auth/react'
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
            _id: string;
            name: string;
        };
    };
    destinationSite: {
        _id: string;
        name: string;
    };
    totalItems: number;
    items: Array<{
        _key: string; // Add this required property
        stockItem: {
            _id: string;
            name: string;
        };
        dispatchedQuantity: number;
        totalCost?: number;
    }>;
}

export default function DispatchesPage() {
    const { data: session, status } = useSession();
    const user = session?.user;

    const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
    const [filteredDispatches, setFilteredDispatches] = useState<DispatchRecord[]>([]);
    const [selectedDispatch, setSelectedDispatch] = useState<DispatchRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const [viewMode, setViewMode] = useState<'actionRequired' | 'all'>('actionRequired');

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const inputBg = useColorModeValue('white', 'gray.800');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const searchIconColor = useColorModeValue('gray.300', 'gray.500');

    const fetchDispatches = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/dispatches');
            if (response.ok) {
                const data = await response.json();
                // Add _key property if missing
                const dispatchesWithKeys = data.map((dispatch: DispatchRecord) => ({
                    ...dispatch,
                    items: dispatch.items.map((item, index) => ({
                        ...item,
                        _key: item._key || `item-${index}-${Date.now()}` // Generate key if missing
                    }))
                }));
                setDispatches(dispatchesWithKeys);
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
    }, [toast]);


    useEffect(() => {
        fetchDispatches();
    }, [fetchDispatches]);

    useEffect(() => {
        const filtered = searchTerm
            ? dispatches.filter(dispatch => {
                const term = searchTerm.toLowerCase();
                const dispatchNumberMatch = dispatch.dispatchNumber.toLowerCase().includes(term);
                const sourceBinMatch = dispatch.sourceBin.name.toLowerCase().includes(term);
                const destinationSiteMatch = dispatch.destinationSite.name.toLowerCase().includes(term);
                return dispatchNumberMatch || sourceBinMatch || destinationSiteMatch;
            })
            : dispatches;

        const dispatchesToDisplay = viewMode === 'actionRequired'
            ? filtered.filter(dispatch => dispatch.status === 'pending')
            : filtered;

        setFilteredDispatches(dispatchesToDisplay);
    }, [dispatches, searchTerm, viewMode]);

    const handleAddDispatch = () => {
        setSelectedDispatch(null);
        onOpen();
    };

    const handleViewDispatch = (dispatch: DispatchRecord) => {
        setSelectedDispatch(dispatch);
        onOpen();
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

    // Update the getItemList function to handle string references
    const getItemList = (dispatch: DispatchRecord) => {
        if (!dispatch.items || dispatch.items.length === 0) return 'No items';

        const items = dispatch.items.slice(0, 3).map(item =>
            `${item.stockItem?.name || 'Unknown'} (${item.dispatchedQuantity})`
        );

        return items.join(', ') + (dispatch.items.length > 3 ? '...' : '');
    };

    const columns = [
        {
            accessorKey: 'workflowAction',
            header: 'Action',
            cell: (row: any) => (
                <Button
                    size="sm"
                    colorScheme={row.status === 'pending' ? 'brand' : 'gray'}
                    variant={row.status === 'pending' ? 'solid' : 'outline'}
                    onClick={() => handleViewDispatch(row)}
                    leftIcon={<Icon as={row.status === 'pending' ? FiEdit : FiEye} />}
                >
                    {row.status === 'pending' ? 'Edit' : 'View'}
                </Button>
            ),
        },
        {
            accessorKey: 'dispatchNumber',
            header: 'Dispatch Number',
        },
        {
            accessorKey: 'dispatchDate',
            header: 'Dispatch Date',
            cell: (row: DispatchRecord) => new Date(row.dispatchDate).toLocaleDateString(),
        },
        {
            accessorKey: 'sourceBin',
            header: 'Source Bin',
            cell: (row: DispatchRecord) => (
                <Box>
                    <Text fontWeight="bold">{row.sourceBin.name}</Text>
                    <Text fontSize="sm" color={secondaryTextColor}>{row.sourceBin.site.name}</Text>
                </Box>
            ),
        },
        {
            accessorKey: 'destinationSite',
            header: 'Destination Site',
            cell: (row: DispatchRecord) => (
                <Box>
                    <Text fontWeight="bold">{row.destinationSite.name}</Text>
                </Box>
            ),
        },
        {
            accessorKey: 'description',
            header: 'Items',
            cell: (row: DispatchRecord) => (
                <Box>
                    <Text fontSize="sm" color={secondaryTextColor} noOfLines={2}>
                        {getItemList(row)}
                    </Text>
                </Box>
            )
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: (row: DispatchRecord) => (
                <Badge colorScheme={getStatusColor(row.status)} variant="subtle">
                    {row.status.replace('-', ' ').toUpperCase()}
                </Badge>
            ),
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
        <Box p={{ base: 2, md: 4 }}>
            <Flex
                justifyContent="space-between"
                alignItems={{ base: 'flex-start', md: 'center' }}
                mb={6}
                flexDirection={{ base: 'column', md: 'row' }}
                gap={4}
            >
                <Heading as="h1" size="lg">Dispatches</Heading>
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
                        onClick={handleAddDispatch}
                    >
                        New Dispatch
                    </Button>
                </Flex>
            </Flex>

            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" mb={4}>
                <CardBody>
                    <InputGroup>
                        <InputLeftElement pointerEvents="none">
                            <Icon as={FiSearch} color={searchIconColor} />
                        </InputLeftElement>
                        <Input
                            placeholder="Search by dispatch number, source bin, or destination site..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            bg={inputBg}
                        />
                    </InputGroup>
                </CardBody>
            </Card>

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