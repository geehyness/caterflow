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
  Tooltip,
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
  totalStockCount: number;
}

const StatCard = ({
  title,
  value,
  subValue,
  icon,
  colorScheme = 'brand',
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
  const iconBg = useColorModeValue(`${colorScheme}.50`, `${colorScheme}.900`);
  const iconColor = useColorModeValue(`${colorScheme}.500`, `${colorScheme}.300`);
  const subValueColor = useColorModeValue(`${colorScheme}.600`, `${colorScheme}.300`);
  const cardBg = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
  const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
  const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
  const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');

  return (
    <Card
      boxShadow="md"
      p={3}
      height="100%"
      minH="120px"
      bg={cardBg}
      border="1px"
      borderColor={borderColor}
      sx={{
        _dark: {
          boxShadow: 'dark-md',
        },
      }}
    >
      <VStack spacing={3} align="stretch" h="full">
        <HStack spacing={3} align="flex-start" flex="1">
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
                color={secondaryTextColor}
              >
                {title}
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', sm: 'xl' }} fontWeight="bold" color={primaryTextColor}>
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
          <Box borderTopWidth="1px" borderColor={borderColor} pt={2} mt="auto">
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
      </VStack>
    </Card>
  );
};

export default function Home() {
  const { data: session, status } = useSession();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSitesLoading, setIsSitesLoading] = useState(true);

  const toast = useToast();
  const sitesContainerRef = useRef<HTMLDivElement>(null);

  const user = session?.user as SessionUser | undefined;
  const userRole = user?.role;
  const associatedSite = user?.associatedSite;
  const isAuthReady = status !== 'loading';

  // Moved all useColorModeValue calls to the top level
  const pageBg = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
  const headingColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
  const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
  const dividerColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
  const transactionCardBg = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
  const spinnerColor = useColorModeValue('brand.500', 'brand.300');

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
        } else if (userRole !== 'siteManager' && fetchedSites.length > 0) {
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

  useEffect(() => {
    if (!isAuthReady || isSitesLoading) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);

      const siteIdsToQuery = selectedSiteId ? [selectedSiteId] : (userRole === 'admin' || userRole === 'auditor' ? sites.map(s => s._id) : []);

      if (siteIdsToQuery.length === 0) {
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
          todayActivityCount: 0,
          totalStockCount: 0
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
  }, [isAuthReady, isSitesLoading, selectedSiteId, sites, toast, userRole]);

  const TransactionIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'GoodsReceipt':
        return <Icon as={BsBuildingAdd} color="green.500" boxSize={4} />;
      case 'DispatchLog':
        return <Icon as={BsTruck} color="orange.500" boxSize={4} />;
      case 'InternalTransfer':
        return <Icon as={BsArrowRight} color="blue.500" boxSize={4} />;
      case 'StockAdjustment':
        return <Icon as={BsBoxSeam} color="purple.500" boxSize={4} />;
      case 'InventoryCount':
        return <Icon as={BsClipboardData} color="teal.500" boxSize={4} />;
      default:
        return null;
    }
  };

  const handleSiteClick = (siteId: string) => {
    setSelectedSiteId(siteId);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (sitesContainerRef.current) {
      const scrollAmount = sitesContainerRef.current.clientWidth / 2;
      if (direction === 'left') {
        sitesContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        sitesContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  if (!isAuthReady || isSitesLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" minHeight="calc(100vh - 60px - 80px)" bg={pageBg}>
        {/* Using the spinnerColor variable */}
        <Spinner size="xl" color={spinnerColor} />
      </Flex>
    );
  }

  return (
    <Box p={{ base: 3, md: 8 }} bg={pageBg} minHeight="100vh">
      <Heading as="h1" size={{ base: 'md', md: 'xl' }} mb={4} color={headingColor}>
        Dashboard
      </Heading>

      {/* Sites Section */}
      {(user?.role === 'admin' || user?.role === 'auditor') && sites.length > 0 && (
        <VStack align="stretch" spacing={3} mb={6}>
          <Flex justify="space-between" align="center">
            <Heading as="h2" size={{ base: 'sm', md: 'md' }} color={headingColor}>Sites</Heading>
            {sites.length > 3 && (
              <HStack>
                <IconButton
                  aria-label="Scroll left"
                  icon={<FiArrowLeft />}
                  onClick={() => handleScroll('left')}
                  size="xs"
                  variant="outline"
                  colorScheme="brand"
                />
                <IconButton
                  aria-label="Scroll right"
                  icon={<FiArrowRight />}
                  onClick={() => handleScroll('right')}
                  size="xs"
                  variant="outline"
                  colorScheme="brand"
                />
              </HStack>
            )}
          </Flex>

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
                mr={2}
                size="sm"
                variant={selectedSiteId === site._id ? 'solid' : 'outline'}
                colorScheme={selectedSiteId === site._id ? 'brand' : 'gray'}
                minW="120px"
                fontSize={{ base: 'xs', sm: 'sm' }}
                flexShrink={0}
                borderRadius="lg"
              >
                {site.name}
              </Button>
            ))}
          </Flex>
        </VStack>
      )}

      {/* Stats Section */}
      <Heading as="h2" size={{ base: 'sm', md: 'md' }} mt={user?.role === 'siteManager' || sites.length === 0 ? 0 : 6} mb={3} color={headingColor}>
        Site Statistics
        {selectedSiteId && (
          <Badge ml={2} colorScheme="brand" fontSize={{ base: 'xs', md: 'sm' }}>
            {sites.find(s => s._id === selectedSiteId)?.name}
          </Badge>
        )}
      </Heading>

      {isLoading ? (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing={4} mb={6}>
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
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing={4} mb={6}>
          {/* Card 1: Receipts This Month */}
          <StatCard
            title="Receipts This Month"
            value={dashboardStats?.monthlyReceiptsCount || 0}
            subValue={`+${dashboardStats?.receiptsTrend || 0} vs last month`}
            icon={BsBuildingAdd}
            colorScheme="green"
            viewAllLink="/operations/receipts"
          />

          {/* Card 2: Issues This Month */}
          <StatCard
            title="Issues This Month"
            value={dashboardStats?.monthlyDispatchesCount || 0}
            subValue={`${dashboardStats?.todaysDispatchesCount || 0} today`}
            icon={BsTruck}
            colorScheme="orange"
            viewAllLink="/operations/dispatches"
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

          {/* Card 5: Total Stock */}
          <StatCard
            title="Total Stock"
            value={dashboardStats?.totalStockCount || 0}
            subValue={`${dashboardStats?.todayActivityCount || 0} items moved today`}
            icon={BsClipboardData}
            colorScheme="brand"
            viewAllLink="/inventory"
          />
        </SimpleGrid>
      )}

      <Divider mb={6} borderColor={dividerColor} />

      {/* Transaction History Section */}
      <Heading as="h2" size={{ base: 'sm', md: 'md' }} mb={3} color={headingColor}>
        Recent Transactions
        {selectedSiteId && (
          <Badge ml={2} colorScheme="brand" fontSize={{ base: 'xs', md: 'sm' }}>
            {sites.find(s => s._id === selectedSiteId)?.name}
          </Badge>
        )}
        {!selectedSiteId && (user?.role === 'admin' || user?.role === 'auditor') && (
          <Badge ml={2} colorScheme="green" fontSize={{ base: 'xs', md: 'sm' }}>All Sites</Badge>
        )}
      </Heading>

      {isLoading ? (
        <Flex justifyContent="center" alignItems="center" minHeight="150px">
          {/* Using the spinnerColor variable */}
          <Spinner size="lg" color={spinnerColor} />
        </Flex>
      ) : transactions.length > 0 ? (
        <VStack spacing={3} align="stretch">
          {transactions.slice(0, 5).map(transaction => (
            <Card key={transaction._id} boxShadow="sm" size="sm" bg={transactionCardBg}>
              <CardBody py={3} px={4}>
                <Flex direction={{ base: 'column', sm: 'row' }} alignItems={{ base: 'flex-start', sm: 'center' }}>
                  <Box flexShrink={0} mb={{ base: 2, sm: 0 }}>
                    <TransactionIcon type={transaction._type} />
                  </Box>
                  <Box flex="1" ml={{ base: 0, sm: 3 }}>
                    <Text fontWeight="medium" fontSize="sm" noOfLines={1} color={headingColor}>
                      {transaction.description}
                    </Text>
                    <Flex direction={{ base: 'column', sm: 'row' }} fontSize="xs" color={secondaryTextColor} mt={1}>
                      <Text>{new Date(transaction.createdAt).toLocaleDateString()}</Text>
                      <Text display={{ base: 'none', sm: 'block' }} mx={2}>•</Text>
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
          <Text fontSize="sm" color={secondaryTextColor}>
            No transaction history found for {selectedSiteId ? "this site." : "your account."}
          </Text>
        </Box>
      )}

      {transactions.length > 0 && (
        <Box textAlign="center" mt={4}>
          <Link href="/transactions" passHref>
            <Button size="sm" variant="ghost" colorScheme="brand">
              View All Transactions
            </Button>
          </Link>
        </Box>
      )}
    </Box>
  );
}