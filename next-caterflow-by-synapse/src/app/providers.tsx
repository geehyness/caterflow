// providers.tsx
'use client';

import { ChakraProvider } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import themes from './theme/theme';
import { AuthProvider } from '@/context/AuthContext';
import { LoadingProvider } from '@/context/LoadingContext';
import { SidebarProvider } from '@/context/SidebarContext'; // Make sure this import is correct

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
          <LoadingProvider>
            <SidebarProvider> {/* Make sure this is properly nested */}
              {children}
            </SidebarProvider>
          </LoadingProvider>
        </AuthProvider>
      </ThemeProvider>
    </ChakraProvider>
  );
}