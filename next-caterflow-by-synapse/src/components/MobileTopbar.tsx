// components/MobileTopbar.tsx
'use client';

import { Flex, IconButton, Heading, Box } from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { useSidebar } from '@/context/SidebarContext';
import Image from 'next/image';

export const MobileTopbar = () => {
    const { toggleSidebar, isOpen } = useSidebar();

    console.log('MobileTopbar - Sidebar isOpen:', isOpen); // Debug log

    return (
        <Flex
            position="fixed"
            top="0"
            left="0"
            right="0"
            height="60px"
            bg="white"
            borderBottom="1px"
            borderColor="gray.200"
            align="center"
            px={4}
            zIndex="sticky"
            display={{ base: 'flex', md: 'none' }}
        >
            <IconButton
                aria-label="Open sidebar"
                icon={<HamburgerIcon />}
                variant="ghost"
                onClick={() => {
                    console.log('Hamburger clicked'); // Debug log
                    toggleSidebar();
                }}
                mr={3}
            />
            <Flex align="center">
                {/* App Icon */}
                <Box
                    w={8}
                    h={8}
                    bg="white"
                    borderRadius="md"
                    mr={2}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="white"
                    fontWeight="bold"
                    overflow="hidden"
                >
                    <Image
                        src="/icons/icon-512x512.png"
                        alt="Caterflow Logo"
                        width={32}
                        height={32}
                        style={{ objectFit: 'cover' }}
                    />
                </Box>
                <Heading size="md" color="brand.500">
                    Caterflow
                </Heading>
            </Flex>
        </Flex>
    );
};