// app/AuthWrapper.tsx
'use client'

import { Box, Spinner } from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import LoginPage from './login/page';
import { useEffect, useState } from 'react';

interface AuthWrapperProps {
    children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
    const { isAuthenticated, isAuthReady } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration issues
    if (!mounted) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Box>
        );
    }

    if (!isAuthReady) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return <>{children}</>;
}