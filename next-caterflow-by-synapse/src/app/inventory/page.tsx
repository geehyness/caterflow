// src/app/inventory/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { Box, Heading, Flex, Text, Button, useDisclosure, IconButton, HStack, useToast, Tag } from '@chakra-ui/react';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
import DataTable, { Column } from '@/components/DataTable';
import { useRouter } from 'next/navigation';
import StockItemModal from '@/components/StockItemModal';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';

interface StockItem {
    _id: string;
    name: string;
    sku: string;
    minimumStockLevel: number;
    quantityInStock: number;
    category: {
        _id: string;
        title: string;
    };
    suppliers: Array<{
        _id: string;
        name: string;
    }>;
    primarySupplier: {
        _id: string;
        name: string;
    };
    unitOfMeasure: string;
}

export default function InventoryPage() {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const toast = useToast();

    useEffect(() => {
        setIsMounted(true);
        fetchStockItems();
    }, []);

    const fetchStockItems = async () => {
        const query = groq`
      *[_type == "StockItem"]{
        _id,
        name,
        sku,
        minimumStockLevel,
        quantityInStock,
        "category": category->{_id, title},
        "suppliers": suppliers[]->{_id, name},
        "primarySupplier": primarySupplier->{_id, name},
        unitOfMeasure
      }
    `;
        try {
            setLoading(true);
            const data = await client.fetch(query);
            setStockItems(data);
        } catch (error) {
            console.error("Failed to fetch stock items:", error);
            toast({
                title: "Error",
                description: "Failed to fetch stock items",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: StockItem) => {
        setSelectedItem(item);
        onOpen();
    };

    const handleDelete = async (item: StockItem) => {
        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
            try {
                await client.delete(item._id);
                toast({
                    title: "Success",
                    description: "Item deleted successfully",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
                fetchStockItems(); // Refresh the list
            } catch (error) {
                console.error("Failed to delete item:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete item",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            }
        }
    };

    const handleNewItem = () => {
        setSelectedItem(null);
        onOpen();
    };

    const handleItemSaved = () => {
        onClose();
        fetchStockItems(); // Refresh the list
    };

    const columns: Column[] = [
        {
            accessorKey: 'actions',
            header: 'Actions',
            isSortable: false,
            cell: (row: StockItem) => (
                <HStack spacing={2}>
                    <IconButton
                        aria-label="Edit item"
                        icon={<EditIcon />}
                        size="sm"
                        colorScheme="blue"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(row);
                        }}
                    />
                    {/*<IconButton
                        aria-label="Delete item"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(row);
                        }}
                    />*/}
                </HStack>
            ),
        },
        {
            accessorKey: 'name',
            header: 'Item Name',
            isSortable: true,
        },
        {
            accessorKey: 'sku',
            header: 'SKU',
            isSortable: true,
        },
        {
            accessorKey: 'quantityInStock',
            header: 'Qty in Stock',
            isSortable: true,
            cell: (row: StockItem) => (
                <Text
                    color={row.quantityInStock <= row.minimumStockLevel ? 'red.500' : 'inherit'}
                    fontWeight={row.quantityInStock <= row.minimumStockLevel ? 'bold' : 'normal'}
                >
                    {row.quantityInStock} {row.unitOfMeasure}
                </Text>
            ),
        },
        {
            accessorKey: 'minimumStockLevel',
            header: 'Min. Level',
            isSortable: true,
            cell: (row: StockItem) => (
                <Text>
                    {row.minimumStockLevel} {row.unitOfMeasure}
                </Text>
            ),
        },
        {
            accessorKey: 'category.title',
            header: 'Category',
            isSortable: true,
            cell: (row: StockItem) => <Text>{row.category?.title || 'N/A'}</Text>,
        },
        {
            accessorKey: 'suppliers',
            header: 'Suppliers',
            isSortable: false,
            cell: (row: StockItem) => (
                <HStack spacing={1} flexWrap="wrap">
                    {row.suppliers?.map((supplier, index) => (
                        <Tag
                            key={supplier._id}
                            size="sm"
                            colorScheme={row.primarySupplier?._id === supplier._id ? 'blue' : 'gray'}
                            variant={row.primarySupplier?._id === supplier._id ? 'solid' : 'subtle'}
                        >
                            {supplier.name}
                            {row.primarySupplier?._id === supplier._id && ' (Primary)'}
                        </Tag>
                    )) || <Text>N/A</Text>}
                </HStack>
            ),
        },
    ];

    // Prevent rendering until after hydration
    if (!isMounted) {
        return null;
    }

    return (
        <Box p={8} flex="1">
            <Flex justify="space-between" align="center" mb={6}>
                <Heading as="h1" size="xl">
                    Inventory
                </Heading>
                <Button colorScheme="blue" onClick={handleNewItem}>
                    Add New Item
                </Button>
            </Flex>
            <Text mb={6} color="gray.600">
                Manage and view all stock items in your inventory.
            </Text>
            <DataTable
                columns={columns}
                data={stockItems}
                loading={loading}
            />

            <StockItemModal
                isOpen={isOpen}
                onClose={onClose}
                item={selectedItem}
                onSave={handleItemSaved}
            />
        </Box>
    );
}