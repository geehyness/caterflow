// src/components/PasswordResetModal.tsx
'use client';

import { useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    FormControl,
    FormLabel,
    Input,
    VStack,
    Text,
    useToast,
    Alert,
    AlertIcon,
    HStack,
} from '@chakra-ui/react';

interface PasswordResetModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PasswordResetModal({ isOpen, onClose }: PasswordResetModalProps) {
    const [email, setEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    const handleSendCode = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/send-verification-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: 'Verification code sent.',
                    description: data.message,
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
                setIsCodeSent(true);
            } else {
                toast({
                    title: 'Failed to send code.',
                    description: data.message || 'An error occurred.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (error) {
            console.error('Error sending verification code:', error);
            toast({
                title: 'Network error.',
                description: 'Failed to connect to the server.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/verify-and-reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, verificationCode, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: 'Password reset successful!',
                    description: data.message,
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
                // Reset and close modal
                setEmail('');
                setVerificationCode('');
                setNewPassword('');
                setIsCodeSent(false);
                onClose();
            } else {
                toast({
                    title: 'Password reset failed.',
                    description: data.message || 'An error occurred.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            toast({
                title: 'Network error.',
                description: 'Failed to connect to the server.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader color="neutral.text-primary">Reset Password</ModalHeader>
                <ModalBody>
                    <VStack spacing={4}>
                        {!isCodeSent ? (
                            <>
                                <Text color="neutral.text-secondary">
                                    Please enter your email to receive a verification code.
                                </Text>
                                <FormControl id="reset-email" isRequired>
                                    <FormLabel>Email Address</FormLabel>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                    />
                                </FormControl>
                            </>
                        ) : (
                            <>
                                <Alert status="info" borderRadius="md">
                                    <AlertIcon />
                                    <Text>
                                        A verification code has been sent to <strong>{email}</strong>.
                                    </Text>
                                </Alert>
                                <FormControl id="verification-code" isRequired>
                                    <FormLabel>Verification Code</FormLabel>
                                    <Input
                                        type="text"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        placeholder="Enter the 6-digit code"
                                    />
                                </FormControl>
                                <FormControl id="new-password" isRequired>
                                    <FormLabel>New Password</FormLabel>
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter your new password"
                                    />
                                </FormControl>
                            </>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <HStack spacing={4}>
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        {!isCodeSent ? (
                            <Button
                                colorScheme="brand"
                                onClick={handleSendCode}
                                isLoading={isLoading}
                            >
                                Send Code
                            </Button>
                        ) : (
                            <Button
                                colorScheme="brand"
                                onClick={handleResetPassword}
                                isLoading={isLoading}
                            >
                                Reset Password
                            </Button>
                        )}
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}