'use client';
import React, { useState, useMemo, ChangeEvent } from 'react';
import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Box,
    Input,
    Flex,
    Button,
    Text,
    IconButton,
    HStack,
    Select,
    chakra,
    Spinner,
    Badge,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FiPackage } from 'react-icons/fi';
import { PendingAction } from './types';

// Define a flexible column type for better control over rendering
export interface Column {
    accessorKey: string;
    header: string | React.ReactNode;
    cell?: (row: any) => React.ReactNode;
    isSortable?: boolean;
}

interface DataTableProps {
    columns: Column[];
    data: PendingAction[];
    loading: boolean;
    onActionClick: (action: PendingAction) => void;
    hideStatusColumn?: boolean;
    actionType?: string;
}

export default function DataTable({
    columns,
    data,
    loading,
    onActionClick,
    hideStatusColumn = false,
    actionType = '',
}: DataTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'gray';
            case 'pending': return 'orange';
            case 'in-progress': return 'blue';
            case 'completed': return 'green';
            case 'pending-approval': return 'purple';
            default: return 'gray';
        }
    };

    // Custom action button renderer based on action type
    const renderActionButton = (row: PendingAction) => {
        if (actionType === 'GoodsReceipt') {
            return (
                <Button
                    size="sm"
                    colorScheme="green"
                    onClick={() => onActionClick(row)}
                    leftIcon={<FiPackage />}
                >
                    Receive
                </Button>
            );
        } else {
            return (
                <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => onActionClick(row)}
                >
                    Resolve
                </Button>
            );
        }
    };

    // Custom cell renderer for description that includes stock items for PurchaseOrders
    const renderDescriptionWithItems = (row: PendingAction) => {
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
    };

    // Function to search across all available data including nested objects
    const searchAllData = (row: PendingAction, searchTerm: string): boolean => {
        if (!searchTerm) return true;

        const searchTermLower = searchTerm.toLowerCase();

        // Check basic string properties
        const basicProperties = [
            row.title,
            row.description,
            row.siteName,
            row.priority,
            row.status,
            row.poNumber,
            row.supplierName,
            row.actionType
        ];

        if (basicProperties.some(prop =>
            prop && typeof prop === 'string' && prop.toLowerCase().includes(searchTermLower)
        )) {
            return true;
        }

        // Check date properties
        const dateProperties = [row.createdAt];
        if (dateProperties.some(date =>
            date && new Date(date).toLocaleDateString().toLowerCase().includes(searchTermLower)
        )) {
            return true;
        }

        // Check ordered items for PurchaseOrders
        if (row.actionType === 'PurchaseOrder' && row.orderedItems) {
            const hasMatchingItem = row.orderedItems.some((item: any) => {
                return (
                    (item.stockItem.name && item.stockItem.name.toLowerCase().includes(searchTermLower)) ||
                    (item.orderedQuantity && item.orderedQuantity.toString().includes(searchTerm)) ||
                    (item.unitPrice && item.unitPrice.toString().includes(searchTerm))
                );
            });

            if (hasMatchingItem) return true;
        }

        return false;
    };

    const processedData = useMemo(() => {
        // 1. Filter Data - search across all available information
        const filtered = data.filter((row) => searchAllData(row, searchTerm));

        // 2. Sort Data
        if (sortColumn && sortDirection) {
            filtered.sort((a, b) => {
                const aValue = a[sortColumn];
                const bValue = b[sortColumn];

                // Handle null/undefined values
                if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
                if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortDirection === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                }
                return 0; // Don't sort if types are not comparable
            });
        }
        return filtered;
    }, [data, searchTerm, sortColumn, sortDirection]);

    // 3. Paginate Data
    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedData = processedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleNextPage = () => handlePageChange(currentPage + 1);
    const handlePreviousPage = () => handlePageChange(currentPage - 1);

    const handleSort = (column: string, isSortable: boolean | undefined) => {
        if (!isSortable) return;
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const renderSortIcon = (accessorKey: string) => {
        if (sortColumn !== accessorKey) return null;
        return sortDirection === 'asc' ? (
            <ChevronUpIcon ml={1} />
        ) : (
            <ChevronDownIcon ml={1} />
        );
    };

    // The 'action' and 'status' columns are now handled entirely by the parent component.
    const allColumns = columns;

    return (
        <Box p={4} borderRadius="md" borderWidth="1px" overflowX="auto" className="shadow-sm">
            <Flex mb={4} justifyContent="space-between" alignItems="center">
                <Input
                    placeholder="Search across all data..."
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to first page on search
                    }}
                    maxW="250px"
                    className="bg-gray-50 border-gray-300 text-gray-900"
                />
                <Flex alignItems="center">
                    <Text mr={2} fontSize="sm" className="text-gray-600">
                        Items per page:
                    </Text>
                    <Select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1); // Reset to first page
                        }}
                        maxW="100px"
                        size="sm"
                        className="bg-gray-50 border-gray-300"
                    >
                        {[5, 10, 25, 50].map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </Select>
                </Flex>
            </Flex>

            {loading ? (
                <Flex justifyContent="center" alignItems="center" py={10}>
                    <Spinner size="xl" />
                </Flex>
            ) : (
                <Table variant="simple" size="sm" className="min-w-full divide-y divide-gray-200">
                    <Thead>
                        <Tr className="bg-gray-50">
                            {allColumns.map((column) => (
                                <Th
                                    key={column.accessorKey}
                                    onClick={() => handleSort(column.accessorKey, column.isSortable)}
                                    cursor={column.isSortable ? 'pointer' : 'default'}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    _hover={{ bg: column.isSortable ? 'gray.100' : 'gray.50' }}
                                >
                                    <Flex alignItems="center">
                                        {column.header}
                                        {renderSortIcon(column.accessorKey)}
                                    </Flex>
                                </Th>
                            ))}
                        </Tr>
                    </Thead>
                    <Tbody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row, rowIndex) => (
                                <Tr key={row._id || rowIndex}>
                                    {allColumns.map((column) => (
                                        <Td
                                            key={column.accessorKey}
                                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                        >
                                            {column.cell ? (
                                                column.cell(row)
                                            ) : column.accessorKey === 'description' ? (
                                                renderDescriptionWithItems(row)
                                            ) : (
                                                <Text>{row[column.accessorKey]}</Text>
                                            )}
                                        </Td>
                                    ))}
                                </Tr>
                            ))
                        ) : (
                            <Tr>
                                <Td colSpan={allColumns.length} textAlign="center" py={10}>
                                    No results found.
                                </Td>
                            </Tr>
                        )}
                    </Tbody>
                </Table>
            )}

            {/* Pagination Controls */}
            <Flex justifyContent="space-between" alignItems="center" mt={4} px={2}>
                <Text fontSize="sm" className="font-medium text-gray-600">
                    Showing {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
                </Text>
                <HStack spacing={2}>
                    <IconButton
                        aria-label="Previous page"
                        icon={<ChevronLeftIcon />}
                        onClick={handlePreviousPage}
                        isDisabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                        borderColor="gray.300"
                        color="gray.600"
                        _hover={{ bg: 'gray.100' }}
                        rounded="md"
                    />
                    <Text fontSize="sm" className="font-medium text-gray-600">
                        Page {totalPages === 0 ? 0 : currentPage} of {totalPages === 0 ? 0 : totalPages}
                    </Text>
                    <IconButton
                        aria-label="Next page"
                        icon={<ChevronRightIcon />}
                        onClick={handleNextPage}
                        isDisabled={currentPage === totalPages || totalPages === 0}
                        size="sm"
                        variant="outline"
                        borderColor="gray.300"
                        color="gray.600"
                        _hover={{ bg: 'gray.100' }}
                        rounded="md"
                    />
                </HStack>
            </Flex>
        </Box>
    );
}