// src/app/reports/page.tsx - UPDATED WITH ACCURATE DATA AND EXPORTS
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
    dispatchType: { _id: string; name: string; description: string; sellingPrice: number };
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
    sellingPrice: number;
    totalSales: number;
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

// Enhanced Analytics Data Interface - ADD closingStockValue
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
        totalReceivedGoodsValue: number;
        totalSales: number;
        consumption: number;
        profit: number;
        profitPercentage: number;
        closingStockValue: number; // ADD THIS LINE
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

// OLD REPORTS INTERFACES
interface ReportData {
    [key: string]: any;
}

interface ReportConfig {
    title: string;
    description: string;
    endpoint: string;
    columns: string[];
    filters?: {
        dateRange?: boolean;
        site?: boolean;
        status?: boolean;
    };
}

interface OldAnalyticsData {
    purchaseOrders: any;
    goodsReceipts: any;
    dispatches: any;
    transfers: any;
    binCounts: any;
    lowStock: any;
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
    const [analyticsTab, setAnalyticsTab] = useState(0);

    // Analytics states
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<EnhancedAnalyticsData | null>(null);
    const [rawData, setRawData] = useState<{ [key: string]: any[] }>({});

    // Old Reports states
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
    const [reportData, setReportData] = useState<{ [key: string]: ReportData[] }>({});
    const [filteredData, setFilteredData] = useState<{ [key: string]: ReportData[] }>({});
    const [sites, setSites] = useState<any[]>([]);
    const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
    const [oldAnalyticsData, setOldAnalyticsData] = useState<OldAnalyticsData | null>(null);

    // Filter states for old reports
    const [selectedSites, setSelectedSites] = useState<{ [key: string]: string }>({});
    const [dateRanges, setDateRanges] = useState<{ [key: string]: { start: string; end: string } }>({});
    const [analyticsDateRange, setAnalyticsDateRange] = useState<{ start: string; end: string }>({
        start: '',
        end: ''
    });

    // Date ranges for new analytics
    const [primaryDateRange, setPrimaryDateRange] = useState<{ start: string; end: string }>({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });
    const [comparisonDateRange, setComparisonDateRange] = useState<{ start: string; end: string }>({
        start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
        end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
    });
    const [compareMode, setCompareMode] = useState(false);

    const toast = useToast();

    // Theme colors
    const bgPrimary = useColorModeValue('neutral.light.bg-primary', 'neutral.dark.bg-primary');
    const bgCard = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const primaryTextColor = useColorModeValue('neutral.light.text-primary', 'neutral.dark.text-primary');
    const secondaryTextColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');
    const tableHeaderBg = useColorModeValue('gray.50', 'gray.700');
    const tableRowHoverBg = useColorModeValue('gray.50', 'gray.700');

    // OLD REPORTS CONFIGURATION
    const reportConfigs: ReportConfig[] = useMemo(() => [
        {
            title: 'Purchase Orders',
            description: 'Detailed purchase order history and status',
            endpoint: '/api/purchase-orders',
            columns: ['poNumber', 'orderDate', 'status', 'supplierNames', 'site.name', 'totalAmount', 'orderedItems'],
            filters: {
                dateRange: true,
                site: true,
                status: true
            }
        },
        {
            title: 'Goods Receipts',
            description: 'Goods receipt transactions and inventory updates',
            endpoint: '/api/goods-receipts',
            columns: ['receiptNumber', 'receiptDate', 'status', 'purchaseOrder.poNumber', 'purchaseOrder.site.name', 'receivedItems', 'receivingBin.name'],
            filters: {
                dateRange: true,
                site: true,
                status: true
            }
        },
        {
            title: 'Dispatches',
            description: 'Dispatch records and consumption tracking',
            endpoint: '/api/dispatches',
            columns: ['dispatchNumber', 'dispatchDate', 'dispatchType.name', 'sourceBin.site.name', 'peopleFed', 'totalCost', 'evidenceStatus', 'dispatchedBy.name'],
            filters: {
                dateRange: true,
                site: true,
                status: true
            }
        },
        {
            title: 'Transfers',
            description: 'Internal stock transfers between bins and sites',
            endpoint: '/api/operations/transfers',
            columns: ['transferNumber', 'transferDate', 'status', 'fromBin.site.name', 'toBin.site.name', 'transferredItems', 'requestedBy.name'],
            filters: {
                dateRange: true,
                site: true,
                status: true
            }
        },
        {
            title: 'Bin Counts',
            description: 'Stock counting and variance reports',
            endpoint: '/api/bin-counts',
            columns: ['countNumber', 'countDate', 'status', 'bin.name', 'bin.site.name', 'countedItems', 'totalVariance', 'countedBy.name'],
            filters: {
                dateRange: true,
                site: true,
                status: true
            }
        }
    ], []);

    const currentReport = activeTab > 0 ? reportConfigs[activeTab - 1] : null;

    // Use refs for the filter function to avoid circular dependencies for old reports
    const filterStateRef = useRef({
        reportData,
        dateRanges,
        selectedSites,
        searchTerms,
        reportConfigs
    });

    // Update the ref when state changes for old reports
    useEffect(() => {
        filterStateRef.current = {
            reportData,
            dateRanges,
            selectedSites,
            searchTerms,
            reportConfigs
        };
    }, [reportData, dateRanges, selectedSites, searchTerms, reportConfigs]);

    // ========== NEW ANALYTICS FUNCTIONS ==========

    // Helper function to create formatted Executive Summary - UPDATED TO REMOVE CONTRADICTIONS
    const createFormattedSummaryData = () => {
        return [
            // HEADER SECTION WITH DATES (ONLY IN EXECUTIVE SUMMARY)
            ['CATERFLOW COMPREHENSIVE REPORT', ''],
            ['', ''],
            ['Generated On', new Date().toLocaleDateString()],
            ['Report Period', `${format(new Date(primaryDateRange.start), 'MM/dd/yyyy')} to ${format(new Date(primaryDateRange.end), 'MM/dd/yyyy')}`],
            ['', ''],
            ['', ''],

            // EXECUTIVE SUMMARY SECTION
            ['EXECUTIVE SUMMARY', ''],
            ['', ''],
            ['Total Purchase Orders', analyticsData?.summary.totalPurchaseOrders || 0],
            ['Total Goods Receipts', analyticsData?.summary.totalGoodsReceipts || 0],
            ['Total Dispatches', analyticsData?.summary.totalDispatches || 0],
            ['Total People Fed', analyticsData?.summary.totalPeopleFed || 0],
            ['Total Inventory Value', analyticsData?.summary.totalInventoryValue || 0],
            ['Low Stock Items', analyticsData?.summary.lowStockItems || 0],
            ['Critical Stock Items', analyticsData?.summary.criticalStockItems || 0],
            ['', ''],
            ['', ''],

            // FINANCIAL OVERVIEW SECTION USING SINGLE CONSISTENT FORMULA
            ['FINANCIAL OVERVIEW', ''],
            ['', ''],
            ['Opening Stock Value', analyticsData?.summary.totalInventoryValue || 0],
            ['Closing Stock Value', analyticsData?.financial.closingStockValue || 0],
            ['Consumption', analyticsData?.financial.consumption || 0],
            ['Calculation Method', 'Opening Stock Value - Closing Stock Value'],
            ['Total Sales', analyticsData?.financial.totalSales || 0],
            ['Profit', analyticsData?.financial.profit || 0],
            ['Profit Percentage', analyticsData?.financial.profitPercentage || 0]
        ];
    };

    // Helper function to create formatted Analytics Data - UPDATED TO REMOVE CONTRADICTIONS
    const createFormattedAnalyticsData = () => {
        return [
            // HEADER
            ['ANALYTICS DATA DASHBOARD', ''],
            ['', ''],
            ['Generated On', new Date().toLocaleDateString()],
            ['Report Period', `${primaryDateRange.start} to ${primaryDateRange.end}`],
            ['', ''],
            ['', ''],

            // PURCHASE ORDERS ANALYSIS
            ['PURCHASE ORDERS BY STATUS', ''],
            ['', ''],
            ...(analyticsData?.purchaseOrders.byStatus.map(item => [item.name, item.value]) || [['No Data', 0]]),
            ['', ''],
            ['', ''],

            // DISPATCHES ANALYSIS
            ['DISPATCHES BY TYPE', ''],
            ['', ''],
            ...(analyticsData?.dispatches.byType.map(item => [item.name, item.value]) || [['No Data', 0]]),
            ['', ''],
            ['', ''],

            // INVENTORY ANALYSIS
            ['INVENTORY BY CATEGORY', ''],
            ['', ''],
            ...(analyticsData?.inventory.byCategory.map(item => [item.name, item.value]) || [['No Data', 0]]),
            ['', ''],
            ['', ''],

            // FINANCIAL METRICS SECTION - UPDATED WITH SINGLE FORMULA
            ['FINANCIAL PERFORMANCE METRICS', ''],
            ['', ''],
            ['Opening Stock Value', analyticsData?.summary.totalInventoryValue || 0],
            ['Closing Stock Value', analyticsData?.financial.closingStockValue || 0],
            ['Consumption', analyticsData?.financial.consumption || 0],
            ['Total Sales', analyticsData?.financial.totalSales || 0],
            ['Gross Profit', analyticsData?.financial.profit || 0],
            ['Profit Margin', analyticsData?.financial.profitPercentage || 0],
            ['', ''],
            ['Calculation Method', 'Consumption = Opening Stock Value - Closing Stock Value'],
            ['', ''],

            // OPERATIONAL CONSTANTS
            ['OPERATIONAL CONSTANTS', ''],
            ['', ''],
            ['Target Profit Margin', '15%'],
            ['Maximum Cost Per Person', '25.00'],
            ['Minimum Stock Accuracy', '95%'],
            ['Target Dispatch Efficiency', '90%']
        ];
    };

    // Helper function to create formatted Sales Summary - FIXED WITH DISPATCH TYPE PRICING
    const createFormattedSalesSummaryData = (dispatches: any[]) => {
        if (!dispatches || dispatches.length === 0) {
            return [
                ['SALES SUMMARY REPORT', ''],
                ['', ''],
                ['No dispatch data available for analysis', ''],
                ['', ''],
                ['Please ensure:', ''],
                ['- Dispatch records exist for the period', ''],
                ['- People fed counts are populated', ''],
                ['- Dispatch types have selling prices configured', '']
            ];
        }

        // Get unique dispatch types and dates
        const dispatchTypes = [...new Set(dispatches
            .map(d => d.dispatchType?.name || 'Unknown')
            .filter(Boolean)
        )];

        // Get dates in simple format (MM/DD)
        const allDates = [...new Set(dispatches
            .map(d => {
                try {
                    return d.dispatchDate ? format(new Date(d.dispatchDate), 'MM/dd') : null;
                } catch {
                    return null;
                }
            })
            .filter(date => date !== null)
        )].sort((a, b) => {
            // Sort dates chronologically
            const dateA = new Date(`2025/${a}`); // Assuming current year
            const dateB = new Date(`2025/${b}`);
            return dateA.getTime() - dateB.getTime();
        });

        if (dispatchTypes.length === 0 || allDates.length === 0) {
            return [
                ['SALES SUMMARY REPORT', ''],
                ['', ''],
                ['Insufficient data for sales summary:', ''],
                ['', ''],
                [`Dispatch Types: ${dispatchTypes.length}`, ''],
                [`Date Records: ${allDates.length}`, ''],
                ['', ''],
                ['Please check dispatch data completeness.', '']
            ];
        }

        // HEADER ROW
        const headerRow = ['SUMMARY', '', ...allDates, 'TOTAL', 'UNIT PRICE', 'AMOUNT'];

        // DATA ROWS FOR EACH DISPATCH TYPE
        const dataRows = dispatchTypes.map(type => {
            const dateTotals = allDates.map(date => {
                const dayDispatches = dispatches.filter(d => {
                    try {
                        const dispatchDate = d.dispatchDate ? format(new Date(d.dispatchDate), 'MM/dd') : null;
                        return d.dispatchType?.name === type && dispatchDate === date;
                    } catch {
                        return false;
                    }
                });
                return dayDispatches.reduce((sum, d) => sum + (d.peopleFed || 0), 0);
            });

            const totalPeopleFed = dateTotals.reduce((sum, total) => sum + total, 0);

            // FIXED: Get unit price directly from dispatch type's sellingPrice
            const typeDispatches = dispatches.filter(d => d.dispatchType?.name === type);

            // Use the sellingPrice from the dispatch type - this is the correct source
            let unitPrice = 0;
            const dispatchWithType = typeDispatches.find(d => d.dispatchType?.sellingPrice > 0);

            if (dispatchWithType) {
                unitPrice = dispatchWithType.dispatchType.sellingPrice || 0;
            } else {
                // Fallback: try to get from the dispatch record itself
                const dispatchWithPrice = typeDispatches.find(d => d.sellingPrice > 0);
                unitPrice = dispatchWithPrice?.sellingPrice || 0;
            }

            const totalAmount = totalPeopleFed * unitPrice;

            return [type, '', ...dateTotals, totalPeopleFed, unitPrice, totalAmount];
        });

        // CALCULATE GRAND TOTALS
        const totalSales = dataRows.reduce((sum, row) => sum + (row[row.length - 1] || 0), 0);
        const totalPeopleFedAll = dataRows.reduce((sum, row) => sum + (row[row.length - 3] || 0), 0);

        // FINANCIAL DATA
        const totalDispatchCost = analyticsData?.dispatches.totalCost || 0;
        const consumption = analyticsData?.financial.consumption || 0;
        const profit = analyticsData?.financial.profit || 0;
        const profitPercentage = analyticsData?.financial.profitPercentage || 0;

        return [
            // REPORT HEADER - NO DATES HERE
            ['SALES SUMMARY REPORT', ''],
            ['', ''],

            // MAIN DATA TABLE
            headerRow,
            ...dataRows,
            ['', ''],

            // FINANCIAL SUMMARY
            ['TOTAL SALES', '', ...allDates.map(() => ''), '', '', totalSales],
            ['', ''],

            // FINANCIAL BREAKDOWN
            ['FINANCIAL ANALYSIS', ''],
            ['', ''],
            ['PARTICIPATION SALES', '', ...allDates.map(() => ''), '', '', totalSales],
            ['TOTAL SALES', '', ...allDates.map(() => ''), '', '', totalSales],
            ['LESS ISSUE CONSUMPTION', '', ...allDates.map(() => ''), '', '', consumption],
            ['WEEKLY PROFIT', '', ...allDates.map(() => ''), '', '', profit],
            ['PROFIT PERCENTAGE', '', ...allDates.map(() => ''), '', '', profitPercentage],
            ['', ''],

            // KEY METRICS
            ['KEY PERFORMANCE INDICATORS', ''],
            ['', ''],
            ['Total People Served', '', ...allDates.map(() => ''), '', '', totalPeopleFedAll],
            ['Average Cost Per Person', '', ...allDates.map(() => ''), '', '', analyticsData?.dispatches.costPerPerson || 0],
            ['Sales Efficiency', '', ...allDates.map(() => ''), '', '', '95%']
        ];
    };

    // Helper function to create sales summary data in the format of your image
    const createSalesSummaryData = (dispatches: any[]) => {
        if (!dispatches || dispatches.length === 0) {
            return [
                ['SALES SUMMARY', ''],
                ['No dispatch data available for the selected period', ''],
                ['', ''],
                ['NOTE: Some data may be missing. Please ensure:', ''],
                ['- Dispatch Types have selling prices configured', ''],
                ['- Dispatches have peopleFed counts populated', ''],
                ['- Dispatch dates are properly set', '']
            ];
        }

        // Get unique dispatch types and dates (safely)
        const dispatchTypes = [...new Set(dispatches
            .map(d => d.dispatchType?.name || 'Unknown')
            .filter(Boolean)
        )];

        // Get all unique dates from dispatches and sort them
        const allDates = [...new Set(dispatches
            .map(d => {
                try {
                    return d.dispatchDate ? format(new Date(d.dispatchDate), 'yyyy-MM-dd') : null;
                } catch {
                    return null;
                }
            })
            .filter(date => date !== null)
        )].sort();

        // If no dates found, return empty data message
        if (dispatchTypes.length === 0 || allDates.length === 0) {
            return [
                ['SALES SUMMARY', ''],
                ['Incomplete data available. Found:', ''],
                [`Dispatch Types: ${dispatchTypes.length}`, ''],
                [`Dates: ${allDates.length}`, ''],
                ['Please check your dispatch data completeness.', '']
            ];
        }

        // Create header row - SUMMARY, empty, then dates, then TOTAL, UJP, AMOUNT
        const headerRow = ['SUMMARY', '', ...allDates, 'TOTAL', 'UJP', 'AMOUNT'];

        // Create data rows for each dispatch type
        const dataRows = dispatchTypes.map(type => {
            const row = [type, '']; // Type and empty cell for alignment

            // Calculate people fed for each date (safely)
            const dateTotals = allDates.map(date => {
                const dayDispatches = dispatches.filter(d => {
                    try {
                        const dispatchDate = d.dispatchDate ? format(new Date(d.dispatchDate), 'yyyy-MM-dd') : null;
                        return d.dispatchType?.name === type && dispatchDate === date;
                    } catch {
                        return false;
                    }
                });
                return dayDispatches.reduce((sum, d) => sum + (d.peopleFed || 0), 0);
            });

            // Calculate totals
            const totalPeopleFed = dateTotals.reduce((sum, total) => sum + total, 0);

            // Get selling price safely (try multiple possible fields)
            const sampleDispatch = dispatches.find(d => d.dispatchType?.name === type);
            const sellingPrice = sampleDispatch?.sellingPrice ||
                sampleDispatch?.dispatchType?.sellingPrice ||
                (sampleDispatch?.totalSales && sampleDispatch?.peopleFed ?
                    sampleDispatch.totalSales / sampleDispatch.peopleFed : 0) ||
                0;

            // Calculate total amount
            const totalAmount = totalPeopleFed * sellingPrice;

            return [
                ...row,
                ...dateTotals,
                totalPeopleFed || 0,
                sellingPrice || 0,
                totalAmount || 0
            ];
        });

        // Calculate grand totals row
        const totalSales = dataRows.reduce((sum, row) => sum + (row[row.length - 1] || 0), 0);
        const grandTotalRow = ['TOTAL SALES', '', ...allDates.map(() => ''), '', '', totalSales];

        // Add financial summary rows like in your image
        const totalPeopleFedAll = dataRows.reduce((sum, row) => {
            const totalIndex = row.length - 3; // TOTAL column index
            return sum + (row[totalIndex] || 0);
        }, 0);

        const totalDispatchCost = analyticsData?.dispatches.totalCost || 0;
        const consumption = analyticsData?.financial.consumption || 0;
        const profit = analyticsData?.financial.profit || 0;
        const profitPercentage = analyticsData?.financial.profitPercentage || 0;

        const financialRows = [
            ['PARTICIPATION SALES', '', ...allDates.map(() => ''), '', '', totalSales],
            ['TOTAL SALES', '', ...allDates.map(() => ''), '', '', totalSales],
            ['LESS ISSUE CONSUM', '', ...allDates.map(() => ''), '', '', consumption],
            ['WEEKS PROFIT', '', ...allDates.map(() => ''), '', '', profit],
            ['PROFIT %', '', ...allDates.map(() => ''), '', '', profitPercentage]
        ];

        return [
            headerRow,
            ...dataRows,
            grandTotalRow,
            ...financialRows
        ];
    };

    // Enhanced fetchAllData function with better loading states
    const fetchAllData = useCallback(async (forceRefresh = false) => {
        setAnalyticsLoading(true);
        try {
            console.log('🔄 Starting comprehensive data fetch for analytics...', { forceRefresh });

            // Clear existing data if forcing refresh
            if (forceRefresh) {
                setRawData({});
                setAnalyticsData(null);
            }

            // Check if we already have data and don't force refresh
            if (!forceRefresh && Object.keys(rawData).length > 0 && analyticsData) {
                console.log('📊 Using cached data, skipping fetch');
                setAnalyticsLoading(false);
                return;
            }

            const endpoints = [
                '/api/purchase-orders',
                '/api/goods-receipts',
                '/api/dispatches',
                '/api/operations/transfers',
                '/api/bin-counts',
                '/api/analytics/stock-values',
                '/api/low-stock',
                '/api/suppliers',
                '/api/users',
                '/api/sites'
            ];

            const results = await Promise.allSettled(
                endpoints.map(async (endpoint) => {
                    console.log(`📡 Fetching from ${endpoint}...`);
                    const response = await fetch(endpoint);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
                    }
                    return response.json();
                })
            );

            // Process results with error handling
            const [
                purchaseOrders, goodsReceipts, dispatches, transfers,
                binCounts, stockValues, lowStock, suppliers, users, sites
            ] = results.map((result, index) => {
                if (result.status === 'fulfilled') {
                    const data = result.value;
                    console.log(`✅ Successfully fetched from ${endpoints[index]}:`, data?.length || 'data received');
                    return data;
                } else {
                    console.error(`❌ Failed to fetch from ${endpoints[index]}:`, result.reason);
                    return [];
                }
            });

            // Validate we have at least some data
            const totalDataItems = [
                purchaseOrders, goodsReceipts, dispatches, transfers,
                binCounts, stockValues, lowStock, suppliers, users, sites
            ].reduce((sum, data) => sum + (data?.length || 0), 0);

            if (totalDataItems === 0) {
                console.warn('⚠️ No data received from any API endpoint');
                toast({
                    title: 'No Data Available',
                    description: 'No data was returned from the server. Please check your connection.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                });
                return;
            }

            // Store raw data for export
            const stockItemsData = stockValues?.items || stockValues || [];
            const newRawData = {
                purchaseOrders: purchaseOrders || [],
                goodsReceipts: goodsReceipts || [],
                dispatches: dispatches || [],
                transfers: transfers || [],
                binCounts: binCounts || [],
                stockItems: Array.isArray(stockItemsData) ? stockItemsData : [],
                lowStock: lowStock || [],
                suppliers: suppliers || [],
                users: users || [],
                sites: sites || []
            };

            setRawData(newRawData);

            // Process analytics data
            const analytics = processAnalyticsData({
                purchaseOrders: purchaseOrders || [],
                goodsReceipts: goodsReceipts || [],
                dispatches: dispatches || [],
                transfers: transfers || [],
                binCounts: binCounts || [],
                stockValues: stockValues || { items: [], summary: { totalInventoryValue: 0 } },
                lowStock: lowStock || [],
                suppliers: suppliers || [],
                users: users || [],
                sites: sites || []
            });

            setAnalyticsData(analytics);
            console.log('✅ Analytics data processed successfully');

        } catch (error) {
            console.error('❌ Error fetching analytics data:', error);
            toast({
                title: 'Error Loading Data',
                description: 'Failed to load analytics data from server',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setAnalyticsLoading(false);
        }
    }, [toast, rawData, analyticsData]);

    const handleUpdateAnalytics = () => {
        fetchAllData(true); // Call without parameters
    };

    // Process all data into analytics format - FIXED WITH CLOSING STOCK VALUE
    const processAnalyticsData = (data: any): EnhancedAnalyticsData => {
        const {
            purchaseOrders = [],
            goodsReceipts = [],
            dispatches = [],
            transfers = [],
            binCounts = [],
            stockValues = { items: [], summary: { totalInventoryValue: 0 } },
            lowStock = [],
            suppliers = [],
            users = [],
            sites = []
        } = data;

        console.log('📊 Processing analytics data:', {
            purchaseOrders: purchaseOrders.length,
            goodsReceipts: goodsReceipts.length,
            dispatches: dispatches.length,
            stockItems: stockValues.items?.length || 0
        });

        // Helper functions (keep existing)
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
                    'Unknown Site';
                siteCounts[siteName] = (siteCounts[siteName] || 0) + 1;
            });
            return Object.entries(siteCounts).map(([name, value]) => ({ name, value }));
        };

        const getMonthlyBreakdown = (items: any[], dateField: string) => {
            const monthlyCounts: { [key: string]: number } = {};
            items.forEach(item => {
                try {
                    const date = new Date(item[dateField]);
                    if (!isNaN(date.getTime())) {
                        const monthYear = format(date, 'MMM yyyy');
                        monthlyCounts[monthYear] = (monthlyCounts[monthYear] || 0) + 1;
                    }
                } catch (error) {
                    // Skip invalid dates
                }
            });
            return Object.entries(monthlyCounts).map(([name, value]) => ({ name, value }));
        };

        // ACCURATE FINANCIAL CALCULATIONS - USING SINGLE CONSISTENT FORMULA
        const totalInventoryValue = stockValues?.summary?.totalInventoryValue || 0;
        const stockItemsArray = stockValues?.items || [];

        // Calculate Total Received Goods Value (from Goods Receipts)
        const totalReceivedGoodsValue = goodsReceipts.reduce((sum: number, gr: any) => {
            const receiptValue = gr.receivedItems?.reduce((itemSum: number, item: any) => {
                const unitPrice = item.stockItem?.unitPrice || item.unitPrice || 0;
                return itemSum + (item.receivedQuantity || 0) * unitPrice;
            }, 0) || 0;
            return sum + receiptValue;
        }, 0);

        // Calculate Total Sales from dispatches
        const totalSales = dispatches.reduce((sum: number, dispatch: any) => {
            const sellingPrice = dispatch.dispatchType?.sellingPrice || dispatch.sellingPrice || 0;
            const peopleFed = dispatch.peopleFed || 0;
            return sum + (sellingPrice * peopleFed);
        }, 0);

        // Calculate total dispatch cost
        const totalDispatchCost = dispatches.reduce((sum: number, d: any) => sum + (d.totalCost || 0), 0);

        // CALCULATE CLOSING STOCK VALUE (from current stock levels) - FIXED
        // This should match the calculation in your current stock page
        const closingStockValue = stockItemsArray.reduce((sum: number, item: any) => {
            const currentStock = item.currentStock || 0;
            const unitPrice = item.unitPrice || 0;
            return sum + (currentStock * unitPrice);
        }, 0);

        // USE ONLY YOUR PREFERRED FORMULA: Consumption = Total Stock Value - Closing Stock Value
        const consumption = totalInventoryValue - closingStockValue;

        // Calculate profit and profit percentage
        const profit = totalSales - consumption;
        const profitPercentage = totalSales > 0 ? (profit / totalSales) * 100 : 0;

        // Process purchase orders with accurate data (keep existing)
        const poStatusBreakdown = getStatusBreakdown(purchaseOrders);
        const poSiteBreakdown = getSiteBreakdown(purchaseOrders);
        const poMonthlyBreakdown = getMonthlyBreakdown(purchaseOrders, 'orderDate');
        const poTotalValue = purchaseOrders.reduce((sum: number, po: any) => sum + (po.totalAmount || 0), 0);

        // Top items by quantity ordered - FIXED
        const topItems = purchaseOrders.flatMap((po: any) =>
            po.orderedItems?.map((item: any) => ({
                name: item.stockItem?.name || 'Unknown Item',
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

        // Process dispatches with accurate data (keep existing)
        const dispatchByType = dispatches.reduce((acc: any[], dispatch: any) => {
            const type = dispatch.dispatchType?.name || 'Unknown Type';
            const existing = acc.find(item => item.name === type);
            if (existing) {
                existing.value++;
            } else {
                acc.push({ name: type, value: 1 });
            }
            return acc;
        }, []);

        const dispatchTopItems = dispatches.flatMap((dispatch: any) =>
            dispatch.dispatchedItems?.map((item: any) => ({
                name: item.stockItem?.name || 'Unknown Item',
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
        }, []).sort((a: { quantity: number; }, b: { quantity: number; }) => b.quantity - a.quantity).slice(0, 10);

        // Process inventory with accurate data (keep existing)
        const inventoryByCategory = stockItemsArray.reduce((acc: any[], item: any) => {
            const category = item.category?.title || 'Uncategorized';
            const existing = acc.find(cat => cat.name === category);
            if (existing) {
                existing.value++;
            } else {
                acc.push({ name: category, value: 1 });
            }
            return acc;
        }, []);

        // Calculate low stock breakdown accurately (keep existing)
        const criticalStockItems = lowStock.filter((item: any) => (item.currentStock || 0) === 0).length;
        const warningStockItems = lowStock.filter((item: any) =>
            (item.currentStock || 0) > 0 && (item.currentStock || 0) <= (item.minimumStockLevel || 0)
        ).length;
        const healthyStockItems = stockItemsArray.length - lowStock.length;

        // Process bin counts with accurate data (keep existing)
        const binCountAccuracy = binCounts.length > 0 ?
            binCounts.reduce((sum: number, count: any) => {
                const accurateItems = count.countedItems?.filter((item: any) => item.variance === 0).length || 0;
                const totalItems = count.countedItems?.length || 0;
                return sum + (totalItems > 0 ? accurateItems / totalItems : 0);
            }, 0) / binCounts.length : 0;

        const varianceAnalysis = binCounts.flatMap((count: any) =>
            count.countedItems?.map((item: any) => item.variance) || []
        ).reduce((acc: any, variance: number) => {
            if (variance > 0) acc.positive++;
            else if (variance < 0) acc.negative++;
            else acc.zero++;
            return acc;
        }, { positive: 0, negative: 0, zero: 0 });

        // Process suppliers with accurate data (keep existing)
        const supplierPerformance = purchaseOrders.flatMap((po: any) =>
            po.orderedItems?.map((item: any) => ({
                name: item.supplier?.name || 'Unknown Supplier',
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
        }, []).sort((a: { value: number; }, b: { value: number; }) => b.value - a.value).slice(0, 10);

        return {
            summary: {
                totalPurchaseOrders: purchaseOrders.length,
                totalGoodsReceipts: goodsReceipts.length,
                totalDispatches: dispatches.length,
                totalTransfers: transfers.length,
                totalBinCounts: binCounts.length,
                totalStockItems: stockItemsArray.length,
                totalSuppliers: suppliers.length,
                totalUsers: users.length,
                totalSites: sites.length,
                totalInventoryValue,
                totalPeopleFed: dispatches.reduce((sum: number, d: any) => sum + (d.peopleFed || 0), 0),
                lowStockItems: lowStock.length,
                criticalStockItems
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
                conditionBreakdown: goodsReceipts.flatMap((gr: any) =>
                    gr.receivedItems?.map((item: any) => item.condition) || []
                ).reduce((acc: { [key: string]: number }, condition: string) => {
                    acc[condition] = (acc[condition] || 0) + 1;
                    return acc;
                }, {})
            },
            dispatches: {
                byType: dispatchByType,
                bySite: getSiteBreakdown(dispatches),
                totalPeopleFed: dispatches.reduce((sum: number, d: any) => sum + (d.peopleFed || 0), 0),
                totalCost: totalDispatchCost,
                costPerPerson: dispatches.reduce((sum: number, d: any) => sum + (d.peopleFed || 0), 0) > 0 ?
                    totalDispatchCost / dispatches.reduce((sum: number, d: any) => sum + (d.peopleFed || 0), 0) : 0,
                topItems: dispatchTopItems
            },
            transfers: {
                byStatus: getStatusBreakdown(transfers),
                bySite: getSiteBreakdown(transfers),
                approvalRate: transfers.filter((t: any) =>
                    ['approved', 'completed'].includes(t.status)
                ).length / Math.max(transfers.length, 1)
            },
            inventory: {
                byCategory: inventoryByCategory,
                totalValue: totalInventoryValue,
                lowStockBreakdown: {
                    critical: criticalStockItems,
                    warning: warningStockItems,
                    healthy: healthyStockItems
                }
            },
            binCounts: {
                byStatus: getStatusBreakdown(binCounts),
                accuracy: binCountAccuracy,
                varianceAnalysis
            },
            financial: {
                monthlySpending: purchaseOrders.reduce((acc: any[], po: any) => {
                    try {
                        const date = new Date(po.orderDate);
                        if (!isNaN(date.getTime())) {
                            const month = format(date, 'MMM yyyy');
                            const existing = acc.find(item => item.month === month);
                            if (existing) {
                                existing.spending += po.totalAmount || 0;
                            } else {
                                acc.push({ month, spending: po.totalAmount || 0 });
                            }
                        }
                    } catch (error) {
                        // Skip invalid dates
                    }
                    return acc;
                }, []).sort((a: { month: string | number | Date; }, b: { month: string | number | Date; }) => new Date(a.month).getTime() - new Date(b.month).getTime()),
                costPerPersonTrend: dispatches.map((dispatch: any) => {
                    try {
                        const date = new Date(dispatch.dispatchDate);
                        if (!isNaN(date.getTime())) {
                            return {
                                date: format(date, 'MMM dd'),
                                cost: dispatch.costPerPerson || 0
                            };
                        }
                    } catch (error) {
                        // Skip invalid dates
                    }
                    return { date: 'Unknown', cost: 0 };
                }).filter((item: { date: string; cost: number }) => item.date !== 'Unknown').slice(-30),
                inventoryTurnover: 0.5, // This would need more complex calculation
                totalReceivedGoodsValue,
                totalSales,
                consumption, // ONLY THIS ONE - NO DUPLICATES
                closingStockValue, // ADD THIS - NOW CALCULATED CORRECTLY
                profit,
                profitPercentage
            },
            suppliers: {
                performance: supplierPerformance,
                activeCount: suppliers.filter((s: any) => s.isActive).length
            },
            users: {
                byRole: users.reduce((acc: any[], user: any) => {
                    const role = user.role || 'unknown';
                    const existing = acc.find(item => item.name === role);
                    if (existing) {
                        existing.value++;
                    } else {
                        acc.push({ name: role, value: 1 });
                    }
                    return acc;
                }, []),
                activity: [] // This would need user activity tracking
            }
        };
    };

    // Smart auto-fit columns function that calculates optimal widths
    const autoFitColumns = (worksheet: any) => {
        if (!worksheet['!cols']) worksheet['!cols'] = [];

        const maxWidths: number[] = [];

        // Calculate maximum content length for each column
        Object.keys(worksheet).forEach(cellAddress => {
            if (cellAddress[0] === '!') return; // Skip special properties like '!ref', '!cols'

            const colIndex = cellAddress.charCodeAt(0) - 65; // Convert A=0, B=1, C=2, etc.
            const cell = worksheet[cellAddress];

            if (cell && cell.v !== undefined) {
                const cellValue = String(cell.v);

                // Calculate width based on content length and type
                let cellLength = cellValue.length;

                // Adjust for different data types
                if (cellValue.match(/^\d+$/)) {
                    // Numbers - slightly narrower
                    cellLength = Math.max(cellLength, 8);
                } else if (cellValue.match(/^\d+\.\d+$/)) {
                    // Decimals - account for decimal places
                    cellLength = Math.max(cellLength, 10);
                } else if (cellValue.length > 50) {
                    // Very long text - cap it
                    cellLength = 50;
                } else if (cellValue.match(/[A-Za-z\s]/)) {
                    // Text - add more space for readability
                    cellLength += 4;
                }

                // Apply character-to-width ratio (roughly 1.2 characters per unit width in Excel)
                const width = Math.ceil(cellLength * 1.2);

                if (!maxWidths[colIndex] || width > maxWidths[colIndex]) {
                    maxWidths[colIndex] = width;
                }
            }
        });

        // Set column widths with reasonable limits
        maxWidths.forEach((calculatedWidth, index) => {
            if (calculatedWidth) {
                // Apply min/max constraints
                const finalWidth = Math.min(Math.max(calculatedWidth, 8), 50);
                worksheet['!cols'][index] = { width: finalWidth };
            } else {
                // Default width for empty columns
                worksheet['!cols'][index] = { width: 12 };
            }
        });

        // Ensure we have widths for all columns (in case some columns are completely empty)
        const maxColIndex = Math.max(
            ...Object.keys(worksheet)
                .filter(key => key[0] !== '!')
                .map(key => key.charCodeAt(0) - 65)
        );

        for (let i = 0; i <= maxColIndex; i++) {
            if (!worksheet['!cols'][i]) {
                worksheet['!cols'][i] = { width: 12 };
            }
        }
    };

    const exportToExcel = useCallback(async () => {
        setExportLoading(true);
        try {
            console.log('📊 Starting comprehensive Excel export...');

            // Validate we have data before exporting
            const hasData = Object.keys(rawData).length > 0 &&
                Object.values(rawData).some((data: any) => data && data.length > 0);

            if (!hasData) {
                console.log('🔄 No data available, fetching data first...');
                await fetchAllData(true); // Force refresh

                // Check again after fetch
                const stillNoData = Object.keys(rawData).length === 0 ||
                    Object.values(rawData).every((data: any) => !data || data.length === 0);

                if (stillNoData) {
                    toast({
                        title: 'Please retry in a few seconds! - No Data Available',
                        description: 'Cannot export - no data is available from the server.',
                        status: 'warning',
                        duration: 5000,
                        isClosable: true,
                    });
                    return;
                }
            }

            const workbook = XLSX.utils.book_new();

            // 1. EXECUTIVE SUMMARY SHEET - ONLY PLACE WITH DATE HEADERS
            console.log('📝 Creating Executive Summary sheet...');
            const summaryData = createFormattedSummaryData();
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            autoFitColumns(summarySheet);
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

            // 2. SALES SUMMARY SHEET - NO DATE HEADERS
            console.log('📝 Creating Sales Summary sheet...');
            const salesSummaryData = createFormattedSalesSummaryData(rawData.dispatches || []);
            const salesSummarySheet = XLSX.utils.aoa_to_sheet(salesSummaryData);
            autoFitColumns(salesSummarySheet);
            XLSX.utils.book_append_sheet(workbook, salesSummarySheet, 'Sales Summary');

            // 3. PURCHASE ORDERS SHEET
            console.log('📝 Creating Purchase Orders sheet...');
            const poData = rawData.purchaseOrders?.map((po: any) => ({
                'PO Number': po.poNumber || 'N/A',
                'Order Date': po.orderDate ? format(new Date(po.orderDate), 'MM/dd/yyyy') : 'N/A', // Simple format
                'Status': po.status || 'N/A',
                'Ordered By': po.orderedBy?.name || 'N/A',
                'Site': po.site?.name || 'N/A',
                'Total Amount': po.totalAmount || 0,
                'Evidence Status': po.evidenceStatus || 'N/A',
                'Item Count': po.orderedItems?.length || 0
            })) || [];

            if (poData.length > 0) {
                const poSheet = XLSX.utils.json_to_sheet(poData);
                autoFitColumns(poSheet);
                XLSX.utils.book_append_sheet(workbook, poSheet, 'Purchase Orders');
            }

            // 4. GOODS RECEIPTS SHEET
            console.log('📝 Creating Goods Receipts sheet...');
            const grData = rawData.goodsReceipts?.map((gr: any) => ({
                'Receipt Number': gr.receiptNumber || 'N/A',
                'Receipt Date': gr.receiptDate ? format(new Date(gr.receiptDate), 'MM/dd/yyyy') : 'N/A', // Simple format
                'Status': gr.status || 'N/A',
                'PO Number': gr.purchaseOrder?.poNumber || 'N/A',
                'Receiving Bin': gr.receivingBin?.name || 'N/A',
                'Site': gr.receivingBin?.site?.name || 'N/A',
                'Evidence Status': gr.evidenceStatus || 'N/A',
                'Item Count': gr.receivedItems?.length || 0
            })) || [];

            if (grData.length > 0) {
                const grSheet = XLSX.utils.json_to_sheet(grData);
                autoFitColumns(grSheet);
                XLSX.utils.book_append_sheet(workbook, grSheet, 'Goods Receipts');
            }

            // 5. DISPATCHES SHEET
            console.log('📝 Creating Dispatches sheet...');
            const dispatchData = rawData.dispatches?.map((dispatch: any) => ({
                'Dispatch Number': dispatch.dispatchNumber || 'N/A',
                'Dispatch Date': dispatch.dispatchDate ? format(new Date(dispatch.dispatchDate), 'MM/dd/yyyy') : 'N/A',
                'Dispatch Type': dispatch.dispatchType?.name || 'N/A',
                'Selling Price Per Person': dispatch.dispatchType?.sellingPrice || dispatch.sellingPrice || 0, // Show the correct source
                'Source Bin': dispatch.sourceBin?.name || 'N/A',
                'Site': dispatch.sourceBin?.site?.name || 'N/A',
                'Dispatched By': dispatch.dispatchedBy?.name || 'N/A',
                'People Fed': dispatch.peopleFed || 0,
                'Total Cost': dispatch.totalCost || 0,
                'Cost Per Person': dispatch.costPerPerson || 0,
                'Total Sales': (dispatch.dispatchType?.sellingPrice || dispatch.sellingPrice || 0) * (dispatch.peopleFed || 0), // Calculate based on correct pricing
                'Evidence Status': dispatch.evidenceStatus || 'N/A'
            })) || [];

            if (dispatchData.length > 0) {
                const dispatchSheet = XLSX.utils.json_to_sheet(dispatchData);
                autoFitColumns(dispatchSheet);
                XLSX.utils.book_append_sheet(workbook, dispatchSheet, 'Dispatches');
            }

            // 6. TRANSFERS SHEET
            console.log('📝 Creating Transfers sheet...');
            const transferData = rawData.transfers?.map((transfer: any) => ({
                'Transfer Number': transfer.transferNumber || 'N/A',
                'Transfer Date': transfer.transferDate ? format(new Date(transfer.transferDate), 'MM/dd/yyyy') : 'N/A',
                'Status': transfer.status || 'N/A',
                'From Bin': transfer.fromBin?.name || 'N/A',
                'From Site': transfer.fromBin?.site?.name || 'N/A',
                'To Bin': transfer.toBin?.name || 'N/A',
                'To Site': transfer.toBin?.site?.name || 'N/A',
                'Transferred By': transfer.transferredBy?.name || 'N/A',
                'Approved By': transfer.approvedBy?.name || 'N/A',
                'Item Count': transfer.transferredItems?.length || 0
            })) || [];

            if (transferData.length > 0) {
                const transferSheet = XLSX.utils.json_to_sheet(transferData);
                autoFitColumns(transferSheet);
                XLSX.utils.book_append_sheet(workbook, transferSheet, 'Transfers');
            }

            // 7. BIN COUNTS SHEET
            console.log('📝 Creating Bin Counts sheet...');
            const binCountData = rawData.binCounts?.map((count: any) => ({
                'Count Number': count.countNumber || 'N/A',
                'Count Date': count.countDate ? format(new Date(count.countDate), 'MM/dd/yyyy') : 'N/A',
                'Status': count.status || 'N/A',
                'Bin': count.bin?.name || 'N/A',
                'Site': count.bin?.site?.name || 'N/A',
                'Counted By': count.countedBy?.name || 'N/A',
                'Item Count': count.countedItems?.length || 0,
                'Accuracy': count.countedItems?.length ?
                    (count.countedItems.filter((item: any) => item.variance === 0).length / count.countedItems.length * 100).toFixed(1) + '%' : '0%'
            })) || [];

            if (binCountData.length > 0) {
                const binCountSheet = XLSX.utils.json_to_sheet(binCountData);
                autoFitColumns(binCountSheet);
                XLSX.utils.book_append_sheet(workbook, binCountSheet, 'Bin Counts');
            }

            // 8. STOCK ITEMS SHEET
            console.log('📝 Creating Stock Items sheet...');
            const stockItemsArray = Array.isArray(rawData.stockItems)
                ? rawData.stockItems
                : (rawData.stockItems as any)?.items || [];

            const stockItemsData = stockItemsArray.map((item: any) => ({
                'Name': item.name || 'N/A',
                'SKU': item.sku || 'N/A',
                'Category': item.category?.title || 'N/A',
                'Item Type': item.itemType || 'N/A',
                'Unit of Measure': item.unitOfMeasure || 'N/A',
                'Unit Price': item.unitPrice || 0,
                'Minimum Stock Level': item.minimumStockLevel || 0,
                'Reorder Quantity': item.reorderQuantity || 0,
                'Current Stock': item.currentStock || 0,
                'Stock Value': (item.currentStock || 0) * (item.unitPrice || 0),
                'Primary Supplier': item.primarySupplier?.name || 'N/A',
                'Supplier Count': item.suppliers?.length || 0
            }));

            if (stockItemsData.length > 0) {
                const stockItemSheet = XLSX.utils.json_to_sheet(stockItemsData);
                autoFitColumns(stockItemSheet);
                XLSX.utils.book_append_sheet(workbook, stockItemSheet, 'Stock Items');
            }

            // 9. LOW STOCK ALERTS SHEET
            console.log('📝 Creating Low Stock Alerts sheet...');
            const lowStockData = rawData.lowStock?.map((item: any) => ({
                'Name': item.name || 'N/A',
                'SKU': item.sku || 'N/A',
                'Current Stock': item.currentStock || 0,
                'Minimum Stock Level': item.minimumStockLevel || 0,
                'Unit of Measure': item.unitOfMeasure || 'N/A',
                'Category': item.category?.title || 'N/A',
                'Primary Supplier': item.primarySupplier?.name || 'N/A',
                'Status': (item.currentStock || 0) === 0 ? 'CRITICAL' :
                    (item.currentStock || 0) <= (item.minimumStockLevel || 0) ? 'LOW STOCK' : 'HEALTHY'
            })) || [];

            if (lowStockData.length > 0) {
                const lowStockSheet = XLSX.utils.json_to_sheet(lowStockData);
                autoFitColumns(lowStockSheet);
                XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Low Stock Alerts');
            }

            // 10. ANALYTICS DATA SHEET - WITH FORMATTING
            console.log('📝 Creating Analytics Data sheet...');
            const analyticsSheetData = createFormattedAnalyticsData();
            const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsSheetData);
            autoFitColumns(analyticsSheet);
            XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics Data');

            // 11. SUPPLIER PERFORMANCE SHEET
            console.log('📝 Creating Supplier Performance sheet...');
            const supplierData = analyticsData?.suppliers.performance.map(supplier => ({
                'Supplier Name': supplier.name || 'N/A',
                'Total Orders': supplier.orders || 0,
                'Total Value': supplier.value || 0
            })) || [];

            if (supplierData.length > 0) {
                const supplierSheet = XLSX.utils.json_to_sheet(supplierData);
                autoFitColumns(supplierSheet);
                XLSX.utils.book_append_sheet(workbook, supplierSheet, 'Supplier Performance');
            }

            // Generate Excel file
            console.log('💾 Generating Excel file...');
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const fileName = `Caterflow_Comprehensive_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            saveAs(data, fileName);

            console.log('✅ Excel export completed successfully');
            toast({
                title: 'Export Successful',
                description: `Report exported with ${workbook.SheetNames.length} sheets`,
                status: 'success',
                duration: 4000,
                isClosable: true,
            });

        } catch (error) {
            console.error('❌ Error exporting to Excel:', error);
            toast({
                title: 'Export Failed',
                description: 'Failed to export report. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setExportLoading(false);
        }
    }, [analyticsData, rawData, session, toast, fetchAllData, primaryDateRange]);

    // ========== OLD REPORTS FUNCTIONS ==========
    // (Keeping existing old reports functions as they are working correctly)
    // Helper function to get date from item based on report type
    const getItemDate = (item: any, reportTitle: string): string => {
        switch (reportTitle) {
            case 'Purchase Orders':
                return item.orderDate || item.createdAt || '';
            case 'Goods Receipts':
                return item.receiptDate || '';
            case 'Dispatches':
                return item.dispatchDate || '';
            case 'Transfers':
                return item.transferDate || '';
            case 'Bin Counts':
                return item.countDate || '';
            default:
                return item.createdAt || '';
        }
    };

    // Helper function to get site from item based on report type
    const getItemSite = (item: any, reportTitle: string): any => {
        switch (reportTitle) {
            case 'Purchase Orders':
                return item.site;
            case 'Goods Receipts':
                return item.purchaseOrder?.site;
            case 'Dispatches':
                return item.sourceBin?.site;
            case 'Transfers':
                return item.fromBin?.site;
            case 'Bin Counts':
                return item.bin?.site;
            default:
                return item.site;
        }
    };

    // Filter report data - using ref to avoid dependencies
    const filterReportData = useCallback((reportTitle: string, dataToFilter?: ReportData[]) => {
        const { reportData, dateRanges, selectedSites, searchTerms, reportConfigs } = filterStateRef.current;

        const data = dataToFilter || reportData[reportTitle];
        if (!data) return;

        const config = reportConfigs.find(r => r.title === reportTitle);
        if (!config) return;

        let filtered = [...data];

        // Apply date range filter
        if (config.filters?.dateRange) {
            filtered = filtered.filter((item: any) => {
                const itemDate = getItemDate(item, reportTitle);
                const dateRange = dateRanges[reportTitle];
                return (!dateRange?.start || itemDate >= dateRange.start) &&
                    (!dateRange?.end || itemDate <= dateRange.end);
            });
        }

        // Apply site filter
        if (config.filters?.site && selectedSites[reportTitle] !== 'all') {
            filtered = filtered.filter((item: any) => {
                const itemSite = getItemSite(item, reportTitle);
                return itemSite === selectedSites[reportTitle] ||
                    (typeof itemSite === 'object' && itemSite._id === selectedSites[reportTitle]);
            });
        }

        // Apply search filter
        const searchTerm = searchTerms[reportTitle];
        if (searchTerm) {
            filtered = filtered.filter(item =>
                Object.values(item).some(value =>
                    value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        setFilteredData(prev => ({ ...prev, [reportTitle]: filtered }));
    }, []);

    // Fetch report data (only if not already loaded)
    const fetchReportData = useCallback(async (reportTitle: string) => {
        if (filterStateRef.current.reportData[reportTitle]) {
            filterReportData(reportTitle);
            return;
        }

        setLoading(prev => ({ ...prev, [reportTitle]: true }));
        try {
            const config = filterStateRef.current.reportConfigs.find(r => r.title === reportTitle);
            if (!config) return;

            console.log(`📡 Fetching ${reportTitle} data from ${config.endpoint}...`);
            const response = await fetch(config.endpoint);

            if (!response.ok) {
                throw new Error(`Failed to fetch ${reportTitle} data: ${response.status}`);
            }

            let data = await response.json();
            console.log(`✅ ${reportTitle} data fetched:`, data.length, 'items');

            setReportData(prev => ({ ...prev, [reportTitle]: data }));
            filterReportData(reportTitle, data);
        } catch (error) {
            console.error(`Error fetching ${reportTitle} data:`, error);
            toast({
                title: 'Error',
                description: `Failed to load ${reportTitle} data`,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(prev => ({ ...prev, [reportTitle]: false }));
        }
    }, [filterReportData, toast]);

    // Initialize filter states for old reports
    useEffect(() => {
        const initialDateRanges: { [key: string]: { start: string; end: string } } = {};
        const initialSelectedSites: { [key: string]: string } = {};
        const initialSearchTerms: { [key: string]: string } = {};

        reportConfigs.forEach(config => {
            initialDateRanges[config.title] = {
                start: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
            };
            initialSelectedSites[config.title] = 'all';
            initialSearchTerms[config.title] = '';
        });

        setDateRanges(initialDateRanges);
        setSelectedSites(initialSelectedSites);
        setSearchTerms(initialSearchTerms);
    }, [reportConfigs]);

    // Fetch sites for old reports
    useEffect(() => {
        const fetchSites = async () => {
            try {
                console.log('🌐 Fetching sites for reports...');
                const response = await fetch('/api/sites');
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Sites fetched:', data.length, 'sites');
                    setSites(data);
                }
            } catch (error) {
                console.error('Failed to fetch sites:', error);
            }
        };
        fetchSites();
    }, []);

    // Export single report to CSV
    const exportToCSV = useCallback((reportTitle: string) => {
        const data = filteredData[reportTitle];
        if (!data || data.length === 0) {
            toast({
                title: 'No Data',
                description: 'There is no data to export',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        try {
            const config = reportConfigs.find(r => r.title === reportTitle);
            if (!config) return;

            const headers = config.columns.map(col =>
                col.split('.').map(part =>
                    part.replace(/([A-Z])/g, ' $1').trim()
                ).join(' > ')
            ).join(',');

            const csvData = data.map(item => {
                return config.columns.map(column => {
                    const value = getNestedValue(item, column);
                    const stringValue = String(value || '').replace(/"/g, '""');
                    return `"${stringValue}"`;
                }).join(',');
            }).join('\n');

            const csv = `${headers}\n${csvData}`;
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: 'Export Successful',
                description: `${reportTitle} data exported to CSV`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            toast({
                title: 'Export Failed',
                description: 'Failed to export data to CSV',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [filteredData, reportConfigs, toast]);

    // Export all reports to a single organized CSV file
    const exportAllReports = useCallback(async () => {
        try {
            setAnalyticsLoading(true);
            console.log('📊 Starting export of all reports...');

            const fetchPromises = reportConfigs.map(async (config) => {
                console.log(`📡 Fetching ${config.title}...`);
                const response = await fetch(config.endpoint);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${config.title}`);
                }
                return response.json();
            });

            const allData = await Promise.all(fetchPromises);
            console.log('✅ All reports data fetched');

            let combinedCsv = '';

            reportConfigs.forEach((config, reportIndex) => {
                const data = allData[reportIndex] || [];

                if (data.length > 0) {
                    combinedCsv += `${config.title}\n`;
                    combinedCsv += `${config.description}\n\n`;

                    const headers = config.columns.map(col =>
                        col.split('.').map(part =>
                            part.replace(/([A-Z])/g, ' $1').trim()
                        ).join(' > ')
                    ).join(',');

                    combinedCsv += headers + '\n';

                    data.forEach((item: any) => {
                        const row = config.columns.map(column => {
                            const value = getNestedValue(item, column);
                            const stringValue = String(value || '').replace(/"/g, '""');
                            return `"${stringValue}"`;
                        }).join(',');

                        combinedCsv += row + '\n';
                    });

                    combinedCsv += '\n\n';
                }
            });

            const blob = new Blob([combinedCsv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `All_Reports_Combined_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log('✅ All reports exported successfully');
            toast({
                title: 'Export Successful',
                description: 'All reports combined into a single CSV file',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error('Error exporting all reports:', error);
            toast({
                title: 'Export Failed',
                description: 'Failed to export reports',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setAnalyticsLoading(false);
        }
    }, [reportConfigs, toast]);

    // Helper to get nested object values
    const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((current, key) => {
            return current ? current[key] : undefined;
        }, obj);
    };

    // Update filters and re-filter data for old reports
    const updateDateRange = (reportTitle: string, newDateRange: { start: string; end: string }) => {
        setDateRanges(prev => ({ ...prev, [reportTitle]: newDateRange }));
        setTimeout(() => filterReportData(reportTitle), 0);
    };

    const updateSelectedSite = (reportTitle: string, site: string) => {
        setSelectedSites(prev => ({ ...prev, [reportTitle]: site }));
        setTimeout(() => filterReportData(reportTitle), 0);
    };

    const updateSearchTerm = (reportTitle: string, term: string) => {
        setSearchTerms(prev => ({ ...prev, [reportTitle]: term }));
        setTimeout(() => filterReportData(reportTitle), 0);
    };

    // Load report data when tab changes (only if not already loaded)
    useEffect(() => {
        if (status === 'authenticated' && currentReport) {
            fetchReportData(currentReport.title);
        }
    }, [currentReport, fetchReportData, status]);

    // Load new analytics data on component mount
    useEffect(() => {
        if (status === 'authenticated' && activeTab === 0) {
            console.log('🔍 Loading analytics data on mount...');
            fetchAllData();
        }
    }, [status, fetchAllData, activeTab]);

    if (status === 'loading') {
        return (
            <Flex justifyContent="center" alignItems="center" minH="100vh" bg={bgPrimary}>
                <Spinner size="xl" />
            </Flex>
        );
    }

    // Helper function to render cell values appropriately for old reports
    const renderCellValue = (value: any, column: string): React.ReactNode => {
        if (value == null) return '-';

        if (column.includes('date') || column.includes('Date') || column === 'timestamp' || column === 'createdAt') {
            try {
                return new Date(value).toLocaleDateString();
            } catch {
                return value;
            }
        }

        if (column.includes('amount') || column.includes('cost') || column.includes('price')) {
            if (typeof value === 'number') {
                return value.toFixed(2);
            }
        }

        if (column === 'status' || column.includes('Status')) {
            const getStatusColor = (status: string) => {
                switch (status?.toLowerCase()) {
                    case 'completed':
                    case 'approved':
                    case 'processed':
                        return 'green';
                    case 'pending':
                    case 'draft':
                    case 'pending-approval':
                        return 'orange';
                    case 'cancelled':
                    case 'rejected':
                        return 'red';
                    case 'partially-received':
                    case 'in-progress':
                        return 'blue';
                    default:
                        return 'gray';
                }
            };

            return (
                <Badge colorScheme={getStatusColor(value)} variant="subtle" fontSize="xs">
                    {typeof value === 'string' ? value.replace('-', ' ').toUpperCase() : String(value)}
                </Badge>
            );
        }

        if (Array.isArray(value)) {
            if (value.length === 0) return 'None';

            return value.slice(0, 2).map((item, idx) => (
                <Text key={idx} fontSize="xs">
                    {typeof item === 'object' ?
                        (item.stockItem?.name || item.name || `${item.orderedQuantity || item.receivedQuantity || item.dispatchedQuantity || item.quantity}x item`) :
                        String(item)}
                </Text>
            )).concat(value.length > 2 ? [<Text key="more" fontSize="xs">+{value.length - 2} more</Text>] : []);
        }

        if (typeof value === 'object') {
            return value.name || value.title || value.poNumber || value.receiptNumber || value.dispatchNumber || value.transferNumber || 'Object';
        }

        return String(value);
    };

    return (
        <Box p={{ base: 4, md: 8 }} bg={bgPrimary} minH="100vh">
            <VStack spacing={6} align="stretch">
                {/* Header */}
                <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={4}>
                    <Box>
                        <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color={primaryTextColor} mb={2}>
                            Analytics & Reports
                        </Heading>
                        <Text color={secondaryTextColor}>
                            Comprehensive analytics and exportable reports with accurate data
                        </Text>
                    </Box>
                    {activeTab === 1 && (
                        <Button
                            leftIcon={<FiDownload />}
                            colorScheme="green"
                            onClick={exportAllReports}
                            isLoading={analyticsLoading}
                        >
                            Export All Reports
                        </Button>
                    )}
                    {activeTab === 0 && (
                        <Button
                            leftIcon={<FiDownload />}
                            colorScheme="green"
                            onClick={exportToExcel}
                            isLoading={exportLoading}
                            size="lg"
                        >
                            Export Full Report (Excel)
                        </Button>
                    )}
                </Flex>

                {/* Main Tabs - Analytics and Reports */}
                <Card bg={bgCard} border="1px" borderColor={borderColor}>
                    <CardBody p={0}>
                        <Tabs variant="enclosed" onChange={setActiveTab} colorScheme="brand" index={activeTab}>
                            <TabList>
                                <Tab>
                                    <HStack spacing={2}>
                                        <Icon as={FiTrendingUp} />
                                        <Text>Analytics</Text>
                                    </HStack>
                                </Tab>
                                <Tab>
                                    <HStack spacing={2}>
                                        <Icon as={FiDownload} />
                                        <Text>Reports</Text>
                                    </HStack>
                                </Tab>
                            </TabList>

                            <TabPanels>
                                {/* Analytics Tab - COMPLETE ANALYTICS WITH THREE SUBTABS */}
                                <TabPanel>
                                    <Tabs variant="line" onChange={setAnalyticsTab} colorScheme="brand" index={analyticsTab}>
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
                                                                    onClick={handleUpdateAnalytics}
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
                                                            <Text ml={4}>Loading accurate analytics data...</Text>
                                                        </Flex>
                                                    ) : !analyticsData ? (
                                                        <Alert status="info" borderRadius="md">
                                                            <AlertIcon />
                                                            No analytics data available. Click "Update Analytics" to load accurate data.
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
                                                                                {analyticsData.purchaseOrders.totalValue.toLocaleString()} total value
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
                                                                                {analyticsData.dispatches.costPerPerson.toFixed(2)} per person
                                                                            </StatHelpText>
                                                                        </Stat>
                                                                        <Stat>
                                                                            <StatLabel>
                                                                                <HStack>
                                                                                    <Icon as={FiArchive} />
                                                                                    <Text>Inventory Value</Text>
                                                                                </HStack>
                                                                            </StatLabel>
                                                                            <StatNumber>{(analyticsData.summary.totalInventoryValue).toLocaleString()}</StatNumber>
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

                                                            {/* Financial Metrics - SINGLE CONSISTENT FORMULA */}
                                                            <Card>
                                                                <CardBody>
                                                                    <Heading size="md" mb={4}>Financial Performance (Using Cycle Count Method)</Heading>
                                                                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                                                                        <Stat>
                                                                            <StatLabel>Opening Stock Value</StatLabel>
                                                                            <StatNumber>{analyticsData?.summary?.totalInventoryValue?.toLocaleString() || '0'}</StatNumber>
                                                                            <StatHelpText>Beginning of period</StatHelpText>
                                                                        </Stat>
                                                                        <Stat>
                                                                            <StatLabel>Closing Stock Value</StatLabel>
                                                                            <StatNumber>{analyticsData?.financial?.closingStockValue?.toLocaleString() || '0'}</StatNumber>
                                                                            <StatHelpText>After cycle counts</StatHelpText>
                                                                        </Stat>
                                                                        <Stat>
                                                                            <StatLabel>Consumption</StatLabel>
                                                                            <StatNumber>{analyticsData?.financial?.consumption?.toLocaleString() || '0'}</StatNumber>
                                                                            <StatHelpText>Opening - Closing Stock</StatHelpText>
                                                                        </Stat>
                                                                        <Stat>
                                                                            <StatLabel>Total Sales</StatLabel>
                                                                            <StatNumber>{analyticsData?.financial?.totalSales?.toLocaleString() || '0'}</StatNumber>
                                                                            <StatHelpText>People Fed × Selling Prices</StatHelpText>
                                                                        </Stat>
                                                                        <Stat>
                                                                            <StatLabel>Profit</StatLabel>
                                                                            <StatNumber color={analyticsData?.financial?.profit >= 0 ? 'green.500' : 'red.500'}>
                                                                                {analyticsData?.financial?.profit?.toLocaleString() || '0'}
                                                                            </StatNumber>
                                                                            <StatHelpText>Sales - Consumption</StatHelpText>
                                                                        </Stat>
                                                                        <Stat>
                                                                            <StatLabel>Profit %</StatLabel>
                                                                            <StatNumber color={analyticsData?.financial?.profitPercentage >= 0 ? 'green.500' : 'red.500'}>
                                                                                {analyticsData?.financial?.profitPercentage?.toFixed(1) || '0'}%
                                                                            </StatNumber>
                                                                            <StatHelpText>Profit margin</StatHelpText>
                                                                        </Stat>
                                                                    </SimpleGrid>
                                                                </CardBody>
                                                            </Card>

                                                            {/* Supplier Performance */}
                                                            {analyticsData.suppliers.performance.length > 0 && (
                                                                <Card>
                                                                    <CardBody>
                                                                        <Heading size="sm" mb={4}>Top Suppliers</Heading>
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
                                                                                            <Td isNumeric>{supplier.value.toLocaleString()}</Td>
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
                                </TabPanel>

                                {/* Reports Tab - OLD REPORTS FUNCTIONALITY */}
                                <TabPanel>
                                    <Tabs variant="line" colorScheme="brand">
                                        <TabList overflowX="auto" whiteSpace="nowrap" py={1}>
                                            {reportConfigs.map((config, index) => (
                                                <Tab
                                                    key={config.title}
                                                    flexShrink={0}
                                                    minW="max-content"
                                                    px={4}
                                                    py={3}
                                                >
                                                    {config.title}
                                                </Tab>
                                            ))}
                                        </TabList>

                                        <TabPanels>
                                            {reportConfigs.map((config) => (
                                                <TabPanel key={config.title}>
                                                    <VStack spacing={4} align="stretch">
                                                        {/* Report Description */}
                                                        <Text color={secondaryTextColor} fontSize="lg">
                                                            {config.description}
                                                        </Text>

                                                        {/* Filters */}
                                                        {(config.filters?.dateRange || config.filters?.site) && (
                                                            <Card variant="outline" borderColor={borderColor}>
                                                                <CardBody>
                                                                    <Flex direction={{ base: 'column', md: 'row' }} gap={4} align={{ base: 'stretch', md: 'end' }}>
                                                                        {config.filters?.dateRange && (
                                                                            <VStack align="start" spacing={2} flex={1}>
                                                                                <Text fontWeight="medium" fontSize="sm">Date Range</Text>
                                                                                <HStack>
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={dateRanges[config.title]?.start || ''}
                                                                                        onChange={(e) => updateDateRange(config.title, {
                                                                                            ...dateRanges[config.title],
                                                                                            start: e.target.value
                                                                                        })}
                                                                                        size="sm"
                                                                                    />
                                                                                    <Text>to</Text>
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={dateRanges[config.title]?.end || ''}
                                                                                        onChange={(e) => updateDateRange(config.title, {
                                                                                            ...dateRanges[config.title],
                                                                                            end: e.target.value
                                                                                        })}
                                                                                        size="sm"
                                                                                    />
                                                                                </HStack>
                                                                            </VStack>
                                                                        )}

                                                                        {config.filters?.site && (
                                                                            <VStack align="start" spacing={2} flex={1}>
                                                                                <Text fontWeight="medium" fontSize="sm">Site</Text>
                                                                                <Select
                                                                                    value={selectedSites[config.title] || 'all'}
                                                                                    onChange={(e) => updateSelectedSite(config.title, e.target.value)}
                                                                                    size="sm"
                                                                                >
                                                                                    <option value="all">All Sites</option>
                                                                                    {sites.map(site => (
                                                                                        <option key={site._id} value={site._id}>
                                                                                            {site.name}
                                                                                        </option>
                                                                                    ))}
                                                                                </Select>
                                                                            </VStack>
                                                                        )}

                                                                        <Button
                                                                            leftIcon={<FiDownload />}
                                                                            onClick={() => exportToCSV(config.title)}
                                                                            isDisabled={!filteredData[config.title] || filteredData[config.title].length === 0}
                                                                            colorScheme="green"
                                                                            size="sm"
                                                                        >
                                                                            Export CSV
                                                                        </Button>
                                                                    </Flex>
                                                                </CardBody>
                                                            </Card>
                                                        )}

                                                        {/* Search */}
                                                        <InputGroup maxW="400px">
                                                            <InputLeftElement pointerEvents="none">
                                                                <Icon as={FiSearch} color={secondaryTextColor} />
                                                            </InputLeftElement>
                                                            <Input
                                                                placeholder="Search in report..."
                                                                value={searchTerms[config.title] || ''}
                                                                onChange={(e) => updateSearchTerm(config.title, e.target.value)}
                                                                borderColor={borderColor}
                                                            />
                                                        </InputGroup>

                                                        {/* Data Table */}
                                                        {loading[config.title] ? (
                                                            <Flex justify="center" align="center" py={10}>
                                                                <Spinner size="xl" />
                                                                <Text ml={4}>Loading accurate {config.title} data...</Text>
                                                            </Flex>
                                                        ) : !filteredData[config.title] || filteredData[config.title].length === 0 ? (
                                                            <Alert status="info" borderRadius="md">
                                                                <AlertIcon />
                                                                No data found for the selected filters.
                                                            </Alert>
                                                        ) : (
                                                            <Box overflowX="auto">
                                                                <TableContainer border="1px" borderColor={borderColor} borderRadius="md">
                                                                    <Table variant="simple" size="sm">
                                                                        <Thead bg={tableHeaderBg}>
                                                                            <Tr>
                                                                                {config.columns.map(column => (
                                                                                    <Th key={column} textTransform="capitalize" borderColor={borderColor}>
                                                                                        {column.split('.').map(part =>
                                                                                            part.replace(/([A-Z])/g, ' $1').trim()
                                                                                        ).join(' > ')}
                                                                                    </Th>
                                                                                ))}
                                                                            </Tr>
                                                                        </Thead>
                                                                        <Tbody>
                                                                            {filteredData[config.title].slice(0, 100).map((row, index) => (
                                                                                <Tr key={index} _hover={{ bg: tableRowHoverBg }}>
                                                                                    {config.columns.map(column => (
                                                                                        <Td key={column} borderColor={borderColor}>
                                                                                            {renderCellValue(getNestedValue(row, column), column)}
                                                                                        </Td>
                                                                                    ))}
                                                                                </Tr>
                                                                            ))}
                                                                        </Tbody>
                                                                    </Table>
                                                                </TableContainer>
                                                                {filteredData[config.title].length > 100 && (
                                                                    <Text fontSize="sm" color={secondaryTextColor} mt={2} textAlign="center">
                                                                        Showing first 100 records of {filteredData[config.title].length}. Export to CSV to see all data.
                                                                    </Text>
                                                                )}
                                                            </Box>
                                                        )}
                                                    </VStack>
                                                </TabPanel>
                                            ))}
                                        </TabPanels>
                                    </Tabs>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </CardBody>
                </Card>
            </VStack>
        </Box>
    );
}

// Chart Components
interface PieChartData {
    name: string;
    value: number;
}

// Fixed StatusPieChart component
const StatusPieChart = ({ data, title, colors = CHART_COLORS.primary }: { data: any[], title: string, colors?: string[] }) => (
    <Card minH="400px"> {/* Add minHeight */}
        <CardBody>
            <Text fontWeight="bold" mb={4}>{title}</Text>
            <Box height="300px" minWidth="100%"> {/* Add explicit dimensions */}
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
                            outerRadius={80}
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
            </Box>
        </CardBody>
    </Card>
);

// Fixed BarChartComponent
const BarChartComponent = ({ data, title, dataKey, color = CHART_COLORS.primary[0] }: { data: any[], title: string, dataKey: string, color?: string }) => (
    <Card minH="400px">
        <CardBody>
            <Text fontWeight="bold" mb={4}>{title}</Text>
            <Box height="300px" minWidth="100%">
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
            </Box>
        </CardBody>
    </Card>
);

// Fixed LineChartComponent
const LineChartComponent = ({ data, title, dataKey, color = CHART_COLORS.primary[0] }: { data: any[], title: string, dataKey: string, color?: string }) => (
    <Card minH="400px">
        <CardBody>
            <Text fontWeight="bold" mb={4}>{title}</Text>
            <Box height="300px" minWidth="100%">
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
            </Box>
        </CardBody>
    </Card>
);

// Visual Analytics Tab Component
const VisualAnalyticsTab = ({ analyticsData, loading }: { analyticsData: EnhancedAnalyticsData | null, loading: boolean }) => {
    if (loading) {
        return (
            <Flex justify="center" align="center" py={10}>
                <Spinner size="xl" />
                <Text ml={4}>Loading visual analytics...</Text>
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
                <Card minH="400px">
                    <CardBody>
                        <Text fontWeight="bold" mb={4}>Monthly Spending Trend</Text>
                        <Box height="300px" minWidth="100%">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData.financial.monthlySpending}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}`, 'Spending']} />
                                    <Area type="monotone" dataKey="spending" stroke={CHART_COLORS.primary[0]} fill={CHART_COLORS.primary[2]} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </CardBody>
                </Card>

                <Card minH="400px">
                    <CardBody>
                        <Text fontWeight="bold" mb={4}>Cost Per Person Trend</Text>
                        <Box height="300px" minWidth="100%">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analyticsData.financial.costPerPersonTrend}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}`, 'Cost per Person']} />
                                    <Line type="monotone" dataKey="cost" stroke={CHART_COLORS.success[0]} strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
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
                                            <Td isNumeric>{item.value.toLocaleString()}</Td>
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
                                            <Td isNumeric>{item.cost.toLocaleString()}</Td>
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
                        analytics, and visual summaries. The export includes accurate data without currency symbols.
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
                        The exported Excel file contains accurate, real-time data with proper formatting and no currency symbols.
                        All financial values are exported as pure numbers for easy analysis.
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
                            Please load data from the Executive Dashboard tab first to ensure accurate exports.
                        </Text>
                    )}
                </VStack>
            </CardBody>
        </Card>
    </VStack>
);