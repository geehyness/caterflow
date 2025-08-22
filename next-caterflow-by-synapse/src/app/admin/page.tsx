// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  Text,
  Flex,
  useToast,
  Select,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  useColorModeValue,
  useTheme,
  IconButton,
  HStack,
} from '@chakra-ui/react';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import UserManagementModal from '../../components/UserManagementModal';
import { FiEdit } from 'react-icons/fi';

interface User {
  _id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  role: 'admin' | 'receptionist' | 'barber';
  barberRef?: { _ref: string; _type: 'reference' };
  barberName?: string;
}

interface Barber {
  _id: string;
  name: string;
}

export default function AdminPage() {
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const theme = useTheme();

  const [users, setUsers] = useState<User[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const bgColor = useColorModeValue(theme.colors.neutral.light['bg-primary'], theme.colors.neutral.dark['bg-primary']);
  const cardBgColor = useColorModeValue(theme.colors.neutral.light['bg-card'], theme.colors.neutral.dark['bg-card']);
  const textColor = useColorModeValue(theme.colors.neutral.light['text-primary'], theme.colors.neutral.dark['text-primary']);

  const inputBg = useColorModeValue(theme.colors.neutral.light['input-bg'], theme.colors.neutral.dark['input-bg']);
  const inputBorder = useColorModeValue(theme.colors.neutral.light['input-border'], theme.colors.neutral.dark['input-border']);
  const placeholderColor = useColorModeValue(theme.colors.neutral.light['placeholder-color'], theme.colors.neutral.dark['placeholder-color']);

  const textColorPrimary = useColorModeValue(theme.colors.neutral.light['text-primary'], theme.colors.neutral.dark['text-primary']);
  const textColorSecondary = useColorModeValue(theme.colors.neutral.light['text-secondary'], theme.colors.neutral.dark['text-secondary']);
  const tableCardBg = useColorModeValue(theme.colors.neutral.light['bg-surface'], theme.colors.neutral.dark['bg-surface']);
  const tableCardBorderColor = useColorModeValue(theme.colors.neutral.light['border-color'], theme.colors.neutral.dark['border-color']);
  const tableHeaderBg = useColorModeValue('gray.100', 'gray.600');
  const tableBorderColor = useColorModeValue('gray.200', 'gray.600');


  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      // Fetch users from your API route, which handles sanitization (no password sent)
      const usersResponse = await fetch('/api/users');
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users from API.');
      }
      const fetchedUsers: User[] = await usersResponse.json();

      // Fetch barbers directly from Sanity (or another API route if you create one for barbers)
      const barbersQuery = groq`
        *[_type == "barber"]{
          _id,
          name
        }
      `;
      const fetchedBarbers = await client.fetch(barbersQuery);

      setUsers(fetchedUsers);
      setBarbers(fetchedBarbers);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users or barbers.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isAuthenticated || !isAdmin) {
      console.log("[AdminPage useEffect] Auth ready, but not authenticated or not admin. Redirecting to /login.");
      router.push('/login');
    } else {
      console.log("[AdminPage useEffect] Auth ready, authenticated, and is admin. Fetching data.");
      fetchData();
    }
  }, [isAuthenticated, isAdmin, isAuthReady, router, fetchData]);

  const handleAddUserClick = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditUserClick = (user: User) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setUserToEdit(null);
  };

  const handleSaveSuccess = () => {
    fetchData();
  };

  if (!isAuthReady) {
    console.log("[AdminPage Render] Auth not ready, showing initial spinner.");
    return (
      <Flex minH="100vh" align="center" justify="center" bg={bgColor}>
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    console.log("[AdminPage Render] Auth ready, but not authenticated/admin. Returning null (redirecting).");
    return null;
  }

  if (isLoadingData) {
    console.log("[AdminPage Render] Auth ready, authenticated/admin, but data loading. Showing data spinner.");
    return (
      <Flex minH="100vh" align="center" justify="center" bg={bgColor}>
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  console.log("[AdminPage Render] All checks passed. Rendering Admin Page content.");
  return (
    <Box p={8} minH="100vh" bg={bgColor} color={textColor} pt="64px">
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading as="h1" size="xl">
          Admin User Management
        </Heading>
        <Button colorScheme="brand" onClick={handleAddUserClick}>
          Add New User
        </Button>
      </Flex>

      <Box bg={cardBgColor} p={6} borderRadius="lg" boxShadow="md">
        <Heading as="h2" size="lg" mb={4}>Existing Users</Heading>
        {users.length === 0 ? (
          <Text color={textColor}>No users found.</Text>
        ) : (
          <Box overflowX="auto" bg={tableCardBg} borderRadius="lg" shadow="md" border="1px solid" borderColor={tableCardBorderColor}>
            <Table variant="simple">
              <Thead>
                <Tr bg={tableHeaderBg}>
                  <Th color={textColorPrimary}>Username</Th>
                  <Th color={textColorPrimary}>Email</Th>
                  <Th color={textColorPrimary}>Phone Number</Th>
                  <Th color={textColorPrimary}>Role</Th>
                  <Th color={textColorPrimary}>Associated Barber</Th>
                  <Th color={textColorPrimary}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => (
                  <Tr key={user._id} borderBottom="1px solid" borderColor={tableBorderColor}>
                    <Td color={textColorSecondary}>{user.username}</Td>
                    <Td color={textColorSecondary}>{user.email}</Td>
                    <Td color={textColorSecondary}>{user.phoneNumber || '-'}</Td>
                    <Td color={textColorSecondary}>{user.role}</Td>
                    <Td color={textColorSecondary}>{user.barberName || '-'}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <IconButton
                          aria-label="Edit user"
                          icon={<FiEdit />}
                          onClick={() => handleEditUserClick(user)}
                          size="sm"
                          colorScheme="blue"
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <UserManagementModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        userToEdit={userToEdit}
        onSaveSuccess={handleSaveSuccess}
      />
    </Box>
  );
}
