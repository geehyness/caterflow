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
    Badge,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react'
import { FiCheckCircle, FiXCircle, FiEye } from 'react-icons/fi';
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
    fromBin?: {
        name: string;
        site: {
            name: string;
        };
    };
    toBin?: {
        name: string;
        site: {
            name: string;
        };
    };
    items?: Array<{
        stockItem: {
            name: string;
        };
        quantity: number;
    }>;
}

export default function ApprovalsPage() {
    const { data: session, status } = useSession();
    const isAuthReady = status !== 'loading';
    const isAuthenticated = status === 'authenticated';
    const user = session?.user;

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
        'InternalTransfer': 'Internal Transfers',
        'StockAdjustment': 'Stock Adjustments',
        'GoodsReceipt': 'Goods Receipts',
    };

    const fetchPendingApprovals = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!user) {
                setLoading(false);
                return;
            }

            // Check if user has approval permissions
            if (user.role !== 'admin' && user.role !== 'siteManager' && user.role !== 'auditor') {
                router.push('/');
                return;
            }

            const response = await fetch('/api/approvals');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to fetch approvals: ${response.statusText}`);
            }

            // Filter approvals based on user role and site
            let filteredData = data;

            if (user.role === 'siteManager' && user.associatedSite?._id) {
                // Site managers can only approve actions for their site
                filteredData = data.filter((action: ApprovalAction) =>
                    action.siteName === user.associatedSite?.name
                );
            }

            setPendingApprovals(filteredData);
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
        if (status === 'loading') return;

        if (isAuthenticated) {
            fetchPendingApprovals();
        }
    }, [status, isAuthenticated, fetchPendingApprovals]);

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
            const response = await fetch('/api/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actionId: selectedApproval._id,
                    actionType: selectedApproval._type,
                    status: 'approved',
                    approvedBy: user?.id,
                    approvedAt: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to approve action');
            }

            toast({
                title: 'Action Approved',
                description: 'The item has been approved successfully.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            // Remove the approved action from the list
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
            const response = await fetch('/api/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actionId: selectedApproval._id,
                    actionType: selectedApproval._type,
                    status: 'rejected',
                    rejectedBy: user?.id,
                    rejectedAt: new Date().toISOString(),
                    rejectionReason: 'Rejected by approver', // You might want to add a reason field
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to reject action');
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
        const suppliers = orderedItems.map(item => item.supplier?.name).filter(Boolean);
        const uniqueSuppliers = [...new Set(suppliers)];
        return uniqueSuppliers.join(', ');
    };

    // Helper function to get action details based on type
    const getActionDetails = (action: ApprovalAction) => {
        switch (action._type) {
            case 'PurchaseOrder':
                return {
                    title: 'Purchase Order',
                    reference: action.poNumber,
                    description: action.description,
                };
            case 'InternalTransfer':
                return {
                    title: 'Internal Transfer',
                    reference: action.transferNumber,
                    description: `Transfer from ${action.fromBin?.name} to ${action.toBin?.name}`,
                };
            case 'StockAdjustment':
                return {
                    title: 'Stock Adjustment',
                    reference: action.adjustmentNumber,
                    description: action.description,
                };
            case 'GoodsReceipt':
                return {
                    title: 'Goods Receipt',
                    reference: action.receiptNumber,
                    description: action.description,
                };
            default:
                return {
                    title: action._type,
                    reference: 'N/A',
                    description: action.description,
                };
        }
    };

    // Update loading check to use status
    if (status === 'loading' || loading) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Flex>
        );
    }

    if (!isAuthenticated) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh">
                <Text fontSize="xl">Please sign in to view approvals</Text>
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
                <Badge ml={3} colorScheme="orange" fontSize="lg">
                    {pendingApprovals.length}
                </Badge>
            </Heading>

            <Tabs variant="enclosed" onChange={(index) => setActiveTab(index)}>
                <TabList>
                    {actionTypes.map((type, index) => (
                        <Tab key={type}>
                            {actionTypeTitles[type]}
                            <Badge ml={2} colorScheme="blue">
                                {pendingApprovals.filter(a => a._type === type).length}
                            </Badge>
                        </Tab>
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
                                                    leftIcon={<FiEye />}
                                                >
                                                    Review
                                                </Button>
                                            )
                                        },
                                        {
                                            accessorKey: 'referenceNumber',
                                            header: 'Reference',
                                            isSortable: true,
                                            cell: (row: any) => {
                                                const details = getActionDetails(row);
                                                return details.reference || 'N/A';
                                            }
                                        },
                                        {
                                            accessorKey: 'description',
                                            header: 'Description',
                                            isSortable: false,
                                            cell: (row: any) => {
                                                const details = getActionDetails(row);
                                                return details.description;
                                            }
                                        },
                                        { accessorKey: 'siteName', header: 'Site', isSortable: true },
                                        {
                                            accessorKey: 'priority',
                                            header: 'Priority',
                                            isSortable: true,
                                            cell: (row: any) => (
                                                <Badge
                                                    colorScheme={
                                                        row.priority === 'high' ? 'red' :
                                                            row.priority === 'medium' ? 'orange' : 'green'
                                                    }
                                                >
                                                    {row.priority}
                                                </Badge>
                                            )
                                        },
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
            <Modal isOpen={isModalOpen} onClose={onModalClose} size="4xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        <HStack spacing={2} alignItems="center">
                            <Icon as={FaBoxes} color="blue.500" />
                            <Text>
                                {selectedApproval ? getActionDetails(selectedApproval).title : 'Approval'} Details
                            </Text>
                        </HStack>
                    </ModalHeader>
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            <Flex justifyContent="space-between" flexWrap="wrap" gap={4}>
                                <Box>
                                    <Text fontWeight="bold">Reference Number:</Text>
                                    <Text>
                                        {selectedApproval?.poNumber ||
                                            selectedApproval?.transferNumber ||
                                            selectedApproval?.adjustmentNumber ||
                                            selectedApproval?.receiptNumber ||
                                            'N/A'}
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
                                <Box>
                                    <Text fontWeight="bold">Priority:</Text>
                                    <Badge
                                        colorScheme={
                                            selectedApproval?.priority === 'high' ? 'red' :
                                                selectedApproval?.priority === 'medium' ? 'orange' : 'green'
                                        }
                                    >
                                        {selectedApproval?.priority}
                                    </Badge>
                                </Box>
                            </Flex>

                            <Box>
                                <Text fontWeight="bold">Description:</Text>
                                <Text>{selectedApproval?.description}</Text>
                            </Box>

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

                            {selectedApproval?.items && selectedApproval.items.length > 0 && (
                                <>
                                    <Heading as="h4" size="sm" mt={4}>
                                        Items
                                    </Heading>
                                    <TableContainer>
                                        <Table variant="simple" size="sm">
                                            <Thead>
                                                <Tr>
                                                    <Th>Item</Th>
                                                    <Th isNumeric>Quantity</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {selectedApproval.items.map((item, index) => (
                                                    <Tr key={index}>
                                                        <Td>{item.stockItem.name}</Td>
                                                        <Td isNumeric>{item.quantity}</Td>
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