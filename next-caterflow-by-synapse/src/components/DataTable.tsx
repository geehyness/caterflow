// src/components/DataTable.tsx
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
    Checkbox, // Added Checkbox import
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';

// Define a flexible column type for better control over rendering
export interface Column {
    accessorKey: string;
    header: string | React.ReactNode;
    cell?: (row: any) => React.ReactNode;
    isSortable?: boolean;
}

// Add these props to the DataTable component interface
interface DataTableProps {
    columns: Column[];
    data: any[];
    loading: boolean;
    onSelectionChange?: (selectedItems: any[]) => void; // Add selection callback
}

export default function DataTable({
    columns,
    data,
    loading,
    onSelectionChange, // Add this prop
}: DataTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

    // Add state for selected rows
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

    // Add checkbox handler
    const handleRowSelection = (id: string) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedRows(newSelected);
        onSelectionChange?.(data.filter(item => newSelected.has(item._id)));
    };

    // Add select all handler
    const handleSelectAll = () => {
        if (selectedRows.size === data.length) {
            setSelectedRows(new Set());
            onSelectionChange?.([]);
        } else {
            const allIds = new Set(data.map(item => item._id));
            setSelectedRows(allIds);
            onSelectionChange?.(data);
        }
    };

    const processedData = useMemo(() => {
        // 1. Filter Data
        const filtered = data.filter((row) =>
            Object.values(row).some(
                (value) =>
                    typeof value === 'string' &&
                    value.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );

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

    // Add to columns definition for checkbox column
    const checkboxColumn: Column = {
        accessorKey: 'select',
        header: (
            <Checkbox
                isChecked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                isIndeterminate={selectedRows.size > 0 && selectedRows.size < paginatedData.length}
                onChange={handleSelectAll}
            />
        ),
        cell: (row) => (
            <Checkbox
                isChecked={selectedRows.has(row._id)}
                onChange={() => handleRowSelection(row._id)}
            />
        ),
        isSortable: false,
    };

    // Use checkboxColumn as the first column
    const allColumns = [checkboxColumn, ...columns];

    return (
        <Box p={4} borderRadius="md" borderWidth="1px" overflowX="auto" className="shadow-sm">
            <Flex mb={4} justifyContent="space-between" alignItems="center">
                <Input
                    placeholder="Search..."
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
                                <Tr key={rowIndex} className="even:bg-gray-50">
                                    {allColumns.map((column) => (
                                        <Td
                                            key={column.accessorKey}
                                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                            onClick={(e) => {
                                                // Prevent click propagation for action cells
                                                if (column.accessorKey !== 'actions') {
                                                    // Handle row click if needed
                                                }
                                            }}
                                        >
                                            {column.cell ? (
                                                column.cell(row)
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