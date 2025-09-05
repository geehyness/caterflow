// src/components/AttachmentGallery.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardBody,
    Text,
    IconButton,
    useToast,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Image,
    Button,
    VStack,
    HStack,
    Spinner,
    Flex, // ADDED
    Heading, // ADDED
} from '@chakra-ui/react';
import { FiDownload, FiEye, FiTrash2, FiFile } from 'react-icons/fi';

interface Attachment {
    _id: string;
    fileName: string;
    fileType: string;
    file: {
        asset: {
            url: string;
            originalFilename: string;
            size: number;
            mimeType: string;
        };
    };
    uploadedBy: {
        _id: string;
        name: string;
    };
    uploadedAt: string;
    description?: string;
}

interface AttachmentGalleryProps {
    relatedTo: string;
    canUpload?: boolean;
    onUploadClick?: () => void;
}

export default function AttachmentGallery({
    relatedTo,
    canUpload = false,
    onUploadClick,
}: AttachmentGalleryProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const toast = useToast();

    useEffect(() => {
        const fetchAttachments = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/attachments?relatedTo=${relatedTo}`);
                if (!response.ok) throw new Error('Failed to fetch attachments');
                const data = await response.json();
                setAttachments(data);
            } catch (error) {
                console.error("Failed to fetch attachments:", error);
                toast({
                    title: 'Error',
                    description: 'Failed to load attachments',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setLoading(false);
            }
        };

        if (relatedTo) {
            fetchAttachments();
        }
    }, [relatedTo, toast]);

    const handleView = (attachment: Attachment) => {
        setViewingAttachment(attachment);
        setIsViewerOpen(true);
    };

    const handleDownload = (attachment: Attachment) => {
        const link = document.createElement('a');
        link.href = attachment.file.asset.url;
        link.download = attachment.file.asset.originalFilename || attachment.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = async (attachmentId: string) => {
        try {
            const response = await fetch(`/api/attachments/${attachmentId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete attachment');
            setAttachments(prev => prev.filter(att => att._id !== attachmentId));
            toast({
                title: 'Deleted',
                description: 'Attachment has been deleted.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error("Failed to delete attachment:", error);
            toast({
                title: 'Error',
                description: 'Failed to delete attachment',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    if (loading) {
        return (
            <Flex justify="center" align="center" height="200px">
                <Spinner size="lg" />
            </Flex>
        );
    }

    return (
        <Box>
            <HStack mb={4} justifyContent="space-between">
                <Heading as="h4" size="md">
                    Attachments ({attachments.length})
                </Heading>
                {canUpload && (
                    <Button onClick={onUploadClick}>
                        Upload
                    </Button>
                )}
            </HStack>
            {attachments.length === 0 ? (
                <Text textAlign="center" color="gray.500" py={8}>
                    No attachments have been uploaded yet.
                </Text>
            ) : (
                <Grid
                    templateColumns="repeat(auto-fill, minmax(200px, 1fr))"
                    gap={4}
                >
                    {attachments.map(attachment => (
                        <Card key={attachment._id} _hover={{ boxShadow: 'lg' }} transition="box-shadow 0.2s">
                            <CardBody p={4}>
                                <VStack spacing={2} align="stretch">
                                    <Box
                                        bg="gray.100"
                                        borderRadius="md"
                                        h="120px"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        p={2}
                                    >
                                        {attachment.file.asset.mimeType.startsWith('image/') ? (
                                            <Image
                                                src={attachment.file.asset.url}
                                                alt={attachment.fileName}
                                                maxW="full"
                                                maxH="full"
                                                objectFit="contain"
                                            />
                                        ) : (
                                            <VStack>
                                                <FiFile size={40} />
                                                <Text fontSize="xs" textAlign="center" color="gray.600" noOfLines={1}>{attachment.file.asset.mimeType}</Text>
                                            </VStack>
                                        )}
                                    </Box>
                                    <Text fontWeight="medium" noOfLines={1}>{attachment.fileName}</Text>
                                    <Text fontSize="sm" color="gray.500">
                                        by {attachment.uploadedBy.name}
                                    </Text>
                                    <HStack justifyContent="flex-end" spacing={2}>
                                        <IconButton
                                            aria-label="View attachment"
                                            icon={<FiEye />}
                                            size="sm"
                                            onClick={() => handleView(attachment)}
                                        />
                                        <IconButton
                                            aria-label="Download attachment"
                                            icon={<FiDownload />}
                                            size="sm"
                                            onClick={() => handleDownload(attachment)}
                                        />
                                        <IconButton
                                            aria-label="Delete attachment"
                                            icon={<FiTrash2 />}
                                            size="sm"
                                            colorScheme="red"
                                            variant="ghost"
                                            onClick={() => handleDelete(attachment._id)}
                                        />
                                    </HStack>
                                </VStack>
                            </CardBody>
                        </Card>
                    ))}
                </Grid>
            )}

            <Modal isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{viewingAttachment?.fileName}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {viewingAttachment && (
                            <Box textAlign="center">
                                {viewingAttachment.file.asset.mimeType.startsWith('image/') ? (
                                    <Image
                                        src={viewingAttachment.file.asset.url}
                                        alt={viewingAttachment.fileName}
                                        maxH="60vh"
                                        mx="auto"
                                    />
                                ) : (
                                    <Box textAlign="center" py={8}>
                                        <FiFile size={64} style={{ margin: '0 auto 16px' }} />
                                        <Text mb={4}>
                                            This file type cannot be previewed in the browser.
                                        </Text>
                                        <Button
                                            colorScheme="blue"
                                            onClick={() => handleDownload(viewingAttachment)}
                                            leftIcon={<FiDownload />}
                                        >
                                            Download File
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}