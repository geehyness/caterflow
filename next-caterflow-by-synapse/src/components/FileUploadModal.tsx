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
    Icon,
    IconButton,
    SimpleGrid,
    Image,
    Badge,
    Flex,
    Alert,
    AlertIcon,
    useColorModeValue // Import useColorModeValue for theme-based colors
} from '@chakra-ui/react';
import { FiUpload, FiXCircle, FiCamera, FiFolder, FiTrash2 } from 'react-icons/fi';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: (attachmentIds: string[]) => void;
    relatedToId: string;
    fileType: 'invoice' | 'receipt' | 'photo' | 'contract' | 'delivery-note' | 'quality-check' | 'other';
    title: string;
    description?: string;
}

interface FileWithPreview extends File {
    preview?: string;
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
    const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
    const [fileDescription, setFileDescription] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Get colors from theme for consistency
    const cardBg = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');
    const borderColor = useColorModeValue('neutral.light.border-color', 'neutral.dark.border-color');
    const textSecondaryColor = useColorModeValue('neutral.light.text-secondary', 'neutral.dark.text-secondary');

    // Check if device supports camera and multiple file selection
    const isMobile = typeof window !== 'undefined' &&
        (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            (navigator as any).maxTouchPoints > 0);

    const supportsMultipleCapture = isMobile &&
        typeof window !== 'undefined' &&
        'mediaDevices' in navigator;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const filesWithPreview = files.map(file => {
            const fileWithPreview: FileWithPreview = file;
            if (file.type.startsWith('image/')) {
                fileWithPreview.preview = URL.createObjectURL(file);
            }
            return fileWithPreview;
        });
        setSelectedFiles(prev => [...prev, ...filesWithPreview]);
    };

    const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const filesWithPreview = files.map(file => {
            const fileWithPreview: FileWithPreview = file;
            if (file.type.startsWith('image/')) {
                fileWithPreview.preview = URL.createObjectURL(file);
            }
            return fileWithPreview;
        });
        setSelectedFiles(prev => [...prev, ...filesWithPreview]);

        // Reset camera input to allow capturing more photos
        if (cameraInputRef.current) {
            cameraInputRef.current.value = '';
        }
    };

    const handleClearFile = (fileToRemove: FileWithPreview) => {
        setSelectedFiles(prev => prev.filter(file => file !== fileToRemove));
        // Clean up preview URL
        if (fileToRemove.preview) {
            URL.revokeObjectURL(fileToRemove.preview);
        }
    };

    const handleClearAllFiles = () => {
        // Clean up all preview URLs
        selectedFiles.forEach(file => {
            if (file.preview) {
                URL.revokeObjectURL(file.preview);
            }
        });
        setSelectedFiles([]);
        setFileDescription('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    const startCameraCapture = () => {
        if (cameraInputRef.current) {
            cameraInputRef.current.click();
        }
    };

    const startFileBrowse = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) {
            toast({
                title: 'No files selected.',
                description: 'Please select at least one file to upload.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        const uploadedAttachmentIds: string[] = [];
        let totalProgress = 0;

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const formData = new FormData();
                formData.append('file', file);
                formData.append('relatedTo', relatedToId);
                formData.append('fileType', fileType);
                formData.append('description', fileDescription || description || '');

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to upload file');
                }

                const result = await response.json();
                uploadedAttachmentIds.push(result.attachment._id);

                // Update progress
                totalProgress = Math.round(((i + 1) / selectedFiles.length) * 100);
                setUploadProgress(totalProgress);
            }

            toast({
                title: `${selectedFiles.length} files uploaded successfully.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            onUploadComplete(uploadedAttachmentIds);
            handleClearAllFiles();
            onClose();
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
        }
    };

    // Clean up preview URLs when component unmounts or modal closes
    React.useEffect(() => {
        return () => {
            selectedFiles.forEach(file => {
                if (file.preview) {
                    URL.revokeObjectURL(file.preview);
                }
            });
        };
    }, [selectedFiles]);

    const handleClose = () => {
        handleClearAllFiles();
        onClose();
    };

    return (
        // Set modal size responsively, e.g., full on mobile and xl on larger screens
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            size={{ base: 'full', md: 'xl' }}
            scrollBehavior="inside"
        >
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{title}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        {/* Hidden file inputs */}
                        <Input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                            multiple
                            display="none"
                        />
                        <Input
                            ref={cameraInputRef}
                            type="file"
                            onChange={handleCameraCapture}
                            accept="image/*"
                            capture="environment"
                            multiple={supportsMultipleCapture}
                            display="none"
                        />

                        {/* Action Buttons */}
                        {/* Use responsive grid for two-column layout */}
                        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} w="100%">
                            <Button
                                leftIcon={<Icon as={FiCamera} />}
                                onClick={startCameraCapture}
                                colorScheme="brand"
                                variant="outline"
                                isDisabled={isUploading}
                            >
                                Take Photos
                            </Button>
                            <Button
                                leftIcon={<Icon as={FiFolder} />}
                                onClick={startFileBrowse}
                                colorScheme="brand"
                                variant="outline"
                                isDisabled={isUploading}
                            >
                                Browse Files
                            </Button>
                        </SimpleGrid>

                        {supportsMultipleCapture && (
                            <Alert status="info" size="sm" borderRadius="md">
                                <AlertIcon />
                                <Text fontSize="sm">
                                    On your mobile device, you can take multiple photos in sequence
                                </Text>
                            </Alert>
                        )}

                        {/* Selected Files Preview */}
                        {selectedFiles.length > 0 && (
                            <VStack w="100%" spacing={3} align="stretch">
                                <Flex justify="space-between" align="center" w="100%">
                                    <Text fontWeight="medium">Selected files ({selectedFiles.length}):</Text>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        colorScheme="red"
                                        onClick={handleClearAllFiles}
                                        leftIcon={<Icon as={FiTrash2} />}
                                        isDisabled={isUploading}
                                    >
                                        Clear all
                                    </Button>
                                </Flex>

                                <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} spacing={3} maxH="200px" overflowY="auto">
                                    {selectedFiles.map((file, index) => (
                                        <Box
                                            key={`${file.name}-${index}`}
                                            position="relative"
                                            borderWidth="1px"
                                            borderRadius="md"
                                            p={2}
                                            borderColor={borderColor} // Use theme border color
                                            bg={cardBg} // Use theme card background
                                        >
                                            {file.preview ? (
                                                <VStack spacing={1}>
                                                    <Image
                                                        src={file.preview}
                                                        alt={file.name}
                                                        boxSize="60px"
                                                        objectFit="cover"
                                                        borderRadius="sm"
                                                    />
                                                    <Text fontSize="xs" noOfLines={1} title={file.name}>
                                                        {file.name}
                                                    </Text>
                                                </VStack>
                                            ) : (
                                                <VStack spacing={1}>
                                                    <Box
                                                        boxSize="60px"
                                                        bg={cardBg} // Use primary background color
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        borderRadius="sm"
                                                    >
                                                        <Icon as={FiFolder} boxSize={6} color={textSecondaryColor} /> {/* Use secondary text color for icon */}
                                                    </Box>
                                                    <Text fontSize="xs" noOfLines={1} title={file.name}>
                                                        {file.name}
                                                    </Text>
                                                </VStack>
                                            )}
                                            <Badge
                                                position="absolute"
                                                top={1}
                                                right={1}
                                                colorScheme="blue"
                                                fontSize="2xs"
                                            >
                                                {(file.size / 1024 / 1024).toFixed(1)}MB
                                            </Badge>
                                            <IconButton
                                                aria-label={`Remove ${file.name}`}
                                                icon={<Icon as={FiXCircle} />}
                                                onClick={() => handleClearFile(file)}
                                                size="xs"
                                                colorScheme="red"
                                                variant="ghost"
                                                position="absolute"
                                                top={1}
                                                left={1}
                                                isDisabled={isUploading}
                                            />
                                        </Box>
                                    ))}
                                </SimpleGrid>
                            </VStack>
                        )}

                        <FormControl isRequired>
                            <FormLabel>File Type</FormLabel>
                            <Select value={fileType} isDisabled>
                                <option value={fileType}>
                                    {fileType.charAt(0).toUpperCase() + fileType.slice(1).replace('-', ' ')}
                                </option>
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Description</FormLabel>
                            <Textarea
                                name="description"
                                placeholder={description || "Describe what these files are for"}
                                rows={3}
                                value={fileDescription}
                                onChange={(e) => setFileDescription(e.target.value)}
                                isDisabled={isUploading}
                            />
                        </FormControl>

                        {isUploading && (
                            <Box width="100%">
                                <Progress value={uploadProgress} size="sm" colorScheme="blue" />
                                <Text fontSize="sm" textAlign="center" mt={2} color={textSecondaryColor}> {/* Use theme color for text */}
                                    Uploading... {Math.round(uploadProgress)}%
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
                        colorScheme="brand"
                        onClick={handleSubmit}
                        isLoading={isUploading}
                        isDisabled={selectedFiles.length === 0 || isUploading}
                        leftIcon={<Icon as={FiUpload} />}
                    >
                        Upload ({selectedFiles.length})
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}