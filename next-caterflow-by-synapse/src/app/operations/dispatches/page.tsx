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
    VStack,
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
    totalCost?: number; // ADD THIS
    costPerPerson?: number; // ADD THIS
    dispatchType?: {
        _id: string;
        name: string;
        description?: string;
    };
    sourceBin?: {
        _id: string;
        name: string;
        site?: {
            _id: string;
            name: string;
        };
    };
    dispatchedBy?: {
        _id: string;
        name: string;
        email: string;
    };
    dispatchedItems?: Array<{
        _key: string;
        stockItem?: {
            _id: string;
            name: string;
            sku?: string;
            unitOfMeasure?: string;
        };
        dispatchedQuantity: number;
        unitPrice?: number; // ADD THIS
        totalCost?: number;
        notes?: string;
    }>;
    attachments?: Array<{
        _id: string;
        name: string;
        url: string;
    }>;
    status?: string;
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

    // Theming props
    const bgPrimary = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const bgCard = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');

    const getEvidenceStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'pending': return 'yellow';
            case 'partial': return 'orange';
            case 'complete': return 'green';
            default: return 'gray';
        }
    }, []);

    const fetchDispatches = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/dispatches');
            if (response.ok) {
                const data = await response.json();
                setDispatches(data || []);
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
        if (status === 'authenticated') {
            fetchDispatches();
        }
    }, [fetchDispatches, status]);

    useEffect(() => {
        const filtered = searchTerm
            ? dispatches.filter(dispatch => {
                const term = searchTerm.toLowerCase();
                const dispatchNumberMatch = (dispatch.dispatchNumber || '').toLowerCase().includes(term);
                const dispatchTypeMatch = (dispatch.dispatchType?.name || '').toLowerCase().includes(term);
                const sourceBinMatch = (dispatch.sourceBin?.name || '').toLowerCase().includes(term);
                const dispatchedByMatch = (dispatch.dispatchedBy?.name || '').toLowerCase().includes(term);
                return dispatchNumberMatch || dispatchTypeMatch || sourceBinMatch || dispatchedByMatch;
            })
            : dispatches;

        const dispatchesToDisplay = viewMode === 'actionRequired'
            ? filtered.filter(dispatch => dispatch.evidenceStatus === 'pending' || dispatch.evidenceStatus === 'partial')
            : filtered;

        // Sort by dispatch number, highest first
        dispatchesToDisplay.sort((a, b) => {
            const numA = parseInt(a.dispatchNumber?.split('-')[1] || '0', 10);
            const numB = parseInt(b.dispatchNumber?.split('-')[1] || '0', 10);
            return numB - numA;
        });

        setFilteredDispatches(dispatchesToDisplay);
    }, [dispatches, searchTerm, viewMode]);

    const handleAddDispatch = () => {
        setSelectedDispatch(null);
        onOpen();
    };

    const handleViewDispatch = useCallback(async (rowOrRecord: DispatchRecord) => {
        const record = (rowOrRecord as any)?.original ?? rowOrRecord;
        if (!record?._id) {
            toast({
                title: 'Error',
                description: 'Invalid dispatch selected.',
                status: 'error',
                isClosable: true,
            });
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`/api/dispatches/${record._id}`);
            if (!res.ok) {
                throw new Error('Failed to fetch dispatch details');
            }
            const latest = await res.json();
            setSelectedDispatch(latest);
            onOpen();
        } catch (err) {
            console.error('Error loading dispatch details:', err);
            toast({
                title: 'Error',
                description: 'Could not load dispatch details. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [onOpen, toast]);

    const handleSaveSuccess = () => {
        fetchDispatches();
        onClose();
    };

    const getItemList = (dispatch: DispatchRecord) => {
        if (!dispatch.dispatchedItems || dispatch.dispatchedItems.length === 0) return 'No items';

        const items = dispatch.dispatchedItems.slice(0, 3).map(item =>
            `${item.stockItem?.name || 'Unknown'} (${item.dispatchedQuantity})`
        );

        return items.join(', ') + (dispatch.dispatchedItems.length > 3 ? '...' : '');
    };

    const columns = useMemo(() => [
        {
            accessorKey: 'workflowAction',
            header: 'Action',
            isSortable: false, // Explicitly set to false for clarity
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                const isComplete = d?.evidenceStatus === 'complete';
                const LabelIcon = isComplete ? FiEye : FiEdit;

                return (
                    <Button
                        size="sm"
                        colorScheme="brand"
                        variant={isComplete ? 'outline' : 'solid'}
                        onClick={() => handleViewDispatch(d)}
                        leftIcon={<Icon as={LabelIcon} />}
                        isDisabled={!user}
                    >
                        {isComplete ? 'View' : 'Edit'}
                    </Button>
                );
            },
        },
        {
            accessorKey: 'dispatchNumber',
            header: 'Dispatch Number',
            isSortable: true,
        },
        {
            accessorKey: 'evidenceStatus',
            header: 'Evidence Status',
            isSortable: true,
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                const statusStr = d?.evidenceStatus || 'pending';
                return (
                    <Badge colorScheme={getEvidenceStatusColor(statusStr)} variant="subtle">
                        {statusStr.toUpperCase()}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'dispatchType.name',
            header: 'Dispatch Type',
            isSortable: true,
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                return d?.dispatchType?.name || '-';
            },
        },
        {
            accessorKey: 'sourceBin.name',
            header: 'Source Bin',
            isSortable: true,
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                return (
                    <Box>
                        <Text fontWeight="bold">{d?.sourceBin?.name || '-'}</Text>
                        <Text fontSize="sm" color={secondaryTextColor}>{d?.sourceBin?.site?.name || ''}</Text>
                    </Box>
                );
            },
        },
        {
            accessorKey: 'dispatchedBy.name',
            header: 'Dispatched By',
            isSortable: true,
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                return d?.dispatchedBy?.name || '-';
            },
        },
        {
            accessorKey: 'description',
            header: 'Items',
            isSortable: false,
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                return (
                    <Box>
                        <Text fontSize="sm" color={secondaryTextColor} noOfLines={2}>
                            {getItemList(d)}
                        </Text>
                    </Box>
                );
            }
        },
        {
            accessorKey: 'totalCost',
            header: 'Total Cost',
            isSortable: true,
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                return d?.totalCost ? `$${d.totalCost.toFixed(2)}` : '$0.00';
            },
        },
        {
            accessorKey: 'peopleFed',
            header: 'People Fed',
            isSortable: true,
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                return d?.peopleFed ?? 'N/A';
            },
        },
        {
            accessorKey: 'costPerPerson',
            header: 'Cost per Person',
            isSortable: true,
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                return d?.costPerPerson ? `$${d.costPerPerson.toFixed(2)}` : 'N/A';
            },
        },
        {
            accessorKey: 'dispatchDate',
            header: 'Dispatch Date',
            isSortable: true,
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                return d?.dispatchDate ? new Date(d.dispatchDate).toLocaleDateString() : '-';
            },
        },
        {
            accessorKey: 'dispatchedItems.length',
            header: 'Item Count',
            isSortable: true,
            cell: (row: any) => {
                const d: DispatchRecord = row?.original ?? row;
                return d?.dispatchedItems?.length || 0;
            },
        }
    ], [handleViewDispatch, user, getEvidenceStatusColor, secondaryTextColor]);

    if (loading || status === 'loading') {
        return (
            <Flex justifyContent="center" alignItems="center" height="50vh" bg={bgPrimary}>
                <Spinner size="xl" />
            </Flex>
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
                        Dispatches
                    </Heading>
                    <HStack spacing={3} flexWrap="wrap">

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
                            onClick={handleAddDispatch}
                            isDisabled={!user}
                        >
                            New Dispatch
                        </Button>
                    </HStack>
                </Flex>

                <Card bg={bgCard} border="1px" borderColor={borderColor}>
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
                    dispatch={selectedDispatch as any}
                    onSave={handleSaveSuccess}
                />
            </VStack>
        </Box>
    );
}