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
import GoodsReceiptModal from '@/components/GoodsReceiptModal';

// Update the interface to match what GoodsReceiptModal expects
interface ReceivedItem {
    stockItem: string;
    receivedQuantity: number;
    batchNumber?: string;
    expiryDate?: string;
    condition: 'good' | 'damaged' | 'short-shipped' | 'over-shipped';
}

interface GoodsReceipt {
    _id: string;
    receiptNumber: string;
    receiptDate: string;
    purchaseOrder: string; // Changed from object to string to match modal expectation
    receivingBin: string; // Changed from object to string to match modal expectation
    status: 'draft' | 'completed' | 'cancelled';
    items: ReceivedItem[];
}

export default function ReceiptsPage() {
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    const [filteredReceipts, setFilteredReceipts] = useState<GoodsReceipt[]>([]);
    const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const { user } = useAuth();

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const inputBg = useColorModeValue('white', 'gray.800');

    const fetchReceipts = useCallback(async () => {
        try {
            const response = await fetch('/api/goods-receipts');
            if (response.ok) {
                const data = await response.json();
                // Transform the data to match the expected structure
                const transformedData = data.map((receipt: any) => ({
                    ...receipt,
                    purchaseOrder: receipt.purchaseOrder?.poNumber || receipt.purchaseOrder || '', // Extract poNumber if it's an object
                    receivingBin: receipt.receivingBin?.name || receipt.receivingBin || '', // Extract name if it's an object
                }));
                setReceipts(transformedData);
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
        fetchReceipts();
    }, [fetchReceipts]);

    useEffect(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            setFilteredReceipts(
                receipts.filter(receipt =>
                    receipt.receiptNumber.toLowerCase().includes(term) ||
                    receipt.purchaseOrder.toLowerCase().includes(term) ||
                    receipt.receivingBin.toLowerCase().includes(term)
                )
            );
        } else {
            setFilteredReceipts(receipts);
        }
    }, [receipts, searchTerm]);

    const handleAddReceipt = () => {
        setSelectedReceipt(null);
        onOpen();
    };

    const handleEditReceipt = (receipt: GoodsReceipt) => {
        setSelectedReceipt(receipt);
        onOpen();
    };

    const handleViewReceipt = (receipt: GoodsReceipt) => {
        // Navigate to detail page or open a view modal
        console.log('View receipt:', receipt);
    };

    const handleDeleteReceipt = async (receiptId: string) => {
        if (window.confirm('Are you sure you want to delete this goods receipt?')) {
            try {
                const response = await fetch(`/api/goods-receipts?id=${receiptId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete goods receipt');
                }

                setReceipts(receipts.filter(receipt => receipt._id !== receiptId));
                toast({
                    title: 'Receipt deleted.',
                    description: 'The goods receipt has been successfully deleted.',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } catch (error) {
                console.error('Error deleting goods receipt:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to delete goods receipt. Please try again.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };

    const handleSaveSuccess = () => {
        fetchReceipts();
        onClose();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'gray';
            case 'completed': return 'green';
            case 'cancelled': return 'red';
            default: return 'gray';
        }
    };

    const columns = [
        {
            accessorKey: 'actions',
            header: 'Actions',
            cell: (row: GoodsReceipt) => (
                <Flex>
                    <IconButton
                        aria-label="View receipt"
                        icon={<FiEye />}
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        mr={2}
                        onClick={() => handleViewReceipt(row)}
                    />
                    <IconButton
                        aria-label="Edit receipt"
                        icon={<FiEdit />}
                        size="sm"
                        colorScheme="green"
                        variant="ghost"
                        mr={2}
                        onClick={() => handleEditReceipt(row)}
                    />
                    <IconButton
                        aria-label="Delete receipt"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleDeleteReceipt(row._id)}
                    />
                </Flex>
            ),
        },
        {
            accessorKey: 'receiptNumber',
            header: 'Receipt Number',
            isSortable: true,
        },
        {
            accessorKey: 'receiptDate',
            header: 'Receipt Date',
            isSortable: true,
            cell: (row: GoodsReceipt) => new Date(row.receiptDate).toLocaleDateString(),
        },
        {
            accessorKey: 'purchaseOrder',
            header: 'Purchase Order',
            isSortable: true,
            cell: (row: GoodsReceipt) => row.purchaseOrder || 'N/A',
        },
        {
            accessorKey: 'receivingBin',
            header: 'Receiving Bin',
            isSortable: true,
            cell: (row: GoodsReceipt) => row.receivingBin || 'N/A',
        },
        {
            accessorKey: 'status',
            header: 'Status',
            isSortable: true,
            cell: (row: GoodsReceipt) => (
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
                <Heading as="h1" size="lg">Goods Receipts</Heading>
                <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={handleAddReceipt}
                >
                    New Receipt
                </Button>
            </Flex>

            {/* Search */}
            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" mb={4} p={4}>
                <InputGroup>
                    <InputLeftElement pointerEvents="none">
                        <FiSearch color="gray.300" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search goods receipts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        bg={inputBg}
                    />
                </InputGroup>
            </Card>

            {/* Goods Receipts Table */}
            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md">
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={filteredReceipts}
                        loading={false}
                    />
                </CardBody>
            </Card>

            <GoodsReceiptModal
                isOpen={isOpen}
                onClose={onClose}
                receipt={selectedReceipt}
                onSave={handleSaveSuccess}
            />
        </Box>
    );
}