import {
    Card,
    CardBody,
    VStack,
    HStack,
    Badge,
    Button,
    Text,
    Heading,
    useColorModeValue,
} from '@chakra-ui/react';
import { FiCheckCircle, FiPaperclip } from 'react-icons/fi';
import { PendingAction } from './types';

interface ActionCardProps {
    action: PendingAction;
    onOpenWorkflow: () => void;
    onOpenUploadModal: () => void;
}

const priorityColors = {
    high: 'red',
    medium: 'orange',
    low: 'blue',
};

export default function ActionCard({ action, onOpenWorkflow, onOpenUploadModal }: ActionCardProps) {
    const cardBg = useColorModeValue('neutral.light.bg-card', 'neutral.dark.bg-card');

    return (
        <Card bg={cardBg}>
            <CardBody>
                <HStack mb={2} justifyContent="space-between">
                    <Badge colorScheme={priorityColors[action.priority]}>
                        {action.priority.toUpperCase()}
                    </Badge>
                    <Text fontSize="sm" color="gray.500">
                        {new Date(action.createdAt).toLocaleDateString()}
                    </Text>
                </HStack>
                <VStack align="start" spacing={1}>
                    <Heading as="h3" size="md">
                        {action.title}
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                        {action.description}
                    </Text>
                    <Text fontSize="sm" color="gray.500" fontStyle="italic">
                        Site: {action.siteName}
                    </Text>
                </VStack>
                <HStack mt={4} spacing={4}>
                    <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={onOpenWorkflow}
                        leftIcon={<FiCheckCircle />}
                        flexGrow={1}
                    >
                        Resolve Action
                    </Button>
                    {action.evidenceRequired && (
                        <Button
                            size="sm"
                            variant="outline"
                            colorScheme={action.evidenceStatus === 'complete' ? 'green' : 'orange'}
                            onClick={onOpenUploadModal}
                            leftIcon={<FiPaperclip />}
                        >
                            Evidence
                        </Button>
                    )}
                </HStack>
            </CardBody>
        </Card>
    );
}