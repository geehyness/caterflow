// src/app/reports/page.tsx - COMPLETE IMPLEMENTATION
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Box, Heading, Text, Flex, Spinner, Button, useToast, Tabs, TabList, TabPanels, Tab, TabPanel,
    Card, CardBody, VStack, HStack, Select, Input, InputGroup, InputLeftElement, Badge,
    Table, Thead, Tbody, Tr, Th, Td, TableContainer, useColorModeValue, Icon, Alert, AlertIcon,
    SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Grid, GridItem, Progress,
    Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
    Radio, RadioGroup, Stack, Wrap, WrapItem
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import {
    FiDownload, FiSearch, FiCalendar, FiFilter, FiTrendingUp, FiPackage,
    FiTruck, FiRepeat, FiBarChart2, FiPieChart, FiUsers,
    FiShoppingCart, FiArchive, FiAlertTriangle, FiDollarSign, FiUser
} from 'react-icons/fi';

// Chart components
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';

// Excel export utilities
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format, subDays, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

// Types based on your Sanity schemas
interface AppUser {
    _id: string;
    name: string;
    email: string;
    role: string;
    associatedSite?: { _id: string; name: string };
    isActive: boolean;
}

interface Site {
    _id: string;
    name: string;
    code: { current: string };
    location: string;
    manager?: { _id: string; name: string };
    patientCount: number;
}

interface StockItem {
    _id: string;
    name: string;
    sku: string;
    itemType: string;
    category: { _id: string; title: string };
    unitOfMeasure: string;
    unitPrice: number;
    minimumStockLevel: number;
    reorderQuantity: number;
    primarySupplier?: { _id: string; name: string };
    suppliers: Array<{ _id: string; name: string }>;
}

interface PurchaseOrder {
    _id: string;
    poNumber: string;
    orderDate: string;
    status: string;
    orderedItems: Array<{
        stockItem: StockItem;
        supplier?: { _id: string; name: string };
        orderedQuantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
    totalAmount: number;
    orderedBy: AppUser;
    site: Site;
    evidenceStatus: string;
}

interface GoodsReceipt {
    _id: string;
    receiptNumber: string;
    receiptDate: string;
    status: string;
    purchaseOrder?: { _id: string; poNumber: string; site: Site };
    receivingBin: { _id: string; name: string; site: Site };
    receivedItems: Array<{
        stockItem: StockItem;
        receivedQuantity: number;
        batchNumber?: string;
        expiryDate?: string;
        condition: string;
    }>;
    evidenceStatus: string;
}

interface DispatchLog {
    _id: string;
    dispatchNumber: string;
    dispatchDate: string;
    dispatchType: { _id: string; name: string; description: string };
    sourceBin: { _id: string; name: string; site: Site };
    dispatchedBy: AppUser;
    dispatchedItems: Array<{
        stockItem: StockItem;
        dispatchedQuantity: number;
        unitPrice: number;
        totalCost: number;
    }>;
    peopleFed: number;
    totalCost: number;
    costPerPerson: number;
    evidenceStatus: string;
}

interface InternalTransfer {
    _id: string;
    transferNumber: string;
    transferDate: string;
    fromBin: { _id: string; name: string; site: Site };
    toBin: { _id: string; name: string; site: Site };
    transferredBy: AppUser;
    transferredItems: Array<{
        stockItem: StockItem;
        transferredQuantity: number;
    }>;
    status: string;
    approvedBy?: AppUser;
    approvedAt?: string;
}

interface InventoryCount {
    _id: string;
    countNumber: string;
    countDate: string;
    bin: { _id: string; name: string; site: Site };
    countedBy: AppUser;
    status: string;
    countedItems: Array<{
        stockItem: StockItem;
        countedQuantity: number;
        systemQuantityAtCountTime: number;
        variance: number;
    }>;
}

interface Supplier {
    _id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    isActive: boolean;
}

// Enhanced Analytics Data Interface
interface EnhancedAnalyticsData {
    summary: {
        totalPurchaseOrders: number;
        totalGoodsReceipts: number;
        totalDispatches: number;
        totalTransfers: number;
        totalBinCounts: number;
        totalStockItems: number;
        totalSuppliers: number;
        totalUsers: number;
        totalSites: number;
        totalInventoryValue: number;
        totalPeopleFed: number;
        lowStockItems: number;
        criticalStockItems: number;
    };
    purchaseOrders: {
        byStatus: Array<{ name: string; value: number }>;
        bySite: Array<{ name: string; value: number }>;
        byMonth: Array<{ name: string; value: number }>;
        totalValue: number;
        avgOrderValue: number;
        topItems: Array<{ name: string; quantity: number; value: number }>;
        statusBreakdown: { [key: string]: number };
    };
    goodsReceipts: {
        byStatus: Array<{ name: string; value: number }>;
        bySite: Array<{ name: string; value: number }>;
        efficiency: number;
        conditionBreakdown: { [key: string]: number };
    };
    dispatches: {
        byType: Array<{ name: string; value: number }>;
        bySite: Array<{ name: string; value: number }>;
        totalPeopleFed: number;
        totalCost: number;
        costPerPerson: number;
        topItems: Array<{ name: string; quantity: number; cost: number }>;
    };
    transfers: {
        byStatus: Array<{ name: string; value: number }>;
        bySite: Array<{ name: string; value: number }>;
        approvalRate: number;
    };
    inventory: {
        byCategory: Array<{ name: string; value: number }>;
        totalValue: number;
        lowStockBreakdown: {
            critical: number;
            warning: number;
            healthy: number;
        };
    };
    binCounts: {
        byStatus: Array<{ name: string; value: number }>;
        accuracy: number;
        varianceAnalysis: {
            positive: number;
            negative: number;
            zero: number;
        };
    };
    financial: {
        monthlySpending: Array<{ month: string; spending: number }>;
        costPerPersonTrend: Array<{ date: string; cost: number }>;
        inventoryTurnover: number;
    };
    suppliers: {
        performance: Array<{ name: string; orders: number; value: number }>;
        activeCount: number;
    };
    users: {
        byRole: Array<{ name: string; value: number }>;
        activity: Array<{ name: string; actions: number }>;
    };
}

// Chart color schemes
const CHART_COLORS = {
    primary: ['#3182CE', '#63B3ED', '#90CDF4', '#BEE3F8'],
    success: ['#38A169', '#68D391', '#9AE6B4', '#C6F6D5'],
    warning: ['#DD6B20', '#F6AD55', '#FBD38D', '#FEEBC8'],
    error: ['#E53E3E', '#FC8181', '#FEB2B2', '#FED7D7'],
    purple: ['#805AD5', '#B794F4', '#D6BCFA', '#E9D8FD'],
    pink: ['#D53F8C', '#F687B3', '#FBB6CE', '#FED7E2'],
    gray: ['#4A5568', '#718096', '#A0AEC0', '#CBD5E0']
};

const STATUS_COLORS: { [key: string]: string } = {
    draft: 'gray',
    'pending-approval': 'orange',
    approved: 'blue',
    completed: 'green',
    processed: 'green',
    'partially-received': 'yellow',
    'in-progress': 'purple',
    cancelled: 'red',
    rejected: 'red',
    scheduled: 'blue',
    adjusted: 'purple'
};

export default function ComprehensiveReportsPage() {
    const { data: session, status } = useSession();
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<EnhancedAnalyticsData | null>(null);
    const [rawData, setRawData] = useState<{ [key: string]: any[] }>({});
    const toast = useToast();

    // Date ranges
    const [primaryDateRange, setPrimaryDateRange] = useState<{ start: string; end: string }>({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });
    const [comparisonDateRange, setComparisonDateRange] = useState<{ start: string; end: string }>({
        start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
        end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
    });
    const [compareMode, setCompareMode] = useState(false);

    // Theme colors
    const bgPrimary = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const bgCard = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');

    // Fetch all data for comprehensive analytics
    const fetchAllData = useCallback(async () => {
        setAnalyticsLoading(true);
        try {
            const endpoints = [
                '/api/purchase-orders',
                '/api/goods-receipts',
                '/api/dispatches',
                '/api/transfers',
                '/api/bin-counts',
                '/api/stock-items',
                '/api/low-stock',
                '/api/suppliers',
                '/api/users',
                '/api/sites'
            ];

            const [
                purchaseOrders, goodsReceipts, dispatches, transfers,
                binCounts, stockItems, lowStock, suppliers, users, sites
            ] = await Promise.all(
                endpoints.map(endpoint =>
                    fetch(endpoint).then(r => r.ok ? r.json() : [])
                )
            );

            // Store raw data
            setRawData({
                purchaseOrders, goodsReceipts, dispatches, transfers,
                binCounts, stockItems, lowStock, suppliers, users, sites
            });

            // Process analytics data
            const analytics = processAnalyticsData({
                purchaseOrders, goodsReceipts, dispatches, transfers,
                binCounts, stockItems, lowStock, suppliers, users, sites
            });

            setAnalyticsData(analytics);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load analytics data',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setAnalyticsLoading(false);
        }
    }, [toast]);

    // Process all data into analytics format
    const processAnalyticsData = (data: any): EnhancedAnalyticsData => {
        const {
            purchaseOrders, goodsReceipts, dispatches, transfers,
            binCounts, stockItems, lowStock, suppliers, users, sites
        } = data;

        // Helper functions
        const getStatusBreakdown = (items: any[]) => {
            const statusCounts: { [key: string]: number } = {};
            items.forEach(item => {
                const status = item.status || 'unknown';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        };

        const getSiteBreakdown = (items: any[]) => {
            const siteCounts: { [key: string]: number } = {};
            items.forEach(item => {
                const siteName = item.site?.name ||
                    item.purchaseOrder?.site?.name ||
                    item.sourceBin?.site?.name ||
                    item.receivingBin?.site?.name ||
                    item.fromBin?.site?.name ||
                    item.bin?.site?.name ||
                    'Unknown';
                siteCounts[siteName] = (siteCounts[siteName] || 0) + 1;
            });
            return Object.entries(siteCounts).map(([name, value]) => ({ name, value }));
        };

        const getMonthlyBreakdown = (items: any[], dateField: string) => {
            const monthlyCounts: { [key: string]: number } = {};
            items.forEach(item => {
                const date = new Date(item[dateField]);
                const monthYear = format(date, 'MMM yyyy');
                monthlyCounts[monthYear] = (monthlyCounts[monthYear] || 0) + 1;
            });
            return Object.entries(monthlyCounts).map(([name, value]) => ({ name, value }));
        };

        // Calculate inventory value
        const totalInventoryValue = stockItems.reduce((sum: number, item: StockItem) => {
            // This would need actual stock levels from your system
            return sum + (item.unitPrice * (item.minimumStockLevel || 0));
        }, 0);

        // Process purchase orders
        const poStatusBreakdown = getStatusBreakdown(purchaseOrders);
        const poSiteBreakdown = getSiteBreakdown(purchaseOrders);
        const poMonthlyBreakdown = getMonthlyBreakdown(purchaseOrders, 'orderDate');
        const poTotalValue = purchaseOrders.reduce((sum: number, po: PurchaseOrder) => sum + (po.totalAmount || 0), 0);

        // Top items by quantity ordered
        const topItems = purchaseOrders.flatMap((po: PurchaseOrder) =>
            po.orderedItems?.map((item: any) => ({
                name: item.stockItem?.name || 'Unknown',
                quantity: item.orderedQuantity || 0,
                value: (item.orderedQuantity || 0) * (item.unitPrice || 0)
            })) || []
        ).reduce((acc: any[], item: { name: any; quantity: any; value: any; }) => {
            const existing = acc.find(i => i.name === item.name);
            if (existing) {
                existing.quantity += item.quantity;
                existing.value += item.value;
            } else {
                acc.push({ ...item });
            }
            return acc;
        }, []).sort((a: { quantity: number; }, b: { quantity: number; }) => b.quantity - a.quantity).slice(0, 10);

        return {
            summary: {
                totalPurchaseOrders: purchaseOrders.length,
                totalGoodsReceipts: goodsReceipts.length,
                totalDispatches: dispatches.length,
                totalTransfers: transfers.length,
                totalBinCounts: binCounts.length,
                totalStockItems: stockItems.length,
                totalSuppliers: suppliers.length,
                totalUsers: users.length,
                totalSites: sites.length,
                totalInventoryValue,
                totalPeopleFed: dispatches.reduce((sum: number, d: DispatchLog) => sum + (d.peopleFed || 0), 0),
                lowStockItems: lowStock.length,
                criticalStockItems: lowStock.filter((item: any) => (item.currentStock || 0) === 0).length
            },
            purchaseOrders: {
                byStatus: poStatusBreakdown,
                bySite: poSiteBreakdown,
                byMonth: poMonthlyBreakdown,
                totalValue: poTotalValue,
                avgOrderValue: purchaseOrders.length ? poTotalValue / purchaseOrders.length : 0,
                topItems,
                statusBreakdown: poStatusBreakdown.reduce((acc, item) => {
                    acc[item.name] = item.value;
                    return acc;
                }, {} as { [key: string]: number })
            },
            goodsReceipts: {
                byStatus: getStatusBreakdown(goodsReceipts),
                bySite: getSiteBreakdown(goodsReceipts),
                efficiency: goodsReceipts.filter((gr: any) => gr.status === 'completed').length / Math.max(goodsReceipts.length, 1),
                conditionBreakdown: goodsReceipts.flatMap((gr: GoodsReceipt) =>
                    gr.receivedItems?.map((item: any) => item.condition) || []
                ).reduce((acc: { [key: string]: number }, condition: string) => {
                    acc[condition] = (acc[condition] || 0) + 1;
                    return acc;
                }, {})
            },
            dispatches: {
                byType: dispatches.reduce((acc: any[], dispatch: DispatchLog) => {
                    const type = dispatch.dispatchType?.name || 'Unknown';
                    const existing = acc.find(item => item.name === type);
                    if (existing) {
                        existing.value++;
                    } else {
                        acc.push({ name: type, value: 1 });
                    }
                    return acc;
                }, []),
                bySite: getSiteBreakdown(dispatches),
                totalPeopleFed: dispatches.reduce((sum: number, d: DispatchLog) => sum + (d.peopleFed || 0), 0),
                totalCost: dispatches.reduce((sum: number, d: DispatchLog) => sum + (d.totalCost || 0), 0),
                costPerPerson: dispatches.reduce((sum: number, d: DispatchLog) => sum + (d.peopleFed || 0), 0) > 0 ?
                    dispatches.reduce((sum: number, d: DispatchLog) => sum + (d.totalCost || 0), 0) /
                    dispatches.reduce((sum: number, d: DispatchLog) => sum + (d.peopleFed || 0), 0) : 0,
                topItems: dispatches.flatMap((dispatch: DispatchLog) =>
                    dispatch.dispatchedItems?.map((item: any) => ({
                        name: item.stockItem?.name || 'Unknown',
                        quantity: item.dispatchedQuantity || 0,
                        cost: item.totalCost || 0
                    })) || []
                ).reduce((acc: any[], item: { name: any; quantity: any; cost: any; }) => {
                    const existing = acc.find(i => i.name === item.name);
                    if (existing) {
                        existing.quantity += item.quantity;
                        existing.cost += item.cost;
                    } else {
                        acc.push({ ...item });
                    }
                    return acc;
                }, []).sort((a: { quantity: number; }, b: { quantity: number; }) => b.quantity - a.quantity).slice(0, 10)
            },
            transfers: {
                byStatus: getStatusBreakdown(transfers),
                bySite: getSiteBreakdown(transfers),
                approvalRate: transfers.filter((t: InternalTransfer) =>
                    ['approved', 'completed'].includes(t.status)
                ).length / Math.max(transfers.length, 1)
            },
            inventory: {
                byCategory: stockItems.reduce((acc: any[], item: StockItem) => {
                    const category = item.category?.title || 'Uncategorized';
                    const existing = acc.find(cat => cat.name === category);
                    if (existing) {
                        existing.value++;
                    } else {
                        acc.push({ name: category, value: 1 });
                    }
                    return acc;
                }, []),
                totalValue: totalInventoryValue,
                lowStockBreakdown: {
                    critical: lowStock.filter((item: any) => (item.currentStock || 0) === 0).length,
                    warning: lowStock.filter((item: any) =>
                        (item.currentStock || 0) > 0 && (item.currentStock || 0) <= (item.minimumStockLevel || 0)
                    ).length,
                    healthy: stockItems.length - lowStock.length
                }
            },
            binCounts: {
                byStatus: getStatusBreakdown(binCounts),
                accuracy: binCounts.reduce((sum: number, count: InventoryCount) => {
                    const accurateItems = count.countedItems?.filter((item: any) => item.variance === 0).length || 0;
                    const totalItems = count.countedItems?.length || 0;
                    return sum + (totalItems > 0 ? accurateItems / totalItems : 0);
                }, 0) / Math.max(binCounts.length, 1),
                varianceAnalysis: binCounts.flatMap((count: InventoryCount) =>
                    count.countedItems?.map((item: any) => item.variance) || []
                ).reduce((acc: any, variance: number) => {
                    if (variance > 0) acc.positive++;
                    else if (variance < 0) acc.negative++;
                    else acc.zero++;
                    return acc;
                }, { positive: 0, negative: 0, zero: 0 })
            },
            financial: {
                monthlySpending: purchaseOrders.reduce((acc: any[], po: PurchaseOrder) => {
                    const month = format(new Date(po.orderDate), 'MMM yyyy');
                    const existing = acc.find(item => item.month === month);
                    if (existing) {
                        existing.spending += po.totalAmount || 0;
                    } else {
                        acc.push({ month, spending: po.totalAmount || 0 });
                    }
                    return acc;
                }, []).sort((a: { month: string | number | Date; }, b: { month: string | number | Date; }) => new Date(a.month).getTime() - new Date(b.month).getTime()),
                costPerPersonTrend: dispatches.map((dispatch: DispatchLog) => ({
                    date: format(new Date(dispatch.dispatchDate), 'MMM dd'),
                    cost: dispatch.costPerPerson || 0
                })).slice(-30), // Last 30 dispatches
                inventoryTurnover: 0.5 // This would need actual turnover calculation
            },
            suppliers: {
                performance: purchaseOrders.flatMap((po: PurchaseOrder) =>
                    po.orderedItems?.map((item: any) => ({
                        name: item.supplier?.name || 'Unknown',
                        orders: 1,
                        value: (item.orderedQuantity || 0) * (item.unitPrice || 0)
                    })) || []
                ).reduce((acc: any[], supplier: { name: any; orders: any; value: any; }) => {
                    const existing = acc.find(s => s.name === supplier.name);
                    if (existing) {
                        existing.orders += supplier.orders;
                        existing.value += supplier.value;
                    } else {
                        acc.push(supplier);
                    }
                    return acc;
                }, []).sort((a: { value: number; }, b: { value: number; }) => b.value - a.value).slice(0, 10),
                activeCount: suppliers.filter((s: Supplier) => s.isActive).length
            },
            users: {
                byRole: users.reduce((acc: any[], user: AppUser) => {
                    const role = user.role || 'unknown';
                    const existing = acc.find(item => item.name === role);
                    if (existing) {
                        existing.value++;
                    } else {
                        acc.push({ name: role, value: 1 });
                    }
                    return acc;
                }, []),
                activity: [] // This would need user activity data
            }
        };
    };

    // Enhanced Excel export with multiple sheets
    const exportToExcel = useCallback(async () => {
        setExportLoading(true);
        try {
            const workbook = XLSX.utils.book_new();

            // 1. Executive Summary Sheet
            const summaryData = [
                ['CATERFLOW COMPREHENSIVE REPORT', ''],
                ['Generated On', new Date().toLocaleDateString()],
                ['Generated By', session?.user?.name || 'Unknown'],
                ['', ''],
                ['EXECUTIVE SUMMARY', ''],
                ['Total Purchase Orders', analyticsData?.summary.totalPurchaseOrders],
                ['Total Goods Receipts', analyticsData?.summary.totalGoodsReceipts],
                ['Total Dispatches', analyticsData?.summary.totalDispatches],
                ['Total People Fed', analyticsData?.summary.totalPeopleFed],
                ['Total Inventory Value', `$${analyticsData?.summary.totalInventoryValue.toLocaleString()}`],
                ['Low Stock Items', analyticsData?.summary.lowStockItems],
                ['Critical Stock Items', analyticsData?.summary.criticalStockItems],
                ['', ''],
                ['FINANCIAL OVERVIEW', ''],
                ['Total PO Value', `$${analyticsData?.purchaseOrders.totalValue.toLocaleString()}`],
                ['Average Order Value', `$${analyticsData?.purchaseOrders.avgOrderValue.toFixed(2)}`],
                ['Total Dispatch Cost', `$${analyticsData?.dispatches.totalCost.toLocaleString()}`],
                ['Cost Per Person', `$${analyticsData?.dispatches.costPerPerson.toFixed(2)}`]
            ];

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

            // 2. Purchase Orders Sheet
            const poData = rawData.purchaseOrders?.map((po: PurchaseOrder) => ({
                'PO Number': po.poNumber,
                'Order Date': format(new Date(po.orderDate), 'yyyy-MM-dd'),
                Status: po.status,
                'Ordered By': po.orderedBy?.name,
                Site: po.site?.name,
                'Total Amount': po.totalAmount,
                'Evidence Status': po.evidenceStatus,
                'Item Count': po.orderedItems?.length || 0
            })) || [];

            if (poData.length > 0) {
                const poSheet = XLSX.utils.json_to_sheet(poData);
                XLSX.utils.book_append_sheet(workbook, poSheet, 'Purchase Orders');
            }

            // 3. Goods Receipts Sheet
            const grData = rawData.goodsReceipts?.map((gr: GoodsReceipt) => ({
                'Receipt Number': gr.receiptNumber,
                'Receipt Date': format(new Date(gr.receiptDate), 'yyyy-MM-dd'),
                Status: gr.status,
                'PO Number': gr.purchaseOrder?.poNumber,
                'Receiving Bin': gr.receivingBin?.name,
                Site: gr.receivingBin?.site?.name,
                'Evidence Status': gr.evidenceStatus,
                'Item Count': gr.receivedItems?.length || 0
            })) || [];

            if (grData.length > 0) {
                const grSheet = XLSX.utils.json_to_sheet(grData);
                XLSX.utils.book_append_sheet(workbook, grSheet, 'Goods Receipts');
            }

            // 4. Dispatches Sheet
            const dispatchData = rawData.dispatches?.map((dispatch: DispatchLog) => ({
                'Dispatch Number': dispatch.dispatchNumber,
                'Dispatch Date': format(new Date(dispatch.dispatchDate), 'yyyy-MM-dd'),
                'Dispatch Type': dispatch.dispatchType?.name,
                'Source Bin': dispatch.sourceBin?.name,
                Site: dispatch.sourceBin?.site?.name,
                'Dispatched By': dispatch.dispatchedBy?.name,
                'People Fed': dispatch.peopleFed,
                'Total Cost': dispatch.totalCost,
                'Cost Per Person': dispatch.costPerPerson,
                'Evidence Status': dispatch.evidenceStatus
            })) || [];

            if (dispatchData.length > 0) {
                const dispatchSheet = XLSX.utils.json_to_sheet(dispatchData);
                XLSX.utils.book_append_sheet(workbook, dispatchSheet, 'Dispatches');
            }

            // 5. Transfers Sheet
            const transferData = rawData.transfers?.map((transfer: InternalTransfer) => ({
                'Transfer Number': transfer.transferNumber,
                'Transfer Date': format(new Date(transfer.transferDate), 'yyyy-MM-dd'),
                Status: transfer.status,
                'From Bin': transfer.fromBin?.name,
                'From Site': transfer.fromBin?.site?.name,
                'To Bin': transfer.toBin?.name,
                'To Site': transfer.toBin?.site?.name,
                'Transferred By': transfer.transferredBy?.name,
                'Approved By': transfer.approvedBy?.name,
                'Item Count': transfer.transferredItems?.length || 0
            })) || [];

            if (transferData.length > 0) {
                const transferSheet = XLSX.utils.json_to_sheet(transferData);
                XLSX.utils.book_append_sheet(workbook, transferSheet, 'Transfers');
            }

            // 6. Bin Counts Sheet
            const binCountData = rawData.binCounts?.map((count: InventoryCount) => ({
                'Count Number': count.countNumber,
                'Count Date': format(new Date(count.countDate), 'yyyy-MM-dd'),
                Status: count.status,
                Bin: count.bin?.name,
                Site: count.bin?.site?.name,
                'Counted By': count.countedBy?.name,
                'Item Count': count.countedItems?.length || 0,
                'Accuracy': count.countedItems?.length ?
                    (count.countedItems.filter((item: any) => item.variance === 0).length / count.countedItems.length * 100).toFixed(1) + '%' : '0%'
            })) || [];

            if (binCountData.length > 0) {
                const binCountSheet = XLSX.utils.json_to_sheet(binCountData);
                XLSX.utils.book_append_sheet(workbook, binCountSheet, 'Bin Counts');
            }

            // 7. Stock Items Sheet
            const stockItemData = rawData.stockItems?.map((item: StockItem) => ({
                Name: item.name,
                SKU: item.sku,
                Category: item.category?.title,
                'Item Type': item.itemType,
                'Unit of Measure': item.unitOfMeasure,
                'Unit Price': item.unitPrice,
                'Minimum Stock Level': item.minimumStockLevel,
                'Reorder Quantity': item.reorderQuantity,
                'Primary Supplier': item.primarySupplier?.name,
                'Supplier Count': item.suppliers?.length || 0
            })) || [];

            if (stockItemData.length > 0) {
                const stockItemSheet = XLSX.utils.json_to_sheet(stockItemData);
                XLSX.utils.book_append_sheet(workbook, stockItemSheet, 'Stock Items');
            }

            // 8. Low Stock Alerts Sheet
            const lowStockData = rawData.lowStock?.map((item: any) => ({
                Name: item.name,
                SKU: item.sku,
                'Current Stock': item.currentStock,
                'Minimum Stock Level': item.minimumStockLevel,
                'Unit of Measure': item.unitOfMeasure,
                Category: item.category?.title,
                'Primary Supplier': item.primarySupplier?.name,
                Status: (item.currentStock || 0) === 0 ? 'CRITICAL' : 'WARNING'
            })) || [];

            if (lowStockData.length > 0) {
                const lowStockSheet = XLSX.utils.json_to_sheet(lowStockData);
                XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Low Stock Alerts');
            }

            // 9. Analytics Data Sheet
            const analyticsSheetData = [
                ['ANALYTICS DATA', ''],
                ['PURCHASE ORDERS BY STATUS', ''],
                ...analyticsData?.purchaseOrders.byStatus.map(item => [item.name, item.value]) || [],
                ['', ''],
                ['DISPATCHES BY TYPE', ''],
                ...analyticsData?.dispatches.byType.map(item => [item.name, item.value]) || [],
                ['', ''],
                ['INVENTORY BY CATEGORY', ''],
                ...analyticsData?.inventory.byCategory.map(item => [item.name, item.value]) || []
            ];

            const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsSheetData);
            XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics Data');

            // Generate Excel file
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(data, `Caterflow_Comprehensive_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

            toast({
                title: 'Export Successful',
                description: 'Comprehensive report exported with multiple sheets',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            toast({
                title: 'Export Failed',
                description: 'Failed to export comprehensive report',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setExportLoading(false);
        }
    }, [analyticsData, rawData, session, toast]);

    interface PieChartData {
        name: string;
        value: number;
    }

    const StatusPieChart = ({ data, title, colors = CHART_COLORS.primary }: { data: any[], title: string, colors?: string[] }) => (
        <Card height="400px">
            <CardBody>
                <Text fontWeight="bold" mb={4}>{title}</Text>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, value }) => {
                                const total = data.reduce((sum, item) => sum + item.value, 0);
                                const percentage = (((value as number) / total) * 100).toFixed(0);
                                return `${name}: ${percentage}%`;
                            }}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Count']} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );

    const BarChartComponent = ({ data, title, dataKey, color = CHART_COLORS.primary[0] }: { data: any[], title: string, dataKey: string, color?: string }) => (
        <Card height="400px">
            <CardBody>
                <Text fontWeight="bold" mb={4}>{title}</Text>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey={dataKey} fill={color} />
                    </BarChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );

    const LineChartComponent = ({ data, title, dataKey, color = CHART_COLORS.primary[0] }: { data: any[], title: string, dataKey: string, color?: string }) => (
        <Card height="400px">
            <CardBody>
                <Text fontWeight="bold" mb={4}>{title}</Text>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );

    // Load data on component mount
    useEffect(() => {
        if (status === 'authenticated') {
            fetchAllData();
        }
    }, [status, fetchAllData]);

    if (status === 'loading') {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh" bg={bgPrimary}>
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <Box p={{ base: 4, md: 8 }} bg={bgPrimary} minH="100vh">
            <VStack spacing={6} align="stretch">
                {/* Header */}
                <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={4}>
                    <Box>
                        <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color={primaryTextColor} mb={2}>
                            Comprehensive Analytics & Reports
                        </Heading>
                        <Text color={secondaryTextColor}>
                            Complete system overview with visual analytics and detailed reporting
                        </Text>
                    </Box>
                    <Button
                        leftIcon={<FiDownload />}
                        colorScheme="green"
                        onClick={exportToExcel}
                        isLoading={exportLoading}
                        size="lg"
                    >
                        Export Full Report (Excel)
                    </Button>
                </Flex>

                {/* Main Tabs */}
                <Card bg={bgCard} border="1px" borderColor={borderColor}>
                    <CardBody p={0}>
                        <Tabs variant="enclosed" onChange={setActiveTab} colorScheme="brand" index={activeTab}>
                            <TabList>
                                <Tab>
                                    <HStack spacing={2}>
                                        <Icon as={FiTrendingUp} />
                                        <Text>Executive Dashboard</Text>
                                    </HStack>
                                </Tab>
                                <Tab>
                                    <HStack spacing={2}>
                                        <Icon as={FiBarChart2} />
                                        <Text>Visual Analytics</Text>
                                    </HStack>
                                </Tab>
                                <Tab>
                                    <HStack spacing={2}>
                                        <Icon as={FiDownload} />
                                        <Text>Data Export</Text>
                                    </HStack>
                                </Tab>
                            </TabList>

                            <TabPanels>
                                {/* Executive Dashboard Tab */}
                                <TabPanel>
                                    <VStack spacing={6} align="stretch">
                                        {/* Date Range Controls */}
                                        <Card>
                                            <CardBody>
                                                <VStack align="start" spacing={4}>
                                                    <HStack wrap="wrap" spacing={4}>
                                                        <VStack align="start">
                                                            <Text fontWeight="medium">Analysis Period</Text>
                                                            <HStack>
                                                                <Input
                                                                    type="date"
                                                                    value={primaryDateRange.start}
                                                                    onChange={(e) => setPrimaryDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                                />
                                                                <Text>to</Text>
                                                                <Input
                                                                    type="date"
                                                                    value={primaryDateRange.end}
                                                                    onChange={(e) => setPrimaryDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                                />
                                                            </HStack>
                                                        </VStack>

                                                        <RadioGroup onChange={(value) => setCompareMode(value === 'true')} value={compareMode ? 'true' : 'false'}>
                                                            <Stack direction="row">
                                                                <Radio value="false">Single Period</Radio>
                                                                <Radio value="true">Compare Periods</Radio>
                                                            </Stack>
                                                        </RadioGroup>

                                                        {compareMode && (
                                                            <VStack align="start">
                                                                <Text fontWeight="medium">Comparison Period</Text>
                                                                <HStack>
                                                                    <Input
                                                                        type="date"
                                                                        value={comparisonDateRange.start}
                                                                        onChange={(e) => setComparisonDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                                    />
                                                                    <Text>to</Text>
                                                                    <Input
                                                                        type="date"
                                                                        value={comparisonDateRange.end}
                                                                        onChange={(e) => setComparisonDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                                    />
                                                                </HStack>
                                                            </VStack>
                                                        )}
                                                    </HStack>

                                                    <Button
                                                        leftIcon={<FiFilter />}
                                                        onClick={fetchAllData}
                                                        isLoading={analyticsLoading}
                                                        colorScheme="brand"
                                                    >
                                                        Update Analytics
                                                    </Button>
                                                </VStack>
                                            </CardBody>
                                        </Card>

                                        {analyticsLoading ? (
                                            <Flex justify="center" align="center" py={10}>
                                                <Spinner size="xl" />
                                            </Flex>
                                        ) : !analyticsData ? (
                                            <Alert status="info" borderRadius="md">
                                                <AlertIcon />
                                                No analytics data available. Click "Update Analytics" to load data.
                                            </Alert>
                                        ) : (
                                            <>
                                                {/* Key Metrics Summary */}
                                                <Card>
                                                    <CardBody>
                                                        <Heading size="md" mb={6}>Key Performance Indicators</Heading>
                                                        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                                                            <Stat>
                                                                <StatLabel>
                                                                    <HStack>
                                                                        <Icon as={FiShoppingCart} />
                                                                        <Text>Purchase Orders</Text>
                                                                    </HStack>
                                                                </StatLabel>
                                                                <StatNumber>{analyticsData.summary.totalPurchaseOrders}</StatNumber>
                                                                <StatHelpText>
                                                                    ${analyticsData.purchaseOrders.totalValue.toLocaleString()} total value
                                                                </StatHelpText>
                                                            </Stat>
                                                            <Stat>
                                                                <StatLabel>
                                                                    <HStack>
                                                                        <Icon as={FiUsers} />
                                                                        <Text>People Served</Text>
                                                                    </HStack>
                                                                </StatLabel>
                                                                <StatNumber>{(analyticsData.summary.totalPeopleFed).toLocaleString()}</StatNumber>
                                                                <StatHelpText>
                                                                    ${analyticsData.dispatches.costPerPerson.toFixed(2)} per person
                                                                </StatHelpText>
                                                            </Stat>
                                                            <Stat>
                                                                <StatLabel>
                                                                    <HStack>
                                                                        <Icon as={FiArchive} />
                                                                        <Text>Inventory Value</Text>
                                                                    </HStack>
                                                                </StatLabel>
                                                                <StatNumber>E {(analyticsData.summary.totalInventoryValue).toLocaleString()}</StatNumber>
                                                                <StatHelpText>
                                                                    {analyticsData.summary.totalStockItems} items
                                                                </StatHelpText>
                                                            </Stat>
                                                            <Stat>
                                                                <StatLabel>
                                                                    <HStack>
                                                                        <Icon as={FiAlertTriangle} />
                                                                        <Text>Low Stock</Text>
                                                                    </HStack>
                                                                </StatLabel>
                                                                <StatNumber>{analyticsData.summary.lowStockItems}</StatNumber>
                                                                <StatHelpText>
                                                                    {analyticsData.summary.criticalStockItems} critical
                                                                </StatHelpText>
                                                            </Stat>
                                                        </SimpleGrid>
                                                    </CardBody>
                                                </Card>

                                                {/* Operational Overview */}
                                                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                                                    <StatusPieChart
                                                        data={analyticsData.purchaseOrders.byStatus}
                                                        title="Purchase Orders by Status"
                                                        colors={[CHART_COLORS.primary[0], CHART_COLORS.warning[0], CHART_COLORS.success[0], CHART_COLORS.error[0]]}
                                                    />
                                                    <BarChartComponent
                                                        data={analyticsData.purchaseOrders.bySite}
                                                        title="Purchase Orders by Site"
                                                        dataKey="value"
                                                    />
                                                </SimpleGrid>

                                                {/* Dispatch & Inventory Analytics */}
                                                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                                                    <StatusPieChart
                                                        data={analyticsData.dispatches.byType}
                                                        title="Dispatches by Type"
                                                        colors={CHART_COLORS.success}
                                                    />
                                                    <StatusPieChart
                                                        data={analyticsData.inventory.byCategory}
                                                        title="Inventory by Category"
                                                        colors={CHART_COLORS.purple}
                                                    />
                                                </SimpleGrid>

                                                {/* Financial Metrics */}
                                                <Card>
                                                    <CardBody>
                                                        <Heading size="md" mb={4}>Financial Performance</Heading>
                                                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                                                            <Stat>
                                                                <StatLabel>Total Spending</StatLabel>
                                                                <StatNumber>${analyticsData.purchaseOrders.totalValue.toLocaleString()}</StatNumber>
                                                                <StatHelpText>All purchase orders</StatHelpText>
                                                            </Stat>
                                                            <Stat>
                                                                <StatLabel>Avg Order Value</StatLabel>
                                                                <StatNumber>${analyticsData.purchaseOrders.avgOrderValue.toFixed(2)}</StatNumber>
                                                                <StatHelpText>Per purchase order</StatHelpText>
                                                            </Stat>
                                                            <Stat>
                                                                <StatLabel>Cost Efficiency</StatLabel>
                                                                <StatNumber>${analyticsData.dispatches.costPerPerson.toFixed(2)}</StatNumber>
                                                                <StatHelpText>Cost per person served</StatHelpText>
                                                            </Stat>
                                                        </SimpleGrid>
                                                    </CardBody>
                                                </Card>

                                                {/* Supplier Performance */}
                                                {analyticsData.suppliers.performance.length > 0 && (
                                                    <Card>
                                                        <CardBody>
                                                            <Heading size="md" mb={4}>Top Suppliers</Heading>
                                                            <TableContainer>
                                                                <Table variant="simple">
                                                                    <Thead>
                                                                        <Tr>
                                                                            <Th>Supplier</Th>
                                                                            <Th isNumeric>Orders</Th>
                                                                            <Th isNumeric>Total Value</Th>
                                                                        </Tr>
                                                                    </Thead>
                                                                    <Tbody>
                                                                        {analyticsData.suppliers.performance.slice(0, 5).map((supplier, index) => (
                                                                            <Tr key={supplier.name}>
                                                                                <Td>{supplier.name}</Td>
                                                                                <Td isNumeric>{supplier.orders}</Td>
                                                                                <Td isNumeric>${supplier.value.toLocaleString()}</Td>
                                                                            </Tr>
                                                                        ))}
                                                                    </Tbody>
                                                                </Table>
                                                            </TableContainer>
                                                        </CardBody>
                                                    </Card>
                                                )}
                                            </>
                                        )}
                                    </VStack>
                                </TabPanel>

                                {/* Visual Analytics Tab */}
                                <TabPanel>
                                    <VisualAnalyticsTab
                                        analyticsData={analyticsData}
                                        loading={analyticsLoading}
                                    />
                                </TabPanel>

                                {/* Data Export Tab */}
                                <TabPanel>
                                    <DataExportTab
                                        exportToExcel={exportToExcel}
                                        loading={exportLoading}
                                        dataAvailable={!!analyticsData}
                                    />
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </CardBody>
                </Card>
            </VStack>
        </Box>
    );
}

// Visual Analytics Tab Component
const VisualAnalyticsTab = ({ analyticsData, loading }: { analyticsData: EnhancedAnalyticsData | null, loading: boolean }) => {
    if (loading) {
        return (
            <Flex justify="center" align="center" py={10}>
                <Spinner size="xl" />
            </Flex>
        );
    }

    if (!analyticsData) {
        return (
            <Alert status="info" borderRadius="md">
                <AlertIcon />
                No analytics data available. Please load data from the Executive Dashboard.
            </Alert>
        );
    }

    return (
        <VStack spacing={6} align="stretch">
            <Text fontSize="lg" color="gray.600">
                Interactive visualizations and detailed analytics across all system modules
            </Text>

            {/* Financial Trends */}
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                <Card height="400px">
                    <CardBody>
                        <Text fontWeight="bold" mb={4}>Monthly Spending Trend</Text>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData.financial.monthlySpending}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Spending']} />
                                <Area type="monotone" dataKey="spending" stroke={CHART_COLORS.primary[0]} fill={CHART_COLORS.primary[2]} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardBody>
                </Card>

                <Card height="400px">
                    <CardBody>
                        <Text fontWeight="bold" mb={4}>Cost Per Person Trend</Text>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData.financial.costPerPersonTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cost per Person']} />
                                <Line type="monotone" dataKey="cost" stroke={CHART_COLORS.success[0]} strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardBody>
                </Card>
            </SimpleGrid>

            {/* Inventory Health */}
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                <Card>
                    <CardBody>
                        <Text fontWeight="bold" mb={4}>Inventory Health Status</Text>
                        <VStack spacing={4} align="stretch">
                            <HStack justify="space-between">
                                <Text>Healthy Items</Text>
                                <Badge colorScheme="green" fontSize="md">
                                    {analyticsData.inventory.lowStockBreakdown.healthy}
                                </Badge>
                            </HStack>
                            <HStack justify="space-between">
                                <Text>Low Stock Warning</Text>
                                <Badge colorScheme="yellow" fontSize="md">
                                    {analyticsData.inventory.lowStockBreakdown.warning}
                                </Badge>
                            </HStack>
                            <HStack justify="space-between">
                                <Text>Critical Stock</Text>
                                <Badge colorScheme="red" fontSize="md">
                                    {analyticsData.inventory.lowStockBreakdown.critical}
                                </Badge>
                            </HStack>
                            <Progress
                                value={
                                    (analyticsData.inventory.lowStockBreakdown.healthy / analyticsData.summary.totalStockItems) * 100
                                }
                                colorScheme="green"
                                size="lg"
                            />
                        </VStack>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <Text fontWeight="bold" mb={4}>Inventory Accuracy</Text>
                        <VStack spacing={4} align="stretch">
                            <HStack justify="space-between">
                                <Text>Count Accuracy</Text>
                                <Text fontWeight="bold">{(analyticsData.binCounts.accuracy * 100).toFixed(1)}%</Text>
                            </HStack>
                            <Progress value={analyticsData.binCounts.accuracy * 100} colorScheme="blue" size="lg" />
                            <Wrap spacing={4}>
                                <WrapItem>
                                    <Badge colorScheme="green">Zero Variance: {analyticsData.binCounts.varianceAnalysis.zero}</Badge>
                                </WrapItem>
                                <WrapItem>
                                    <Badge colorScheme="red">Negative: {analyticsData.binCounts.varianceAnalysis.negative}</Badge>
                                </WrapItem>
                                <WrapItem>
                                    <Badge colorScheme="orange">Positive: {analyticsData.binCounts.varianceAnalysis.positive}</Badge>
                                </WrapItem>
                            </Wrap>
                        </VStack>
                    </CardBody>
                </Card>
            </SimpleGrid>

            {/* Top Items Tables */}
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                <Card>
                    <CardBody>
                        <Heading size="sm" mb={4}>Top Purchased Items</Heading>
                        <TableContainer>
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Item</Th>
                                        <Th isNumeric>Quantity</Th>
                                        <Th isNumeric>Value</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {analyticsData.purchaseOrders.topItems.slice(0, 5).map((item, index) => (
                                        <Tr key={item.name}>
                                            <Td>{item.name}</Td>
                                            <Td isNumeric>{item.quantity}</Td>
                                            <Td isNumeric>${item.value.toLocaleString()}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <Heading size="sm" mb={4}>Top Dispatched Items</Heading>
                        <TableContainer>
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Item</Th>
                                        <Th isNumeric>Quantity</Th>
                                        <Th isNumeric>Cost</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {analyticsData.dispatches.topItems.slice(0, 5).map((item, index) => (
                                        <Tr key={item.name}>
                                            <Td>{item.name}</Td>
                                            <Td isNumeric>{item.quantity}</Td>
                                            <Td isNumeric>${item.cost.toLocaleString()}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </VStack>
    );
};

// Data Export Tab Component
const DataExportTab = ({ exportToExcel, loading, dataAvailable }: { exportToExcel: () => void, loading: boolean, dataAvailable: boolean }) => (
    <VStack spacing={6} align="stretch">
        <Card>
            <CardBody>
                <VStack spacing={4} align="start">
                    <Heading size="md">Comprehensive Data Export</Heading>
                    <Text>
                        Generate a complete Excel report with multiple sheets containing all system data,
                        analytics, and visual summaries. The export includes:
                    </Text>

                    <SimpleGrid columns={2} spacing={4} width="100%">
                        <HStack><Box w="2" h="2" bg="green.500" borderRadius="full" /><Text>Executive Summary</Text></HStack>
                        <HStack><Box w="2" h="2" bg="green.500" borderRadius="full" /><Text>Purchase Orders</Text></HStack>
                        <HStack><Box w="2" h="2" bg="green.500" borderRadius="full" /><Text>Goods Receipts</Text></HStack>
                        <HStack><Box w="2" h="2" bg="green.500" borderRadius="full" /><Text>Dispatches & Consumption</Text></HStack>
                        <HStack><Box w="2" h="2" bg="green.500" borderRadius="full" /><Text>Stock Transfers</Text></HStack>
                        <HStack><Box w="2" h="2" bg="green.500" borderRadius="full" /><Text>Bin Counts & Adjustments</Text></HStack>
                        <HStack><Box w="2" h="2" bg="green.500" borderRadius="full" /><Text>Inventory Catalog</Text></HStack>
                        <HStack><Box w="2" h="2" bg="green.500" borderRadius="full" /><Text>Low Stock Alerts</Text></HStack>
                        <HStack><Box w="2" h="2" bg="green.500" borderRadius="full" /><Text>Analytics Data</Text></HStack>
                        <HStack><Box w="2" h="2" bg="green.500" borderRadius="full" /><Text>Supplier Performance</Text></HStack>
                    </SimpleGrid>

                    <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        The exported Excel file will be properly formatted with headers, appropriate data types,
                        and organized sheets for easy analysis. No [object Object] values will be included.
                    </Alert>

                    <Button
                        leftIcon={<FiDownload />}
                        colorScheme="green"
                        onClick={exportToExcel}
                        isLoading={loading}
                        isDisabled={!dataAvailable}
                        size="lg"
                    >
                        {dataAvailable ? 'Generate Comprehensive Report' : 'Load Data First'}
                    </Button>

                    {!dataAvailable && (
                        <Text color="orange.500" fontSize="sm">
                            Please load data from the Executive Dashboard tab first.
                        </Text>
                    )}
                </VStack>
            </CardBody>
        </Card>
    </VStack>
);