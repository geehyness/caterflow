'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  Text,
  Flex,
  useToast,
  useColorModeValue,
  Spinner
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toast = useToast();
  const router = useRouter();
  const { login, isAuthenticated, isAuthReady } = useAuth();

  const bgColor = useColorModeValue('white', 'gray.800');
  const formBgColor = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');

  useEffect(() => {
    // Redirect if already logged in
    if (isAuthReady && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isAuthReady, router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    const success = await login(email, password);

    setIsLoading(false);
    if (!success) {
      toast({
        title: 'Login failed.',
        description: 'Invalid email or password.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (!isAuthReady || (isAuthReady && isAuthenticated)) {
    return (
      <Box minH="100vh" display="flex" justifyContent="center" alignItems="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg={bgColor}
      color={textColor}
      p={4}
    >
      <Box
        bg={formBgColor}
        p={8}
        borderRadius="lg"
        boxShadow="lg"
        w="full"
        maxW="md"
      >
        <Heading as="h1" size="xl" textAlign="center" mb={6}>
          Caterflow Login
        </Heading>
        <Text textAlign="center" mb={6} color="gray.500">
          Sign in to your account
        </Text>
        <form onSubmit={handleLogin}>
          <FormControl id="email" mb={4} isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </FormControl>
          <FormControl id="password" mb={6} isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </FormControl>
          <Button
            colorScheme="blue"
            width="full"
            type="submit"
            isLoading={isLoading}
            loadingText="Logging in..."
          >
            Sign In
          </Button>
        </form>
      </Box>
    </Flex>
  );
}