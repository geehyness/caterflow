// src/components/FileUploadModal.tsx
'use client';

import React, { useState, useRef } from 'react';
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
    Textarea,
    useToast,
    VStack,
    Box,
    Text,
    Progress,
    HStack,
    Icon
} from '@chakra-ui/react';
import { FiUpload, FiXCircle } from 'react-icons/fi';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Updated prop signature to pass the newly created document's ID
    onUploadComplete: (attachmentId: string) => void;
    relatedToId: string;
    fileType: 'invoice' | 'receipt' | 'photo' | 'contract' | 'delivery-note' | 'quality-check' | 'other';
    title: string;
    description?: string;
}

export default function FileUploadModal({
    isOpen,
    onClose,
    onUploadComplete,
    relatedToId,
    fileType,
    title,
    description
}: FileUploadModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileDescription, setFileDescription] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const toast = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
    };

    const handleClearFile = () => {
        setSelectedFile(null);
        setFileDescription('');
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
            input.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            toast({
                title: 'No file selected.',
                description: 'Please select a file to upload.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('relatedTo', relatedToId);
        formData.append('fileType', fileType);
        formData.append('description', fileDescription);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload file');
            }

            const result = await response.json();

            toast({
                title: 'File uploaded successfully.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            // Pass the new attachment's ID to the parent component
            onUploadComplete(result.attachment._id);
            onClose();
            handleClearFile();
        } catch (error: any) {
            toast({
                title: 'Upload error',
                description: error.message || 'Something went wrong.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsUploading(false);
            setUploadProgress(100);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{title}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel htmlFor="file-upload">Choose File</FormLabel>
                            <Input
                                id="file-upload"
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                                p={1}
                            />
                        </FormControl>
                        {selectedFile && (
                            <HStack
                                w="100%"
                                p={2}
                                borderWidth="1px"
                                borderRadius="md"
                                justifyContent="space-between"
                            >
                                <Text fontSize="sm" isTruncated>
                                    {selectedFile.name}
                                </Text>
                                <Icon as={FiXCircle} color="red.500" cursor="pointer" onClick={handleClearFile} />
                            </HStack>
                        )}
                        <FormControl isRequired>
                            <FormLabel>File Type</FormLabel>
                            <Select value={fileType} isDisabled>
                                <option value={fileType}>{fileType.charAt(0).toUpperCase() + fileType.slice(1).replace('-', ' ')}</option>
                            </Select>
                        </FormControl>
                        <FormControl>
                            <FormLabel>Description</FormLabel>
                            <Textarea
                                name="description"
                                placeholder={description || "Describe what this file is for"}
                                rows={3}
                                value={fileDescription}
                                onChange={(e) => setFileDescription(e.target.value)}
                            />
                        </FormControl>
                        {isUploading && (
                            <Box width="100%">
                                <Progress value={uploadProgress} size="sm" colorScheme="blue" />
                                <Text fontSize="sm" textAlign="center" mt={2}>
                                    Uploading... {uploadProgress}%
                                </Text>
                            </Box>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isUploading}>
                        Cancel
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleSubmit}
                        isLoading={isUploading}
                        isDisabled={!selectedFile || isUploading}
                        leftIcon={<Icon as={FiUpload} />}
                    >
                        Upload
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}