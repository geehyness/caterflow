// src/components/Sidebar.tsx
'use client'

import React, { useState } from 'react';
import {
    Box, Flex, Heading, Button, Stack, useColorMode, useColorModeValue, IconButton, Link as ChakraLink, Text, useTheme, Tooltip, Icon, Divider, Spinner, Collapse,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { FiLogOut, FiBarChart2, FiBox, FiMapPin, FiTruck, FiUsers, FiSettings, FiBell, FiClock, FiActivity, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { useLoading } from '@/context/LoadingContext';
import { FaCheckCircle } from 'react-icons/fa';

interface SidebarProps {
    appName?: string;
}

export function Sidebar({ appName = 'Caterflow' }: SidebarProps) {
    const { colorMode, toggleColorMode } = useColorMode();
    const theme = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, logout, userRole, isAuthReady } = useAuth();
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['Main', 'Operations', 'Admin']);

    const sidebarBg = useColorModeValue(theme.colors.neutral.light['bg-secondary'], theme.colors.neutral.dark['bg']);
    const activeBg = useColorModeValue(theme.colors.brand['100'], theme.colors.brand['700']);
    const borderColor = useColorModeValue(theme.colors.neutral.light['border-color'], theme.colors.neutral.dark['border-color']);
    const iconColor = useColorModeValue(theme.colors.neutral.light['text-header'], theme.colors.neutral.dark['text-header']);
    const hoverBg = useColorModeValue('gray.100', 'gray.700');
    const { setLoading } = useLoading();

    // Define menu items with roles and groups
    const menuGroups = [
        {
            heading: 'Main',
            items: [
                { label: 'Dashboard', href: '/', icon: FiBarChart2, roles: ['admin', 'siteManager', 'stockController', 'dispatchStaff', 'auditor'] },
                { label: 'Stock Items', href: '/stock-items', icon: FiBox, roles: ['admin', 'siteManager', 'stockController', 'auditor'] },
                { label: 'Locations', href: '/locations', icon: FiMapPin, roles: ['admin', 'siteManager', 'auditor'] },
                { label: 'Low Stock', href: '/low-stock', icon: FiBox, roles: ['admin', 'siteManager', 'stockController', 'auditor'] },
                { label: 'Actions', href: '/actions', icon: FiClock, roles: ['admin', 'siteManager', 'stockController', 'dispatchStaff'] },
                { label: 'Activity', href: '/activity', icon: FiActivity, roles: ['admin', 'siteManager', 'stockController', 'auditor'] },
            ],
        },
        {
            heading: 'Operations',
            items: [
                { label: 'Approvals', href: '/approvals', icon: FaCheckCircle, roles: ['admin', 'siteManager'] },
                { label: 'Purchases', href: '/operations/purchases', icon: FiTruck, roles: ['admin', 'siteManager', 'auditor'] },
                { label: 'Receipts', href: '/operations/receipts', icon: FiTruck, roles: ['admin', 'siteManager', 'auditor'] },
                { label: 'Dispatches', href: '/operations/dispatches', icon: FiTruck, roles: ['admin', 'siteManager', 'dispatchStaff', 'auditor'] },
                { label: 'Transfers', href: '/operations/transfers', icon: FiTruck, roles: ['admin', 'siteManager', 'stockController', 'dispatchStaff', 'auditor'] },
                { label: 'Adjustments', href: '/operations/adjustments', icon: FiBox, roles: ['admin', 'siteManager', 'stockController', 'auditor'] },
                { label: 'Counts', href: '/operations/counts', icon: FiBox, roles: ['admin', 'siteManager', 'stockController', 'auditor'] },
            ],
        },
        {
            heading: 'Admin',
            items: [
                { label: 'Users', href: '/users', icon: FiUsers, roles: ['admin'] },
                { label: 'Suppliers', href: '/suppliers', icon: FiTruck, roles: ['admin'] },
                { label: 'Notifications', href: '/notifications', icon: FiBell, roles: ['admin'] },
                { label: 'Settings', href: '/settings', icon: FiSettings, roles: ['admin'] },
            ],
        },
    ];

    // Filter menu items based on the user's role
    const filteredMenuGroups = userRole ? menuGroups
        .map(group => ({
            ...group,
            items: group.items.filter(item => item.roles.includes(userRole)),
        }))
        .filter(group => group.items.length > 0)
        : [];

    const toggleGroup = (heading: string) => {
        setExpandedGroups(prev =>
            prev.includes(heading)
                ? prev.filter(h => h !== heading)
                : [...prev, heading]
        );
    };

    if (!isAuthReady) {
        return (
            <Box
                as="aside"
                w="250px"
                bg={sidebarBg}
                borderRight="1px solid"
                borderColor={borderColor}
                position="fixed"
                left="0"
                top="0"
                h="100vh"
                p={4}
                pt={6}
                zIndex="sticky"
                display={{ base: 'none', md: 'flex' }}
                justifyContent="center"
                alignItems="center"
            >
                <Spinner size="md" />
            </Box>
        );
    }

    return (
        <Box
            as="aside"
            w="250px"
            bg={sidebarBg}
            borderRight="1px solid"
            borderColor={borderColor}
            position="fixed"
            left="0"
            top="0"
            h="100vh"
            p={4}
            pt={6}
            zIndex="sticky"
            flexDirection="column"
            justifyContent="space-between"
            display={{ base: 'none', md: 'flex' }}
        >
            {/* Top Fixed Section */}
            <Box>
                {/* App Logo and Name */}
                <Flex alignItems="center" mb={6} pr={2} flexDirection="column">
                    <Box
                        bg="white"
                        p={3}
                        borderRadius="xl"
                        boxShadow="md"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Image
                            src="/icons/icon-512x512.png"
                            alt="Caterflow Logo"
                            width={120}
                            height={120}
                        />
                    </Box>
                </Flex>
                <Divider mb={4} />
            </Box>

            {/* Scrollable Menu Items */}
            <Flex direction="column" overflowY="auto" overflowX="hidden" flex="1" pr={2}>
                <Stack direction="column" spacing={2} w="full">
                    {filteredMenuGroups.map((group) => (
                        <Box key={group.heading} w="full">
                            <Flex
                                as="button"
                                w="full"
                                alignItems="center"
                                justifyContent="space-between"
                                onClick={() => toggleGroup(group.heading)}
                                py={2}
                                px={3}
                                _hover={{
                                    bg: hoverBg,
                                    borderRadius: 'md',
                                }}
                            >
                                <Text
                                    fontSize="xs"
                                    fontWeight="bold"
                                    textTransform="uppercase"
                                    color="gray.500"
                                >
                                    {group.heading}
                                </Text>
                                <Icon
                                    as={expandedGroups.includes(group.heading) ? FiChevronDown : FiChevronUp}
                                    boxSize={4}
                                    color="gray.500"
                                />
                            </Flex>
                            <Collapse in={expandedGroups.includes(group.heading)} animateOpacity>
                                <Stack spacing={1} pl={1} mt={1}>
                                    {group.items.map((item) => (
                                        <NextLink key={item.href} href={item.href} passHref>
                                            <ChakraLink
                                                as={Button}
                                                variant="ghost"
                                                justifyContent="flex-start"
                                                w="full"
                                                leftIcon={<Icon as={item.icon} boxSize={5} />}
                                                color={pathname === item.href ? theme.colors.brand['500'] : iconColor}
                                                bg={pathname === item.href ? activeBg : 'transparent'}
                                                _hover={{ bg: activeBg, color: theme.colors.brand['500'] }}
                                                onClick={(e: { preventDefault: () => void; }) => {
                                                    e.preventDefault();
                                                    setLoading(true);
                                                    router.push(item.href);
                                                }}
                                            >
                                                {item.label}
                                            </ChakraLink>
                                        </NextLink>
                                    ))}
                                </Stack>
                            </Collapse>
                        </Box>
                    ))}
                </Stack>
            </Flex>

            {/* Bottom Fixed Section */}
            <Box>
                <Divider my={4} />
                <Button
                    w="full"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<Icon as={colorMode === 'light' ? SunIcon : MoonIcon} />}
                    onClick={toggleColorMode}
                >
                    Toggle Theme
                </Button>
                {isAuthenticated && (
                    <Button
                        w="full"
                        variant="ghost"
                        justifyContent="flex-start"
                        leftIcon={<Icon as={FiLogOut} />}
                        onClick={logout}
                    >
                        Logout
                    </Button>
                )}
            </Box>
        </Box>
    );
}