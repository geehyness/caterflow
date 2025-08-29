'use client';

import { ChakraProvider } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import themes from './theme/theme';
import { AuthProvider } from '@/context/AuthContext';
import { LoadingProvider } from '@/context/LoadingContext';

const ThemeProvider = dynamic(
  () => import('next-themes').then((mod) => mod.ThemeProvider),
  { ssr: false }
);

interface ProvidersProps {
  children?: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ChakraProvider theme={themes}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <AuthProvider>
          <LoadingProvider> {/* Wrap with LoadingProvider */}
            {children}
          </LoadingProvider>
        </AuthProvider>

      </ThemeProvider>
    </ChakraProvider>
  );
}