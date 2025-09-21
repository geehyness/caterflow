// src/app/operations/procurement/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Heading,
    Text,
    Flex,
    Spinner,
    useToast,
    Card,
    CardBody,
    Button,
    HStack,
    Badge,
    Icon,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    NumberInput,
    NumberInputField,
    Select,
    VStack,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Switch,
    Tooltip,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { FiCheck, FiEdit, FiInfo } from 'react-icons/fi';
import DataTable from '@/app/actions/DataTable';

interface PurchaseOrder {
    _id: string;
    poNumber: string;
    orderDate: string;
    status: string;
    site: { _id: string; name: string };
    orderedItems: Array<{
        _key: string;
        orderedQuantity: number;
        unitPrice: number;
        stockItem: {
            _id: string;
            name: string;
            sku?: string;
            unitOfMeasure: string;
            primarySupplier?: { _id: string; name: string } | null;
            suppliers?: Array<{ _ref: string }>;
        };
        supplier?: { _id: string; name: string } | null;
    }>;
    totalAmount: number;
    supplierNames?: string;
}

interface Supplier {
    _id: string;
    name: string;
}

type StockItem = PurchaseOrder['orderedItems'][0]['stockItem'];

interface StockItemWithSupplier extends StockItem {
    primarySupplier?: { _id: string; name: string } | null;
    suppliersList?: Supplier[];
}

export default function ProcurementPage() {
    const { data: session, status } = useSession();
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stockItems, setStockItems] = useState<{ [key: string]: StockItemWithSupplier }>({});
    const [editedSuppliers, setEditedSuppliers] = useState<{ [key: string]: string | undefined }>({});
    const [editedPrices, setEditedPrices] = useState<{ [key: string]: number | undefined }>({});
    const [defaultSupplierFlags, setDefaultSupplierFlags] = useState<{ [key: string]: boolean }>({});

    /* ---------- Fetch helpers ---------- */

    const fetchApprovedPOs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/purchase-orders?status=approved');
            if (!response.ok) throw new Error('Failed to fetch purchase orders');
            const data = await response.json();
            setPurchaseOrders(data);
        } catch (err) {
            console.error(err);
            toast({
                title: 'Error',
                description: 'Failed to load purchase orders',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchSuppliers = useCallback(async () => {
        try {
            const res = await fetch('/api/suppliers');
            if (!res.ok) throw new Error('Failed to fetch suppliers');
            const data = await res.json();
            setSuppliers(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchStockItemDetails = useCallback(async (itemId: string) => {
        try {
            const response = await fetch(`/api/procurement/stock-items?id=${itemId}`);
            if (!response.ok) throw new Error('Failed to fetch stock item details');
            const data = await response.json();
            const suppliersList = (data.suppliers || []).map((s: any) => ({ _id: s._id, name: s.name }));
            setStockItems(prev => ({
                ...prev,
                [itemId]: { ...data, suppliersList, primarySupplier: data.primarySupplier || null },
            }));
            return { ...data, suppliersList };
        } catch (err) {
            console.error(err);
            return null;
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchApprovedPOs();
            fetchSuppliers();
        }
    }, [status, fetchApprovedPOs, fetchSuppliers]);

    /* ---------- Server helpers (client calls) ---------- */

    const addSupplierToStockItem = async (itemId: string, supplierId: string) => {
        try {
            const resp = await fetch('/api/procurement/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, supplierId }),
            });

            const contentType = resp.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }

            const json = await resp.json();

            if (!resp.ok) {
                if (json?.error && json.error.includes('already exists')) {
                    return json;
                }
                throw new Error(json?.error || 'Failed to add supplier to stock item');
            }

            setStockItems(prev => {
                const s = prev[itemId];
                if (!s) return prev;
                const newSuppliersList = [...(s.suppliersList || [])];
                if (!newSuppliersList.find(x => x._id === supplierId)) {
                    newSuppliersList.push({
                        _id: supplierId,
                        name: suppliers.find(x => x._id === supplierId)?.name || ''
                    });
                }
                return {
                    ...prev,
                    [itemId]: { ...s, suppliersList: newSuppliersList }
                };
            });

            return json;
        } catch (err) {
            console.error('addSupplierToStockItem error:', err);
            throw err;
        }
    };

    const setPrimarySupplierAPI = async (itemId: string, supplierId: string) => {
        try {
            const resp = await fetch('/api/procurement/primary-supplier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, supplierId }),
            });
            if (!resp.ok) {
                const j = await resp.json().catch(() => ({}));
                throw new Error(j?.error || 'Failed to set primary supplier');
            }
            const json = await resp.json();
            setStockItems(prev => {
                const s = prev[itemId];
                if (!s) return prev;
                return {
                    ...prev,
                    [itemId]: { ...s, primarySupplier: { _id: supplierId, name: suppliers.find(x => x._id === supplierId)?.name || '' } }
                };
            });
            return json;
        } catch (err) {
            console.error('setPrimarySupplierAPI error:', err);
            throw err;
        }
    };

    const unsetPrimarySupplierAPI = async (itemId: string) => {
        try {
            const resp = await fetch('/api/procurement/stock-items', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, updates: { primarySupplier: null } }),
            });
            if (!resp.ok) {
                const j = await resp.json().catch(() => ({}));
                throw new Error(j?.error || 'Failed to unset primary supplier');
            }
            setStockItems(prev => {
                const s = prev[itemId];
                if (!s) return prev;
                return {
                    ...prev,
                    [itemId]: { ...s, primarySupplier: null }
                };
            });
            return await resp.json();
        } catch (err) {
            console.error('unsetPrimarySupplierAPI error:', err);
            throw err;
        }
    };

    const updateStockItemUnitPrice = async (itemId: string, unitPrice: number) => {
        try {
            const resp = await fetch('/api/procurement/stock-items', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, updates: { unitPrice } }),
            });
            if (!resp.ok) {
                const j = await resp.json().catch(() => ({}));
                throw new Error(j?.error || 'Failed to update stock item price');
            }
            const json = await resp.json();
            setStockItems(prev => {
                const s = prev[itemId];
                if (!s) return prev;
                return {
                    ...prev,
                    [itemId]: { ...s, unitPrice }
                };
            });
            return json;
        } catch (err) {
            console.error('updateStockItemUnitPrice error:', err);
            throw err;
        }
    };

    const updatePurchaseOrderItems = async (poId: string, updates: Array<{ itemKey: string; newPrice?: number; newQuantity?: number; supplierId?: string }>) => {
        try {
            const resp = await fetch('/api/purchase-orders/update-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poId, updates }),
            });

            if (!resp.ok) {
                const j = await resp.json().catch(() => ({}));
                throw new Error(j?.error || 'Failed to update purchase order items');
            }

            const json = await resp.json();
            return json;
        } catch (err) {
            console.error('updatePurchaseOrderItems error:', err);
            throw err;
        }
    };

    /* ---------- Modal actions ---------- */

    const handleEditPO = async (po: PurchaseOrder) => {
        setSelectedPO(po);

        const initialSuppliers: { [key: string]: string | undefined } = {};
        const initialPrices: { [key: string]: number | undefined } = {};
        const initialDefaultFlags: { [key: string]: boolean } = {};

        for (const item of po.orderedItems) {
            let itemDetails = stockItems[item.stockItem._id];
            if (!itemDetails) {
                const fetched = await fetchStockItemDetails(item.stockItem._id);
                itemDetails = fetched || undefined;
            }

            initialSuppliers[item._key] = item.supplier?._id;
            initialPrices[item._key] = item.unitPrice > 0 ? item.unitPrice * item.orderedQuantity : undefined;

            const isPrimary = !!(itemDetails?.primarySupplier?._id && item.supplier?._id === itemDetails.primarySupplier._id);
            initialDefaultFlags[item._key] = isPrimary;
        }

        setEditedSuppliers(initialSuppliers);
        setEditedPrices(initialPrices);
        setDefaultSupplierFlags(initialDefaultFlags);
        onEditModalOpen();
    };

    const handleSupplierChange = (itemKey: string, supplierId: string, stockItemId: string) => {
        setEditedSuppliers(prev => ({ ...prev, [itemKey]: supplierId }));

        const itemDetails = stockItems[stockItemId];
        if (itemDetails?.primarySupplier?._id === supplierId) {
            setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: true }));
        } else {
            setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: false }));
        }
    };

    const handlePriceChange = (itemKey: string, valueAsString: string) => {
        const value = parseFloat(valueAsString);
        setEditedPrices(prev => ({ ...prev, [itemKey]: isNaN(value) ? undefined : value }));
    };

    const handleDefaultSupplierToggle = async (itemKey: string, stockItemId: string, checked: boolean) => {
        setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: checked }));

        const supplierId = editedSuppliers[itemKey];
        if (!supplierId) {
            toast({
                title: 'Select supplier first',
                description: 'Choose a supplier before marking as default.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: false }));
            return;
        }

        try {
            await addSupplierToStockItem(stockItemId, supplierId);

            if (checked) {
                await setPrimarySupplierAPI(stockItemId, supplierId);
                toast({
                    title: 'Default supplier set',
                    description: 'Primary supplier updated for this item.',
                    status: 'success',
                    duration: 2000,
                    isClosable: true,
                });
            } else {
                await unsetPrimarySupplierAPI(stockItemId);
                toast({
                    title: 'Default supplier unset',
                    description: 'Primary supplier removed for this item.',
                    status: 'info',
                    duration: 2000,
                    isClosable: true,
                });
            }
        } catch (err: any) {
            console.error(err);
            toast({
                title: 'Error',
                description: err?.message || 'Failed to update primary supplier.',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
            setDefaultSupplierFlags(prev => ({ ...prev, [itemKey]: !checked }));
        }
    };


    /* ---------- Validation helpers & UI state ---------- */

    const canSaveChanges = () => {
        if (!selectedPO) return false;
        return selectedPO.orderedItems.every(item => {
            const supplier = editedSuppliers[item._key] ?? item.supplier?._id;
            const totalPrice = editedPrices[item._key];
            return Boolean(supplier) && typeof totalPrice === 'number' && totalPrice > 0;
        });
    };

    const getRowError = (item: any) => {
        const supplier = editedSuppliers[item._key] ?? item.supplier?._id;
        const totalPrice = editedPrices[item._key];
        if (!supplier) return 'No supplier selected';
        if (totalPrice === undefined || totalPrice === null) return 'No total price entered';
        if (typeof totalPrice !== 'number' || totalPrice <= 0) return 'Enter a valid total price';
        return null;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'orange';
            case 'processed': return 'green';
            default: return 'gray';
        }
    };

    /* ---------- Columns ---------- */

    const columns = [
        {
            accessorKey: 'actions',
            header: 'Actions',
            cell: (row: PurchaseOrder) => (
                <Button
                    size="sm"
                    colorScheme="blue"
                    leftIcon={<Icon as={FiEdit} />}
                    onClick={() => handleEditPO(row)}
                >
                    Edit
                </Button>
            )
        },
        {
            accessorKey: 'poNumber',
            header: 'PO Number',
            cell: (row: PurchaseOrder) => (
                <Text fontWeight="bold">{row.poNumber}</Text>
            )
        },
        {
            accessorKey: 'site',
            header: 'Site',
            cell: (row: PurchaseOrder) => row.site?.name || 'N/A'
        },
        {
            accessorKey: 'items',
            header: 'Items',
            cell: (row: PurchaseOrder) => (
                <VStack align="start" spacing={1}>
                    {row.orderedItems.map(item => (
                        <HStack key={item._key} spacing={2}>
                            <Text fontSize="sm">
                                {item.stockItem.name} ({item.orderedQuantity} {item.stockItem.unitOfMeasure})
                            </Text>
                            {(!item.supplier || item.unitPrice <= 0) && (
                                <Badge colorScheme="red" fontSize="xs">
                                    Needs Setup
                                </Badge>
                            )}
                            {item.supplier && item.unitPrice > 0 && (
                                <Badge colorScheme="green" fontSize="xs">
                                    {item.supplier.name} - E{item.unitPrice.toFixed(2)}
                                </Badge>
                            )}
                        </HStack>
                    ))}
                </VStack>
            )
        },
        {
            accessorKey: 'totalAmount',
            header: 'Total Amount',
            cell: (row: PurchaseOrder) => `E${row.totalAmount?.toFixed(2)}`
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: (row: PurchaseOrder) => (
                <Badge colorScheme={getStatusColor(row.status)} variant="subtle">
                    {row.status.toUpperCase()}
                </Badge>
            )
        },
        {
            accessorKey: 'orderDate',
            header: 'Order Date',
            cell: (row: PurchaseOrder) => new Date(row.orderDate).toLocaleDateString()
        },

    ];

    // Add this function after handleProcessPO
    const handleSaveChanges = async () => {
        if (!selectedPO) return;
        setSaving(true);

        try {
            const updates = selectedPO.orderedItems.map(item => {
                const supplierId = editedSuppliers[item._key] ?? item.supplier?._id;
                const totalPrice = editedPrices[item._key];

                return {
                    itemKey: item._key,
                    supplierId: supplierId,
                    newPrice: totalPrice ? totalPrice / item.orderedQuantity : undefined
                };
            }).filter(update => update.supplierId && update.newPrice);

            // Update the purchase order items
            await updatePurchaseOrderItems(selectedPO._id, updates);

            // Update stock item prices
            for (const item of selectedPO.orderedItems) {
                const totalPrice = editedPrices[item._key];
                if (totalPrice) {
                    const unitPrice = totalPrice / item.orderedQuantity;
                    await updateStockItemUnitPrice(item.stockItem._id, unitPrice);
                }
            }

            toast({
                title: 'Success',
                description: 'Changes saved successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onEditModalClose();
            await fetchApprovedPOs();
        } catch (err: any) {
            console.error('Failed to save changes:', err);
            toast({
                title: 'Error',
                description: err?.message || 'Failed to save changes',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };


    // Replace the existing handleProcessPO function with this:
    const handleProcessPO = async () => {
        if (!selectedPO) return;
        setProcessing(true);

        try {
            // First, save all the changes to the purchase order items
            const updates = selectedPO.orderedItems.map(item => {
                const supplierId = editedSuppliers[item._key] ?? item.supplier?._id;
                const totalPrice = editedPrices[item._key];

                return {
                    itemKey: item._key,
                    supplierId: supplierId,
                    newPrice: totalPrice ? totalPrice / item.orderedQuantity : undefined
                };
            }).filter(update => update.supplierId && update.newPrice);

            // Update the purchase order items
            await updatePurchaseOrderItems(selectedPO._id, updates);

            // Then update the stock items with the new prices
            for (const item of selectedPO.orderedItems) {
                const totalPrice = editedPrices[item._key];
                if (totalPrice) {
                    const unitPrice = totalPrice / item.orderedQuantity;
                    await updateStockItemUnitPrice(item.stockItem._id, unitPrice);
                }
            }

            // Finally, process the purchase order
            const response = await fetch(`/api/purchase-orders/${selectedPO._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updateData: { status: 'processed' } })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process purchase order');
            }

            toast({
                title: 'Success',
                description: 'Purchase order processed successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onEditModalClose();
            await fetchApprovedPOs();
        } catch (err: any) {
            console.error('Failed to process purchase order:', err);
            toast({
                title: 'Error',
                description: err?.message || 'Failed to process purchase order',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setProcessing(false);
        }
    };

    /* ---------- Render ---------- */

    if (status === 'loading' || loading) {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <Box p={8}>
            <Heading as="h1" size="xl" mb={6}>
                Procurement Processing
            </Heading>
            <Text mb={6} color="gray.600">
                Process approved purchase orders and manage supplier relationships
            </Text>

            <Card>
                <CardBody>
                    {purchaseOrders.length === 0 ? (
                        <Text textAlign="center" color="gray.500" py={8}>
                            No approved purchase orders to process
                        </Text>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={purchaseOrders}
                            loading={loading}
                        />
                    )}
                </CardBody>
            </Card>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="4xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        Set Suppliers & Prices: {selectedPO?.poNumber}
                    </ModalHeader>
                    <ModalBody>
                        {selectedPO && (
                            <VStack spacing={4} align="stretch">
                                <Text fontSize="sm" color="gray.600">
                                    Enter <strong>total price</strong> for each item (total price for the ordered quantity).
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                    The system will calculate the <strong>unit price</strong> (total ÷ quantity) and save it to the stock item and the purchase order.
                                </Text>

                                <TableContainer>
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>Item</Th>
                                                <Th>Supplier</Th>
                                                <Th>Set Default</Th>
                                                <Th>Total Price (E)</Th>
                                                <Th></Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {selectedPO.orderedItems.map(item => {
                                                const currentSupplier = editedSuppliers[item._key] ?? item.supplier?._id;
                                                const currentPrice = editedPrices[item._key];
                                                const isDefault = defaultSupplierFlags[item._key] ?? false;
                                                const itemDetails = stockItems[item.stockItem._id];
                                                const rowError = getRowError(item);

                                                const totalPriceValue = typeof currentPrice === 'number' ? currentPrice : (item.unitPrice > 0 ? item.unitPrice * item.orderedQuantity : undefined);

                                                return (
                                                    <Tr key={item._key} borderRadius="md" bg={rowError ? 'red.50' : undefined}>
                                                        <Td>
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontWeight="medium">{item.stockItem.name}</Text>
                                                                <Text fontSize="sm" color="gray.600">
                                                                    {item.orderedQuantity} {item.stockItem.unitOfMeasure}
                                                                </Text>
                                                            </VStack>
                                                        </Td>
                                                        <Td>
                                                            <Select
                                                                value={currentSupplier || ''}
                                                                onChange={(e) => handleSupplierChange(item._key, e.target.value, item.stockItem._id)}
                                                                size="sm"
                                                                placeholder="Select supplier"
                                                            >
                                                                {suppliers.map(supplier => (
                                                                    <option key={supplier._id} value={supplier._id}>
                                                                        {supplier.name}
                                                                    </option>
                                                                ))}
                                                            </Select>
                                                            {rowError === 'No supplier selected' && (
                                                                <Text fontSize="xs" color="red.500">Select supplier</Text>
                                                            )}
                                                        </Td>
                                                        <Td>
                                                            <Tooltip
                                                                label={
                                                                    currentSupplier
                                                                        ? 'Mark this supplier as the default for this item'
                                                                        : 'Select a supplier first'
                                                                }
                                                            >
                                                                <HStack>
                                                                    <Switch
                                                                        isChecked={isDefault}
                                                                        onChange={(e) => handleDefaultSupplierToggle(item._key, item.stockItem._id, e.target.checked)}
                                                                        isDisabled={!currentSupplier}
                                                                        colorScheme="blue"
                                                                    />
                                                                    <Icon as={FiInfo} color="gray.500" boxSize={4} />
                                                                </HStack>
                                                            </Tooltip>
                                                        </Td>
                                                        <Td>
                                                            <NumberInput
                                                                value={totalPriceValue !== undefined ? totalPriceValue.toFixed(2) : ''}
                                                                onChange={(value) => handlePriceChange(item._key, value)}
                                                                precision={2}
                                                                step={0.01}
                                                                size="sm"
                                                                min={0}
                                                            >
                                                                <NumberInputField />
                                                            </NumberInput>
                                                            {rowError && rowError !== 'No supplier selected' && (
                                                                <Text fontSize="xs" color="red.500">{rowError}</Text>
                                                            )}
                                                        </Td>
                                                        <Td>
                                                            {totalPriceValue !== undefined && (
                                                                <Text fontSize="xs" color="gray.500">
                                                                    = E{(totalPriceValue / item.orderedQuantity).toFixed(2)} per {item.stockItem.unitOfMeasure}
                                                                </Text>
                                                            )}
                                                        </Td>
                                                    </Tr>
                                                );
                                            })}
                                        </Tbody>
                                    </Table>
                                </TableContainer>

                                {!canSaveChanges() && (
                                    <Alert status="warning" borderRadius="md">
                                        <AlertIcon />
                                        <AlertTitle>Missing data</AlertTitle>
                                        <AlertDescription>
                                            Some rows are missing supplier or total price. Fix those before saving.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </VStack>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <HStack spacing={3}>
                            <Button variant="ghost" onClick={onEditModalClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="blue"
                                onClick={handleSaveChanges} // replace with your save handler
                                isDisabled={!canSaveChanges()}
                            >
                                Save All Changes
                            </Button>
                            <Button
                                colorScheme="green"
                                onClick={handleProcessPO}
                                isLoading={processing}
                                isDisabled={!canSaveChanges()}
                            >
                                Process PO
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}
