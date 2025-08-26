'use client';

import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    Select,
    Switch,
    useToast,
    VStack,
    FormErrorMessage,
} from '@chakra-ui/react';
import { AppUser, Site } from '@/lib/sanityTypes';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    userToEdit: AppUser | null;
    sites: Site[];
    onSaveSuccess: () => void;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({
    isOpen,
    onClose,
    userToEdit,
    sites,
    onSaveSuccess,
}) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('siteManager');
    const [isActive, setIsActive] = useState(true);
    const [selectedSiteId, setSelectedSiteId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const toast = useToast();

    useEffect(() => {
        if (userToEdit) {
            setName(userToEdit.name || '');
            setEmail(userToEdit.email || '');
            setRole(userToEdit.role || 'siteManager');
            setIsActive(userToEdit.isActive !== undefined ? userToEdit.isActive : true);
            setSelectedSiteId(
                userToEdit.associatedSite && typeof userToEdit.associatedSite === 'object'
                    ? userToEdit.associatedSite._id
                    : userToEdit.associatedSite || ''
            );
            setPassword(''); // Don't prefill password for existing users
        } else {
            // Reset form for new user
            setName('');
            setEmail('');
            setPassword('');
            setRole('siteManager');
            setIsActive(true);
            setSelectedSiteId('');
        }
    }, [userToEdit, isOpen]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) newErrors.name = 'Name is required';
        if (!email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';

        if (!userToEdit && !password.trim()) {
            newErrors.password = 'Password is required for new users';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);

        try {
            const url = '/api/users';
            const method = userToEdit ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    _id: userToEdit?._id,
                    name,
                    email,
                    password: password || undefined,
                    role,
                    isActive,
                    associatedSite: selectedSiteId || undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save user');
            }

            toast({
                title: 'Success',
                description: userToEdit
                    ? 'User updated successfully.'
                    : 'User created successfully.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving user:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save user. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <form onSubmit={handleSubmit}>
                    <ModalHeader>
                        {userToEdit ? 'Edit User' : 'Add New User'}
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            <FormControl isInvalid={!!errors.name} isRequired>
                                <FormLabel>Name</FormLabel>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter full name"
                                />
                                <FormErrorMessage>{errors.name}</FormErrorMessage>
                            </FormControl>

                            <FormControl isInvalid={!!errors.email} isRequired>
                                <FormLabel>Email</FormLabel>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter email address"
                                />
                                <FormErrorMessage>{errors.email}</FormErrorMessage>
                            </FormControl>

                            <FormControl isInvalid={!!errors.password} isRequired={!userToEdit}>
                                <FormLabel>Password</FormLabel>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={userToEdit ? 'Leave blank to keep current password' : 'Enter password'}
                                />
                                <FormErrorMessage>{errors.password}</FormErrorMessage>
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Role</FormLabel>
                                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                                    <option value="admin">Admin</option>
                                    <option value="siteManager">Site Manager</option>
                                    <option value="stockController">Stock Controller</option>
                                    <option value="dispatchStaff">Dispatch Staff</option>
                                    <option value="auditor">Auditor</option>
                                </Select>
                            </FormControl>

                            <FormControl>
                                <FormLabel>Associated Site</FormLabel>
                                <Select
                                    value={selectedSiteId}
                                    onChange={(e) => setSelectedSiteId(e.target.value)}
                                    placeholder="Select a site (optional)"
                                >
                                    {sites.map((site) => (
                                        <option key={site._id} value={site._id}>
                                            {site.name}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl display="flex" alignItems="center">
                                <FormLabel htmlFor="is-active" mb="0">
                                    Active Status
                                </FormLabel>
                                <Switch
                                    id="is-active"
                                    isChecked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    colorScheme="green"
                                />
                            </FormControl>
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
                            type="submit"
                            isLoading={loading}
                            loadingText="Saving"
                        >
                            {userToEdit ? 'Update User' : 'Create User'}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default UserManagementModal;