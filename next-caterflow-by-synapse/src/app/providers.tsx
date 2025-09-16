'use client';

import { ChakraProvider } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import themes from './theme/theme';
import { LoadingProvider } from '@/context/LoadingContext';
import { SidebarProvider } from '@/context/SidebarContext';
<<<<<<< HEAD
import { SessionProvider } from 'next-auth/react'; // Import the new provider
=======
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/react-query';
>>>>>>> dev

const ThemeProvider = dynamic(
  () => import('next-themes').then((mod) => mod.ThemeProvider),
  { ssr: false }
);

interface ProvidersProps {
  children?: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
<<<<<<< HEAD
    // SessionProvider must wrap the entire application
    <SessionProvider>
=======
    <QueryClientProvider client={queryClient}>
>>>>>>> dev
      <ChakraProvider theme={themes}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
<<<<<<< HEAD
          <LoadingProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </LoadingProvider>
        </ThemeProvider>
      </ChakraProvider>
    </SessionProvider>
=======
          <AuthProvider>
            <LoadingProvider>
              <SidebarProvider>
                {children}
              </SidebarProvider>
            </LoadingProvider>
          </AuthProvider>
        </ThemeProvider>
      </ChakraProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
>>>>>>> dev
  );
}