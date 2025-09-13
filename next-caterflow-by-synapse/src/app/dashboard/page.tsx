// src/app/dashboard/page.tsx
import { getStockItems, getPurchaseOrders, getAppUsers } from '@/lib/queries';
import { AppUser } from '@/lib/sanityTypes';
import { SimpleGrid, Card, CardHeader, CardBody, Heading, Text, Box, List, ListItem, Flex, Tag, Link as ChakraLink } from '@chakra-ui/react';
import NextLink from 'next/link';

// Helper function to get the status color
const getStatusColor = (status: string) => {
    switch (status) {
        case 'received':
            return 'green';
        case 'ordered':
            return 'orange';
        case 'cancelled':
            return 'red';
        case 'completed':
            return 'purple';
        default:
            return 'gray';
    }
};

export default async function DashboardPage() {
    const [stockItems, purchaseOrders, appUsers] = await Promise.all([
        getStockItems(),
        getPurchaseOrders(),
        getAppUsers(),
    ]);

    const activeUsers = appUsers.filter((user: AppUser) => user.isActive);

    return (
        <Box p={6}>
            <Heading as="h1" size="xl" mb={6} fontWeight="semibold">
                Caterflow Dashboard
            </Heading>

            {/* Summary Cards */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
                <Card>
                    <CardHeader pb={0}>
                        <Heading as="h2" size="sm" fontWeight="semibold">
                            Stock Items
                        </Heading>
                    </CardHeader>
                    <CardBody>
                        <Text fontSize="4xl" fontWeight="bold">
                            {stockItems.length}
                        </Text>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader pb={0}>
                        <Heading as="h2" size="sm" fontWeight="semibold">
                            Active Users
                        </Heading>
                    </CardHeader>
                    <CardBody>
                        <Text fontSize="4xl" fontWeight="bold">
                            {activeUsers.length}
                        </Text>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader pb={0}>
                        <Heading as="h2" size="sm" fontWeight="semibold">
                            Purchase Orders
                        </Heading>
                    </CardHeader>
                    <CardBody>
                        <Text fontSize="4xl" fontWeight="bold">
                            {purchaseOrders.length}
                        </Text>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader pb={0}>
                        <Heading as="h2" size="sm" fontWeight="semibold">
                            Pending Orders
                        </Heading>
                    </CardHeader>
                    <CardBody>
                        <Text fontSize="4xl" fontWeight="bold">
                            {purchaseOrders.filter((po: any) => po.status === 'ordered').length}
                        </Text>
                    </CardBody>
                </Card>
            </SimpleGrid>

            {/* Recent Lists */}
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {/* Recent Stock Items List */}
                <Card>
                    <CardHeader>
                        <Heading as="h2" size="md" fontWeight="semibold">
                            Recent Stock Items
                        </Heading>
                    </CardHeader>
                    <CardBody>
                        <List spacing={3}>
                            {stockItems.slice(0, 5).map((item: any) => (
                                <ListItem key={item._id} borderBottom="1px solid" borderColor="neutral.border-color" pb={2}>
                                    <Flex justifyContent="space-between" alignItems="center">
                                        <Text>{item.name}</Text>
                                        <Text color="neutral.text-secondary">{item.sku}</Text>
                                    </Flex>
                                </ListItem>
                            ))}
                        </List>
                        <NextLink href="/inventory" passHref>
                            <ChakraLink mt={4} display="block">
                                View All Inventory
                            </ChakraLink>
                        </NextLink>
                    </CardBody>
                </Card>

                {/* Recent Orders List */}
                <Card>
                    <CardHeader>
                        <Heading as="h2" size="md" fontWeight="semibold">
                            Recent Orders
                        </Heading>
                    </CardHeader>
                    <CardBody>
                        <List spacing={3}>
                            {purchaseOrders.slice(0, 5).map((order: any) => (
                                <ListItem key={order._id} borderBottom="1px solid" borderColor="neutral.border-color" pb={2}>
                                    <Flex justifyContent="space-between" alignItems="center" mb={1}>
                                        <Text>{order.poNumber}</Text>
                                        <Tag variant="subtle" colorScheme={getStatusColor(order.status)}>
                                            {order.status}
                                        </Tag>
                                    </Flex>
                                    <Text fontSize="sm" color="neutral.text-secondary">
                                        {order.supplier?.name || 'No Supplier'} • {new Date(order.orderDate).toLocaleDateString()}
                                    </Text>
                                </ListItem>
                            ))}
                        </List>
                        <NextLink href="/operations/purchases" passHref>
                            <ChakraLink mt={4} display="block">
                                View All Orders
                            </ChakraLink>
                        </NextLink>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </Box>
    );
}