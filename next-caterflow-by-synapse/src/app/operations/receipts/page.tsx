// src/app/goods-receipts/page.tsx
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
    useColorModeValue,
    Card,
    CardBody,
    Input,
    InputGroup,
    InputLeftElement,
    Badge,
    Text,
    Icon,
    HStack
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiEye, FiFilter } from 'react-icons/fi';
import DataTable from '@/app/actions/DataTable';
import { useAuth } from '@/context/AuthContext';
import GoodsReceiptModal from '@/app/actions/GoodsReceiptModal';
import { GoodsReceipt } from '@/lib/sanityTypes'; // Assuming this interface is correct

export default function GoodsReceiptsPage() {
    const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
    const [filteredReceipts, setFilteredReceipts] = useState<GoodsReceipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useAuth();
    const toast = useToast();
    const [viewMode, setViewMode] = useState<'actionRequired' | 'all'>('actionRequired');

    const [selectedGoodsReceipt, setSelectedGoodsReceipt] = useState<GoodsReceipt | null>(null);
    const { isOpen: isReceiptModalOpen, onOpen: onReceiptModalOpen, onClose: onReceiptModalClose } = useDisclosure();

    // Theme-based color values
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const searchIconColor = useColorModeValue('gray.300', 'gray.500');

    const fetchGoodsReceipts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/goods-receipts');
            if (response.ok) {
                const data = await response.json();
                setGoodsReceipts(data || []);
            } else {
                throw new Error('Failed to fetch goods receipts');
            }
        } catch (error) {
            console.error('Error fetching goods receipts:', error);
            toast({
                title: 'Error',
                description: 'Failed to load goods receipts. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchGoodsReceipts();
    }, [fetchGoodsReceipts]);

    useEffect(() => {
        const filtered = searchTerm
            ? goodsReceipts.filter(receipt => {
                const term = searchTerm.toLowerCase();
                const receiptNumberMatch = receipt.receiptNumber?.toLowerCase().includes(term) || false;
                const poNumberMatch = receipt.purchaseOrder?.poNumber?.toLowerCase().includes(term) || false;
                return receiptNumberMatch || poNumberMatch;
            })
            : goodsReceipts;

        const receiptsToDisplay = viewMode === 'actionRequired'
            ? filtered.filter(receipt => receipt.status === 'draft' || receipt.status === 'partially-received')
            : filtered;

        setFilteredReceipts(receiptsToDisplay);

    }, [goodsReceipts, searchTerm, viewMode]);

    const handleViewReceipt = (receipt: GoodsReceipt) => {
        setSelectedGoodsReceipt(receipt);
        onReceiptModalOpen();
    };

    const handleModalClose = () => {
        onReceiptModalClose();
        setSelectedGoodsReceipt(null);
        fetchGoodsReceipts();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'gray';
            case 'partially-received': return 'orange';
            case 'completed': return 'green';
            default: return 'gray';
        }
    };

    const columns = [
        {
            accessorKey: 'action',
            header: 'Action',
            cell: (row: any) => (
                <Button
                    size="sm"
                    colorScheme="brand"
                    onClick={() => handleViewReceipt(row)}
                    leftIcon={<Icon as={FiEye} />}
                >
                    View
                </Button>
            )
        },
        { accessorKey: 'receiptNumber', header: 'Receipt Number' },
        { accessorKey: 'poNumber', header: 'PO Number', cell: (row: any) => row.purchaseOrder?.poNumber || 'N/A' },
        {
            accessorKey: 'receiptDate',
            header: 'Receipt Date',
            cell: (row: any) => new Date(row.receiptDate).toLocaleDateString()
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: (row: any) => (
                <Badge colorScheme={getStatusColor(row.status)} variant="subtle">
                    {row.status.replace('-', ' ').toUpperCase()}
                </Badge>
            )
        },
    ];

    return (
        <Box p={{ base: 2, md: 4 }}>
            <Flex
                justifyContent="space-between"
                alignItems={{ base: 'flex-start', md: 'center' }}
                mb={6}
                flexDirection={{ base: 'column', md: 'row' }}
                gap={4}
            >
                <Heading as="h1" size="lg">Goods Receipts</Heading>
                <HStack>
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
                </HStack>
            </Flex>

            <Card mb={4}>
                <CardBody>
                    <InputGroup>
                        <InputLeftElement pointerEvents="none">
                            <Icon as={FiSearch} color={searchIconColor} />
                        </InputLeftElement>
                        <Input
                            placeholder="Search by receipt number or PO number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </InputGroup>
                </CardBody>
            </Card>

            <Card>
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={filteredReceipts}
                        loading={loading}
                    />
                </CardBody>
            </Card>

            {selectedGoodsReceipt && (
                <GoodsReceiptModal
                    isOpen={isReceiptModalOpen}
                    onClose={handleModalClose}
                    receipt={selectedGoodsReceipt}
                    onSave={handleModalClose}
                />
            )}
        </Box>
    );
}