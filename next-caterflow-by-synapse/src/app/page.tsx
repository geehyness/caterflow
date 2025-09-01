// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Spinner,
  SimpleGrid,
  Card,
  CardBody,
  Button,
  Badge,
  Icon,
  IconButton,
  useToast,
  useColorModeValue,
  VStack,
  HStack,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  Skeleton,
} from '@chakra-ui/react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { BsBoxSeam, BsArrowRight, BsTruck, BsBuildingAdd } from 'react-icons/bs';

interface Site {
  _id: string;
  name: string;
}

interface Transaction {
  _id: string;
  _type: string;
  createdAt: string;
  description: string;
  siteName: string;
}

interface DashboardStats {
  totalItemsReceived: number;
  totalItemsDispatched: number;
  pendingInternalTransfers: number;
  lowStockItems: number;
  totalStock: number;
}

const StatCard = ({
  title,
  value,
  icon,
  isLoading = false
}: {
  title: string;
  value: number | string;
  icon: any;
  isLoading?: boolean;
}) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  return (
    <Card bg={cardBg} boxShadow="sm" p={4} borderRadius="md" textAlign="left">
      <HStack spacing={4}>
        <Flex
          align="center"
          justify="center"
          w={12}
          h={12}
          bg={useColorModeValue('blue.50', 'blue.900')}
          borderRadius="full"
        >
          <Icon as={icon} w={6} h={6} color={useColorModeValue('blue.500', 'blue.300')} />
        </Flex>
        <VStack align="flex-start" spacing={0}>
          <Stat>
            <StatLabel fontWeight="medium" isTruncated>{title}</StatLabel>
            <StatNumber fontSize="xl">
              {isLoading ? (
                <Skeleton height="24px" width="60px" />
              ) : (
                value
              )}
            </StatNumber>
          </Stat>
        </VStack>
      </HStack>
    </Card>
  );
};

export default function Home() {
  const { user, isAuthReady } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSitesLoading, setIsSitesLoading] = useState(true);
  const [isCalculatingStock, setIsCalculatingStock] = useState(false);

  const toast = useToast();
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  // Fetch sites based on user role
  useEffect(() => {
    if (!isAuthReady) return;

    const fetchSites = async () => {
      setIsSitesLoading(true);
      try {
        let siteQuery = `*[_type == "Site"] | order(name asc) { _id, name }`;
        if (user?.role === 'siteManager') {
          siteQuery = `*[_type == "Site" && _id == $siteId] | order(name asc) { _id, name }`;
        } else if (user?.role === 'admin' || user?.role === 'auditor') {
          siteQuery = `*[_type == "Site"] | order(name asc) { _id, name }`;
        } else {
          setSites([]);
          setTransactions([]);
          setDashboardStats(null);
          setIsLoading(false);
          setIsSitesLoading(false);
          return;
        }

        const siteParams = user?.associatedSite?._id ? { siteId: user.associatedSite._id } : {};
        const response = await fetch('/api/sanity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: siteQuery,
            params: siteParams
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch sites');
        }

        const fetchedSites: Site[] = await response.json();
        setSites(fetchedSites);

        if (user?.role === 'siteManager' && fetchedSites.length > 0) {
          setSelectedSiteId(fetchedSites[0]._id);
        }
      } catch (error) {
        console.error("Failed to fetch sites:", error);
        toast({
          title: 'Error fetching sites.',
          description: 'Failed to load site list. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsSitesLoading(false);
      }
    };

    fetchSites();
  }, [isAuthReady, user, toast]);

  // Fetch dashboard data from API route
  useEffect(() => {
    if (!isAuthReady || isSitesLoading) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setIsCalculatingStock(true);

      let siteIdsToQuery = selectedSiteId ? [selectedSiteId] : sites.map(s => s._id);

      // If no site is selected and we have sites, default to the first one
      if (!selectedSiteId && sites.length > 0) {
        setSelectedSiteId(sites[0]._id);
        siteIdsToQuery = [sites[0]._id];
      } else if (siteIdsToQuery.length === 0) {
        setTransactions([]);
        setDashboardStats(null);
        setIsLoading(false);
        setIsCalculatingStock(false);
        return;
      }

      try {
        const response = await fetch('/api/dashboard/stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ siteIds: siteIdsToQuery }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();

        setTransactions(data.transactions || []);
        setDashboardStats(data.stats || {
          totalItemsReceived: 0,
          totalItemsDispatched: 0,
          pendingInternalTransfers: 0,
          lowStockItems: 0,
          totalStock: 0
        });

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast({
          title: 'Error fetching dashboard data.',
          description: 'Failed to load data. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
        setIsCalculatingStock(false);
      }
    };

    fetchDashboardData();
  }, [isAuthReady, isSitesLoading, selectedSiteId, sites, toast]);

  const TransactionIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'GoodsReceipt':
        return <Icon as={BsBuildingAdd} color="green.500" />;
      case 'DispatchLog':
        return <Icon as={BsTruck} color="red.500" />;
      case 'InternalTransfer':
        return <Icon as={BsArrowRight} color="yellow.500" />;
      case 'StockAdjustment':
        return <Icon as={BsBoxSeam} color="purple.500" />;
      case 'InventoryCount':
        return <Icon as={BsBoxSeam} color="blue.500" />;
      default:
        return null;
    }
  };

  const handleSiteClick = (siteId: string) => {
    setSelectedSiteId(siteId === selectedSiteId ? null : siteId);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('sites-container');
    if (container) {
      const scrollAmount = 200;
      if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
      } else {
        container.scrollLeft += scrollAmount;
      }
    }
  };

  if (!isAuthReady || isSitesLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box p={4}>
      <Heading as="h1" size="lg" mb={4}>
        Dashboard
      </Heading>

      {/* Sites Section */}
      <Flex justify="space-between" align="center" mb={4}>
        <Heading as="h2" size="md">Sites</Heading>
        <HStack>
          <IconButton
            aria-label="Scroll left"
            icon={<FiArrowLeft />}
            onClick={() => handleScroll('left')}
          />
          <IconButton
            aria-label="Scroll right"
            icon={<FiArrowRight />}
            onClick={() => handleScroll('right')}
          />
        </HStack>
      </Flex>

      {sites.length > 0 ? (
        <Flex
          id="sites-container"
          overflowX="auto"
          whiteSpace="nowrap"
          pb={4}
          sx={{
            '::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {sites.map(site => (
            <Button
              key={site._id}
              onClick={() => handleSiteClick(site._id)}
              mx={2}
              variant={selectedSiteId === site._id ? 'solid' : 'outline'}
              colorScheme={selectedSiteId === site._id ? 'blue' : 'gray'}
              minW="120px"
            >
              {site.name}
            </Button>
          ))}
        </Flex>
      ) : (
        <Text color="gray.500" mb={6}>No sites found for your account.</Text>
      )}

      {/* Stats Section */}
      <Heading as="h2" size="md" mt={8} mb={4}>
        Site Statistics
        {selectedSiteId && (
          <Badge ml={2} colorScheme="blue">
            {sites.find(s => s._id === selectedSiteId)?.name}
          </Badge>
        )}
      </Heading>

      {isLoading ? (
        <Flex justifyContent="center" alignItems="center" minHeight="100px">
          <Spinner size="lg" />
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={8}>
          <StatCard
            title="Items Received"
            value={dashboardStats?.totalItemsReceived || 0}
            icon={BsBuildingAdd}
            isLoading={isCalculatingStock}
          />
          <StatCard
            title="Items Dispatched"
            value={dashboardStats?.totalItemsDispatched || 0}
            icon={BsTruck}
            isLoading={isCalculatingStock}
          />
          <StatCard
            title="Pending Transfers"
            value={dashboardStats?.pendingInternalTransfers || 0}
            icon={BsArrowRight}
            isLoading={isCalculatingStock}
          />
          <StatCard
            title="Low Stock Items"
            value={isCalculatingStock ? "Calculating..." : dashboardStats?.lowStockItems || 0}
            icon={BsBoxSeam}
            isLoading={isCalculatingStock}
          />
          <StatCard
            title="Total Stock"
            value={isCalculatingStock ? "Calculating..." : dashboardStats?.totalStock || 0}
            icon={BsBoxSeam}
            isLoading={isCalculatingStock}
          />
        </SimpleGrid>
      )}

      <Divider mb={8} />

      {/* Transaction History Section */}
      <Heading as="h2" size="md" mb={4}>
        Transaction History
        {selectedSiteId && (
          <Badge ml={2} colorScheme="blue">
            {sites.find(s => s._id === selectedSiteId)?.name}
          </Badge>
        )}
        {!selectedSiteId && (user?.role === 'admin' || user?.role === 'auditor') && (
          <Badge ml={2} colorScheme="green">All Sites</Badge>
        )}
      </Heading>

      {isLoading ? (
        <Flex justifyContent="center" alignItems="center" minHeight="200px">
          <Spinner size="lg" />
        </Flex>
      ) : transactions.length > 0 ? (
        <VStack spacing={4} align="stretch">
          {transactions.map(transaction => (
            <Card key={transaction._id} bg={cardBg} boxShadow="sm">
              <CardBody>
                <HStack spacing={4} alignItems="center">
                  <Box flexShrink={0}>
                    <TransactionIcon type={transaction._type} />
                  </Box>
                  <VStack align="flex-start" spacing={0} flex="1">
                    <Text fontWeight="medium" isTruncated>{transaction.description}</Text>
                    <HStack>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </Text>
                      <Text fontSize="sm" color="gray.500">•</Text>
                      <Text fontSize="sm" color="gray.500">
                        {transaction.siteName}
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </VStack>
      ) : (
        <Box textAlign="center" py={10}>
          <Text fontSize="lg" color="gray.500">
            No transaction history found for {selectedSiteId ? "this site." : "your account."}
          </Text>
        </Box>
      )}

      {/* Calculating Overlay */}
      {isCalculatingStock && (
        <Box
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          bg="blackAlpha.800"
          color="white"
          p={6}
          borderRadius="md"
          zIndex="overlay"
          textAlign="center"
        >
          <Spinner size="xl" color="white" mb={4} />
          <Text fontSize="lg" fontWeight="bold">
            Calculating stock levels...
          </Text>
          <Text fontSize="sm" mt={2}>
            This may take a moment while we process your inventory data
          </Text>
        </Box>
      )}
    </Box>
  );
}