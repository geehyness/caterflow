import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Box,
    Text,
    VStack,
    HStack,
    Flex,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Icon,
} from '@chakra-ui/react';
import { FaBoxes } from 'react-icons/fa';
import { FiPlus } from 'react-icons/fi';
import { PendingAction } from './types';
import { Dispatch, SetStateAction } from 'react';

interface PurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    poDetails: PendingAction | null;
    editedPrices: { [key: string]: number | undefined };
    setEditedPrices: Dispatch<SetStateAction<{ [key: string]: number | undefined }>>;
    editedQuantities: { [key: string]: number | undefined };
    setEditedQuantities: Dispatch<SetStateAction<{ [key: string]: number | undefined }>>;
    isSaving: boolean;
    onConfirmOrderUpdate: () => void;
    onAddItemModalOpen: () => void;
    onRemoveItem: (itemKey: string) => void;
}

export default function PurchaseOrderModal({
    isOpen,
    onClose,
    poDetails,
    editedPrices,
    setEditedPrices,
    editedQuantities,
    setEditedQuantities,
    isSaving,
    onConfirmOrderUpdate,
    onAddItemModalOpen,
    onRemoveItem,
}: PurchaseOrderModalProps) {
    const handleUpdatePrice = (itemKey: string, newPrice: number | undefined) => {
        setEditedPrices(prev => ({
            ...prev,
            [itemKey]: newPrice,
        }));
    };

    const handleUpdateQuantity = (itemKey: string, newQuantity: number | undefined) => {
        setEditedQuantities(prev => ({
            ...prev,
            [itemKey]: newQuantity,
        }));
    };

    const isSaveDisabled =
        !poDetails?.orderedItems?.length ||
        poDetails.orderedItems.some(item => {
            const price = editedPrices[item._key] ?? item.unitPrice;
            return price <= 0;
        });

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <HStack spacing={2} alignItems="center">
                        <Icon as={FaBoxes} color="blue.500" />
                        <Text>Purchase Order Details</Text>
                    </HStack>
                </ModalHeader>
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <Flex justifyContent="space-between">
                            <Box>
                                <Text fontWeight="bold">PO Number:</Text>
                                <Text>{poDetails?.poNumber}</Text>
                            </Box>
                            <Box>
                                <Text fontWeight="bold">Supplier:</Text>
                                <Text>{poDetails?.supplierName}</Text>
                            </Box>
                            <Box>
                                <Text fontWeight="bold">Site:</Text>
                                <Text>{poDetails?.siteName}</Text>
                            </Box>
                        </Flex>
                        <Heading as="h4" size="sm" mt={4}>
                            Ordered Items
                        </Heading>
                        <Button
                            leftIcon={<FiPlus />}
                            colorScheme="blue"
                            variant="outline"
                            onClick={onAddItemModalOpen}
                            alignSelf="flex-start"
                        >
                            Add Item
                        </Button>
                        <TableContainer>
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Item</Th>
                                        <Th isNumeric>Quantity</Th>
                                        <Th isNumeric>Unit Price</Th>
                                        <Th isNumeric>Total</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {poDetails?.orderedItems?.map((item, index) => {
                                        const uniqueKey = item._key || `item-${index}`;
                                        const quantity = editedQuantities[uniqueKey] ?? (item.orderedQuantity || 0);
                                        const price = editedPrices[uniqueKey] ?? (item.unitPrice || 0);
                                        return (
                                            <Tr key={uniqueKey}>
                                                <Td>{item.stockItem.name}</Td>
                                                <Td isNumeric>
                                                    <NumberInput
                                                        value={quantity}
                                                        onChange={(_, valueAsNumber) => handleUpdateQuantity(uniqueKey, valueAsNumber)}
                                                        min={1}
                                                        width="100px"
                                                    >
                                                        <NumberInputField />
                                                        <NumberInputStepper>
                                                            <NumberIncrementStepper />
                                                            <NumberDecrementStepper />
                                                        </NumberInputStepper>
                                                    </NumberInput>
                                                </Td>
                                                <Td isNumeric>
                                                    <NumberInput
                                                        value={typeof price === 'number' ? price.toFixed(2) : price}
                                                        onChange={(valueString) => {
                                                            const value = parseFloat(valueString.replace(/[^0-9.]/g, ''));
                                                            if (!isNaN(value)) {
                                                                handleUpdatePrice(uniqueKey, value);
                                                            }
                                                        }}
                                                        min={0}
                                                        precision={2}
                                                        width="120px"
                                                    >
                                                        <NumberInputField
                                                            onBlur={(e) => {
                                                                const value = parseFloat(e.target.value);
                                                                if (!isNaN(value)) {
                                                                    handleUpdatePrice(uniqueKey, parseFloat(value.toFixed(2)));
                                                                }
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </Td>
                                                <Td isNumeric>
                                                    E {(price * quantity).toFixed(2)}
                                                </Td>
                                                <Td>
                                                    <Button
                                                        size="sm"
                                                        colorScheme="red"
                                                        variant="ghost"
                                                        onClick={() => onRemoveItem(uniqueKey)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        colorScheme="blue"
                        onClick={onConfirmOrderUpdate}
                        isLoading={isSaving}
                        loadingText="Saving"
                        isDisabled={isSaveDisabled}
                    >
                        Confirm & Save
                    </Button>
                    <Button variant="ghost" ml={3} onClick={onClose}>
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}