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
    HStack,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEye, FiFilter, FiEdit } from 'react-icons/fi';
import DataTable from '@/components/DataTable';
import { useSession } from 'next-auth/react'
import DispatchModal from '@/components/DispatchModal';

interface DispatchRecord {
    _id: string;
    dispatchNumber: string;
    dispatchDate: string;
    evidenceStatus: 'pending' | 'partial' | 'complete';
    peopleFed?: number;
    notes?: string;
    dispatchType: {
        _id: string;
        name: string;
        description?: string;
    };
    sourceBin: {
        _id: string;
        name: string;
        site: {
            _id: string;
            name: string;
        };
    };
    dispatchedBy: {
        _id: string;
        name: string;
        email: string;
    };
    dispatchedItems: Array<{
        _key: string;
        stockItem: {
            _id: string;
            name: string;
            sku?: string;
            unitOfMeasure?: string;
        };
        dispatchedQuantity: number;
        totalCost?: number;
        notes?: string;
    }>;
    attachments?: Array<{
        _id: string;
        name: string;
        url: string;
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
    const [viewMode, setViewMode] = useState<'actionRequired' | 'all'>('all');

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
    }, [toast]);

    useEffect(() => {
        fetchDispatches();
    }, [fetchDispatches]);

    useEffect(() => {
        const filtered = searchTerm
            ? dispatches.filter(dispatch => {
                const term = searchTerm.toLowerCase();
                const dispatchNumberMatch = dispatch.dispatchNumber.toLowerCase().includes(term);
                const dispatchTypeMatch = dispatch.dispatchType.name.toLowerCase().includes(term);
                const sourceBinMatch = dispatch.sourceBin.name.toLowerCase().includes(term);
                const dispatchedByMatch = dispatch.dispatchedBy.name.toLowerCase().includes(term);
                return dispatchNumberMatch || dispatchTypeMatch || sourceBinMatch || dispatchedByMatch;
            })
            : dispatches;

        const dispatchesToDisplay = viewMode === 'actionRequired'
            ? filtered.filter(dispatch => dispatch.evidenceStatus === 'pending' || dispatch.evidenceStatus === 'partial')
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

    const getEvidenceStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'yellow';
            case 'partial': return 'orange';
            case 'complete': return 'green';
            default: return 'gray';
        }
    };

    const getItemList = (dispatch: DispatchRecord) => {
        if (!dispatch.dispatchedItems || dispatch.dispatchedItems.length === 0) return 'No items';

        const items = dispatch.dispatchedItems.slice(0, 3).map(item =>
            `${item.stockItem?.name || 'Unknown'} (${item.dispatchedQuantity})`
        );

        return items.join(', ') + (dispatch.dispatchedItems.length > 3 ? '...' : '');
    };

    const columns = [
        {
            accessorKey: 'workflowAction',
            header: 'Action',
            cell: (row: any) => (
                <Button
                    size="sm"
                    colorScheme={row.evidenceStatus === 'pending' ? 'brand' : 'gray'}
                    variant={row.evidenceStatus === 'pending' ? 'solid' : 'outline'}
                    onClick={() => handleViewDispatch(row)}
                    leftIcon={<Icon as={row.evidenceStatus === 'pending' ? FiEdit : FiEye} />}
                >
                    {row.evidenceStatus === 'pending' ? 'Edit' : 'View'}
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
            accessorKey: 'dispatchType',
            header: 'Dispatch Type',
            cell: (row: DispatchRecord) => row.dispatchType?.name,
        },
        {
            accessorKey: 'sourceBin',
            header: 'Source Bin',
            cell: (row: DispatchRecord) => (
                <Box>
                    <Text fontWeight="bold">{row.sourceBin?.name}</Text>
                    <Text fontSize="sm" color={secondaryTextColor}>{row.sourceBin.site.name}</Text>
                </Box>
            ),
        },
        {
            accessorKey: 'dispatchedBy',
            header: 'Dispatched By',
            cell: (row: DispatchRecord) => row.dispatchedBy.name,
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
            accessorKey: 'peopleFed',
            header: 'People Fed',
            cell: (row: DispatchRecord) => row.peopleFed || 'N/A',
        },
        {
            accessorKey: 'evidenceStatus',
            header: 'Evidence Status',
            cell: (row: DispatchRecord) => (
                <Badge colorScheme={getEvidenceStatusColor(row.evidenceStatus)} variant="subtle">
                    {row.evidenceStatus.toUpperCase()}
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
                py={4}
                mb={6}
                flexDirection={{ base: 'column', md: 'row' }}
                gap={{ base: 4, md: 3 }}
            >
                <Heading as="h1" size="xl">
                    Dispatches
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
                        onClick={handleAddDispatch}
                        isDisabled={!user}
                    >
                        New Dispatch
                    </Button>
                </HStack>
            </Flex>

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