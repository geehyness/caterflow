'use client';

import { useState, useEffect, useCallback } from 'react';
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
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Text,
} from '@chakra-ui/react';
import { FiSearch, FiEye, FiFilter, FiCheckCircle, FiPlus, FiPackage } from 'react-icons/fi';
import DataTable from '@/app/actions/DataTable';
import { useSession } from 'next-auth/react';
import GoodsReceiptModal from '@/app/actions/GoodsReceiptModal';
import { GoodsReceipt, Reference } from '@/lib/sanityTypes';
import { v4 as uuidv4 } from 'uuid';

// Helper function to extract ID from a Sanity reference
const getReferenceId = (ref: Reference | any): string => {
    if (!ref) return '';
    if (typeof ref === 'object' && '_id' in ref) return ref._id;
    if (typeof ref === 'object' && '_ref' in ref) return ref._ref;
    return '';
};

// Helper function to get data from a populated reference
const getPopulatedData = (ref: any, field: string): string => {
    if (!ref) return '';
    if (typeof ref === 'object' && field in ref) return ref[field];
    return '';
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'draft': return 'gray';
        case 'partially-received': return 'orange';
        case 'completed': return 'green';
        default: return 'gray';
    }
};

export default function GoodsReceiptsPage() {
    const { data: session, status } = useSession();
    const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
    const [filteredReceipts, setFilteredReceipts] = useState<GoodsReceipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const toast = useToast();
    const [viewMode, setViewMode] = useState<'actionRequired' | 'all'>('all');
    const [selectedGoodsReceipt, setSelectedGoodsReceipt] = useState<any>(null);
    const { isOpen: isReceiptModalOpen, onOpen: onReceiptModalOpen, onClose: onReceiptModalClose } = useDisclosure();
    const { isOpen: isPOSelectionModalOpen, onOpen: onPOSelectionModalOpen, onClose: onPOSelectionModalClose } = useDisclosure();
    const [approvedPurchaseOrders, setApprovedPurchaseOrders] = useState<any[]>([]);
    const [allPurchaseOrders, setAllPurchaseOrders] = useState<any[]>([]);
    const [goodsReceiptsList, setGoodsReceiptsList] = useState<any[]>([]);
    //const [loadingPOs, setLoadingPOs] = useState(false);
    //const [loadingReceipts, setLoadingReceipts] = useState(false);
    const [preSelectedPO, setPreSelectedPO] = useState<string | null>(null);
    const searchIconColor = useColorModeValue('gray.300', 'gray.500');

    // Also update the fetch functions to remove their individual loading states:
    const fetchGoodsReceipts = useCallback(async () => {
        try {
            const response = await fetch('/api/goods-receipts');
            if (response.ok) {
                const data = await response.json();
                setGoodsReceipts(data || []);
                setGoodsReceiptsList(data || []);
            } else {
                throw new Error('Failed to fetch goods receipts');
            }
        } catch (error) {
            console.error('Error fetching goods receipts:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch goods receipts',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [toast]);


    const fetchAllPurchaseOrders = useCallback(async () => {
        try {
            const response = await fetch('/api/purchase-orders');
            if (response.ok) {
                const data = await response.json();
                setAllPurchaseOrders(data || []);
                setApprovedPurchaseOrders(data.filter((po: any) => po.status === 'approved') || []);
            } else {
                console.error('Failed to fetch purchase orders:', response.status);
            }
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
        }
    }, []);

    // Replace the useEffect that fetches data with this:
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchGoodsReceipts(), fetchAllPurchaseOrders()]);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [fetchGoodsReceipts, fetchAllPurchaseOrders]);

    useEffect(() => {
        const filtered = searchTerm
            ? goodsReceipts.filter(receipt => {
                const term = searchTerm.toLowerCase();
                const receiptNumberMatch = receipt.receiptNumber?.toLowerCase().includes(term) || false;
                const poNumberMatch = getPopulatedData(receipt.purchaseOrder, 'poNumber')?.toLowerCase().includes(term) || false;
                return receiptNumberMatch || poNumberMatch;
            })
            : goodsReceipts;

        const receiptsToDisplay = viewMode === 'actionRequired'
            ? filtered.filter(receipt => receipt.status === 'draft' || receipt.status === 'partially-received')
            : filtered;

        setFilteredReceipts(receiptsToDisplay);
    }, [goodsReceipts, searchTerm, viewMode]);

    // Get approved POs without receipts
    const getApprovedPOsWithoutReceipts = (): any[] => {
        // Get all PO IDs that have receipts
        const poIdsWithReceipts = new Set(
            goodsReceiptsList
                .filter(receipt => receipt.purchaseOrder)
                .map(receipt => getReferenceId(receipt.purchaseOrder))
        );

        // Filter approved POs that don't have receipts
        return allPurchaseOrders
            .filter(po => po.status === 'approved' && !poIdsWithReceipts.has(po._id))
            .map(po => ({
                _id: po._id,
                _type: 'purchaseOrder',
                _createdAt: po.orderDate || new Date().toISOString(),
                poNumber: po.poNumber || '',
                status: po.status || 'approved',
                site: {
                    _id: po.site?._id || '',
                    name: po.site?.name || ''
                },
                supplier: {
                    _id: po.supplier?._id || '',
                    name: po.supplier?.name || ''
                },
                orderedItems: po.orderedItems || [],
                orderedBy: po.orderedBy || '',
                totalAmount: po.totalAmount || 0
            }));
    };

    const approvedPOsWithoutReceipts = getApprovedPOsWithoutReceipts();

    const handleViewReceipt = (receipt: GoodsReceipt) => {
        // Don't transform the data - pass it as-is from API
        setSelectedGoodsReceipt(receipt);
        setPreSelectedPO(null);
        onReceiptModalOpen();
    };

    const handleReceiveGoods = (po: any) => {
        setPreSelectedPO(po._id);
        setSelectedGoodsReceipt(null);
        onPOSelectionModalClose();
        onReceiptModalOpen();
    };

    const handleModalClose = () => {
        onReceiptModalClose();
        setSelectedGoodsReceipt(null);
        setPreSelectedPO(null);
    };

    const handleAddReceipt = () => {
        onPOSelectionModalOpen();
    };

    const handleNewReceiptWithPO = () => {
        const newReceipt = {
            _id: `temp-${uuidv4()}`,
            _type: 'GoodsReceipt',
            receiptNumber: 'New Receipt',
            receiptDate: new Date().toISOString(),
            status: 'draft',
            receivedItems: [],
        };
        setSelectedGoodsReceipt(newReceipt);
        onPOSelectionModalOpen();
    };

    const columns = [
        {
            accessorKey: 'workflowAction',
            header: 'Action',
            cell: (row: any) => {
                const isCompleted = row.status === 'completed';
                return (
                    <Button
                        size="sm"
                        colorScheme={!isCompleted ? 'brand' : 'gray'}
                        variant={!isCompleted ? 'solid' : 'outline'}
                        onClick={() => handleViewReceipt(row)}
                        leftIcon={<Icon as={!isCompleted ? FiCheckCircle : FiEye} />}
                    >
                        {!isCompleted ? 'Receive' : 'View'}
                    </Button>
                );
            },
        },
        { accessorKey: 'receiptNumber', header: 'Receipt Number' },
        {
            accessorKey: 'poNumber',
            header: 'PO Number',
            cell: (row: any) => getPopulatedData(row.purchaseOrder, 'poNumber') || 'N/A',
        },
        {
            accessorKey: 'receiptDate',
            header: 'Receipt Date',
            cell: (row: any) => new Date(row.receiptDate).toLocaleDateString(),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: (row: any) => (
                <Badge colorScheme={getStatusColor(row.status)} variant="subtle">
                    {row.status.replace('-', ' ').toUpperCase()}
                </Badge>
            ),
        },
    ];

    if (loading || status === 'loading') {
        return (
            <Box p={{ base: 2, md: 4 }}>
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
                    Goods Receipt
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
                        leftIcon={<Icon as={FiPlus} />}
                        colorScheme="blue"
                        onClick={handleAddReceipt}
                    >
                        New Receipt
                    </Button>
                </HStack>
            </Flex>
            <Card>
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={filteredReceipts}
                        loading={loading}
                    />
                </CardBody>
            </Card>

            {/* PO Selection Modal */}
            <Modal isOpen={isPOSelectionModalOpen} onClose={onPOSelectionModalClose} size="4xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Select Purchase Order for Receiving</ModalHeader>
                    <ModalBody>
                        <Heading as="h3" size="md" mb={4}>
                            Approved Purchase Orders Ready for Receiving
                        </Heading>

                        {loading ? (
                            <Flex justifyContent="center" alignItems="center" py={10}>
                                <Spinner size="xl" />
                            </Flex>
                        ) : approvedPOsWithoutReceipts.length === 0 ? (
                            <Text fontSize="lg" color="gray.500">
                                No approved purchase orders available for receiving.
                            </Text>
                        ) : (
                            <DataTable
                                columns={[
                                    {
                                        accessorKey: 'receiveAction',
                                        header: 'Action',
                                        cell: (row: any) => (
                                            <Button
                                                size="sm"
                                                colorScheme="green"
                                                onClick={() => handleReceiveGoods(row)}
                                                leftIcon={<FiPackage />}
                                            >
                                                Receive
                                            </Button>
                                        )
                                    },
                                    {
                                        accessorKey: 'poNumber',
                                        header: 'PO Number',
                                        isSortable: true,
                                        cell: (row: any) => <Text>{row.poNumber || 'N/A'}</Text>
                                    },
                                    {
                                        accessorKey: 'supplierName',
                                        header: 'Supplier',
                                        isSortable: true,
                                        cell: (row: any) => <Text>{row.supplier?.name || 'N/A'}</Text>
                                    },
                                    {
                                        accessorKey: 'siteName',
                                        header: 'Site',
                                        isSortable: true,
                                        cell: (row: any) => <Text>{row.site?.name || 'N/A'}</Text>
                                    },
                                    {
                                        accessorKey: 'orderedItems',
                                        header: 'Items',
                                        isSortable: false,
                                        cell: (row: any) => (
                                            <Box>
                                                {row.orderedItems?.slice(0, 2).map((item: any, index: number) => (
                                                    <Text key={index} fontSize="sm">
                                                        {item.stockItem?.name || 'Unknown Item'} (x{item.orderedQuantity || 0})
                                                    </Text>
                                                ))}
                                                {row.orderedItems?.length > 2 && (
                                                    <Text fontSize="sm" color="gray.500">
                                                        +{row.orderedItems.length - 2} more items
                                                    </Text>
                                                )}
                                                {(!row.orderedItems || row.orderedItems.length === 0) && (
                                                    <Text fontSize="sm" color="gray.500">
                                                        No items
                                                    </Text>
                                                )}
                                            </Box>
                                        )
                                    }
                                ]}
                                data={approvedPOsWithoutReceipts.map(po => ({
                                    _id: po._id,
                                    poNumber: po.poNumber || '',
                                    supplier: po.supplier || { name: '' },
                                    site: po.site || { name: '' },
                                    orderedItems: po.orderedItems || []
                                }))}
                                loading={loading}
                                onActionClick={() => { }}
                                hideStatusColumn={true}
                                onSelectionChange={() => { }}
                            />
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" onClick={onPOSelectionModalClose}>
                            Cancel
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Goods Receipt Modal */}
            {isReceiptModalOpen && (
                <GoodsReceiptModal
                    isOpen={isReceiptModalOpen}
                    onClose={handleModalClose}
                    receipt={selectedGoodsReceipt}
                    onSave={() => {
                        handleModalClose();
                        fetchGoodsReceipts(); // Refresh the list after saving
                        fetchAllPurchaseOrders(); // Refresh POs as well
                    }}
                    approvedPurchaseOrders={approvedPOsWithoutReceipts}
                    preSelectedPO={preSelectedPO}
                />
            )}
        </Box>
    );
}