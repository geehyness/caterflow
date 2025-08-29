'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Heading,
    Flex,
    Text,
    Button,
    useDisclosure,
    IconButton,
    HStack,
    useToast,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Spinner,
} from '@chakra-ui/react';
import DataTable, { Column } from '@/components/DataTable';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { useAuth } from '@/context/AuthContext';
import SiteModal from '@/components/SiteModal';
import BinModal from '@/components/BinModal';

// Interfaces for data types
interface Bin {
    _id: string;
    name: string;
    binType: string;
    locationDescription: string;
    site: {
        _id: string;
        name: string;
    };
}

interface Site {
    _id: string;
    name: string;
    location: string;
    manager: {
        _id: string;
        name: string;
    };
    contactNumber?: string;
    email?: string;
    patientCount?: number;
}

export default function LocationsPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [bins, setBins] = useState<Bin[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSite, setSelectedSite] = useState<Site | null>(null);
    const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    // Modals for Sites and Bins
    const { isOpen: isSiteModalOpen, onOpen: onSiteModalOpen, onClose: onSiteModalClose } = useDisclosure();
    const { isOpen: isBinModalOpen, onOpen: onBinModalOpen, onClose: onBinModalClose } = useDisclosure();

    const toast = useToast();
    const { user, isAuthReady } = useAuth();
    const isSiteManagerOrAdmin = user?.role === 'siteManager' || user?.role === 'admin';



    // Fetch all sites and bins using API
    const fetchLocations = useCallback(async () => {
        try {
            setLoading(true);
            const [sitesResponse, binsResponse] = await Promise.all([
                fetch('/api/sites'),
                fetch('/api/bins')
            ]);

            if (!sitesResponse.ok || !binsResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            const [siteData, binData] = await Promise.all([
                sitesResponse.json(),
                binsResponse.json()
            ]);

            setSites(siteData);
            setBins(binData);
        } catch (error) {
            console.error("Failed to fetch locations and bins:", error);
            toast({
                title: "Error",
                description: "Failed to fetch locations and bins",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (isAuthReady) {
            fetchLocations();
        }
    }, [isAuthReady, fetchLocations]);

    // Handlers for Site actions
    const handleAddSite = () => {
        setSelectedSite(null);
        onSiteModalOpen();
    };

    const handleEditSite = (site: Site) => {
        setSelectedSite(site);
        onSiteModalOpen();
    };

    const handleDeleteSite = async (site: Site) => {
        if (confirm(`Are you sure you want to delete the site "${site.name}"? This will also delete all associated bins.`)) {
            try {
                // First, delete all bins associated with the site
                const binsToDelete = bins.filter(bin => bin.site._id === site._id);
                const binDeletionPromises = binsToDelete.map(bin =>
                    fetch(`/api/bins?id=${bin._id}`, { method: 'DELETE' })
                );
                await Promise.all(binDeletionPromises);

                // Then, delete the site itself
                await fetch(`/api/sites?id=${site._id}`, { method: 'DELETE' });

                toast({
                    title: "Success",
                    description: "Site and all associated bins deleted successfully",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
                fetchLocations(); // Refresh the list
            } catch (error) {
                console.error("Failed to delete site:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete site",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            }
        }
    };

    // Handlers for Bin actions
    const handleAddBin = () => {
        setSelectedBin(null);
        onBinModalOpen();
    };

    const handleEditBin = (bin: Bin) => {
        setSelectedBin(bin);
        onBinModalOpen();
    };

    const handleDeleteBin = async (bin: Bin) => {
        if (confirm(`Are you sure you want to delete the bin "${bin.name}"?`)) {
            try {
                const response = await fetch(`/api/bins?id=${bin._id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete bin');
                }

                toast({
                    title: "Success",
                    description: "Bin deleted successfully",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
                fetchLocations(); // Refresh the list
            } catch (error) {
                console.error("Failed to delete bin:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete bin",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            }
        }
    };

    const handleItemSaved = () => {
        onSiteModalClose();
        onBinModalClose();
        fetchLocations(); // Refresh the list after save
    };

    const siteColumns: Column[] = [
        {
            accessorKey: 'actions',
            header: 'Actions',
            isSortable: false,
            cell: (row: Site) => (
                <HStack spacing={2}>
                    <IconButton
                        aria-label="Edit site"
                        icon={<EditIcon />}
                        size="sm"
                        colorScheme="blue"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditSite(row);
                        }}
                    />
                    <IconButton
                        aria-label="Delete site"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSite(row);
                        }}
                    />
                </HStack>
            ),
        },
        { accessorKey: 'name', header: 'Site Name', isSortable: true },
        { accessorKey: 'location', header: 'Location', isSortable: true },
        { accessorKey: 'manager.name', header: 'Manager', isSortable: true },
        { accessorKey: 'contactNumber', header: 'Contact', isSortable: false },
    ];

    const binColumns: Column[] = [
        {
            accessorKey: 'actions',
            header: 'Actions',
            isSortable: false,
            cell: (row: Bin) => (
                <HStack spacing={2}>
                    <IconButton
                        aria-label="Edit bin"
                        icon={<EditIcon />}
                        size="sm"
                        colorScheme="blue"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditBin(row);
                        }}
                    />
                    <IconButton
                        aria-label="Delete bin"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBin(row);
                        }}
                    />
                </HStack>
            ),
        },
        { accessorKey: 'name', header: 'Bin Name', isSortable: true },
        { accessorKey: 'site.name', header: 'Site', isSortable: true },
        { accessorKey: 'binType', header: 'Type', isSortable: true },
        { accessorKey: 'locationDescription', header: 'Description', isSortable: false },
    ];

    if (!isAuthReady) {
        return (
            <Flex justify="center" align="center" height="80vh">
                <Spinner size="xl" />
            </Flex>
        );
    }

    if (!isSiteManagerOrAdmin) {
        return (
            <Box p={8}>
                <Text color="red.500">You do not have permission to view this page.</Text>
            </Box>
        );
    }

    return (
        <Box p={8} flex="1">
            <Heading as="h1" size="xl" mb={6}>
                Locations Management
            </Heading>

            <Tabs variant="enclosed" onChange={(index) => setActiveTab(index)}>
                <TabList>
                    <Tab>Sites</Tab>
                    <Tab>Storage Bins</Tab>
                </TabList>

                <TabPanels>
                    {/* Sites Tab */}
                    <TabPanel p={0} mt={6}>
                        <Flex justify="space-between" align="center" mb={6}>
                            <Heading as="h2" size="lg">
                                Sites
                            </Heading>
                            <Button colorScheme="blue" onClick={handleAddSite}>
                                Add New Site
                            </Button>
                        </Flex>
                        <Text mb={6} color="gray.600">
                            Manage and view all sites.
                        </Text>
                        <DataTable
                            columns={siteColumns}
                            data={sites}
                            loading={loading}
                        />
                    </TabPanel>

                    {/* Bins Tab */}
                    <TabPanel p={0} mt={6}>
                        <Flex justify="space-between" align="center" mb={6}>
                            <Heading as="h2" size="lg">
                                Storage Bins
                            </Heading>
                            <Button colorScheme="blue" onClick={handleAddBin}>
                                Add New Bin
                            </Button>
                        </Flex>
                        <Text mb={6} color="gray.600">
                            Manage and view all storage bins.
                        </Text>
                        <DataTable
                            columns={binColumns}
                            data={bins}
                            loading={loading}
                        />
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <SiteModal
                isOpen={isSiteModalOpen}
                onClose={onSiteModalClose}
                site={selectedSite}
                onSave={handleItemSaved}
            />
            <BinModal
                isOpen={isBinModalOpen}
                onClose={onBinModalClose}
                bin={selectedBin}
                onSave={handleItemSaved}
            />
        </Box>
    );
}