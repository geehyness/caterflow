// src/app/contact/page.tsx
// Mark as client component if you want to use client-side hooks or interactivity
'use client';

import ContactForm from '../../components/ContactForm'; // Adjust path as necessary
import { Box, Container, Heading, Flex, useColorModeValue } from '@chakra-ui/react';

export default function ContactPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const headingColor = useColorModeValue('gray.800', 'white');

  return (
    <Flex
      minH="100vh" // Ensure it takes full height
      align="center"
      justify="center"
      bg={bgColor}
      py={10} // Add some vertical padding
    >
      <Container maxW="container.md">
        <ContactForm />
      </Container>
    </Flex>
  );
}