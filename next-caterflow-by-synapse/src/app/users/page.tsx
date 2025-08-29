// src/app/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Heading,
    Button,
    Flex,
    Spinner,
    useDisclosure,
    useToast,
    IconButton,
    Badge,
    useColorModeValue,
    Card,
    CardBody,
    Text,
    Input,
    InputGroup,
    InputLeftElement,
    HStack,
    Switch,
    FormLabel,
    Select,
} from '@chakra-ui/react';
import { FiPlus, FiSearch, FiFilter } from 'react-icons/fi';
import DataTable from '@/components/DataTable';
import UserManagementModal from '@/components/UserManagementModal';
import { AppUser, Site, Reference } from '@/lib/sanityTypes';
import { useAuth } from '@/context/AuthContext';
import { EditIcon } from '@chakra-ui/icons';

// Interface for display with expanded site reference
interface AppUserWithSite {
    _id: string;
    _type: string;
    _createdAt: string;
    _updatedAt: string;
    _rev: string;
    name: string;
    email: string;
    role: 'admin' | 'siteManager' | 'stockController' | 'dispatchStaff' | 'auditor';
    associatedSite?: Site;
    isActive: boolean;
}

export default function UsersPage() {
    const [users, setUsers] = useState<AppUserWithSite[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<AppUserWithSite[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedUser, setSelectedUser] = useState<AppUserWithSite | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const { user: currentUser } = useAuth();

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const inputBg = useColorModeValue('white', 'gray.800');

    // Fetch users and sites
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [usersResponse, sitesResponse] = await Promise.all([
                    fetch('/api/users'),
                    fetch('/api/sites')
                ]);

                if (!usersResponse.ok || !sitesResponse.ok) {
                    throw new Error('Failed to fetch data');
                }

                const [usersData, sitesData] = await Promise.all([
                    usersResponse.json(),
                    sitesResponse.json()
                ]);

                // Transform users data to include expanded site information
                const usersWithSites = usersData.map((user: AppUser) => {
                    let associatedSite: Site | undefined;

                    if (user.associatedSite && typeof user.associatedSite === 'object' && '_id' in user.associatedSite) {
                        // If associatedSite is already expanded (has _id property)
                        associatedSite = user.associatedSite as unknown as Site;
                    } else if (user.associatedSite && typeof user.associatedSite === 'object' && '_ref' in user.associatedSite) {
                        // If associatedSite is a reference (has _ref property)
                        const siteRef = (user.associatedSite as Reference)._ref;
                        associatedSite = sitesData.find((site: Site) => site._id === siteRef);
                    }

                    return {
                        ...user,
                        associatedSite
                    };
                });

                setUsers(usersWithSites);
                setFilteredUsers(usersWithSites);
                setSites(sitesData);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load users. Please try again.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [toast]);

    // Filter users based on search term and filters
    useEffect(() => {
        let result = users;

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter((user: AppUserWithSite) =>
                user.name.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term)
            );
        }

        // Apply role filter
        if (roleFilter !== 'all') {
            result = result.filter((user: AppUserWithSite) => user.role === roleFilter);
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            const status = statusFilter === 'active';
            result = result.filter((user: AppUserWithSite) => user.isActive === status);
        }

        setFilteredUsers(result);
    }, [users, searchTerm, roleFilter, statusFilter]);

    const handleAddUser = () => {
        setSelectedUser(null);
        onOpen();
    };

    const handleEditUser = (user: AppUserWithSite) => {
        // Convert back to AppUser format for the modal
        const userForModal = {
            ...user,
            associatedSite: user.associatedSite ? { _ref: user.associatedSite._id } as Reference : undefined
        };
        setSelectedUser(userForModal as any);
        onOpen();
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                const response = await fetch(`/api/users?id=${userId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete user');
                }

                setUsers(users.filter(user => user._id !== userId));
                toast({
                    title: 'User deleted.',
                    description: 'The user has been successfully deleted.',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } catch (error) {
                console.error('Error deleting user:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to delete user. Please try again.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };

    const handleToggleStatus = async (user: AppUserWithSite) => {
        try {
            const response = await fetch('/api/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    _id: user._id,
                    isActive: !user.isActive
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update user status');
            }

            setUsers(users.map(u =>
                u._id === user._id ? { ...u, isActive: !u.isActive } : u
            ));

            toast({
                title: 'Status updated.',
                description: `User status has been ${!user.isActive ? 'activated' : 'deactivated'}.`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error('Error updating user status:', error);
            toast({
                title: 'Error',
                description: 'Failed to update user status. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleSaveSuccess = () => {
        // Refresh the users list
        fetch('/api/users')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }
                return response.json();
            })
            .then(usersData => {
                // Transform the data again
                const usersWithSites = usersData.map((user: AppUser) => {
                    let associatedSite: Site | undefined;

                    if (user.associatedSite && typeof user.associatedSite === 'object' && '_id' in user.associatedSite) {
                        associatedSite = user.associatedSite as unknown as Site;
                    } else if (user.associatedSite && typeof user.associatedSite === 'object' && '_ref' in user.associatedSite) {
                        const siteRef = (user.associatedSite as Reference)._ref;
                        associatedSite = sites.find((site: Site) => site._id === siteRef);
                    }

                    return {
                        ...user,
                        associatedSite
                    };
                });

                setUsers(usersWithSites);
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to refresh users list.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            });

        onClose();
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'purple';
            case 'siteManager': return 'blue';
            case 'stockController': return 'green';
            case 'dispatchStaff': return 'orange';
            case 'auditor': return 'teal';
            default: return 'gray';
        }
    };

    const getStatusColor = (isActive: boolean) => {
        return isActive ? 'green' : 'red';
    };

    const formatRoleName = (role: string) => {
        return role.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    const columns = [
        {
            accessorKey: 'actions',
            header: 'Actions',
            cell: (row: AppUserWithSite) => (
                <IconButton
                    aria-label="Edit item"
                    icon={<EditIcon />}
                    size="sm"
                    colorScheme="blue"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleEditUser(row);
                    }}
                />
            ),
        },
        {
            accessorKey: 'name',
            header: 'Name',
            isSortable: true,
        },
        {
            accessorKey: 'email',
            header: 'Email',
            isSortable: true,
        },
        {
            accessorKey: 'role',
            header: 'Role',
            isSortable: true,
            cell: (row: AppUserWithSite) => (
                <Badge colorScheme={getRoleColor(row.role)} fontSize="sm" px={2} py={1} borderRadius="full">
                    {formatRoleName(row.role)}
                </Badge>
            ),
        },
        {
            accessorKey: 'associatedSite',
            header: 'Site',
            isSortable: true,
            cell: (row: AppUserWithSite) => (
                <Text fontSize="sm">{row.associatedSite?.name || 'N/A'}</Text>
            ),
        },
        {
            accessorKey: 'isActive',
            header: 'Status',
            isSortable: true,
            cell: (row: AppUserWithSite) => (
                <Flex align="center">
                    <Switch
                        isChecked={row.isActive}
                        onChange={() => handleToggleStatus(row)}
                        colorScheme={getStatusColor(row.isActive)}
                        size="md"
                        mr={2}
                        isDisabled={row._id === currentUser?._id}
                    />
                    <Badge colorScheme={getStatusColor(row.isActive)}>
                        {row.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </Flex>
            ),
        },
    ];

    if (loading) {
        return (
            <Box p={4}>
                <Flex justifyContent="center" alignItems="center" height="50vh">
                    <Spinner size="xl" />
                </Flex>
            </Box>
        );
    }

    return (
        <Box p={4}>
            <Flex justifyContent="space-between" alignItems="center" mb={6}>
                <Heading as="h1" size="lg">User Management</Heading>
                <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={handleAddUser}
                >
                    Add User
                </Button>
            </Flex>

            {/* Filters */}
            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" mb={4} p={4}>
                <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                    <InputGroup maxW="300px">
                        <InputLeftElement pointerEvents="none">
                            <FiSearch color="gray.300" />
                        </InputLeftElement>
                        <Input
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            bg={inputBg}
                        />
                    </InputGroup>

                    <HStack spacing={4}>
                        <Flex align="center">
                            <FiFilter style={{ marginRight: '8px' }} />
                            <FormLabel htmlFor="role-filter" mb="0" whiteSpace="nowrap">
                                Role:
                            </FormLabel>
                            <Select
                                id="role-filter"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                size="sm"
                                bg={inputBg}
                                maxW="150px"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="siteManager">Site Manager</option>
                                <option value="stockController">Stock Controller</option>
                                <option value="dispatchStaff">Dispatch Staff</option>
                                <option value="auditor">Auditor</option>
                            </Select>
                        </Flex>

                        <Flex align="center">
                            <FormLabel htmlFor="status-filter" mb="0" whiteSpace="nowrap">
                                Status:
                            </FormLabel>
                            <Select
                                id="status-filter"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                size="sm"
                                bg={inputBg}
                                maxW="120px"
                            >
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </Select>
                        </Flex>
                    </HStack>
                </Flex>
            </Card>

            {/* Users Table */}
            <Card bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md">
                <CardBody p={0}>
                    <DataTable
                        columns={columns}
                        data={filteredUsers}
                        loading={false}
                    />
                </CardBody>
            </Card>

            <UserManagementModal
                isOpen={isOpen}
                onClose={onClose}
                userToEdit={selectedUser as any} // Cast to any to avoid type issues
                sites={sites}
                onSaveSuccess={handleSaveSuccess}
            />
        </Box>
    );
}