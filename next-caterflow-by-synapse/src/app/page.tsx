// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { Box, Heading, Text, Flex, Spinner, SimpleGrid, Card, CardHeader, CardBody, CardFooter, Button, Badge } from '@chakra-ui/react';
import Link from 'next/link';
import { calculateStock } from '@/lib/stockCalculations';

// The types below are used to help with type safety within the component.
interface StockItemWithBins {
  _id: string;
  name: string;
  sku: string;
  category: { title: string };
  unitOfMeasure: string;
  minimumStockLevel: number;
  binStocks: {
    binId: string;
    binName: string;
    siteId: string;
    siteName: string;
    currentQuantity: number;
    requiresCount?: boolean; // New flag for illogical quantities
  }[];
}

interface DashboardData {
  lowStockItems: StockItemWithBins[];
  purchaseOrders: any[];
  goodsReceipts: any[];
  dispatchLogs: any[];
  internalTransfers: any[];
  stockAdjustments: any[];
  inventoryCounts: any[];
}

// TODO: In a real application, replace this with a context or a hook that gets the
// logged-in user's role and site ID from your authentication system.
const useAuth = () => {
  const [userRole, setUserRole] = useState<'admin' | 'siteManager' | 'stockController' | 'dispatchStaff' | 'auditor'>('siteManager');
  const [siteId, setSiteId] = useState('0f75e3c7-43c9-43c7-95de-98c56e29782a'); // Example site ID

  return { userRole, siteId };
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { userRole, siteId } = useAuth();

  const fetchDashboardData = async () => {
    setLoading(true);

    let baseQuery = '';
    const queryParams: Record<string, any> = { siteId };

    // Conditionally build the query based on the user's role
    switch (userRole) {
      case 'siteManager':
      case 'stockController':
        baseQuery = groq`
          {
            "stockItems": *[_type == "StockItem"] {
              _id, name, sku, category->{title}, unitOfMeasure, minimumStockLevel,
              "bins": *[_type == "Bin" && site._ref == $siteId] {
                _id,
                name,
                "site": site->{_id, name}
              }
            },
            "purchaseOrders": *[_type == "PurchaseOrder" && supplier->site._ref == $siteId] | order(orderDate desc)[0..4],
            "goodsReceipts": *[_type == "GoodsReceipt" && receivingBin->site._ref == $siteId] | order(receiptDate desc)[0..4],
            "internalTransfers": *[_type == "InternalTransfer" && (fromBin->site._ref == $siteId || toBin->site._ref == $siteId)] | order(transferDate desc)[0..4],
            "stockAdjustments": *[_type == "StockAdjustment" && bin->site._ref == $siteId] | order(adjustmentDate desc)[0..4],
            "inventoryCounts": *[_type == "InventoryCount" && bin->site._ref == $siteId] | order(countDate desc)[0..4],
          }
        `;
        break;
      case 'dispatchStaff':
        baseQuery = groq`
          {
            "dispatchLogs": *[_type == "DispatchLog" && sourceBin->site._ref == $siteId] | order(dispatchDate desc)[0..4],
            "internalTransfers": *[_type == "InternalTransfer" && (fromBin->site._ref == $siteId || toBin->site._ref == $siteId)] | order(transferDate desc)[0..4],
          }
        `;
        break;
      case 'admin':
      case 'auditor':
      default:
        // Admin and Auditor get the full view
        baseQuery = groq`
          {
            "stockItems": *[_type == "StockItem"] {
              _id, name, sku, category->{title}, unitOfMeasure, minimumStockLevel,
              "bins": *[_type == "Bin"] {
                _id,
                name,
                "site": site->{_id, name}
              }
            },
            "purchaseOrders": *[_type == "PurchaseOrder"] | order(orderDate desc)[0..4],
            "goodsReceipts": *[_type == "GoodsReceipt"] | order(receiptDate desc)[0..4],
            "dispatchLogs": *[_type == "DispatchLog"] | order(dispatchDate desc)[0..4],
            "internalTransfers": *[_type == "InternalTransfer"] | order(transferDate desc)[0..4],
            "stockAdjustments": *[_type == "StockAdjustment"] | order(adjustmentDate desc)[0..4],
            "inventoryCounts": *[_type == "InventoryCount"] | order(countDate desc)[0..4],
          }
        `;
        break;
    }

    try {
      const data = await client.fetch(baseQuery, queryParams);

      if (data && data.stockItems) {
        const lowStockItems: StockItemWithBins[] = [];
        for (const stockItem of data.stockItems) {
          const itemWithLowStockBins = { ...stockItem, binStocks: [] };
          for (const bin of stockItem.bins) {
            const currentQuantity = await calculateStock(stockItem._id, bin._id);

            // Check if quantity is low or illogical (negative)
            if (currentQuantity <= stockItem.minimumStockLevel) {
              const binStock: StockItemWithBins['binStocks'][0] = {
                binId: bin._id,
                binName: bin.name,
                siteId: bin.site._id,
                siteName: bin.site.name,
                currentQuantity,
              };
              if (currentQuantity < 0) {
                binStock.requiresCount = true;
              }
              itemWithLowStockBins.binStocks.push(binStock);
            }
          }
          if (itemWithLowStockBins.binStocks.length > 0) {
            lowStockItems.push(itemWithLowStockBins);
          }
        }
        setDashboardData({ ...data, lowStockItems });
      } else {
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userRole, siteId]);

  if (loading) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  const isSiteManagerOrAdmin = userRole === 'siteManager' || userRole === 'admin' || userRole === 'auditor';
  const isStockControllerOrAdmin = userRole === 'stockController' || userRole === 'admin' || userRole === 'auditor';
  const isDispatchStaffOrAdmin = userRole === 'dispatchStaff' || userRole === 'admin' || userRole === 'auditor';

  return (
    <Box p={8}>
      <Heading mb={6}>Dashboard</Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>

        {/* Low Stock Items Card - visible to Site Manager, Stock Controller, Admin, Auditor */}
        {(isSiteManagerOrAdmin || isStockControllerOrAdmin) && (
          <Card>
            <CardHeader>
              <Heading size="md">Low Stock Items</Heading>
            </CardHeader>
            <CardBody>
              {dashboardData?.lowStockItems?.length ? (
                <Box>
                  {dashboardData.lowStockItems.map((item: StockItemWithBins) => (
                    <Box key={item._id} py={2} borderBottom="1px" borderColor="gray.100">
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="medium">{item.name}</Text>
                        <Flex>
                          {item.binStocks.map((binStock) => (
                            <Badge
                              key={binStock.binId}
                              colorScheme={binStock.requiresCount ? 'orange' : 'red'}
                              ml={2}
                            >
                              {binStock.currentQuantity} {item.unitOfMeasure} ({binStock.binName})
                            </Badge>
                          ))}
                        </Flex>
                      </Flex>
                      <Text fontSize="sm" color="gray.600">
                        SKU: {item.sku}
                        {item.binStocks.length > 0 && ` • Site: ${item.binStocks[0].siteName}`}
                      </Text>
                      {item.binStocks.some(bs => bs.requiresCount) && (
                        <Text mt={2} fontSize="sm" color="red.500" fontWeight="bold">
                          ⚠️ The calculated stock for this item is illogical. A **bin count** is highly recommended for
                          {item.binStocks.filter(bs => bs.requiresCount).map(bs => ` ${bs.binName}`).join(', ')}.
                        </Text>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Text>No low stock items</Text>
              )}
            </CardBody>
            <CardFooter>
              <Link href="/inventory" passHref>
                <Button colorScheme="red" size="sm">
                  View All Stock
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        {/* Recent Purchase Orders - visible to Site Manager, Admin, Auditor */}
        {isSiteManagerOrAdmin && (
          <Card>
            <CardHeader>
              <Heading size="md">Recent Purchase Orders</Heading>
            </CardHeader>
            <CardBody>
              {dashboardData?.purchaseOrders?.length ? (
                <Box>
                  {dashboardData.purchaseOrders.map((order: any) => (
                    <Box key={order._id} py={2} borderBottom="1px" borderColor="gray.100">
                      <Flex justify="space-between">
                        <Text fontWeight="medium">{order.poNumber}</Text>
                        <Badge colorScheme={
                          order.status === 'received' ? 'green' :
                            order.status === 'ordered' ? 'yellow' : 'gray'
                        }>
                          {order.status}
                        </Badge>
                      </Flex>
                      <Text fontSize="sm" color="gray.600">
                        {order.supplier?.name} • {new Date(order.orderDate).toLocaleDateString()}
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Text>No recent purchase orders</Text>
              )}
            </CardBody>
            <CardFooter>
              <Link href="/operations/purchases" passHref>
                <Button colorScheme="blue" size="sm">
                  View All Orders
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        {/* Recent Goods Receipts - visible to Site Manager, Admin, Auditor */}
        {isSiteManagerOrAdmin && (
          <Card>
            <CardHeader>
              <Heading size="md">Recent Goods Receipts</Heading>
            </CardHeader>
            <CardBody>
              {dashboardData?.goodsReceipts?.length ? (
                <Box>
                  {dashboardData.goodsReceipts.map((receipt: any) => (
                    <Box key={receipt._id} py={2} borderBottom="1px" borderColor="gray.100">
                      <Text fontWeight="medium">{receipt.receiptNumber}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(receipt.receiptDate).toLocaleDateString()}
                        {receipt.purchaseOrder?.poNumber && ` (PO: ${receipt.purchaseOrder.poNumber})`}
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Text>No recent goods receipts</Text>
              )}
            </CardBody>
            <CardFooter>
              <Link href="/operations/receipts" passHref>
                <Button colorScheme="green" size="sm">
                  View All Receipts
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        {/* Recent Dispatch Logs - visible to Site Manager, Dispatch Staff, Admin, Auditor */}
        {isDispatchStaffOrAdmin && (
          <Card>
            <CardHeader>
              <Heading size="md">Recent Dispatches</Heading>
            </CardHeader>
            <CardBody>
              {dashboardData?.dispatchLogs?.length ? (
                <Box>
                  {dashboardData.dispatchLogs.map((log: any) => (
                    <Box key={log._id} py={2} borderBottom="1px" borderColor="gray.100">
                      <Text fontWeight="medium">{log.dispatchNumber}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(log.dispatchDate).toLocaleDateString()}
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Text>No recent dispatches</Text>
              )}
            </CardBody>
            <CardFooter>
              <Link href="/operations/dispatches" passHref>
                <Button colorScheme="teal" size="sm">
                  View All Dispatches
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        {/* Recent Internal Transfers - visible to all roles with site access, Admin, Auditor */}
        {(isSiteManagerOrAdmin || isDispatchStaffOrAdmin) && (
          <Card>
            <CardHeader>
              <Heading size="md">Recent Internal Transfers</Heading>
            </CardHeader>
            <CardBody>
              {dashboardData?.internalTransfers?.length ? (
                <Box>
                  {dashboardData.internalTransfers.map((transfer: any) => (
                    <Box key={transfer._id} py={2} borderBottom="1px" borderColor="gray.100">
                      <Text fontWeight="medium">{transfer.transferNumber}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(transfer.transferDate).toLocaleDateString()}
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Text>No recent internal transfers</Text>
              )}
            </CardBody>
            <CardFooter>
              <Link href="/operations/transfers" passHref>
                <Button colorScheme="purple" size="sm">
                  View All Transfers
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        {/* Recent Stock Adjustments - visible to Site Manager, Stock Controller, Admin, Auditor */}
        {(isSiteManagerOrAdmin || isStockControllerOrAdmin) && (
          <Card>
            <CardHeader>
              <Heading size="md">Recent Stock Adjustments</Heading>
            </CardHeader>
            <CardBody>
              {dashboardData?.stockAdjustments?.length ? (
                <Box>
                  {dashboardData.stockAdjustments.map((adjustment: any) => (
                    <Box key={adjustment._id} py={2} borderBottom="1px" borderColor="gray.100">
                      <Text fontWeight="medium">{adjustment.adjustmentNumber}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(adjustment.adjustmentDate).toLocaleDateString()}
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Text>No recent stock adjustments</Text>
              )}
            </CardBody>
            <CardFooter>
              <Link href="/operations/adjustments" passHref>
                <Button colorScheme="yellow" size="sm">
                  View All Adjustments
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        {/* Recent Inventory Counts - visible to Site Manager, Stock Controller, Admin, Auditor */}
        {(isSiteManagerOrAdmin || isStockControllerOrAdmin) && (
          <Card>
            <CardHeader>
              <Heading size="md">Recent Inventory Counts</Heading>
            </CardHeader>
            <CardBody>
              {dashboardData?.inventoryCounts?.length ? (
                <Box>
                  {dashboardData.inventoryCounts.map((count: any) => (
                    <Box key={count._id} py={2} borderBottom="1px" borderColor="gray.100">
                      <Text fontWeight="medium">{count.countNumber}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(count.countDate).toLocaleDateString()}
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Text>No recent inventory counts</Text>
              )}
            </CardBody>
            <CardFooter>
              <Link href="/operations/counts" passHref>
                <Button colorScheme="orange" size="sm">
                  View All Counts
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}
      </SimpleGrid>
    </Box>
  );
}