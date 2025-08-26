'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Flex,
  useToast,
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
import { FiEdit } from 'react-icons/fi';
import { AppUser, Site } from '@/lib/sanityTypes'; // Import your types
import UserManagementModal from '@/components/UserManagementModal';

interface UserWithSiteName extends AppUser {
  associatedSiteName?: string;
}

export default function AdminPage() {
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const theme = useTheme();

  const [users, setUsers] = useState<UserWithSiteName[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithSiteName | null>(null);

  const bgColor = useColorModeValue(theme.colors.neutral.light['bg-primary'], theme.colors.neutral.dark['bg-primary']);
  const cardBgColor = useColorModeValue(theme.colors.neutral.light['bg-card'], theme.colors.neutral.dark['bg-card']);
  const textColor = useColorModeValue(theme.colors.neutral.light['text-primary'], theme.colors.neutral.dark['text-primary']);
  const tableCardBg = useColorModeValue(theme.colors.neutral.light['bg-surface'], theme.colors.neutral.dark['bg-surface']);
  const tableCardBorderColor = useColorModeValue(theme.colors.neutral.light['border-color'], theme.colors.neutral.dark['border-color']);
  const tableHeaderBg = useColorModeValue('gray.100', 'gray.600');
  const tableBorderColor = useColorModeValue('gray.200', 'gray.600');
  const textColorSecondary = useColorModeValue(theme.colors.neutral.light['text-secondary'], theme.colors.neutral.dark['text-secondary']);

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      // Fetch users from a new API route that gets your custom user data
      const usersQuery = groq`
        *[_type == "AppUser"]{
          _id,
          name,
          email,
          role,
          'associatedSite': associatedSite->{_id, name},
          isActive,
          profileImage
        }
      `;
      const fetchedUsers: AppUser[] = await client.fetch(usersQuery);

      // Fetch all sites for the dropdown in the modal
      const sitesQuery = groq`
        *[_type == "Site"]{
          _id,
          name
        } | order(name asc)
      `;
      const fetchedSites: Site[] = await client.fetch(sitesQuery);

      setSites(fetchedSites);

      const usersWithSiteNames = fetchedUsers.map(user => ({
        ...user,
        associatedSiteName: user.associatedSite?.name || '-'
      }));

      setUsers(usersWithSiteNames);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users or sites.',
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
      router.push('/login');
    } else {
      fetchData();
    }
  }, [isAuthenticated, isAdmin, isAuthReady, router, fetchData]);

  const handleAddUserClick = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditUserClick = (user: UserWithSiteName) => {
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
    return (
      <Flex minH="100vh" align="center" justify="center" bg={bgColor}>
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  if (isLoadingData) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg={bgColor}>
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  return (
    <Box p={8} minH="100vh" bg={bgColor} pt="64px">
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading as="h1" size="xl" color={textColor}>
          User Management
        </Heading>
        <Button colorScheme="blue" onClick={handleAddUserClick}>
          Add New User
        </Button>
      </Flex>

      <Box bg={cardBgColor} p={6} borderRadius="lg" boxShadow="md">
        <Heading as="h2" size="lg" mb={4} color={textColor}>Existing Users</Heading>
        {users.length === 0 ? (
          <Text color={textColor}>No users found.</Text>
        ) : (
          <Box overflowX="auto" bg={tableCardBg} borderRadius="lg" shadow="md" border="1px solid" borderColor={tableCardBorderColor}>
            <Table variant="simple">
              <Thead>
                <Tr bg={tableHeaderBg}>
                  <Th color={textColor}>Name</Th>
                  <Th color={textColor}>Email</Th>
                  <Th color={textColor}>Role</Th>
                  <Th color={textColor}>Associated Site</Th>
                  <Th color={textColor}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => (
                  <Tr key={user._id} borderBottom="1px solid" borderColor={tableBorderColor}>
                    <Td color={textColorSecondary}>{user.name}</Td>
                    <Td color={textColorSecondary}>{user.email}</Td>
                    <Td color={textColorSecondary}>{user.role}</Td>
                    <Td color={textColorSecondary}>{user.associatedSiteName}</Td>
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

      {/* Make sure your UserManagementModal component accepts these new props */}
      <UserManagementModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        userToEdit={userToEdit}
        sites={sites} // Pass the list of sites to the modal
        onSaveSuccess={handleSaveSuccess}
      />
    </Box>
  );
}