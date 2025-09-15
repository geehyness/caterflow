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
  Spinner,
  Card,
  CardBody,
  VStack,
  useBreakpointValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  InputGroup,
  InputRightElement,
  IconButton,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isAuthReady } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const cardWidth = useBreakpointValue({ base: '90%', sm: '400px' });

  // Get the redirect parameter from URL
  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    // Redirect if already logged in
    if (isAuthReady && isAuthenticated) {
      router.push(redirect);
    }
  }, [isAuthenticated, isAuthReady, router, redirect]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);

      if (!success) {
        toast({
          title: 'Login failed.',
          description: 'Invalid email or password.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Login successful!',
          description: 'Welcome back to Caterflow.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        router.push(redirect);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login error.',
        description: 'An unexpected error occurred. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!resetEmail) {
      toast({
        title: 'Email required.',
        description: 'Please enter your email address.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "godlinessdongorere@gmail.com" }), /*resetEmail*/
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Reset email sent!',
          description: 'Check your email for a verification code to reset your password.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        onClose();
        setResetEmail('');
      } else {
        toast({
          title: 'Failed to send reset email.',
          description: data.message || 'An error occurred.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: 'Network error.',
        description: 'Failed to connect to the server.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAuthReady || (isAuthReady && isAuthenticated)) {
    return (
      <Box minH="100vh" display="flex" justifyContent="center" alignItems="center">
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  return (
    <>
      <Flex
        minH="100vh"
        align="center"
        justify="center"
        bg="neutral.bg-primary"
        p={4}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card
            bg="neutral.bg-card"
            boxShadow="xl"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="neutral.border-color"
            w={cardWidth}
          >
            <CardBody p={8}>
              <VStack spacing={6} align="stretch">
                <Box textAlign="center">
                  <Heading as="h1" size="xl" color="neutral.text-primary" mb={2}>
                    Caterflow
                  </Heading>
                  <Text color="neutral.text-secondary" fontSize="md">
                    Inventory Management System
                  </Text>
                </Box>

                <Box>
                  <Heading as="h2" size="lg" color="neutral.text-primary" mb={2} textAlign="center">
                    Welcome Back
                  </Heading>
                  <Text color="neutral.text-secondary" textAlign="center" mb={6}>
                    Sign in to your account
                  </Text>

                  <form onSubmit={handleLogin}>
                    <VStack spacing={4}>
                      <FormControl id="email" isRequired>
                        <FormLabel color="neutral.text-primary">Email</FormLabel>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          bg="neutral.input-bg"
                          borderColor="neutral.input-border"
                          _hover={{ borderColor: 'brand.300' }}
                          _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px brand.500' }}
                        />
                      </FormControl>

                      <FormControl id="password" isRequired>
                        <FormLabel color="neutral.text-primary">Password</FormLabel>
                        <InputGroup>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            bg="neutral.input-bg"
                            borderColor="neutral.input-border"
                            _hover={{ borderColor: 'brand.300' }}
                            _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px brand.500' }}
                          />
                          <InputRightElement>
                            <IconButton
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPassword(!showPassword)}
                            />
                          </InputRightElement>
                        </InputGroup>
                      </FormControl>

                      <Button
                        colorScheme="brand"
                        width="full"
                        type="submit"
                        isLoading={isLoading}
                        loadingText="Signing in..."
                        size="lg"
                        mt={4}
                      >
                        Sign In
                      </Button>
                    </VStack>
                  </form>

                  <Box mt={4} textAlign="center">
                    <Button
                      variant="link"
                      colorScheme="brand"
                      onClick={onOpen}
                    >
                      Forgot your password?
                    </Button>
                  </Box>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </motion.div>
      </Flex>

      {/* Password Reset Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          bg="neutral.bg-card"
          borderWidth="1px"
          borderColor="neutral.border-color"
        >
          <ModalHeader color="neutral.text-primary">Reset Password</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handlePasswordReset}>
            <ModalBody>
              <Alert status="info" mb={4} borderRadius="md" variant="subtle">
                <AlertIcon />
                Enter your email address and we'll send you a verification code to reset your password.
              </Alert>

              <FormControl id="reset-email" isRequired>
                <FormLabel color="neutral.text-primary">Email Address</FormLabel>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email address"
                  bg="neutral.input-bg"
                  borderColor="neutral.input-border"
                  _hover={{ borderColor: 'brand.300' }}
                  _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px brand.500' }}
                />
              </FormControl>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="brand"
                type="submit"
                isLoading={isResetting}
                loadingText="Sending..."
              >
                Send Reset Code
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}