'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Heading,
    Button,
    Flex,
    Spinner,
    useDisclosure,
    useToast,
    useColorModeValue,
    Card,
    CardBody,
    Input,
    VStack,
    HStack,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    IconButton,
    Badge,
    Text,
    FormControl,
    FormLabel,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Textarea,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
} from '@chakra-ui/react';
import { FiPlus, FiEdit, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import { useSession } from 'next-auth/react';

interface DispatchType {
    _id: string;
    name: string;
    description?: string;
    defaultTime?: string;
    sellingPrice: number;
    isActive: boolean;
}

export default function DispatchTypesPage() {
    const { data: session, status } = useSession();
    const [dispatchTypes, setDispatchTypes] = useState<DispatchType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingType, setEditingType] = useState<DispatchType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();

    // Theming props
    const bgPrimary = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');

    // Check if user is admin
    const isAdmin = session?.user?.role === 'admin';

    const fetchDispatchTypes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/dispatch-types');
            if (response.ok) {
                const data = await response.json();
                setDispatchTypes(data || []);
            } else {
                throw new Error('Failed to fetch dispatch types');
            }
        } catch (error) {
            console.error('Error fetching dispatch types:', error);
            toast({
                title: 'Error',
                description: 'Failed to load dispatch types.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchDispatchTypes();
        }
    }, [fetchDispatchTypes, status]);

    const handleCreate = () => {
        setEditingType({
            _id: '',
            name: '',
            description: '',
            defaultTime: '',
            sellingPrice: 0,
            isActive: true
        });
        onOpen();
    };

    const handleEdit = (type: DispatchType) => {
        setEditingType({ ...type });
        onOpen();
    };

    const handleSave = async () => {
        if (!editingType?.name.trim()) {
            toast({
                title: 'Error',
                description: 'Name is required.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const url = editingType._id ? `/api/dispatch-types/${editingType._id}` : '/api/dispatch-types';
            const method = editingType._id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editingType),
            });

            if (!response.ok) {
                throw new Error('Failed to save dispatch type');
            }

            toast({
                title: 'Success',
                description: editingType._id ? 'Dispatch type updated.' : 'Dispatch type created.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onClose();
            setEditingType(null);
            fetchDispatchTypes();
        } catch (error) {
            console.error('Error saving dispatch type:', error);
            toast({
                title: 'Error',
                description: 'Failed to save dispatch type.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this dispatch type?')) {
            return;
        }

        try {
            const response = await fetch(`/api/dispatch-types/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete dispatch type');
            }

            toast({
                title: 'Success',
                description: 'Dispatch type deleted.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            fetchDispatchTypes();
        } catch (error) {
            console.error('Error deleting dispatch type:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete dispatch type.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    if (status === 'loading' || loading) {
        return (
            <Flex justifyContent="center" alignItems="center" height="50vh" bg={bgPrimary}>
                <Spinner size="xl" />
            </Flex>
        );
    }

    // Redirect or show unauthorized if not admin
    if (!isAdmin) {
        return (
            <Box p={8} bg={bgPrimary} minH="100vh">
                <Card>
                    <CardBody>
                        <Heading size="lg" color="red.500" mb={4}>
                            Access Denied
                        </Heading>
                        <Text>
                            You do not have permission to access this page. Only administrators can manage dispatch types.
                        </Text>
                    </CardBody>
                </Card>
            </Box>
        );
    }

    return (
        <Box p={{ base: 4, md: 8 }} bg={bgPrimary} minH="100vh">
            <VStack spacing={6} align="stretch">
                <Flex justify="space-between" align="center">
                    <Heading as="h1" size="xl" color={primaryTextColor}>
                        Dispatch Types
                    </Heading>
                    <Button
                        leftIcon={<FiPlus />}
                        colorScheme="brand"
                        onClick={handleCreate}
                    >
                        Add Dispatch Type
                    </Button>
                </Flex>

                <Card>
                    <CardBody p={0}>
                        <TableContainer>
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Name</Th>
                                        <Th>Description</Th>
                                        <Th>Default Time</Th>
                                        <Th>Selling Price</Th>
                                        <Th>Status</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {dispatchTypes.map((type) => (
                                        <Tr key={type._id}>
                                            <Td fontWeight="medium">{type.name}</Td>
                                            <Td>
                                                <Text noOfLines={2} color="gray.600">
                                                    {type.description || 'No description'}
                                                </Text>
                                            </Td>
                                            <Td>{type.defaultTime || 'Not set'}</Td>
                                            <Td>${type.sellingPrice.toFixed(2)}</Td>
                                            <Td>
                                                <Badge colorScheme={type.isActive ? 'green' : 'red'}>
                                                    {type.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </Td>
                                            <Td>
                                                <HStack spacing={2}>
                                                    <IconButton
                                                        aria-label="Edit dispatch type"
                                                        icon={<FiEdit />}
                                                        size="sm"
                                                        colorScheme="blue"
                                                        onClick={() => handleEdit(type)}
                                                    />
                                                    <IconButton
                                                        aria-label="Delete dispatch type"
                                                        icon={<FiTrash2 />}
                                                        size="sm"
                                                        colorScheme="red"
                                                        onClick={() => handleDelete(type._id)}
                                                    />
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    ))}
                                    {dispatchTypes.length === 0 && (
                                        <Tr>
                                            <Td colSpan={6} textAlign="center" py={8}>
                                                <Text color="gray.500">No dispatch types found.</Text>
                                            </Td>
                                        </Tr>
                                    )}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </CardBody>
                </Card>

                {/* Create/Edit Modal */}
                <Modal isOpen={isOpen} onClose={onClose}>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>
                            {editingType?._id ? 'Edit Dispatch Type' : 'Create Dispatch Type'}
                        </ModalHeader>
                        <ModalCloseButton />
                        <ModalBody>
                            <VStack spacing={4}>
                                <FormControl isRequired>
                                    <FormLabel>Name</FormLabel>
                                    <Input
                                        value={editingType?.name || ''}
                                        onChange={(e) => setEditingType(prev => prev ? { ...prev, name: e.target.value } : null)}
                                        placeholder="e.g., Breakfast, Lunch, Emergency"
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Description</FormLabel>
                                    <Textarea
                                        value={editingType?.description || ''}
                                        onChange={(e) => setEditingType(prev => prev ? { ...prev, description: e.target.value } : null)}
                                        placeholder="Description of this dispatch type"
                                        rows={3}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Default Time</FormLabel>
                                    <Input
                                        type="time"
                                        value={editingType?.defaultTime || ''}
                                        onChange={(e) => setEditingType(prev => prev ? { ...prev, defaultTime: e.target.value } : null)}
                                        placeholder="HH:MM"
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Selling Price per Person</FormLabel>
                                    <NumberInput
                                        value={editingType?.sellingPrice || 0}
                                        min={0}
                                        step={0.01}
                                        precision={2}
                                        onChange={(valueString, valueNumber) =>
                                            setEditingType(prev => prev ? { ...prev, sellingPrice: valueNumber } : null)
                                        }
                                    >
                                        <NumberInputField />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>
                                <FormControl>
                                    <HStack>
                                        <FormLabel mb={0}>Active</FormLabel>
                                        <input
                                            type="checkbox"
                                            checked={editingType?.isActive ?? true}
                                            onChange={(e) => setEditingType(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
                                        />
                                    </HStack>
                                </FormControl>
                            </VStack>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="outline" mr={3} onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="blue"
                                onClick={handleSave}
                                isLoading={isSubmitting}
                                leftIcon={editingType?._id ? <FiSave /> : <FiPlus />}
                            >
                                {editingType?._id ? 'Update' : 'Create'}
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            </VStack>
        </Box>
    );
}