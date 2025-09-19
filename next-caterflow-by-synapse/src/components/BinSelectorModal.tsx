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
    InputLeftElement,
    Spinner,
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
    selectedSiteId?: string;
}

export default function BinSelectorModal({ isOpen, onClose, onSelect, selectedSiteId }: BinSelectorModalProps) {
    const [bins, setBins] = useState<Bin[]>([]);
    const [filteredBins, setFilteredBins] = useState<Bin[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const fetchBinsAndSites = useCallback(async () => {
        setLoading(true);
        try {
            const [binsRes, sitesRes] = await Promise.all([
                fetch('/api/bins'),
                fetch('/api/sites'),
            ]);

            if (!binsRes.ok || !sitesRes.ok) {
                throw new Error('Failed to fetch data');
            }

            const binsData = await binsRes.json();
            const sitesData = await sitesRes.json();

            setBins(binsData);
            setSites(sitesData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({
                title: 'Error fetching data.',
                description: 'Failed to load bins and sites.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (isOpen) {
            fetchBinsAndSites();
            setSelectedSite(selectedSiteId || '');
        }
    }, [isOpen, fetchBinsAndSites, selectedSiteId]);

    useEffect(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const newFilteredBins = bins.filter(bin =>
            (selectedSite === '' || bin.site._id === selectedSite) &&
            (bin.name.toLowerCase().includes(lowercasedSearchTerm) ||
                bin.site.name.toLowerCase().includes(lowercasedSearchTerm) ||
                (bin.locationDescription && bin.locationDescription.toLowerCase().includes(lowercasedSearchTerm)))
        );
        setFilteredBins(newFilteredBins);
    }, [searchTerm, selectedSite, bins]);

    const handleBinSelect = (bin: Bin) => {
        onSelect(bin);
        onClose();
    };

    const getBinTypeColor = (binType: string) => {
        switch (binType) {
            case 'storage':
                return 'blue';
            case 'coldStorage':
                return 'cyan';
            case 'display':
                return 'green';
            default:
                return 'gray';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Select a Bin</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <InputGroup>
                            <InputLeftElement pointerEvents="none">
                                <FiSearch color="gray.300" />
                            </InputLeftElement>
                            <Input
                                placeholder="Search bins..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                        <Select
                            placeholder="Filter by Site"
                            value={selectedSite}
                            onChange={(e) => setSelectedSite(e.target.value)}
                        >
                            <option value="">All Sites</option>
                            {sites.map(site => (
                                <option key={site._id} value={site._id}>
                                    {site.name}
                                </option>
                            ))}
                        </Select>
                        <Box maxHeight="400px" overflowY="auto">
                            {loading ? (
                                <Box textAlign="center" py={10}>
                                    <Spinner size="xl" />
                                </Box>
                            ) : filteredBins.length === 0 ? (
                                <Text textAlign="center" color="gray.500" mt={4}>
                                    No bins found.
                                </Text>
                            ) : (
                                <List spacing={3}>
                                    {filteredBins.map((bin) => (
                                        <ListItem
                                            key={bin._id}
                                            p={3}
                                            borderWidth="1px"
                                            borderRadius="md"
                                            _hover={{ bg: 'gray.100', cursor: 'pointer' }}
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
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}