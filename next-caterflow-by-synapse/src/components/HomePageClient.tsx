// src/components/HomePageClient.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Container,
  SimpleGrid,
  Image,
  Link as ChakraLink,
  useColorModeValue,
  Button,
  VStack,
  HStack,
  Icon,
  Divider,
  useTheme,
  useToast, // Import useToast hook for notifications
  useDisclosure, // Import useDisclosure hook
  Tag, // For displaying availability days
  TagLabel,
  Badge, // For service duration
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { FaCut, FaCalendarAlt, FaStar, FaChevronDown } from 'react-icons/fa'; // Import FaChevronDown for the scroll arrow
import { urlFor } from '@/lib/sanity';
import { usePageTransition } from './PageTransitionProvider';
import BarberProfileModal from './BarberProfileModal'; // Import the new modal component
import { motion } from 'framer-motion'; // Import motion for animations

// Import the interfaces from the server component to ensure type consistency
import type { Barber, Service, SiteSettings } from '@/app/page';

// Component for the Barber Pole (assuming it's a separate component or inline HTML/CSS)
const BarberPole = () => (
  <Box className="barber-pole-container" mb={8}>
    <Box className="barber-pole-mount"></Box>
    <Box className="barber-pole-ceiling"></Box>
    <Box className="barber-pole"></Box>
  </Box>
);

interface HomePageClientProps {
  barbers: Barber[];
  services: Service[];
  siteSettings: SiteSettings;
}

// Define Motion components for Framer Motion animations
const MotionBox = motion(Box);
const MotionHeading = motion(Heading);
const MotionText = motion(Text);
const MotionButton = motion(Button);
const MotionFlex = motion(Flex);

export default function HomePageClient({ barbers, services, siteSettings }: HomePageClientProps) {
  const theme = useTheme();
  const router = useRouter();
  const { startTransition, signalPageLoaded } = usePageTransition();
  const toast = useToast(); // Initialize useToast

  // Ref for the section to scroll to
  const contentSectionRef = useRef<HTMLDivElement>(null);

  // State for image loading
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [barberImagesLoadedCount, setBarberImagesLoadedCount] = useState(0);
  const totalBarberImages = barbers?.filter(b => b.image).length || 0;

  // Modal specific state and hooks
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);

  // PWA Install Prompt States
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Effect to signal page loaded after hero image and all barber images are loaded
  useEffect(() => {
    if (heroImageLoaded && barberImagesLoadedCount === totalBarberImages) {
      signalPageLoaded();
    }
  }, [heroImageLoaded, barberImagesLoadedCount, totalBarberImages, signalPageLoaded]);

  // PWA Install Prompt Logic
  useEffect(() => {
    // Check if the app is already installed (PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      console.log('beforeinstallprompt event fired.');
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null); // Clear the deferred prompt once installed
      toast({
        title: 'App Installed!',
        description: 'Professional Hair Salon has been added to your home screen.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]); // Add toast to dependency array

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      (deferredPrompt as any).prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await (deferredPrompt as any).userChoice;
      console.log(`User response to the A2HS prompt: ${outcome}`);
      // We no longer need the prompt. Clear it.
      setDeferredPrompt(null);
    } else {
      toast({
        title: 'Installation Not Available',
        description: 'The browser is not ready to prompt for installation, or the app is already installed.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Define colors using theme and useColorModeValue
  const bgPrimary = useColorModeValue(theme.colors.neutral.light['bg-primary'], theme.colors.neutral.dark['bg-primary']);
  const textColorPrimary = useColorModeValue(theme.colors.neutral.light['text-primary'], theme.colors.neutral.dark['text-primary']);
  const textColorSecondary = useColorModeValue(theme.colors.neutral.light['text-secondary'], theme.colors.neutral.dark['text-secondary']);
  const cardBg = useColorModeValue(theme.colors.neutral.light['bg-card'], theme.colors.neutral.dark['bg-card']);
  const borderColor = useColorModeValue(theme.colors.neutral.light['border-color'], theme.colors.neutral.dark['border-color']);
  const cardBorderColor = useColorModeValue(theme.colors.neutral.light['border-color'], theme.colors.neutral.dark['border-color']);

  // Use coverImageUrl from siteSettings, fallback to default
  const heroImageSrc = siteSettings.coverImageUrl || '/pexels-rodnae-productions-cut.jpg';

  const handleHeroImageLoad = () => {
    setHeroImageLoaded(true);
  };

  const handleBarberImageLoad = () => {
    setBarberImagesLoadedCount(prevCount => prevCount + 1);
  };

  // Function to open modal with selected barber
  const handleViewProfile = (barber: Barber) => {
    setSelectedBarber(barber);
    onOpen();
  };

  // Function to scroll to the content section
  const scrollToContent = () => {
    if (contentSectionRef.current) {
      contentSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Helper to get unique available days
  const getAvailableDays = (availability?: Barber['dailyAvailability']) => {
    if (!availability || availability.length === 0) {
      return [];
    }
    const days = new Set<string>();
    availability.forEach(block => days.add(block.dayOfWeek));
    return Array.from(days);
  };

  return (
    <Box bg={bgPrimary} minH="100vh">
      {/* Hero Section */}
      <Box
        position="relative"
        height="90vh" // Changed to 100vh for full viewport height
        overflow="hidden"
        mb={0} // Removed margin-bottom as content will start directly below
      >
        <Image
          src={heroImageSrc}
          alt={siteSettings.title || 'Professional Hair Salon Hero'}
          objectFit="cover"
          width="100%"
          height="100%"
          onLoad={handleHeroImageLoad}
          onError={() => setHeroImageLoaded(true)} // Treat error as loaded to not block transition
        />
        <Flex
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          align="center"
          justify="center"
          bg="rgba(0,0,0,0.7)" // Semi-transparent overlay
          direction="column"
          textAlign="center"
          px={4}
        >
          <VStack spacing={4}>
            <br /><br />
            <MotionHeading
              as="h1"
              size={{ base: '2xl', md: '3xl', lg: '4xl' }}
              color="white"
              className="glitch-text" // Apply glitch effect
              data-text={siteSettings.title || "Professional Hair Salon"} // Data attribute for glitch effect
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {siteSettings.title || 'Professional Hair Salon'}
            </MotionHeading>
            <MotionText
              fontSize={{ base: 'lg', md: 'xl' }}
              color="whiteAlpha.800"
              maxW="lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {siteSettings.description || 'Your ultimate destination for premium barbering services.'}
            </MotionText>
            {/*        <BarberPole /> Integrate the Barber Pole here */}

            <MotionButton
              as={NextLink} // Use NextLink directly as the 'as' prop
              href="/book"
              size="lg"
              colorScheme="brand"
              onClick={(e) => {
                e.preventDefault();
                startTransition();
                setTimeout(() => router.push('/book'), 400); // Navigate after animation starts
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              boxShadow="lg"
              whileHover={{ // Using Framer Motion's whileHover
                backgroundColor: useColorModeValue(theme.colors.brand['700'], theme.colors.brand['600']),
                boxShadow: "xl",
                y: -2 // Framer Motion equivalent of translateY(-2px)
              }}
            >
              Book Your Appointment
            </MotionButton>

            {/* Install App Button */}
            {!isAppInstalled && deferredPrompt && (
              <MotionButton
                onClick={handleInstallClick}
                colorScheme="teal"
                size="lg"
                mt={4}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }} // Slightly delayed animation
                boxShadow="lg"
                _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
              >
                Install App
              </MotionButton>
            )}


            <Text fontSize={{ base: 'lg', md: 'xl' }} color="whiteAlpha.800" maxW="lg" marginTop={12}>
              {'Explore'}
            </Text>

            {/* Scroll Down Arrow - Moved inside VStack */}
            <Button
              variant="ghost"
              color="white"
              _hover={{ color: 'brand.300', transform: 'translateY(5px)' }} // Adjusted transform for VStack
              onClick={scrollToContent}
              aria-label="Scroll to content"
              zIndex={10}
              transition="all 0.3s ease-in-out"
              mt={0} // Add margin top to separate from the button above
            >
              <Icon as={FaChevronDown} boxSize={8} />
            </Button>
          </VStack>
        </Flex>
      </Box>

      {/* Main Content Section - Add ref here */}
      <Container maxW="container.xl" py={10} ref={contentSectionRef}>
        {/* Our Services Section */}
        <Box mb={10}>
          <Heading as="h2" size="xl" textAlign="center" mb={6} color={textColorPrimary}>
            Our Services
          </Heading>
          {services && services.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
              {services.map((service) => (
                <MotionFlex // Changed from Flex to MotionFlex
                  key={service._id}
                  bg={cardBg}
                  p={6}
                  borderRadius="lg"
                  boxShadow="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  direction="column"
                  justify="space-between"
                  // Removed the duplicate transition prop here
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  whileHover={{ y: -5, boxShadow: 'xl' }} // Using Framer Motion's whileHover
                >
                  {/* Service Image */}
                  {service.imageUrl && (
                    <Image
                      src={service.imageUrl}
                      alt={service.name}
                      boxSize="150px" // Consistent size
                      objectFit="cover"
                      borderRadius="md"
                      mb={4}
                      mx="auto" // Center the image
                    />
                  )}
                  <Box>
                    <Heading as="h3" size="md" mb={2} color={textColorPrimary}>
                      {service.name}
                    </Heading>
                    {/* Service Category */}
                    {service.category && (
                      <Text fontSize="sm" color={theme.colors.brand['400']} mb={1}>
                        Category: {service.category.title}
                      </Text>
                    )}
                    <Text fontSize="md" color={textColorSecondary} mb={3} noOfLines={3}> {/* Limit description lines */}
                      {service.description}
                    </Text>
                  </Box>
                  <Flex justify="space-between" align="center" mt={4}>
                    <VStack align="flex-start" spacing={0}>
                      <Text fontSize="lg" fontWeight="bold" color={theme.colors.brand['500']}>
                        E{service.price.toFixed(2)}
                      </Text>
                      {/* Service Duration */}
                      <Text fontSize="sm" color={textColorSecondary}>
                        Duration: {service.duration} mins
                      </Text>
                    </VStack>
                    <Button
                      as={NextLink} // Use NextLink directly as the 'as' prop
                      href={`/book`}
                      size="md"
                      colorScheme="brand"
                      onClick={(e) => {
                        e.preventDefault();
                        startTransition();
                        setTimeout(() => router.push(`/book`), 400); // Direct navigation
                      }}
                    >
                      Book Now
                    </Button>
                  </Flex>
                </MotionFlex>
              ))}
            </SimpleGrid>
          ) : (
            <Text color={textColorSecondary}>No services found at the moment.</Text>
          )}
        </Box>



        <Divider my={10} borderColor={cardBorderColor} />



        {/* Our Barbers Section */}
        <Box mb={10}>
          <Heading as="h2" size="xl" textAlign="center" mb={6} color={textColorPrimary}>
            Meet Our Barbers
          </Heading>
          {barbers && barbers.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
              {barbers.map((barber) => {
                const availableDays = getAvailableDays(barber.dailyAvailability);
                return (
                  <MotionBox
                    key={barber._id}
                    bg={cardBg}
                    p={6}
                    borderRadius="lg"
                    boxShadow="md"
                    borderWidth="1px"
                    borderColor={borderColor}
                    // Removed the duplicate transition prop here
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    whileHover={{ y: -5, boxShadow: 'xl' }} // Using Framer Motion's whileHover
                  >
                    {barber.image && (
                      <Image
                        src={urlFor(barber.image).url()}
                        alt={barber.name}
                        boxSize="150px"
                        borderRadius="full"
                        objectFit="cover"
                        mb={4}
                        mx="auto"
                        onLoad={handleBarberImageLoad}
                        onError={handleBarberImageLoad} // Count error as loaded to not block transition
                      />
                    )}
                    <Heading as="h3" size="md" mb={2} textAlign="center" color={textColorPrimary}>
                      {barber.name}
                    </Heading>

                    <Text fontSize="md" color={textColorSecondary} textAlign="center" noOfLines={4} mb={3}> {/* Increased lines for bio */}
                      {typeof barber.bio === 'string'
                        ? barber.bio.substring(0, 50) + (barber.bio.length > 50 ? '...' : '')
                        : 'No bio.'}
                    </Text>

                    {/* Display Available Days */}
                    {availableDays.length > 0 && (
                      <VStack align="center" mb={4}>
                        <Text fontSize="sm" fontWeight="semibold" color={textColorPrimary}>
                          Available Days:
                        </Text>
                        <HStack wrap="wrap" justify="center" spacing={1}>
                          {availableDays.map(day => (
                            <Tag key={day} size="sm" variant="solid" colorScheme="brand" borderRadius="full">
                              <TagLabel>{day.charAt(0).toUpperCase() + day.slice(1)}</TagLabel>
                            </Tag>
                          ))}
                        </HStack>
                      </VStack>
                    )}

                    <Flex justify="center" mt={4}>
                      <Button
                        size="md" // Slightly larger button
                        colorScheme="brand"
                        variant="solid" // Solid variant for more prominence
                        onClick={() => handleViewProfile(barber)}
                        width="full" // Make button full width
                        maxW="200px" // Max width for button
                      >
                        View Full Profile
                      </Button>
                    </Flex>
                  </MotionBox>
                );
              })}
            </SimpleGrid>
          ) : (
            <Text color={textColorSecondary} textAlign="center">No barbers found at the moment.</Text>
          )}
        </Box>



        <Divider my={10} borderColor={cardBorderColor} />

        {/* Call to Action / Booking Section */}
        <Box textAlign="center" py={10}>
          <Heading as="h2" size="xl" mb={4} color={textColorPrimary}>Ready for a fresh cut?</Heading>
          <Text fontSize="lg" color={textColorSecondary} mb={6}>
            Book your next appointment online in minutes.
          </Text>
          <Button
            as={NextLink} // Use NextLink directly as the 'as' prop
            href="/book"
            size="lg"
            colorScheme="brand"
            _hover={{ bg: useColorModeValue(theme.colors.brand['700'], theme.colors.brand['600']) }}
            onClick={(e) => {
              e.preventDefault();
              startTransition();
              setTimeout(() => router.push('/book'), 400); // Navigate after animation starts
            }}
          >
            Book Your Appointment
          </Button>
        </Box>
      </Container>

      {/* Barber Profile Modal */}
      <BarberProfileModal
        isOpen={isOpen}
        onClose={onClose}
        barber={selectedBarber}
      />
    </Box>
  );
}
