// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
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
} from '@chakra-ui/react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { BsBoxSeam, BsArrowRightLeft, BsTruck, BsBuildingAdd } from 'react-icons/bs';

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

interface ReceivedItem {
  receivedQuantity: number;
}

interface DispatchedItem {
  dispatchedQuantity: number;
}

interface InternalTransfer {
  _id: string;
}

interface StockItem {
  minimumStockLevel: number;
  binStocks: {
    siteId: string;
    currentQuantity: number;
  }[];
}

interface DashboardStats {
  totalItemsReceived: number;
  totalItemsDispatched: number;
  pendingInternalTransfers: number;
  lowStockItems: number;
}

const StatCard = ({ title, value, icon }: { title: string; value: number | string; icon: any }) => {
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
            <StatNumber fontSize="xl">{value}</StatNumber>
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
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const toast = useToast();
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  // Fetch sites based on user role
  useEffect(() => {
    if (!isAuthReady) return;

    const fetchSites = async () => {
      setIsSitesLoading(true);
      try {
        let siteQuery = groq`*[_type == "Site"] | order(name asc) { _id, name }`;
        if (user?.role === 'siteManager') {
          siteQuery = groq`*[_type == "Site" && _id == $siteId] | order(name asc) { _id, name }`;
        } else if (user?.role === 'admin' || user?.role === 'auditor') {
          siteQuery = groq`*[_type == "Site"] | order(name asc) { _id, name }`;
        } else {
          setSites([]);
          setTransactions([]);
          setDashboardStats(null);
          setIsLoading(false);
          setIsSitesLoading(false);
          return;
        }

        const siteParams = user?.associatedSite?._id ? { siteId: user.associatedSite._id } : {};
        const fetchedSites: Site[] = await client.fetch(siteQuery, siteParams);
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

  // Fetch dashboard data
  useEffect(() => {
    if (!isAuthReady || isSitesLoading) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);

      let siteIdsToQuery = selectedSiteId ? [selectedSiteId] : sites.map(s => s._id);

      // If no site is selected and we have sites, default to the first one
      if (!selectedSiteId && sites.length > 0) {
        setSelectedSiteId(sites[0]._id);
        siteIdsToQuery = [sites[0]._id];
      } else if (siteIdsToQuery.length === 0) {
        setTransactions([]);
        setDashboardStats(null);
        setIsLoading(false);
        return;
      }

      try {
        const query = groq`{
                    "transactions": {
                        "goodsReceipts": *[_type == "GoodsReceipt" && receivingBin->site._id in $siteIds] | order(receiptDate desc) [0..20] {
                            _id, _type, "createdAt": receiptDate, "description": "Receipt " + receiptNumber, "siteName": receivingBin->site->name, receivedItems[] { receivedQuantity }
                        },
                        "dispatchLogs": *[_type == "DispatchLog" && sourceBin->site._id in $siteIds] | order(dispatchDate desc) [0..20] {
                            _id, _type, "createdAt": dispatchDate, "description": "Dispatch " + dispatchNumber, "siteName": sourceBin->site->name, dispatchedItems[] { dispatchedQuantity }
                        },
                        "internalTransfers": *[_type == "InternalTransfer" && (fromBin->site._id in $siteIds || toBin->site._id in $siteIds)] | order(transferDate desc) [0..20] {
                            _id, _type, "createdAt": transferDate, "description": "Transfer " + transferNumber, "siteName": fromBin->site->name
                        },
                        "stockAdjustments": *[_type == "StockAdjustment" && bin->site._id in $siteIds] | order(adjustmentDate desc) [0..20] {
                            _id, _type, "createdAt": adjustmentDate, "description": "Adjustment " + adjustmentNumber, "siteName": bin->site->name
                        },
                        "inventoryCounts": *[_type == "InventoryCount" && bin->site._id in $siteIds] | order(countDate desc) [0..20] {
                            _id, _type, "createdAt": countDate, "description": "Inventory Count " + countNumber, "siteName": bin->site->name
                        }
                    },
                    "statsData": {
                        "receivedQuantities": *[_type == "GoodsReceipt" && receivingBin->site._id in $siteIds].receivedItems[].receivedQuantity,
                        "dispatchedQuantities": *[_type == "DispatchLog" && sourceBin->site._id in $siteIds].dispatchedItems[].dispatchedQuantity,
                        "pendingTransfers": *[_type == "InternalTransfer" && (fromBin->site._id in $siteIds || toBin->site._id in $siteIds) && status == "pending"],
                        "stockItems": *[_type == "StockItem" && defined(binStocks)] {
                            minimumStockLevel,
                            binStocks[] {
                                siteId,
                                currentQuantity
                            }
                        }
                    }
                }`;

        const data = await client.fetch(query, { siteIds: siteIdsToQuery });

        // Process transactions
        const allTransactions = [
          ...(data.transactions.goodsReceipts || []),
          ...(data.transactions.dispatchLogs || []),
          ...(data.transactions.internalTransfers || []),
          ...(data.transactions.stockAdjustments || []),
          ...(data.transactions.inventoryCounts || [])
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setTransactions(allTransactions.map(tx => ({
          ...tx,
          description: `${tx.description} ${tx.receivedItems ? `received ${tx.receivedItems.length} item(s)` : ''} ${tx.dispatchedItems ? `sent ${tx.dispatchedItems.length} item(s)` : ''}`.trim()
        })));

        // Calculate stats on the client side
        const totalItemsReceived = data.statsData.receivedQuantities.reduce((sum: number, qty: number) => sum + qty, 0);
        const totalItemsDispatched = data.statsData.dispatchedQuantities.reduce((sum: number, qty: number) => sum + qty, 0);
        const pendingInternalTransfers = data.statsData.pendingTransfers.length;

        const lowStockItems = data.statsData.stockItems.filter((item: StockItem) => {
          const totalQuantity = item.binStocks
            .filter(bin => siteIdsToQuery.includes(bin.siteId))
            .reduce((sum, bin) => sum + bin.currentQuantity, 0);
          return totalQuantity < item.minimumStockLevel;
        }).length;

        setDashboardStats({
          totalItemsReceived,
          totalItemsDispatched,
          pendingInternalTransfers,
          lowStockItems
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
  }, [isAuthReady, isSitesLoading, selectedSiteId, sites, toast]);

  const TransactionIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'GoodsReceipt':
        return <Icon as={BsBuildingAdd} color="green.500" />;
      case 'DispatchLog':
        return <Icon as={BsTruck} color="red.500" />;
      case 'InternalTransfer':
        return <Icon as={BsArrowRightLeft} color="yellow.500" />;
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
        <SimpleGrid columns={{ base: 1, md: 3, lg: 4 }} spacing={4} mb={8}>
          <StatCard
            title="Items Received"
            value={dashboardStats?.totalItemsReceived || 0}
            icon={BsBuildingAdd}
          />
          <StatCard
            title="Items Dispatched"
            value={dashboardStats?.totalItemsDispatched || 0}
            icon={BsTruck}
          />
          <StatCard
            title="Pending Transfers"
            value={dashboardStats?.pendingInternalTransfers || 0}
            icon={BsArrowRightLeft}
          />
          <StatCard
            title="Low Stock Items"
            value={dashboardStats?.lowStockItems || 0}
            icon={BsBoxSeam}
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
    </Box>
  );
}