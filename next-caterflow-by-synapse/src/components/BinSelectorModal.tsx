// components/BinSelectorModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    VStack,
    HStack,
    Input,
    Select,
    List,
    ListItem,
    Box,
    Text,
    Badge,
    useToast,
    InputGroup,
    InputLeftElement, // Add this import
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';

interface Site {
    _id: string;
    name: string;
}

interface Bin {
    _id: string;
    name: string;
    site: Site;
    binType: string;
    locationDescription?: string;
}

interface BinSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (bin: Bin) => void;
}

export default function BinSelectorModal({ isOpen, onClose, onSelect }: BinSelectorModalProps) {
    const [bins, setBins] = useState<Bin[]>([]);
    const [filteredBins, setFilteredBins] = useState<Bin[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const fetchBinsAndSites = useCallback(async () => {
        try {
            const [binsResponse, sitesResponse] = await Promise.all([
                fetch('/api/bins'),
                fetch('/api/sites')
            ]);

            if (!binsResponse.ok || !sitesResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            const binsData = await binsResponse.json();
            const sitesData = await sitesResponse.json();

            setBins(binsData);
            setSites(sitesData);
        } catch (error) {
            console.error('Error fetching bins and sites:', error);
            toast({
                title: 'Error',
                description: 'Failed to load bins and sites. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const filterBins = useCallback(() => {
        let filtered = bins;

        if (selectedSite) {
            filtered = filtered.filter(bin => bin.site._id === selectedSite);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(bin =>
                bin.name.toLowerCase().includes(term) ||
                bin.site.name.toLowerCase().includes(term) ||
                bin.locationDescription?.toLowerCase().includes(term)
            );
        }

        setFilteredBins(filtered);
    }, [bins, selectedSite, searchTerm]);

    useEffect(() => {
        if (isOpen) {
            fetchBinsAndSites();
        }
    }, [isOpen, fetchBinsAndSites]);

    useEffect(() => {
        filterBins();
    }, [filterBins]);

    const handleBinSelect = (bin: Bin) => {
        onSelect(bin);
        onClose();
    };

    const getBinTypeColor = (type: string) => {
        switch (type) {
            case 'main-storage': return 'blue';
            case 'overflow-storage': return 'orange';
            case 'refrigerator': return 'green';
            case 'freezer': return 'teal';
            case 'dispensing-point': return 'purple';
            case 'receiving-area': return 'pink';
            default: return 'gray';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Select a Bin</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <HStack>
                            <Select
                                placeholder="Filter by site"
                                value={selectedSite}
                                onChange={(e) => setSelectedSite(e.target.value)}
                            >
                                {sites.map(site => (
                                    <option key={site._id} value={site._id}>
                                        {site.name}
                                    </option>
                                ))}
                            </Select>
                            <InputGroup> {/* Add InputGroup wrapper */}
                                <InputLeftElement pointerEvents="none">
                                    <FiSearch color="gray.300" />
                                </InputLeftElement>
                                <Input
                                    placeholder="Search bins..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </HStack>

                        <Box maxH="400px" overflowY="auto">
                            {loading ? (
                                <Text>Loading bins...</Text>
                            ) : filteredBins.length === 0 ? (
                                <Text>No bins found.</Text>
                            ) : (
                                <List spacing={3}>
                                    {filteredBins.map(bin => (
                                        <ListItem
                                            key={bin._id}
                                            p={3}
                                            borderWidth="1px"
                                            borderRadius="md"
                                            cursor="pointer"
                                            _hover={{ bg: 'gray.50' }}
                                            onClick={() => handleBinSelect(bin)}
                                        >
                                            <VStack align="start" spacing={1}>
                                                <HStack>
                                                    <Text fontWeight="bold">{bin.name}</Text>
                                                    <Badge colorScheme={getBinTypeColor(bin.binType)}>
                                                        {bin.binType}
                                                    </Badge>
                                                </HStack>
                                                <Text fontSize="sm">Site: {bin.site.name}</Text>
                                                {bin.locationDescription && (
                                                    <Text fontSize="sm">Location: {bin.locationDescription}</Text>
                                                )}
                                            </VStack>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}