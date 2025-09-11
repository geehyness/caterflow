// components/MobileTopbar.tsx
'use client';

import { Flex, IconButton, Heading, Box, useColorModeValue } from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { useSidebar } from '@/context/SidebarContext';
import Image from 'next/image';

import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button, Icon } from '@chakra-ui/react';
import { FiDownload } from 'react-icons/fi';

export const MobileTopbar = () => {
    const { toggleSidebar } = useSidebar();
    const { isInstallable, installApp } = usePWAInstall();

    // 1. Define theme-aware colors using tokens from your theme.ts
    const bg = useColorModeValue('neutral.light.bg-header', 'neutral.dark.bg-header');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const headingColor = useColorModeValue('brand.500', 'brand.300'); // Use a lighter brand color in dark mode for contrast

    return (
        <Flex
            as="header" // 2. Use semantic HTML for accessibility
            position="fixed"
            top="0"
            left="0"
            right="0"
            height="60px"
            bg={bg} // Use theme-based background
            borderBottomWidth="1px" // Use explicit style prop
            borderColor={borderColor} // Use theme-based border color
            align="center"
            px={4}
            zIndex={1100} // 3. Set a numeric z-index for proper stacking
            display={{ base: 'flex', md: 'none' }}
        >
            <IconButton
                aria-label="Open sidebar"
                icon={<HamburgerIcon />}
                variant="ghost"
                onClick={toggleSidebar} // 4. Removed console.log
                mr={3}
            />
            <Flex align="center">
                {/* App Icon */}
                <Box
                    w={8}
                    h={8}
                    bg="white" // This white bg is kept intentionally to make the logo stand out in both modes
                    borderRadius="md"
                    mr={2}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
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
                <Heading size="md" color={headingColor}>
                    Caterflow
                </Heading>
                {isInstallable && (
                    <Button onClick={installApp} size="sm" colorScheme="blue">
                        <Icon as={FiDownload} mr={2} />
                        Install App
                    </Button>
                )}
            </Flex>
        </Flex>
    );
};