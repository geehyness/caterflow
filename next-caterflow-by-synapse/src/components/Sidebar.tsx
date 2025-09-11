// src/components/Sidebar.tsx
'use client'

import React, { useState } from 'react';
import {
    Box, Flex, Heading, Button, Stack, useColorMode, useColorModeValue, IconButton, Link as ChakraLink, Text, useTheme, Tooltip, Icon, Divider, Spinner, Collapse,
    Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerBody, useBreakpointValue,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, HamburgerIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { FiLogOut, FiBarChart2, FiBox, FiMapPin, FiTruck, FiUsers, FiSettings, FiBell, FiClock, FiActivity, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { useLoading } from '@/context/LoadingContext';
import { FaCheckCircle } from 'react-icons/fa';
import { useSidebar } from '@/context/SidebarContext';

interface SidebarProps {
    appName?: string;
}

// Extract the sidebar content into a separate component
const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => {
    const { colorMode, toggleColorMode } = useColorMode();
    const theme = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, logout, userRole, isAuthReady } = useAuth();
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['Main', 'Operations', 'Admin']);
    const { setLoading } = useLoading();

    // Correctly reference the neutral.light.bg-secondary and neutral.dark.bg-secondary colors from your theme
    const sidebarBg = useColorModeValue(theme.colors.neutral.light['bg-secondary'], theme.colors.neutral.dark['bg-secondary']);
    const activeBg = useColorModeValue(theme.colors.brand['100'], theme.colors.brand['700']);
    const borderColor = useColorModeValue(theme.colors.neutral.light['border-color'], theme.colors.neutral.dark['border-color']);
    const iconColor = useColorModeValue(theme.colors.neutral.light['text-primary'], theme.colors.neutral.dark['text-primary']);
    const hoverBg = useColorModeValue('gray.100', 'gray.700');

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

    const handleItemClick = (href: string) => {
        setLoading(true);
        router.push(href);
        onItemClick?.();
    };

    if (!isAuthReady) {
        return (
            <Flex
                p={4}
                pt={6}
                justifyContent="center"
                alignItems="center"
                height="100%"
            >
                <Spinner size="md" />
            </Flex>
        );
    }

    return (
        <Flex direction="column" h="full">
            {/* Header with App Logo and Name */}
            <Flex
                alignItems="center"
                justifyContent="center"
                p={4}
                bg={sidebarBg}
                position="sticky"
                top="0"
                zIndex="sticky"
                boxShadow="sm"
            >
                <Box
                    bg="white"
                    p={3}
                    borderRadius="xl"
                    boxShadow="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    onClick={() => handleItemClick('/')}
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

            {/* Scrollable Menu Items */}
            <Flex direction="column" overflowY="auto" overflowX="hidden" flex="1" px={2}>
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
                                        <Button
                                            key={item.href}
                                            variant="ghost"
                                            justifyContent="flex-start"
                                            w="full"
                                            leftIcon={<Icon as={item.icon} boxSize={5} />}
                                            color={pathname === item.href ? theme.colors.brand['500'] : iconColor}
                                            bg={pathname === item.href ? activeBg : 'transparent'}
                                            _hover={{ bg: activeBg, color: theme.colors.brand['500'] }}
                                            onClick={() => handleItemClick(item.href)}
                                        >
                                            {item.label}
                                        </Button>
                                    ))}
                                </Stack>
                            </Collapse>
                        </Box>
                    ))}
                </Stack>
            </Flex>

            {/* Footer with Actions */}
            <Box
                bg={sidebarBg}
                position="sticky"
                bottom="0"
                zIndex="sticky"
                p={4}
                boxShadow="sm"
            >
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
        </Flex>
    );
};

export function Sidebar({ appName = 'Caterflow' }: SidebarProps) {
    const isMobile = useBreakpointValue({ base: true, md: false });
    const { isOpen, closeSidebar } = useSidebar();
    const theme = useTheme();
    // Use the same theme color for the main sidebar background
    const sidebarBg = useColorModeValue(theme.colors.neutral.light['bg-secondary'], theme.colors.neutral.dark['bg-secondary']);

    console.log('Sidebar component - isMobile:', isMobile, 'isOpen:', isOpen); // Debug log

    if (isMobile) {
        return (
            <Drawer
                isOpen={isOpen}
                placement="left"
                onClose={closeSidebar}
            >
                <DrawerOverlay />
                <DrawerContent
                    bg={sidebarBg}
                    maxW={{ base: '75%', sm: '320px' }} // Set a max-width for the drawer on small screens
                >
                    <DrawerCloseButton />
                    <DrawerBody p={0}>
                        <SidebarContent onItemClick={closeSidebar} />
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Box
            as="aside"
            w="250px"
            bg={sidebarBg}
            borderRight="1px solid"
            borderColor="gray.200"
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
            <SidebarContent />
        </Box>
    );
}