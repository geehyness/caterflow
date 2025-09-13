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
import { useAuth } from '@/context/AuthContext';
import { BsBoxSeam, BsArrowRight, BsTruck, BsBuildingAdd, BsExclamationTriangle, BsClipboardData, BsClock, BsPersonCheckFill, BsBuildings } from 'react-icons/bs';
import Link from 'next/link';
import { useTheme } from '@chakra-ui/react';
import { motion } from 'framer-motion';

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
  urgentPendingActionsCount: number; // New stat
  negativeStockItemsCount: number;   // New stat
  transfersInTransitCount: number;   // New stat
  totalActiveUsers: number;          // New stat
  totalSites: number;                // New stat
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
  const cardBg = useColorModeValue('whiteAlpha.600', 'whiteAlpha.50');
  const subValueColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
  const iconBg = useColorModeValue(`${colorScheme}.50`, `${colorScheme}.900`);
  const iconColor = useColorModeValue(`${colorScheme}.500`, `${colorScheme}.300`);

  // Define a simple motion variant for a subtle hover effect
  const hoverVariant = {
    hover: {
      scale: 1.02,
      transition: { type: 'spring', stiffness: 400, damping: 10 },
    },
  };

  return (
    <motion.div variants={hoverVariant} whileHover="hover">
      <Card
        bg={cardBg}
        backdropFilter="blur(10px)"
        boxShadow="md"
        p={4}
        borderRadius="xl"
        textAlign="left"
        height="100%"
        minH="120px"
      >
        <VStack spacing={2} align="stretch" h="100%">
          <HStack spacing={3} align="flex-start">
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
                  color="neutral.text-secondary"
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
            <Link href={viewAllLink} passHref>
              <Button
                size="xs"
                variant="link"
                width="full"
                colorScheme="brand"
                justifyContent="flex-end"
                rightIcon={<Icon as={FiArrowRight} />}
                py={1}
                mt="auto"
              >
                View All
              </Button>
            </Link>
          )}
        </VStack>
      </Card>
    </motion.div>
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
  const sitesContainerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

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
          todayActivityCount: 0,
          // Placeholder values for new stats
          urgentPendingActionsCount: 0,
          negativeStockItemsCount: 0,
          transfersInTransitCount: 0,
          totalActiveUsers: 0,
          totalSites: 0,
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
        return <Icon as={BsBuildingAdd} color="neutral.light.status-green" _dark={{ color: "neutral.dark.status-green" }} boxSize={4} />;
      case 'DispatchLog':
        return <Icon as={BsTruck} color="neutral.light.status-red" _dark={{ color: "neutral.dark.status-red" }} boxSize={4} />;
      case 'InternalTransfer':
        return <Icon as={BsArrowRight} color="neutral.light.status-orange" _dark={{ color: "neutral.dark.status-orange" }} boxSize={4} />;
      case 'StockAdjustment':
        return <Icon as={BsBoxSeam} color="neutral.light.status-purple" _dark={{ color: "neutral.dark.status-purple" }} boxSize={4} />;
      case 'InventoryCount':
        return <Icon as={BsBoxSeam} color="brand.500" _dark={{ color: "brand.300" }} boxSize={4} />;
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
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  return (
    <Box p={{ base: 3, md: 4 }} overflowX="hidden">
      <Heading as="h1" size={{ base: 'md', md: 'lg' }} mb={4} color="neutral.text-primary">
        Dashboard
      </Heading>

      {/* Sites Section */}
      {(user?.role === 'admin' || user?.role === 'auditor') && (
        <>
          <Flex justify="space-between" align="center" mb={3}>
            <Heading as="h2" size={{ base: 'sm', md: 'md' }} color="neutral.text-primary">Sites</Heading>
            {sites.length > 3 && (
              <HStack>
                <IconButton
                  aria-label="Scroll left"
                  icon={<FiArrowLeft />}
                  onClick={() => handleScroll('left')}
                  size="xs"
                  variant="ghost"
                  colorScheme="brand"
                />
                <IconButton
                  aria-label="Scroll right"
                  icon={<FiArrowRight />}
                  onClick={() => handleScroll('right')}
                  size="xs"
                  variant="ghost"
                  colorScheme="brand"
                />
              </HStack>
            )}
          </Flex>

          {sites.length > 0 ? (
            <HStack
              ref={sitesContainerRef}
              spacing={2}
              overflowX="auto"
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
                  size="sm"
                  variant={selectedSiteId === site._id ? 'solid' : 'outline'}
                  colorScheme="brand"
                  whiteSpace="nowrap"
                  isTruncated
                  minW="120px"
                  flexShrink={0}
                >
                  {site.name}
                </Button>
              ))}
            </HStack>
          ) : (
            <Text color="neutral.text-secondary" mb={4} fontSize="sm">No sites found for your account.</Text>
          )}
        </>
      )}

      {/* Stats Section */}
      <Heading as="h2" size={{ base: 'sm', md: 'md' }} mt={6} mb={3} color="neutral.text-primary">
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
          {/* Card 1: Purchases (Receipts) */}
          <StatCard
            title="Purchases (Receipts)"
            value={dashboardStats?.monthlyReceiptsCount || 0}
            subValue={`+${dashboardStats?.receiptsTrend || 0} vs last month`}
            icon={BsBuildingAdd}
            colorScheme="green"
            viewAllLink="/operations/receipts"
          />

          {/* Card 2: Issues */}
          <StatCard
            title="Issues"
            value={dashboardStats?.monthlyDispatchesCount || 0}
            subValue={`${dashboardStats?.todaysDispatchesCount || 0} today`}
            icon={BsTruck}
            colorScheme="red"
            viewAllLink="/dispatches"
          />

          {/* Card 3: Low Stock Items */}
          <StatCard
            title="Low Stock"
            value={dashboardStats?.lowStockItemsCount || 0}
            subValue={`${dashboardStats?.outOfStockItemsCount || 0} out of stock`}
            icon={BsExclamationTriangle}
            colorScheme="orange"
            viewAllLink="/low-stock"
          />

          {/* Card 4: Transfers In Transit */}
          <StatCard
            title="Transfers In Transit"
            value={dashboardStats?.transfersInTransitCount || 0}
            icon={BsArrowRight}
            colorScheme="purple"
            viewAllLink="/operations/transfers"
          />

          {/* Card 5: Urgent Pending Actions */}
          <StatCard
            title="Urgent Actions"
            value={dashboardStats?.urgentPendingActionsCount || 0}
            icon={BsClock}
            colorScheme="yellow"
            viewAllLink="/actions"
          />

          {/* Card 6: Negative Stock Items */}
          <StatCard
            title="Negative Stock"
            value={dashboardStats?.negativeStockItemsCount || 0}
            icon={BsExclamationTriangle}
            colorScheme="red"
            viewAllLink="/stock-items"
          />
        </SimpleGrid>
      )}

      {/* Admin/Auditor only Stats */}
      {(user?.role === 'admin' || user?.role === 'auditor') && (
        <>
          <Heading as="h2" size={{ base: 'sm', md: 'md' }} mt={6} mb={3} color="neutral.text-primary">
            System Overview
          </Heading>
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4} mb={6}>
            <StatCard
              title="Total Sites"
              value={dashboardStats?.totalSites || 0}
              icon={BsBuildings}
              colorScheme="blue"
              viewAllLink="/locations"

            />
            <StatCard
              title="Active Users"
              value={dashboardStats?.totalActiveUsers || 0}
              icon={BsPersonCheckFill}
              colorScheme="green"
              viewAllLink="/stock-items"

            />
          </SimpleGrid>
        </>
      )}

      <Divider mb={6} />

      {/* Transaction History Section */}
      <Heading as="h2" size={{ base: 'sm', md: 'md' }} mb={3} color="neutral.text-primary">
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
          <Spinner size="lg" color="brand.500" />
        </Flex>
      ) : transactions.length > 0 ? (
        <VStack spacing={3} align="stretch">
          {transactions.slice(0, 5).map(transaction => (
            <Card key={transaction._id} variant="filled" size="md">
              <CardBody py={3} px={4}>
                <Flex direction={{ base: 'column', sm: 'row' }} alignItems={{ base: 'flex-start', sm: 'center' }}>
                  <Box flexShrink={0} mb={{ base: 2, sm: 0 }}>
                    <TransactionIcon type={transaction._type} />
                  </Box>
                  <Box flex="1" ml={{ base: 0, sm: 3 }}>
                    <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
                      {transaction.description}
                    </Text>
                    <Flex direction={{ base: 'column', xs: 'row' }} fontSize="xs" color="neutral.text-secondary" mt={1}>
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
          <Text fontSize="sm" color="neutral.text-secondary">
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