// src/components/FileUploadModal.tsx
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
} from '@chakra-ui/react';
import { FiPaperclip, FiX } from 'react-icons/fi';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    relatedTo: string;
    relatedType: string;
    onUploadSuccess: () => void;
}

export default function FileUploadModal({
    isOpen,
    onClose,
    relatedTo,
    relatedType,
    onUploadSuccess,
}: FileUploadModalProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);

        if (file) {
            // Validate file size (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                toast({
                    title: 'File too large',
                    description: 'Maximum file size is 10MB',
                    status: 'error',
                    duration: 5000,
                });
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('fileName', selectedFile.name);
            formData.append('fileType', (e.target as any).fileType.value);
            formData.append('description', (e.target as any).description.value);
            formData.append('relatedTo', relatedTo);
            formData.append('relatedType', relatedType);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            toast({
                title: 'File uploaded successfully',
                status: 'success',
                duration: 3000,
            });

            onUploadSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                title: 'Upload failed',
                description: error.message || 'Please try again',
                status: 'error',
                duration: 5000,
            });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="lg">
            <ModalOverlay />
            <ModalContent as="form" onSubmit={handleSubmit}>
                <ModalHeader>Upload Evidence</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl isRequired>
                            <FormLabel>File</FormLabel>
                            {!selectedFile ? (
                                <Box
                                    border="2px dashed"
                                    borderColor="gray.300"
                                    borderRadius="md"
                                    p={6}
                                    textAlign="center"
                                    cursor="pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                    _hover={{ borderColor: 'blue.500' }}
                                >
                                    <FiPaperclip size={24} />
                                    <Text mt={2}>Click to select a file</Text>
                                    <Text fontSize="sm" color="gray.500">
                                        Supported formats: PDF, Word, Excel, JPG, PNG
                                    </Text>
                                    <Text fontSize="sm" color="gray.500">
                                        Max size: 10MB
                                    </Text>
                                </Box>
                            ) : (
                                <Box
                                    border="1px solid"
                                    borderColor="gray.200"
                                    borderRadius="md"
                                    p={3}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                >
                                    <Box>
                                        <Text fontWeight="medium">{selectedFile.name}</Text>
                                        <Text fontSize="sm" color="gray.500">
                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </Text>
                                    </Box>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={removeFile}
                                        aria-label="Remove file"
                                    >
                                        <FiX />
                                    </Button>
                                </Box>
                            )}
                            <Input
                                type="file"
                                ref={fileInputRef}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                onChange={handleFileSelect}
                                display="none"
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>File Type</FormLabel>
                            <Select name="fileType" placeholder="Select file type">
                                <option value="invoice">Invoice</option>
                                <option value="receipt">Receipt</option>
                                <option value="photo">Photo</option>
                                <option value="contract">Contract</option>
                                <option value="delivery-note">Delivery Note</option>
                                <option value="quality-check">Quality Check</option>
                                <option value="other">Other</option>
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Description</FormLabel>
                            <Textarea
                                name="description"
                                placeholder="Describe what this file is for"
                                rows={3}
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
                    <Button variant="ghost" mr={3} onClick={handleClose} isDisabled={isUploading}>
                        Cancel
                    </Button>
                    <Button
                        colorScheme="blue"
                        type="submit"
                        isLoading={isUploading}
                        isDisabled={!selectedFile}
                    >
                        Upload
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}