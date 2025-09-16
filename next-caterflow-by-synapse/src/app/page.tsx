// src/app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
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
  useBreakpointValue,
} from '@chakra-ui/react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { useSession } from 'next-auth/react';
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

// Add this interface for your session user
interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  associatedSite?: {
    _id: string;
    name: string;
  } | null;
}

interface DashboardStats {
  monthlyReceiptsCount: number;
  receiptsTrend: number;
  monthlyDispatchesCount: number;
  todaysDispatchesCount: number;
  pendingActionsCount: number;
  pendingTransfersCount: number;
  draftOrdersCount: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
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
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Card
      bg={cardBg}
      boxShadow="sm"
      p={3}
      borderRadius="md"
      textAlign="left"
      height="100%"
      minH="120px"
    >
      <HStack spacing={3} align="stretch" mb={viewAllLink ? 2 : 0}>
        <Flex
          align="center"
          justify="center"
          w={10}
          h={10}
          bg={iconBg}
          borderRadius="full"
          flexShrink={0}
        >
          <Icon as={icon} w={5} h={5} color={iconColor} />
        </Flex>

        <VStack align="flex-start" spacing={0} flex="1" overflow="hidden">
          <Stat>
            <StatLabel
              fontWeight="medium"
              fontSize={{ base: 'xs', sm: 'sm' }}
              isTruncated
              color="gray.500"
            >
              {title}
            </StatLabel>
            <StatNumber fontSize={{ base: 'lg', sm: 'xl' }} fontWeight="bold">
              {isLoading ? <Skeleton height="20px" width="50px" /> : value}
            </StatNumber>
            {subValue && (
              <Text
                fontSize={{ base: 'xs', sm: 'sm' }}
                color={subValueColor}
                fontWeight="medium"
                noOfLines={1}
              >
                {subValue}
              </Text>
            )}
          </Stat>
        </VStack>
      </HStack>

      {viewAllLink && (
        <Box borderTopWidth="1px" borderTopColor={borderTopColor} pt={2}>
          <Link href={viewAllLink} passHref>
            <Button
              size="xs"
              variant="ghost"
              width="full"
              colorScheme={colorScheme}
              justifyContent="space-between"
              rightIcon={<Icon as={FiArrowRight} />}
              py={1}
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
  const { data: session, status } = useSession(); // Use NextAuth's useSession
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSitesLoading, setIsSitesLoading] = useState(true);



  const toast = useToast();
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const isMobile = useBreakpointValue({ base: true, md: false });
  const sitesContainerRef = useRef<HTMLDivElement>(null);

  // Extract user data from session with proper typing
  const user = session?.user as SessionUser | undefined;
  const userRole = user?.role;
  const associatedSite = user?.associatedSite;
  const isAuthReady = status !== 'loading';

  // Fetch sites based on user role
  useEffect(() => {
    if (status === 'loading') return;

    const fetchSites = async () => {
      setIsSitesLoading(true);
      try {
        let siteQuery = `*[_type == "Site"] | order(name asc) { _id, name }`;
        let siteParams = {};

        if (userRole === 'siteManager') {
          siteQuery = `*[_type == "Site" && _id == $siteId] | order(name asc) { _id, name }`;
          siteParams = associatedSite?._id ? { siteId: associatedSite._id } : {};
        } else if (userRole === 'admin' || userRole === 'auditor') {
          siteQuery = `*[_type == "Site"] | order(name asc) { _id, name }`;
        } else {
          setSites([]);
          setTransactions([]);
          setDashboardStats(null);
          setIsLoading(false);
          setIsSitesLoading(false);
          return;
        }

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

        if (userRole === 'siteManager' && fetchedSites.length > 0) {
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
  }, [status, userRole, associatedSite, toast]);

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
        return <Icon as={BsBuildingAdd} color="green.500" boxSize={4} />;
      case 'DispatchLog':
        return <Icon as={BsTruck} color="red.500" boxSize={4} />;
      case 'InternalTransfer':
        return <Icon as={BsArrowRight} color="yellow.500" boxSize={4} />;
      case 'StockAdjustment':
        return <Icon as={BsBoxSeam} color="purple.500" boxSize={4} />;
      case 'InventoryCount':
        return <Icon as={BsBoxSeam} color="blue.500" boxSize={4} />;
      default:
        return null;
    }
  };

  const handleSiteClick = (siteId: string) => {
    setSelectedSiteId(siteId);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (sitesContainerRef.current) {
      const scrollAmount = 200;
      if (direction === 'left') {
        sitesContainerRef.current.scrollLeft -= scrollAmount;
      } else {
        sitesContainerRef.current.scrollLeft += scrollAmount;
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
    <Box p={{ base: 3, md: 4 }} overflowX="hidden">
      <Heading as="h1" size={{ base: 'md', md: 'lg' }} mb={4}>
        Dashboard
      </Heading>

      {/* Sites Section */}
      {(user?.role === 'admin' || user?.role === 'auditor') && (
        <>
          <Flex justify="space-between" align="center" mb={3}>
            <Heading as="h2" size={{ base: 'sm', md: 'md' }}>Sites</Heading>
            {sites.length > 3 && (
              <HStack>
                <IconButton
                  aria-label="Scroll left"
                  icon={<FiArrowLeft />}
                  onClick={() => handleScroll('left')}
                  size="xs"
                />
                <IconButton
                  aria-label="Scroll right"
                  icon={<FiArrowRight />}
                  onClick={() => handleScroll('right')}
                  size="xs"
                />
              </HStack>
            )}
          </Flex>

          {sites.length > 0 ? (
            <Flex
              ref={sitesContainerRef}
              overflowX="auto"
              whiteSpace="nowrap"
              pb={3}
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
                  mx={1}
                  size="sm"
                  variant={selectedSiteId === site._id ? 'solid' : 'outline'}
                  colorScheme={selectedSiteId === site._id ? 'blue' : 'gray'}
                  minW="100px"
                  fontSize={{ base: 'xs', sm: 'sm' }}
                  flexShrink={0}
                >
                  {site.name}
                </Button>
              ))}
            </Flex>
          ) : (
            <Text color="gray.500" mb={4} fontSize="sm">No sites found for your account.</Text>
          )}
        </>
      )}

      {/* Stats Section */}
      <Heading as="h2" size={{ base: 'sm', md: 'md' }} mt={6} mb={3}>
        Site Statistics
        {selectedSiteId && (
          <Badge ml={2} colorScheme="blue" fontSize={{ base: 'xs', md: 'sm' }}>
            {sites.find(s => s._id === selectedSiteId)?.name}
          </Badge>
        )}
      </Heading>

      {isLoading ? (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing={3} mb={6}>
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
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing={3} mb={6}>
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
            viewAllLink="/current"
          />
        </SimpleGrid>
      )}

      <Divider mb={6} />

      {/* Transaction History Section */}
      <Heading as="h2" size={{ base: 'sm', md: 'md' }} mb={3}>
        Recent Transactions
        {selectedSiteId && (
          <Badge ml={2} colorScheme="blue" fontSize={{ base: 'xs', md: 'sm' }}>
            {sites.find(s => s._id === selectedSiteId)?.name}
          </Badge>
        )}
        {!selectedSiteId && (user?.role === 'admin' || user?.role === 'auditor') && (
          <Badge ml={2} colorScheme="green" fontSize={{ base: 'xs', md: 'sm' }}>All Sites</Badge>
        )}
      </Heading>

      {isLoading ? (
        <Flex justifyContent="center" alignItems="center" minHeight="150px">
          <Spinner size="lg" />
        </Flex>
      ) : transactions.length > 0 ? (
        <VStack spacing={3} align="stretch">
          {transactions.slice(0, isMobile ? 3 : 5).map(transaction => (
            <Card key={transaction._id} bg={cardBg} boxShadow="sm" size="sm">
              <CardBody py={3} px={4}>
                <Flex direction={{ base: 'column', sm: 'row' }} alignItems={{ base: 'flex-start', sm: 'center' }}>
                  <Box flexShrink={0} mb={{ base: 2, sm: 0 }}>
                    <TransactionIcon type={transaction._type} />
                  </Box>
                  <Box flex="1" ml={{ base: 0, sm: 3 }}>
                    <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
                      {transaction.description}
                    </Text>
                    <Flex direction={{ base: 'column', xs: 'row' }} fontSize="xs" color="gray.500" mt={1}>
                      <Text>{new Date(transaction.createdAt).toLocaleDateString()}</Text>
                      <Text display={{ base: 'none', xs: 'block' }} mx={2}>•</Text>
                      <Text noOfLines={1}>{transaction.siteName}</Text>
                    </Flex>
                  </Box>
                </Flex>
              </CardBody>
            </Card>
          ))}
        </VStack>
      ) : (
        <Box textAlign="center" py={6}>
          <Text fontSize="sm" color="gray.500">
            No transaction history found for {selectedSiteId ? "this site." : "your account."}
          </Text>
        </Box>
      )}

      {transactions.length > 0 && (
        <Box textAlign="center" mt={4}>
          <Link href="/transactions" passHref>
            <Button size="sm" variant="ghost" colorScheme="blue">
              View All Transactions
            </Button>
          </Link>
        </Box>
      )}
    </Box>
  );
}