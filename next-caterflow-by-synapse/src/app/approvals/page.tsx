// src/app/approvals/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Heading,
    Text,
    Flex,
    Spinner,
    useToast,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Icon,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Button,
    HStack,
    VStack,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { FaBoxes } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import DataTable from '../actions/DataTable';

// Update the interface to match the expanded data from the API route
interface OrderedItem {
    _key: string;
    stockItem: {
        _id: string;
        name: string;
    };
    supplier: {
        _id: string;
        name: string;
    };
    orderedQuantity: number;
    unitPrice: number;
}

// Update the interface for an approval action
interface ApprovalAction {
    _id: string;
    _type: string;
    title: string;
    description: string;
    createdAt: string;
    priority: 'high' | 'medium' | 'low';
    siteName: string;
    status: 'pending-approval';
    poNumber?: string;
    orderedItems?: OrderedItem[];
    orderedBy?: string;
    transferNumber?: string;
    adjustmentNumber?: string;
    receiptNumber?: string;
}

export default function ApprovalsPage() {
    const { isAuthenticated, isAuthReady, user } = useAuth();
    const [pendingApprovals, setPendingApprovals] = useState<ApprovalAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedApproval, setSelectedApproval] = useState<ApprovalAction | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
    const toast = useToast();
    const router = useRouter();
    const [selectedApprovals, setSelectedApprovals] = useState<ApprovalAction[]>([]);

    const actionTypes = ['PurchaseOrder', 'GoodsReceipt', 'InternalTransfer', 'StockAdjustment'];
    const actionTypeTitles: { [key: string]: string } = {
        'PurchaseOrder': 'Purchase Orders',
        'GoodsReceipt': 'Goods Receipts',
        'InternalTransfer': 'Internal Transfers',
        'StockAdjustment': 'Stock Adjustments',
    };

    const fetchPendingApprovals = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!user) {
                setLoading(false);
                return;
            }

            if (user.role !== 'admin' && user.role !== 'siteManager' && user.role !== 'auditor') {
                router.push('/');
                return;
            }

            let queryString = '';
            if (user.role === 'admin' || user.role === 'auditor') {
                queryString = `userRole=${user.role}`;
            } else if (user.role === 'siteManager' && user.associatedSite?._id) {
                queryString = `userRole=${user.role}&userSite=${user.associatedSite._id}`;
            }

            if (!queryString) {
                setPendingApprovals([]);
                setLoading(false);
                return;
            }

            const response = await fetch(`/api/approvals?${queryString}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to fetch approvals: ${response.statusText}`);
            }

            setPendingApprovals(data);
        } catch (err: any) {
            setError(err.message);
            toast({
                title: 'Error',
                description: err.message || 'Failed to fetch pending approvals',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [user, router, toast]);

    useEffect(() => {
        if (isAuthReady && isAuthenticated) {
            fetchPendingApprovals();
        }
    }, [isAuthReady, isAuthenticated, user, fetchPendingApprovals]);

    const handleOpenReview = (action: ApprovalAction) => {
        setSelectedApproval(action);
        onModalOpen();
    };

    const handleSelectionChange = (selectedItems: ApprovalAction[]) => {
        setSelectedApprovals(selectedItems);
    };

    const handleApprove = async () => {
        if (!selectedApproval) return;

        try {
            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedApproval._id,
                    status: 'approved',
                    approvedBy: user?._id,
                    approvedAt: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to approve action');
            }

            toast({
                title: 'Action Approved',
                description: 'The item has been approved and moved to the "approved" list.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            setPendingApprovals(prev => prev.filter(item => item._id !== selectedApproval._id));
            setSelectedApprovals(prev => prev.filter(item => item._id !== selectedApproval._id));
            onModalClose();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.message || 'Failed to approve action. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleReject = async () => {
        if (!selectedApproval) return;

        try {
            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedApproval._id,
                    status: 'rejected',
                    rejectedBy: user?._id,
                    rejectedAt: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to reject action');
            }

            toast({
                title: 'Action Rejected',
                description: 'The item has been rejected.',
                status: 'info',
                duration: 5000,
                isClosable: true,
            });

            setPendingApprovals(prev => prev.filter(item => item._id !== selectedApproval._id));
            setSelectedApprovals(prev => prev.filter(item => item._id !== selectedApproval._id));
            onModalClose();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.message || 'Failed to reject action. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Filter approvals by type for tabs
    const filteredApprovals = pendingApprovals.filter(action => {
        const type = actionTypes[activeTab];
        return action._type === type;
    });

    // Helper function to get unique supplier names
    const getSupplierNames = (orderedItems: OrderedItem[] | undefined) => {
        if (!orderedItems || orderedItems.length === 0) {
            return 'N/A';
        }
        // Safely access the supplier name using optional chaining
        const suppliers = orderedItems.map(item => item.supplier?.name).filter(Boolean);
        const uniqueSuppliers = [...new Set(suppliers)];
        return uniqueSuppliers.join(', ');
    };

    if (!isAuthReady || loading) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Flex>
        );
    }

    if (error) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh" direction="column">
                <Text fontSize="xl" color="red.500">
                    {error}
                </Text>
                <Button onClick={fetchPendingApprovals} mt={4}>
                    Try Again
                </Button>
            </Flex>
        );
    }

    return (
        <Box p={8}>
            <Heading as="h1" size="xl" mb={6}>
                Pending Approvals
            </Heading>

            <Tabs variant="enclosed" onChange={(index) => setActiveTab(index)}>
                <TabList>
                    {actionTypes.map((type, index) => (
                        <Tab key={type}>{actionTypeTitles[type]}</Tab>
                    ))}
                </TabList>
                <TabPanels>
                    {actionTypes.map((type, index) => (
                        <TabPanel key={type}>
                            {filteredApprovals.length === 0 ? (
                                <Text fontSize="lg" color="gray.500">
                                    No pending {actionTypeTitles[type].toLowerCase()} for approval.
                                </Text>
                            ) : (
                                <DataTable
                                    columns={[
                                        {
                                            accessorKey: 'actions',
                                            header: 'Action',
                                            isSortable: false,
                                            cell: (row: any) => (
                                                <Button
                                                    size="sm"
                                                    colorScheme="blue"
                                                    onClick={() => handleOpenReview(row)}
                                                >
                                                    Review
                                                </Button>
                                            )
                                        },
                                        { accessorKey: 'poNumber', header: 'PO Number', isSortable: true },
                                        {
                                            accessorKey: 'suppliers',
                                            header: 'Suppliers',
                                            isSortable: false,
                                            cell: (row: any) => {
                                                if (row._type === 'PurchaseOrder') {
                                                    return getSupplierNames(row.orderedItems);
                                                }
                                                return 'N/A';
                                            }
                                        },
                                        {
                                            accessorKey: 'orderedItems',
                                            header: 'Items',
                                            isSortable: false,
                                            cell: (row: any) => {
                                                if (row._type === 'PurchaseOrder' && row.orderedItems) {
                                                    return (
                                                        <Box>
                                                            <Text>{row.description}</Text>
                                                            <Text fontSize="sm" color="gray.600" mt={1}>
                                                                Items: {row.orderedItems.map((item: any) =>
                                                                    `${item.stockItem.name} (${item.orderedQuantity})`
                                                                ).join(', ')}
                                                            </Text>
                                                        </Box>
                                                    );
                                                }
                                                return <Text>{row.description}</Text>;
                                            }
                                        },
                                        { accessorKey: 'siteName', header: 'Site', isSortable: true },
                                        { accessorKey: 'priority', header: 'Priority', isSortable: true },
                                        {
                                            accessorKey: 'createdAt',
                                            header: 'Created At',
                                            isSortable: true,
                                            cell: (row) => new Date(row.createdAt).toLocaleDateString()
                                        },
                                    ]}
                                    data={filteredApprovals}
                                    loading={loading}
                                    onActionClick={handleOpenReview}
                                    onSelectionChange={handleSelectionChange}
                                />
                            )}
                        </TabPanel>
                    ))}
                </TabPanels>
            </Tabs>

            {/* Approval Details Modal */}
            <Modal isOpen={isModalOpen} onClose={onModalClose} size="3xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        <HStack spacing={2} alignItems="center">
                            <Icon as={FaBoxes} color="blue.500" />
                            <Text>{selectedApproval?.title} Details</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            <Flex justifyContent="space-between" flexWrap="wrap">
                                <Box>
                                    <Text fontWeight="bold">Reference Number:</Text>
                                    <Text>
                                        {selectedApproval?.poNumber ||
                                            selectedApproval?.transferNumber ||
                                            selectedApproval?.adjustmentNumber ||
                                            selectedApproval?.receiptNumber}
                                    </Text>
                                </Box>
                                {selectedApproval?.orderedItems && (
                                    <Box>
                                        <Text fontWeight="bold">Suppliers:</Text>
                                        <Text>{getSupplierNames(selectedApproval.orderedItems)}</Text>
                                    </Box>
                                )}
                                <Box>
                                    <Text fontWeight="bold">Site:</Text>
                                    <Text>{selectedApproval?.siteName}</Text>
                                </Box>
                                {selectedApproval?.orderedBy && (
                                    <Box>
                                        <Text fontWeight="bold">Ordered By:</Text>
                                        <Text>{selectedApproval.orderedBy}</Text>
                                    </Box>
                                )}
                            </Flex>

                            {selectedApproval?.orderedItems && selectedApproval.orderedItems.length > 0 && (
                                <>
                                    <Heading as="h4" size="sm" mt={4}>
                                        Ordered Items
                                    </Heading>
                                    <TableContainer>
                                        <Table variant="simple" size="sm">
                                            <Thead>
                                                <Tr>
                                                    <Th>Item</Th>
                                                    <Th isNumeric>Quantity</Th>
                                                    <Th isNumeric>Unit Price</Th>
                                                    <Th>Supplier</Th>
                                                    <Th isNumeric>Total</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {selectedApproval.orderedItems.map((item) => (
                                                    <Tr key={item._key}>
                                                        <Td>{item.stockItem.name}</Td>
                                                        <Td isNumeric>{item.orderedQuantity}</Td>
                                                        <Td isNumeric>E {item.unitPrice?.toFixed(2)}</Td>
                                                        <Td>{item.supplier.name}</Td>
                                                        <Td isNumeric>E {(item.unitPrice * item.orderedQuantity).toFixed(2)}</Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="red" onClick={handleReject} leftIcon={<FiXCircle />}>
                            Reject
                        </Button>
                        <Button colorScheme="green" onClick={handleApprove} ml={3} leftIcon={<FiCheckCircle />}>
                            Approve
                        </Button>
                        <Button variant="ghost" ml={3} onClick={onModalClose}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}