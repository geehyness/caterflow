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
import { BsBoxSeam, BsArrowRight, BsTruck, BsBuildingAdd, BsExclamationTriangle, BsClipboardData, BsClock } from 'react-icons/bs';
import Link from 'next/link';


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
  // Card 1: Receipts This Month
  monthlyReceiptsCount: number;
  receiptsTrend: number;

  // Card 2: Dispatches This Month
  monthlyDispatchesCount: number;
  todaysDispatchesCount: number;

  // Card 3: Pending Actions
  pendingActionsCount: number;
  pendingTransfersCount: number;
  draftOrdersCount: number;

  // Card 4: Low Stock Items
  lowStockItemsCount: number;
  outOfStockItemsCount: number;

  // Card 5: Recent Activity
  weeklyActivityCount: number;
  todayActivityCount: number;
}

const StatCard = ({
  title,
  value,
  subValue,
  icon,
  colorScheme = 'blue',
  isLoading = false,
  viewAllLink
}: {
  title: string;
  value: number | string;
  subValue?: string;
  icon: any;
  colorScheme?: string;
  isLoading?: boolean;
  viewAllLink?: string;
}) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const subValueColor = useColorModeValue(`${colorScheme}.600`, `${colorScheme}.300`);
  const iconBg = useColorModeValue(`${colorScheme}.50`, `${colorScheme}.900`);
  const iconColor = useColorModeValue(`${colorScheme}.500`, `${colorScheme}.300`);
  const borderTopColor = useColorModeValue('gray.100', 'gray.600');

  return (
    <Card bg={cardBg} boxShadow="sm" p={4} borderRadius="md" textAlign="left" height="100%">
      <HStack spacing={4} align="stretch" mb={viewAllLink ? 3 : 0}>
        <Flex
          align="center"
          justify="center"
          w={12}
          h={12}
          bg={iconBg}
          borderRadius="full"
          flexShrink={0}
        >
          <Icon as={icon} w={6} h={6} color={iconColor} />
        </Flex>

        <VStack align="flex-start" spacing={0} flex="1">
          <Stat>
            <StatLabel fontWeight="medium" isTruncated color="gray.500">
              {title}
            </StatLabel>
            <StatNumber fontSize="xl" fontWeight="bold">
              {isLoading ? <Skeleton height="24px" width="60px" /> : value}
            </StatNumber>
            {subValue && (
              <Text fontSize="sm" color={subValueColor} fontWeight="medium">
                {subValue}
              </Text>
            )}
          </Stat>
        </VStack>
      </HStack>

      {viewAllLink && (
        <Box borderTopWidth="1px" borderTopColor={borderTopColor} pt={3}>
          <Link href={viewAllLink} passHref>
            <Button
              size="sm"
              variant="ghost"
              width="full"
              colorScheme={colorScheme}
              justifyContent="space-between"
              rightIcon={<Icon as={FiArrowRight} />}
            >
              View All
            </Button>
          </Link>
        </Box>
      )}
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

      let siteIdsToQuery = selectedSiteId ? [selectedSiteId] : sites.map(s => s._id);

      // If no site is selected and we have sites, default to the first one
      if (!selectedSiteId && sites.length > 0 && (user?.role === 'admin' || user?.role === 'auditor')) {
        setSelectedSiteId(sites[0]._id);
        siteIdsToQuery = [sites[0]._id];
      } else if (siteIdsToQuery.length === 0) {
        setTransactions([]);
        setDashboardStats(null);
        setIsLoading(false);
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
          monthlyReceiptsCount: 0,
          receiptsTrend: 0,
          monthlyDispatchesCount: 0,
          todaysDispatchesCount: 0,
          pendingActionsCount: 0,
          pendingTransfersCount: 0,
          draftOrdersCount: 0,
          lowStockItemsCount: 0,
          outOfStockItemsCount: 0,
          weeklyActivityCount: 0,
          todayActivityCount: 0
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
      }
    };

    fetchDashboardData();
  }, [isAuthReady, isSitesLoading, selectedSiteId, sites, toast, user]);

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
    setSelectedSiteId(siteId);
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
      {(user?.role === 'admin' || user?.role === 'auditor') && (
        <>
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
        </>
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
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 5 }} spacing={4} mb={8}>
          {[1, 2, 3, 4, 5].map(i => (
            <StatCard
              key={i}
              title="Loading..."
              value="0"
              isLoading={true}
              icon={BsBoxSeam}
            />
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 5 }} spacing={4} mb={8}>
          {/* Card 1: Receipts This Month */}
          <StatCard
            title="Receipts This Month"
            value={dashboardStats?.monthlyReceiptsCount || 0}
            subValue={`+${dashboardStats?.receiptsTrend || 0} vs last month`}
            icon={BsBuildingAdd}
            colorScheme="green"
            viewAllLink="/operations/receipts"
          />

          {/* Card 2: Dispatches This Month */}
          <StatCard
            title="Issues This Month"
            value={dashboardStats?.monthlyDispatchesCount || 0}
            subValue={`${dashboardStats?.todaysDispatchesCount || 0} pending today`}
            icon={BsTruck}
            colorScheme="orange"
            viewAllLink="/dispatches"
          />

          {/* Card 3: Pending Actions */}
          <StatCard
            title="Pending Actions"
            value={dashboardStats?.pendingActionsCount || 0}
            subValue={`${dashboardStats?.pendingTransfersCount || 0} transfers • ${dashboardStats?.draftOrdersCount || 0} orders`}
            icon={BsClock}
            colorScheme="yellow"
            viewAllLink="/actions"
          />

          {/* Card 4: Low Stock Items */}
          <StatCard
            title="Low Stock Items"
            value={dashboardStats?.lowStockItemsCount || 0}
            subValue={`${dashboardStats?.outOfStockItemsCount || 0} out of stock`}
            icon={BsExclamationTriangle}
            colorScheme="red"
            viewAllLink="/low-stock"
          />

          {/* Card 5: Recent Activity */}
          <StatCard
            title="Current Stock"
            value={dashboardStats?.weeklyActivityCount || 0}
            subValue={`${dashboardStats?.todayActivityCount || 0} today`}
            icon={BsClipboardData}
            colorScheme="blue"
            viewAllLink="/current"  // Updated
          />
        </SimpleGrid>
      )}

      <Divider mb={8} />

      {/* Transaction History Section */}
      <Heading as="h2" size="md" mb={4}>
        Recent Transactions
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
    </Box>
  );
}