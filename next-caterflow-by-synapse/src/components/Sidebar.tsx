// src/components/Sidebar.tsx
'use client'

import React, { useState } from 'react';
import {
    Box, Flex, Heading, Button, Stack, useColorMode, useColorModeValue, IconButton, Link as ChakraLink, Text, useTheme, Tooltip, Icon, Divider, Spinner, Collapse,
    HStack, // ADDED
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
    const activeBg = useColorModeValue('neutral.light.bg-brand-highlight', 'neutral.dark.bg-brand-highlight');
    const linkColor = useColorModeValue('gray.600', 'gray.300');
    const activeLinkColor = useColorModeValue('brand.500', 'brand.300');
    const groupHeaderColor = useColorModeValue('gray.500', 'gray.400');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const { setLoading, isLoading } = useLoading();

    const menuGroups = [
        {
            groupName: 'Main',
            items: [
                {
                    label: 'Dashboard',
                    href: '/',
                    icon: FiBarChart2,
                    roles: ['admin', 'siteManager', 'auditor', 'user']
                },
                {
                    label: 'Approvals',
                    href: '/approvals',
                    icon: FaCheckCircle,
                    roles: ['admin', 'siteManager', 'auditor']
                },
                {
                    label: 'Actions',
                    href: '/actions',
                    icon: FiClock,
                    roles: ['admin', 'siteManager', 'user']
                },
                {
                    label: 'Activity Log',
                    href: '/activity',
                    icon: FiActivity,
                    roles: ['admin', 'siteManager', 'auditor', 'user']
                },
            ]
        },
        {
            groupName: 'Operations',
            items: [
                {
                    label: 'Inventory',
                    href: '/inventory',
                    icon: FiBox,
                    roles: ['admin', 'siteManager', 'user']
                },
                {
                    label: 'Transfers',
                    href: '/transfers',
                    icon: FiTruck,
                    roles: ['admin', 'siteManager']
                },
                {
                    label: 'Sites',
                    href: '/sites',
                    icon: FiMapPin,
                    roles: ['admin', 'siteManager', 'auditor']
                },
            ]
        },
        {
            groupName: 'Admin',
            items: [
                {
                    label: 'Users',
                    href: '/users',
                    icon: FiUsers,
                    roles: ['admin', 'siteManager']
                },
                {
                    label: 'Settings',
                    href: '/settings',
                    icon: FiSettings,
                    roles: ['admin']
                },
            ]
        }
    ];

    const hasPermission = (roles: string[]) => {
        return roles.includes(userRole as string);
    };

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev =>
            prev.includes(groupName)
                ? prev.filter(name => name !== groupName)
                : [...prev, groupName]
        );
    };

    return (
        <Box
            as="aside"
            bg={sidebarBg}
            borderRight="1px"
            borderColor={borderColor}
            w="280px"
            h="100vh"
            p={4}
            position="fixed"
            left={0}
            top={0}
            zIndex={10}
            overflowY="auto"
            display={{ base: 'none', lg: 'flex' }}
            flexDirection="column"
            justifyContent="space-between"
            sx={{
                '&::-webkit-scrollbar': {
                    width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    background: useColorModeValue('rgba(0, 0, 0, 0.2)', 'rgba(255, 255, 255, 0.2)'),
                    borderRadius: '4px',
                },
            }}
        >
            {/* Top Logo and Navigation */}
            <Flex direction="column">
                <HStack mb={6}>
                    <Image src="/logo.svg" alt="Caterflow Logo" width={32} height={32} />
                    <Heading as="h1" size="md" color={useColorModeValue('gray.800', 'white')}>
                        {appName}
                    </Heading>
                </HStack>

                <Stack spacing={4}>
                    {menuGroups.map(group => {
                        const hasVisibleItems = group.items.some(item => hasPermission(item.roles));
                        if (!hasVisibleItems) {
                            return null;
                        }
                        return (
                            <Box key={group.groupName}>
                                <Flex
                                    as="button"
                                    onClick={() => toggleGroup(group.groupName)}
                                    w="full"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    py={1}
                                    px={2}
                                    mb={1}
                                >
                                    <Text
                                        fontSize="xs"
                                        fontWeight="bold"
                                        color={groupHeaderColor}
                                        textTransform="uppercase"
                                        letterSpacing="wide"
                                    >
                                        {group.groupName}
                                    </Text>
                                    <Icon
                                        as={expandedGroups.includes(group.groupName) ? FiChevronUp : FiChevronDown}
                                        color={groupHeaderColor}
                                    />
                                </Flex>
                                <Collapse in={expandedGroups.includes(group.groupName)} animateOpacity>
                                    <Stack spacing={1}>
                                        {group.items
                                            .filter(item => hasPermission(item.roles))
                                            .map(item => (
                                                <NextLink key={item.href} href={item.href} passHref>
                                                    <ChakraLink
                                                        w="full"
                                                        display="flex"
                                                        alignItems="center"
                                                        p={2}
                                                        borderRadius="md"
                                                        _hover={{
                                                            bg: activeBg,
                                                            color: 'brand.500',
                                                        }}
                                                        bg={pathname === item.href ? activeBg : 'transparent'}
                                                        color={pathname === item.href ? activeLinkColor : linkColor}
                                                        fontWeight={pathname === item.href ? 'bold' : 'normal'}
                                                        onClick={() => {
                                                            if (pathname !== item.href) {
                                                                setLoading(true);
                                                            }
                                                        }}
                                                    >
                                                        <Icon as={item.icon} mr={3} />
                                                        {item.label}
                                                    </ChakraLink>
                                                </NextLink>
                                            ))}
                                    </Stack>
                                </Collapse>
                            </Box>
                        );
                    })}
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