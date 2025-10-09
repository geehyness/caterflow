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
    const [preSelectedPO, setPreSelectedPO] = useState<string | null>(null);

    // Theme-based color values
    const bgPrimary = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const bgCard = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const accentColor = useColorModeValue('brand.500', 'brand.300');

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
                const approvedPOs = data.filter((po: any) => po.status === 'processed');
                setApprovedPurchaseOrders(approvedPOs || []);
            } else {
                console.error('Failed to fetch purchase orders:', response.status);
            }
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
        }
    }, []);

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

    const getApprovedPOsWithoutReceipts = (): any[] => {
        const poIdsWithReceipts = new Set(
            goodsReceiptsList
                .filter(receipt => receipt.purchaseOrder)
                .map(receipt => getReferenceId(receipt.purchaseOrder))
        );

        const approvedPOs = allPurchaseOrders.filter(po => {
            const isApproved = po.status === 'processed';
            const hasReceipt = poIdsWithReceipts.has(po._id);
            return isApproved && !hasReceipt;
        });

        const result = approvedPOs.map(po => {
            const transformed = {
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
            };
            return transformed;
        });

        return result;
    };

    const approvedPOsWithoutReceipts = getApprovedPOsWithoutReceipts();

    const handleViewReceipt = (receipt: GoodsReceipt) => {
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

    const columns = [
        {
            accessorKey: 'workflowAction',
            header: 'Action',
            isSortable: false, // Actions column should not be sortable
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
        {
            accessorKey: 'receiptNumber',
            header: 'Receipt Number',
            isSortable: true, // Enable sorting for receipt numbers
            cell: (row: any) => <Text fontWeight="bold" color={primaryTextColor}>{row.receiptNumber || 'N/A'}</Text>,
        },
        {
            accessorKey: 'purchaseOrder.poNumber',
            header: 'PO Number',
            isSortable: true, // Enable sorting for PO numbers
            cell: (row: any) => <Text color={secondaryTextColor}>{getPopulatedData(row.purchaseOrder, 'poNumber') || 'N/A'}</Text>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            isSortable: true, // Enable sorting for status
            cell: (row: any) => (
                <Badge colorScheme={getStatusColor(row.status)} variant="subtle">
                    {row.status.replace('-', ' ').toUpperCase()}
                </Badge>
            ),
        },
        {
            accessorKey: 'receiptDate',
            header: 'Receipt Date',
            isSortable: true, // Enable sorting for dates
            cell: (row: any) => <Text color={secondaryTextColor}>{new Date(row.receiptDate).toLocaleDateString()}</Text>,
        },
        {
            accessorKey: 'supplier.name',
            header: 'Supplier',
            isSortable: true, // Enable sorting for supplier names
            cell: (row: any) => {
                const supplierName = getPopulatedData(row.purchaseOrder?.supplier, 'name');
                return <Text color={secondaryTextColor}>{supplierName || 'N/A'}</Text>;
            },
        },
        {
            accessorKey: 'site.name',
            header: 'Site',
            isSortable: true, // Enable sorting for site names
            cell: (row: any) => {
                const siteName = getPopulatedData(row.purchaseOrder?.site, 'name');
                return <Text color={primaryTextColor}>{siteName || 'N/A'}</Text>;
            },
        },
        {
            accessorKey: 'receivedItems.length',
            header: 'Items Received',
            isSortable: true, // Enable sorting for item counts
            cell: (row: any) => {
                const itemCount = row.receivedItems?.length || 0;
                return <Text color={secondaryTextColor}>{itemCount} items</Text>;
            },
        },
        {
            accessorKey: 'totalAmount',
            header: 'Total Amount',
            isSortable: true, // Enable sorting for amounts
            cell: (row: any) => <Text color={primaryTextColor}>E {(row.totalAmount || 0).toFixed(2)}</Text>
        }
    ];

    const poSelectionColumns = [
        {
            accessorKey: 'receiveAction',
            header: 'Action',
            isSortable: false, // Actions column should not be sortable
            cell: (row: any) => (
                <Button
                    size="sm"
                    colorScheme="green"
                    onClick={() => handleReceiveGoods(row)}
                    leftIcon={<FiPackage />}
                >
                    Receive
                </Button>
            ),
        },
        {
            accessorKey: 'poNumber',
            header: 'PO Number',
            isSortable: true, // Enable sorting for PO numbers
            cell: (row: any) => <Text fontWeight="bold" color={primaryTextColor}>{row.poNumber || 'N/A'}</Text>
        },
        {
            accessorKey: 'supplier.name',
            header: 'Supplier',
            isSortable: true, // Enable sorting for supplier names
            cell: (row: any) => <Text color={secondaryTextColor}>{row.supplier?.name || 'N/A'}</Text>
        },
        {
            accessorKey: 'site.name',
            header: 'Site',
            isSortable: true, // Enable sorting for site names
            cell: (row: any) => <Text color={primaryTextColor}>{row.site?.name || 'N/A'}</Text>
        },
        {
            accessorKey: 'orderDate',
            header: 'Order Date',
            isSortable: true, // Enable sorting for order dates
            cell: (row: any) => <Text color={secondaryTextColor}>{new Date(row._createdAt).toLocaleDateString()}</Text>
        },
        {
            accessorKey: 'totalAmount',
            header: 'Total Amount',
            isSortable: true, // Enable sorting for amounts
            cell: (row: any) => <Text color={primaryTextColor}>E {(row.totalAmount || 0).toFixed(2)}</Text>
        },
        {
            accessorKey: 'orderedItems',
            header: 'Items',
            isSortable: false, // Complex columns should not be sortable
            cell: (row: any) => (
                <Box>
                    {row.orderedItems?.slice(0, 2).map((item: any, index: number) => (
                        <Text key={index} fontSize="sm" color={secondaryTextColor}>
                            {item.stockItem?.name || 'Unknown Item'} (x{item.orderedQuantity || 0})
                        </Text>
                    ))}
                    {row.orderedItems?.length > 2 && (
                        <Text fontSize="sm" color={secondaryTextColor}>
                            +{row.orderedItems.length - 2} more items
                        </Text>
                    )}
                    {(!row.orderedItems || row.orderedItems.length === 0) && (
                        <Text fontSize="sm" color={secondaryTextColor}>
                            No items
                        </Text>
                    )}
                </Box>
            ),
        },
    ];

    if (loading || status === 'loading') {
        return (
            <Box p={4} bg={bgPrimary}>
                <Flex justifyContent="center" alignItems="center" height="50vh">
                    <Spinner size="xl" />
                </Flex>
            </Box>
        );
    }

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
                    Goods Receipt
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
                        leftIcon={<Icon as={FiPlus} />}
                        colorScheme="brand"
                        onClick={handleAddReceipt}
                    >
                        New Receipt
                    </Button>
                </HStack>
            </Flex>
            <Card bg={bgCard} border="1px" borderColor={borderColor}>
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
                <ModalContent bg={bgCard} border="1px" borderColor={borderColor}>
                    <ModalHeader color={primaryTextColor}>Select Purchase Order for Receiving</ModalHeader>
                    <ModalBody>
                        <Heading as="h3" size="md" mb={4} color={primaryTextColor}>
                            Approved Purchase Orders Ready for Receiving
                        </Heading>

                        {loading ? (
                            <Flex justifyContent="center" alignItems="center" py={10}>
                                <Spinner size="xl" />
                            </Flex>
                        ) : approvedPOsWithoutReceipts.length === 0 ? (
                            <Text fontSize="lg" color={secondaryTextColor}>
                                No approved purchase orders available for receiving.
                            </Text>
                        ) : (
                            <DataTable
                                columns={poSelectionColumns}
                                data={approvedPOsWithoutReceipts}
                                loading={loading}
                                onActionClick={() => { }}
                                hideStatusColumn={true}
                                onSelectionChange={() => { }}
                            />
                        )}
                    </ModalBody>
                    <ModalFooter borderTopWidth="1px" borderColor={borderColor}>
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
                        fetchGoodsReceipts();
                        fetchAllPurchaseOrders();
                    }}
                    approvedPurchaseOrders={approvedPOsWithoutReceipts}
                    preSelectedPO={preSelectedPO}
                />
            )}
        </Box>
    );
}