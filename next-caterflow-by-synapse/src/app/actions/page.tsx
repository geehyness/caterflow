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
    Icon,
    useDisclosure,
    Button,
    TabPanel,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    HStack,
    Badge,
    VStack,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Table,
    TableContainer,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import { FaBoxes } from 'react-icons/fa';
import { FiPackage } from 'react-icons/fi';
import ActionCard from './ActionCard';
import WorkflowModal from './WorkflowModal';
import PurchaseOrderModal from './PurchaseOrderModal';
import FileUploadModal from '@/components/FileUploadModal';
import AddItemModal from './AddItemModal';

import {
    PendingAction,
    ActionStep,
    StockItem,
    Category,
    generateWorkflow,
    actionTypeTitles,
} from './types';
import DataTable from './DataTable';
import GoodsReceiptModal from '@/app/actions/GoodsReceiptModal';

// Interface for items selected in the modal
interface SelectedItemData {
    item: StockItem;
    quantity: number;
    price: number;
}
interface PurchaseOrder {
    _id: string;
    poNumber?: string;
    supplier?: { name: string };
    site?: { name: string };
    orderedItems?: any[];
    orderedBy?: string; // Add this line
    // Add other relevant properties from your PurchaseOrder type if needed
}

export default function ActionsPage() {
    const { isAuthenticated, isAuthReady, user } = useAuth();
    const [actions, setActions] = useState<PendingAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const toast = useToast();
    const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
    const { isOpen: isUploadModalOpen, onOpen: onUploadModalOpen, onClose: onUploadModalClose } = useDisclosure();
    const { isOpen: isOrderModalOpen, onOpen: onOrderModalOpen, onClose: onOrderModalClose } = useDisclosure();
    const { isOpen: isAddItemModalOpen, onOpen: onAddItemModalOpen, onClose: onAddItemModalClose } = useDisclosure();
    const { isOpen: isApprovalModalOpen, onOpen: onApprovalModalOpen, onClose: onApprovalModalClose } = useDisclosure();
    const { isOpen: isGoodsReceiptModalOpen, onOpen: onGoodsReceiptModalOpen, onClose: onGoodsReceiptModalClose } = useDisclosure();
    const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
    const [selectedApproval, setSelectedApproval] = useState<PurchaseOrder | null>(null);
    const [poDetails, setPoDetails] = useState<PendingAction | null>(null);
    const [editedPrices, setEditedPrices] = useState<{ [key: string]: number | undefined }>({});
    const [editedQuantities, setEditedQuantities] = useState<{ [key: string]: number | undefined }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [availableItems, setAvailableItems] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [loadingItems, setLoadingItems] = useState(false);
    const [approvedPurchaseOrders, setApprovedPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [preSelectedPO, setPreSelectedPO] = useState<string | null>(null);
    const [loadingApprovedPOs, setLoadingApprovedPOs] = useState(false);


    const fetchActions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/actions?userId=${user?._id}&userRole=${user?.role}&userSite=${user?.associatedSite?._id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || `Failed to fetch actions: ${response.status} ${response.statusText}`);
            }

            const fetchedActions: PendingAction[] = data.map((action: PendingAction) => {
                const workflow = generateWorkflow(action._type, action.status, action.completedSteps || 0);
                return {
                    ...action,
                    actionType: action._type,
                    workflow: workflow,
                    completedSteps: action.completedSteps || 0,
                    evidenceStatus: action.evidenceStatus || 'pending',
                };
            });
            setActions(fetchedActions);
        } catch (err: any) {
            setError(err.message);
            toast({
                title: 'Error',
                description: err.message || 'Failed to fetch actions',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchAvailableItems = async () => {
        try {
            const response = await fetch('/api/stock-items');
            if (response.ok) {
                const data = await response.json();
                setAvailableItems(data);
            }
        } catch (error) {
            console.error('Failed to fetch stock items:', error);
        }
    };

    const fetchApprovedPurchaseOrders = async () => {
        try {
            setLoadingApprovedPOs(true);
            const response = await fetch('/api/purchase-orders?status=approved');
            if (response.ok) {
                const data = await response.json();
                setApprovedPurchaseOrders(data);
            }
        } catch (error) {
            console.error('Failed to fetch approved purchase orders:', error);
        } finally {
            setLoadingApprovedPOs(false);
        }
    };

    const handleReceiveGoods = (poId: string) => {
        setPreSelectedPO(poId);
        onGoodsReceiptModalOpen();
    };

    useEffect(() => {
        if (isAuthReady && isAuthenticated && user) {
            fetchActions();
        }
    }, [isAuthReady, isAuthenticated, user, fetchActions]);

    useEffect(() => {
        if (isAddItemModalOpen) {
            setLoadingItems(true);
            const fetchAllData = async () => {
                await Promise.all([fetchCategories(), fetchAvailableItems()]);
                setLoadingItems(false);
            };
            fetchAllData();
        }
    }, [isAddItemModalOpen]);

    useEffect(() => {
        if (activeTab === 1) {
            fetchApprovedPurchaseOrders();
        }
    }, [activeTab]);

    const handleOpenWorkflow = (action: PendingAction) => {
        setSelectedAction(action);
        onModalOpen();
    };

    const handleOpenApprovalDetails = (action: PendingAction) => {
        setSelectedApproval(action);
        onApprovalModalOpen();
    };

    const handleFinalizeOrderStep = async (action: PendingAction) => {
        try {
            const response = await fetch(`/api/purchase-orders/${action._id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch purchase order details');
            }
            const data = await response.json();
            setPoDetails(data);
            setEditedPrices({});
            setEditedQuantities({});
            onOrderModalOpen();
        } catch (err: any) {
            toast({
                title: 'Error',
                description: 'Failed to fetch purchase order details. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleCompleteStep = async (stepIndex: number) => {
        if (!selectedAction) return;
        const currentStep = selectedAction.workflow?.[stepIndex];

        if (selectedAction.actionType === 'PurchaseOrder' && currentStep?.title === 'Finalize Order Details' && !currentStep.completed) {
            handleFinalizeOrderStep(selectedAction);
            return;
        }

        const newCompletedSteps = stepIndex + 1;
        const newWorkflow = selectedAction.workflow?.map((step: any, index: number) => ({
            ...step,
            completed: index < newCompletedSteps,
        }));

        try {
            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedAction._id,
                    completedSteps: newCompletedSteps,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update action');
            }

            if (selectedAction.actionType === 'PurchaseOrder' && currentStep?.title === 'Submit for Approval') {
                await handleSubmitForApproval(selectedAction);
                return;
            }

            const updatedAction = {
                ...selectedAction,
                workflow: newWorkflow,
                completedSteps: newCompletedSteps,
            };
            setActions(prevActions =>
                prevActions.map(action =>
                    action._id === updatedAction._id ? updatedAction : action
                )
            );
            setSelectedAction(updatedAction);

            toast({
                title: 'Step Completed',
                description: `Workflow step "${selectedAction.workflow?.[stepIndex].title}" has been marked as complete.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            const isEvidenceComplete = !selectedAction.evidenceRequired || selectedAction.evidenceStatus === 'complete';
            const allRequiredStepsCompleted = newWorkflow?.every((step: { required: any; completed: any; }, index: any) => !step.required || step.completed);

            if (isEvidenceComplete && allRequiredStepsCompleted) {
                await onCompleteAction(selectedAction);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to update action. Please try again.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleSubmitForApproval = async (action: PendingAction) => {
        try {
            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: action._id,
                    status: 'pending-approval',
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to submit for approval');
            }
            toast({
                title: 'Order Submitted',
                description: `The purchase order has been submitted for approval.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            setActions(prevActions => prevActions.filter(a => a._id !== action._id));
            onModalClose();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to submit order for approval. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const onCompleteAction = async (action: PendingAction) => {
        try {
            const response = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: action._id,
                    status: 'completed',
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to complete action');
            }
            toast({
                title: 'Action Completed',
                description: `The action "${action.title}" has been successfully completed.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            setActions(prevActions => prevActions.filter(a => a._id !== action._id));
            onModalClose();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to complete action. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const onUploadSuccess = async () => {
        onUploadModalClose();
        toast({
            title: 'Evidence Uploaded',
            description: 'Your file has been uploaded successfully.',
            status: 'success',
            duration: 5000,
            isClosable: true,
        });
        await fetchActions();
    };

    const handleConfirmOrderUpdate = async () => {
        setIsSaving(true);
        try {
            const updates = poDetails?.orderedItems?.map((item: { _key: string | number; }) => {
                const newPrice = editedPrices[item._key];
                const newQuantity = editedQuantities[item._key];
                if (newPrice !== undefined || newQuantity !== undefined) {
                    return fetch('/api/purchase-orders/update-item', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            poId: poDetails?._id,
                            itemKey: item._key,
                            newPrice,
                            newQuantity,
                        }),
                    });
                }
                return Promise.resolve();
            });

            if (updates) {
                await Promise.all(updates);
            }

            const stepUpdateResponse = await fetch('/api/actions/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedAction?._id,
                    completedSteps: 1,
                }),
            });

            if (!stepUpdateResponse.ok) {
                throw new Error('Failed to update step completion');
            }

            if (selectedAction) {
                const updatedAction = {
                    ...selectedAction,
                    completedSteps: 1,
                    workflow: selectedAction.workflow?.map((step: any, index: number) => ({
                        ...step,
                        completed: index < 1,
                    })),
                };
                setActions(prevActions => prevActions.map(action => action._id === updatedAction._id ? updatedAction : action));
                setSelectedAction(updatedAction);
            }

            toast({
                title: 'Order Updated',
                description: 'The purchase order has been saved successfully. Please submit it for approval.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            onOrderModalClose();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save changes. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddSelectedItemsToPO = (items: SelectedItemData[]) => {
        if (!poDetails) return;
        const newItems = items.map(itemData => ({
            _key: Math.random().toString(36).substr(2, 9),
            stockItem: {
                name: itemData.item.name,
            },
            orderedQuantity: itemData.quantity,
            unitPrice: itemData.price,
        }));

        setPoDetails({
            ...poDetails,
            orderedItems: [...(poDetails.orderedItems || []), ...newItems],
        });
        onAddItemModalClose();
    };

    const handleRemoveItemFromPO = (itemKey: string) => {
        if (!poDetails) return;
        setPoDetails({
            ...poDetails,
            orderedItems: poDetails.orderedItems?.filter((item: { _key: string; }) => item._key !== itemKey) || [],
        });
    };

    const actionTypes = ['PurchaseOrder', 'GoodsReceipt', 'InternalTransfer', 'StockAdjustment'];

    // Filter actions for each tab
    const filteredActions = actions.filter(action => {
        const type = actionTypes[activeTab];
        return action.actionType === type && action.status !== 'completed' && action.status !== 'pending-approval';
    });

    // Filter pending approval actions for each tab
    const pendingApprovalActions = actions.filter(action => {
        const type = actionTypes[activeTab];
        return action.actionType === type && action.status === 'pending-approval';
    });

    const completedActions = actions.filter(action => action.status === 'completed');

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
                <Button onClick={fetchActions} mt={4}>
                    Try Again
                </Button>
            </Flex>
        );
    }

    return (
        <Box p={8}>
            <Heading as="h1" size="xl" mb={6}>
                Pending Actions
            </Heading>

            <Tabs variant="enclosed" onChange={(index) => setActiveTab(index)}>
                <TabList>
                    {actionTypes.map((type, index) => (
                        <Tab key={type}>{actionTypeTitles[type as keyof typeof actionTypeTitles]}</Tab>
                    ))}
                    {/*<Tab>Completed</Tab>*/}
                </TabList>
                <TabPanels>
                    {actionTypes.map((type, index) => (
                        <TabPanel key={type}>
                            {/* Pending Approvals Section */}
                            {pendingApprovalActions.length > 0 && (
                                <Accordion defaultIndex={[]} allowToggle mb={6}>
                                    <AccordionItem>
                                        <h2>
                                            <AccordionButton>
                                                <Box flex="1" textAlign="left">
                                                    <HStack>
                                                        <Text fontWeight="bold">Pending Approvals</Text>
                                                        <Badge colorScheme="yellow" ml={2}>
                                                            {pendingApprovalActions.length}
                                                        </Badge>
                                                    </HStack>
                                                </Box>
                                                <AccordionIcon />
                                            </AccordionButton>
                                        </h2>
                                        <AccordionPanel pb={4}>
                                            <DataTable
                                                columns={[
                                                    { accessorKey: 'title', header: 'Title', isSortable: true },
                                                    {
                                                        accessorKey: 'description',
                                                        header: 'Description',
                                                        isSortable: true,
                                                        cell: (row: any) => {
                                                            if (row.actionType === 'PurchaseOrder' && row.orderedItems && row.orderedItems.length > 0) {
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
                                                        cell: (row: any) => new Date(row.createdAt).toLocaleDateString()
                                                    },
                                                    {
                                                        accessorKey: 'approvalAction',
                                                        header: 'Action',
                                                        isSortable: false,
                                                        cell: (row: any) => (
                                                            <Button
                                                                size="sm"
                                                                colorScheme="blue"
                                                                onClick={() => handleOpenApprovalDetails(row)}
                                                            >
                                                                View
                                                            </Button>
                                                        )
                                                    }
                                                ]}
                                                data={pendingApprovalActions}
                                                loading={loading}
                                                onActionClick={handleOpenApprovalDetails}
                                            />
                                        </AccordionPanel>
                                    </AccordionItem>
                                </Accordion>
                            )}

                            {type === 'GoodsReceipt' && (
                                <>
                                    <Heading as="h3" size="md" mb={4}>
                                        Approved Purchase Orders Ready for Receiving
                                    </Heading>

                                    {loadingApprovedPOs ? (
                                        <Flex justifyContent="center" alignItems="center" py={10}>
                                            <Spinner size="xl" />
                                        </Flex>
                                    ) : approvedPurchaseOrders.length === 0 ? (
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
                                                            onClick={() => handleReceiveGoods(row._id)}
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
                                            data={approvedPurchaseOrders.map(po => ({
                                                _id: po._id,
                                                poNumber: po.poNumber || '',
                                                supplier: po.supplier || { name: '' },
                                                site: po.site || { name: '' },
                                                orderedItems: po.orderedItems || []
                                            }))}
                                            loading={loadingApprovedPOs}
                                            onActionClick={() => { }}
                                            hideStatusColumn={true}
                                        />
                                    )}

                                    {/* Regular Goods Receipt Actions Section */}
                                    <Heading as="h3" size="md" mt={8} mb={4}>
                                        Pending Goods Receipts
                                    </Heading>

                                    {filteredActions.filter(action =>
                                        action.actionType === 'GoodsReceipt' &&
                                        (action.status === 'draft' || action.status === 'partial')
                                    ).length === 0 ? (
                                        <Text fontSize="lg" color="gray.500">
                                            No pending goods receipts at this time.
                                        </Text>
                                    ) : (
                                        <DataTable
                                            columns={[
                                                { accessorKey: 'title', header: 'Title', isSortable: true },
                                                { accessorKey: 'status', header: 'Status', isSortable: true },
                                                {
                                                    accessorKey: 'description',
                                                    header: 'Description',
                                                    isSortable: true,
                                                    cell: (row: any) => <Text>{row.description}</Text>
                                                },
                                                { accessorKey: 'siteName', header: 'Site', isSortable: true },
                                                { accessorKey: 'priority', header: 'Priority', isSortable: true },
                                                {
                                                    accessorKey: 'createdAt',
                                                    header: 'Created At',
                                                    isSortable: true,
                                                    cell: (row: any) => new Date(row.createdAt).toLocaleDateString()
                                                },
                                                {
                                                    accessorKey: 'workflowAction',
                                                    header: 'Action',
                                                    isSortable: false,
                                                    cell: (row: any) => (
                                                        <Button
                                                            size="sm"
                                                            colorScheme="blue"
                                                            onClick={() => handleOpenWorkflow(row)}
                                                        >
                                                            Resolve
                                                        </Button>
                                                    )
                                                }
                                            ]}
                                            data={filteredActions.filter(action =>
                                                action.actionType === 'GoodsReceipt' &&
                                                (action.status === 'draft' || action.status === 'partial')
                                            )}
                                            loading={loading}
                                            onActionClick={handleOpenWorkflow}
                                        />
                                    )}
                                </>
                            )}
                            {type !== 'GoodsReceipt' && (
                                filteredActions.length === 0 ? (
                                    <Text fontSize="lg" color="gray.500">
                                        No pending {actionTypeTitles[type as keyof typeof actionTypeTitles].toLowerCase()} at this time.
                                    </Text>
                                ) : (
                                    <DataTable
                                        columns={[
                                            { accessorKey: 'title', header: 'Title', isSortable: true },
                                            {
                                                accessorKey: 'description',
                                                header: 'Description',
                                                isSortable: true,
                                                cell: (row: any) => {
                                                    if (row.actionType === 'PurchaseOrder' && row.orderedItems && row.orderedItems.length > 0) {
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
                                                cell: (row: any) => new Date(row.createdAt).toLocaleDateString()
                                            },
                                            {
                                                accessorKey: 'workflowAction',
                                                header: 'Action',
                                                isSortable: false,
                                                cell: (row: any) => (
                                                    <Button
                                                        size="sm"
                                                        colorScheme="blue"
                                                        onClick={() => handleOpenWorkflow(row)}
                                                    >
                                                        Resolve
                                                    </Button>
                                                )
                                            },
                                        ]}
                                        data={filteredActions}
                                        loading={loading}
                                        onActionClick={handleOpenWorkflow}
                                    />
                                )
                            )}
                        </TabPanel>
                    ))}
                    {/*<TabPanel>
                        {completedActions.length === 0 ? (
                            <Text fontSize="lg" color="gray.500">
                                No completed actions at this time.
                            </Text>
                        ) : (
                            <DataTable
                                columns={[
                                    { accessorKey: 'title', header: 'Title', isSortable: true },
                                    {
                                        accessorKey: 'description',
                                        header: 'Description',
                                        isSortable: true,
                                        cell: (row: any) => {
                                            if (row.actionType === 'PurchaseOrder' && row.orderedItems && row.orderedItems.length > 0) {
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
                                        cell: (row: any) => new Date(row.createdAt).toLocaleDateString()
                                    },
                                    {
                                        accessorKey: 'action',
                                        header: 'Action',
                                        isSortable: false,
                                        cell: (row: any) => (
                                            <Button
                                                size="sm"
                                                colorScheme="blue"
                                                onClick={() => handleOpenWorkflow(row)}
                                            >
                                                View
                                            </Button>
                                        )
                                    }
                                ]}
                                data={completedActions}
                                loading={loading}
                                onActionClick={handleOpenWorkflow}
                            />
                        )}
                    </TabPanel>*/}
                </TabPanels>
            </Tabs>

            {/* Workflow Modal */}
            <WorkflowModal
                isOpen={isModalOpen}
                onClose={onModalClose}
                selectedAction={selectedAction}
                onCompleteStep={handleCompleteStep}
            />

            {/* Approval Details Modal */}
            <Modal isOpen={isApprovalModalOpen} onClose={onApprovalModalClose} size="3xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        <HStack spacing={2} alignItems="center">
                            <Icon as={FaBoxes} color="blue.500" />
                            <Text>{selectedApproval?.poNumber} Details</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            <Flex justifyContent="space-between" flexWrap="wrap">
                                <Box>
                                    <Text fontWeight="bold">Reference Number:</Text>
                                    <Text>{selectedApproval?.poNumber}</Text>
                                </Box>
                                {selectedApproval?.supplier?.name && (
                                    <Box>
                                        <Text fontWeight="bold">Supplier:</Text>
                                        <Text>{selectedApproval.supplier?.name}</Text>
                                    </Box>
                                )}
                                <Box>
                                    <Text fontWeight="bold">Site:</Text>
                                    <Text>{selectedApproval?.site?.name}</Text>
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
                                                    <Th isNumeric>Total</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {selectedApproval.orderedItems.map((item: any) => (
                                                    <Tr key={item._key}>
                                                        <Td>{item.stockItem?.name}</Td>
                                                        <Td isNumeric>{item.orderedQuantity}</Td>
                                                        <Td isNumeric>E {item.unitPrice?.toFixed(2)}</Td>
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
                        <Button variant="ghost" onClick={onApprovalModalClose}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Existing modals */}
            {selectedAction && (
                <FileUploadModal
                    isOpen={isUploadModalOpen}
                    onClose={onUploadModalClose}
                    relatedTo={selectedAction._id}
                    relatedType={selectedAction._type}
                    onUploadSuccess={onUploadSuccess}
                />
            )}

            <PurchaseOrderModal
                isOpen={isOrderModalOpen}
                onClose={onOrderModalClose}
                poDetails={poDetails}
                editedPrices={editedPrices}
                setEditedPrices={setEditedPrices}
                editedQuantities={editedQuantities}
                setEditedQuantities={setEditedQuantities}
                isSaving={isSaving}
                onConfirmOrderUpdate={handleConfirmOrderUpdate}
                onAddItemModalOpen={onAddItemModalOpen}
                onRemoveItem={handleRemoveItemFromPO}
            />

            <AddItemModal
                isOpen={isAddItemModalOpen}
                onClose={onAddItemModalClose}
                availableItems={availableItems}
                categories={categories}
                onAddItems={handleAddSelectedItemsToPO}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                loadingItems={loadingItems}
            />

            <GoodsReceiptModal
                isOpen={isGoodsReceiptModalOpen}
                onClose={() => {
                    onGoodsReceiptModalClose();
                    setPreSelectedPO(null);
                }}
                receipt={null}
                onSave={() => {
                    onGoodsReceiptModalClose();
                    setPreSelectedPO(null);
                    fetchActions();
                }}
                approvedPurchaseOrders={approvedPurchaseOrders || []}
                preSelectedPO={preSelectedPO}
            />
        </Box>
    );
}