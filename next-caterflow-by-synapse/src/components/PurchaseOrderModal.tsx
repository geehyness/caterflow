// src/components/PurchaseOrderModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    Select,
    useToast,
    VStack,
    HStack,
    Text,
    SimpleGrid,
    Card,
    CardBody,
    Heading,
    Icon,
    Box,
    Flex,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
} from '@chakra-ui/react';
import { FaBoxes } from 'react-icons/fa';
import { LowStockItem, Supplier } from '@/lib/sanityTypes';

interface PurchaseOrderGroup {
    supplierId: string;
    items: LowStockItem[];
}

interface PurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedItems: LowStockItem[];
    suppliers: Supplier[];
    onSave: (orders: PurchaseOrderGroup[]) => void;
}

export default function PurchaseOrderModal({ isOpen, onClose, selectedItems, suppliers, onSave }: PurchaseOrderModalProps) {
    const [groupedItems, setGroupedItems] = useState<PurchaseOrderGroup[]>([]);
    const [ungroupedItems, setUngroupedItems] = useState<LowStockItem[]>([]);
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            // Initialize with all items in the ungrouped state
            setGroupedItems([]);
            setUngroupedItems(selectedItems);
        }
    }, [isOpen, selectedItems]);

    const handleCreateGroup = (supplierId: string) => {
        if (ungroupedItems.length === 0) {
            toast({
                title: 'No items to group',
                description: 'Please add items before creating a new group.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        const newGroup = {
            supplierId,
            items: [],
        };
        setGroupedItems([...groupedItems, newGroup]);
    };

    const handleMoveItemToGroup = (item: LowStockItem, groupIndex: number) => {
        const newGroupedItems = [...groupedItems];
        newGroupedItems[groupIndex].items.push(item);

        setGroupedItems(newGroupedItems);
        setUngroupedItems(ungroupedItems.filter(i => i._id !== item._id));
    };

    const handleRemoveItemFromGroup = (item: LowStockItem, groupIndex: number) => {
        const newGroupedItems = [...groupedItems];
        const newGroupItems = newGroupedItems[groupIndex].items.filter(i => i._id !== item._id);
        newGroupedItems[groupIndex].items = newGroupItems;

        setGroupedItems(newGroupedItems);
        setUngroupedItems([...ungroupedItems, item]);
    };

    const updateItemQuantityInGroup = (groupIndex: number, itemId: string, quantity: number) => {
        setGroupedItems(prev => {
            const newGroups = [...prev];
            const groupToUpdate = newGroups[groupIndex];
            const itemToUpdate = groupToUpdate.items.find(item => item._id === itemId);

            if (itemToUpdate) {
                itemToUpdate.orderQuantity = quantity;
            }

            return newGroups;
        });
    };

    const handleSaveOrders = () => {
        if (ungroupedItems.length > 0) {
            toast({
                title: 'Ungrouped Items',
                description: 'Please group all selected items before creating the orders.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        const validGroups = groupedItems.filter(group => group.items.length > 0);
        if (validGroups.length === 0) {
            toast({
                title: 'No Orders to Create',
                description: 'Please create at least one group with items.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        onSave(validGroups);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <HStack spacing={2} alignItems="center">
                        <Icon as={FaBoxes} color="blue.500" />
                        <Text>Create Purchase Orders</Text>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <Heading as="h4" size="sm" mt={4}>
                            Selected Items ({ungroupedItems.length} ungrouped)
                        </Heading>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                            {ungroupedItems.map((item) => (
                                <Card key={item._id} p={4} borderWidth="1px" borderRadius="md" _hover={{ bg: 'gray.50' }}>
                                    <HStack justifyContent="space-between">
                                        <VStack align="start" spacing={0}>
                                            <Text fontWeight="bold">{item.name}</Text>
                                            <Text fontSize="sm" color="gray.500">
                                                Order Qty: {item.orderQuantity}
                                            </Text>
                                        </VStack>
                                        <Select
                                            placeholder="Assign Supplier"
                                            size="sm"
                                            width="150px"
                                            onChange={(e) => {
                                                const supplierId = e.target.value;
                                                const existingGroupIndex = groupedItems.findIndex(g => g.supplierId === supplierId);
                                                if (existingGroupIndex !== -1) {
                                                    handleMoveItemToGroup(item, existingGroupIndex);
                                                } else {
                                                    // Create a new group and add the item
                                                    const newGroup = {
                                                        supplierId,
                                                        items: [item],
                                                    };
                                                    setGroupedItems([...groupedItems, newGroup]);
                                                    setUngroupedItems(ungroupedItems.filter(i => i._id !== item._id));
                                                }
                                            }}
                                        >
                                            {suppliers.map(supplier => (
                                                <option key={supplier._id} value={supplier._id}>
                                                    {supplier.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </HStack>
                                </Card>
                            ))}
                        </SimpleGrid>

                        <Box height="20px" />

                        <Heading as="h4" size="sm">
                            Purchase Order Groups ({groupedItems.length} groups)
                        </Heading>
                        <VStack spacing={6} align="stretch">
                            {groupedItems.map((group, groupIndex) => (
                                <Card key={group.supplierId} p={6} borderWidth="1px" borderRadius="md">
                                    <Flex justifyContent="space-between" alignItems="center" mb={4}>
                                        <HStack spacing={2}>
                                            <Icon as={FaBoxes} color="blue.500" />
                                            <Heading size="md">
                                                {suppliers.find(s => s._id === group.supplierId)?.name || 'Unknown Supplier'}
                                            </Heading>
                                        </HStack>
                                        <Text>
                                            ({group.items.length} items)
                                        </Text>
                                    </Flex>
                                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                        {group.items.map((item) => (
                                            <HStack
                                                key={item._id}
                                                p={2}
                                                bg="gray.50"
                                                borderRadius="md"
                                                justifyContent="space-between"
                                            >
                                                <VStack align="start" spacing={0}>
                                                    <Text fontWeight="bold">{item.name}</Text>
                                                    <HStack>
                                                        <Text fontSize="sm" color="gray.600">
                                                            Order Qty:
                                                        </Text>
                                                        <NumberInput
                                                            size="sm"
                                                            value={item.orderQuantity}
                                                            onChange={(value) => updateItemQuantityInGroup(groupIndex, item._id, parseInt(value) || 1)}
                                                            min={1}
                                                            max={1000}
                                                            width="100px"
                                                        >
                                                            <NumberInputField />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper />
                                                                <NumberDecrementStepper />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </HStack>
                                                </VStack>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveItemFromGroup(item, groupIndex)}
                                                >
                                                    Move back
                                                </Button>
                                            </HStack>
                                        ))}
                                    </SimpleGrid>
                                </Card>
                            ))}
                        </VStack>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleSaveOrders}
                        isDisabled={ungroupedItems.length > 0 || groupedItems.length === 0}
                    >
                        Create Orders ({groupedItems.length})
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}