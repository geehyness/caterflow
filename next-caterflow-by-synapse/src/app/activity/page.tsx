'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Heading,
    Text,
    Flex,
    Spinner,
    Card,
    CardBody,
    VStack,
    HStack,
    Badge,
    Button,
    useToast,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Icon,
    useColorModeValue,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import { FiBox, FiTruck, FiRefreshCw, FiBarChart2, FiCalendar, FiClock } from 'react-icons/fi';

interface ActivityItem {
    _id: string;
    _type: string;
    description: string;
    user: string;
    timestamp: string;
    siteName: string;
}

export default function ActivityPage() {
    const { user, isAuthReady } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('week');
    const toast = useToast();

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    const fetchActivities = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/activity?timeframe=${timeframe}`);
            if (!response.ok) throw new Error('Failed to fetch activities');
            const data = await response.json();
            setActivities(data);
        } catch (error) {
            console.error("Failed to fetch activities:", error);
            toast({
                title: 'Error',
                description: 'Failed to load activities',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast, timeframe]);

    useEffect(() => {
        if (!isAuthReady) return;
        fetchActivities();
    }, [isAuthReady, timeframe, fetchActivities]);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'GoodsReceipt':
                return FiBox;
            case 'DispatchLog':
                return FiTruck;
            case 'InternalTransfer':
                return FiRefreshCw;
            case 'StockAdjustment':
                return FiBarChart2;
            default:
                return FiBox;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'GoodsReceipt':
                return 'green';
            case 'DispatchLog':
                return 'blue';
            case 'InternalTransfer':
                return 'purple';
            case 'StockAdjustment':
                return 'orange';
            default:
                return 'gray';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    if (!isAuthReady) {
        return (
            <Flex justify="center" align="center" height="100vh">
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <Box p={8}>
            <Heading as="h1" size="xl" mb={6}>
                Activity Log
            </Heading>

            <Tabs variant="enclosed" mb={6} onChange={(index) => setTimeframe(index === 0 ? 'today' : index === 1 ? 'week' : 'month')}>
                <TabList>
                    <Tab>
                        <Icon as={FiClock} mr={2} />
                        Today
                    </Tab>
                    <Tab>
                        <Icon as={FiCalendar} mr={2} />
                        This Week
                    </Tab>
                    <Tab>
                        <Icon as={FiCalendar} mr={2} />
                        This Month
                    </Tab>
                </TabList>
                <TabPanels>
                    <TabPanel p={0} pt={4}>
                        <Text color="gray.500" mb={4}>Showing activities from today</Text>
                    </TabPanel>
                    <TabPanel p={0} pt={4}>
                        <Text color="gray.500" mb={4}>Showing activities from the past week</Text>
                    </TabPanel>
                    <TabPanel p={0} pt={4}>
                        <Text color="gray.500" mb={4}>Showing activities from the past month</Text>
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <Button
                onClick={fetchActivities}
                leftIcon={<FiRefreshCw />}
                mb={6}
                isLoading={isLoading}
                loadingText="Refreshing"
            >
                Refresh Activities
            </Button>

            {isLoading ? (
                <Flex justify="center" align="center" height="200px">
                    <Spinner size="lg" />
                </Flex>
            ) : activities.length > 0 ? (
                <VStack spacing={4} align="stretch">
                    {activities.map((activity) => (
                        <Card key={activity._id} bg={cardBg} boxShadow="sm" border="1px" borderColor={borderColor}>
                            <CardBody>
                                <HStack spacing={4} align="flex-start">
                                    <Flex
                                        align="center"
                                        justify="center"
                                        w={10}
                                        h={10}
                                        bg={`${getActivityColor(activity._type)}.100`}
                                        color={`${getActivityColor(activity._type)}.600`}
                                        borderRadius="full"
                                        flexShrink={0}
                                    >
                                        <Icon as={getActivityIcon(activity._type)} w={5} h={5} />
                                    </Flex>

                                    <VStack align="flex-start" spacing={1} flex={1}>
                                        <Text fontWeight="medium">{activity.description}</Text>
                                        <HStack spacing={3}>
                                            <Text fontSize="sm" color="gray.500">
                                                {activity.user}
                                            </Text>
                                            <Text fontSize="sm" color="gray.500">•</Text>
                                            <Text fontSize="sm" color="gray.500">
                                                {activity.siteName}
                                            </Text>
                                        </HStack>
                                    </VStack>

                                    <VStack align="flex-end" spacing={1} flexShrink={0}>
                                        <Text fontSize="sm" color="gray.500">
                                            {formatDate(activity.timestamp)}
                                        </Text>
                                        <Badge colorScheme={getActivityColor(activity._type)}>
                                            {activity._type.replace(/([A-Z])/g, ' $1').trim()}
                                        </Badge>
                                    </VStack>
                                </HStack>
                            </CardBody>
                        </Card>
                    ))}
                </VStack>
            ) : (
                <Box textAlign="center" py={10}>
                    <Text fontSize="lg" color="gray.500">
                        No activities found for the selected timeframe.
                    </Text>
                </Box>
            )}
        </Box>
    );
}