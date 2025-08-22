// src/components/Sidebar.tsx
'use client'

import React from 'react';
import {
    Box, Flex, Heading, Button, Stack, useColorMode, useColorModeValue, IconButton, Link as ChakraLink, Text, useTheme, Tooltip, Icon, Divider
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { FiLogOut, FiBarChart2, FiBox, FiMapPin, FiTruck, FiUsers, FiSettings, FiBell } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
    appName?: string;
}

export function Sidebar({ appName = 'Caterflow' }: SidebarProps) {
    const { colorMode, toggleColorMode } = useColorMode();
    const theme = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, logout, userRole } = useAuth();

    const sidebarBg = useColorModeValue(theme.colors.neutral.light['bg-sidebar'], theme.colors.neutral.dark['bg-sidebar']);
    const activeBg = useColorModeValue(theme.colors.brand['100'], theme.colors.brand['700']);
    const borderColor = useColorModeValue(theme.colors.neutral.light['border-color'], theme.colors.neutral.dark['border-color']);
    const iconColor = useColorModeValue(theme.colors.neutral.light['text-header'], theme.colors.neutral.dark['text-header']);

    // Define menu items with roles and groups
    const menuGroups = [
        {
            heading: 'Main',
            items: [
                { label: 'Dashboard', href: '/', icon: FiBarChart2, roles: ['admin', 'siteManager', 'stockController', 'dispatchStaff', 'auditor'] },
                { label: 'Inventory', href: '/inventory', icon: FiBox, roles: ['admin', 'siteManager', 'stockController', 'auditor'] },
                { label: 'Locations', href: '/locations', icon: FiMapPin, roles: ['admin', 'siteManager', 'auditor'] },
            ],
        },
        {
            heading: 'Operations',
            items: [
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
    const filteredMenuGroups = menuGroups
        .map(group => ({
            ...group,
            // Added a check for userRole to prevent errors when it's not yet defined
            items: group.items.filter(item => userRole && item.roles.includes(userRole)),
        }))
        .filter(group => group.items.length > 0);

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
            <Flex direction="column" alignItems="center">
                {/* App Logo and Name */}
                <Flex alignItems="center" mb={6} pr={2}>
                    <Image
                        src="/icons/icon-512x512.png"
                        alt="Caterflow Logo"
                        width={40}
                        height={40}
                    />
                    <Heading as="h1" size="md" fontWeight="bold" ml={2}>
                        {appName}
                    </Heading>
                </Flex>

                {/* Menu Items */}
                <Stack direction="column" spacing={2} w="full">
                    {filteredMenuGroups.map((group, groupIndex) => (
                        <Box key={group.heading} w="full">
                            <Text
                                fontSize="xs"
                                fontWeight="bold"
                                textTransform="uppercase"
                                color="gray.500"
                                mt={groupIndex > 0 ? 4 : 0}
                                mb={2}
                                pl={3}
                            >
                                {group.heading}
                            </Text>
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
                                            router.push(item.href);
                                        }}
                                    >
                                        {item.label}
                                    </ChakraLink>
                                </NextLink>
                            ))}
                        </Box>
                    ))}
                </Stack>
            </Flex>

            {/* Bottom controls */}
            <Flex direction="column" alignItems="flex-start">
                <Divider mb={4} />
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
            </Flex>
        </Box>
    );
}