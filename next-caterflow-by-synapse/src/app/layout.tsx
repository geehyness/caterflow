'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Sidebar } from '../components/Sidebar';
import { Footer } from '../components/Footer';
import { Box, Spinner } from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLoading } from '@/context/LoadingContext'; // Add this import
import { RouteChangeHandler } from '@/components/RouteChangeHandler'; // Add this import

const inter = Inter({ subsets: ['latin'] });

const MainContentLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAuthReady } = useAuth();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const { isLoading } = useLoading(); // Add this

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isAuthReady || !isClient) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Spinner size="xl" />
      </Box>
    );
  }

  // Don't show sidebar and footer on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <Box display="flex" minHeight="100vh" position="relative">
      <Sidebar />
      <Box ml={{ base: 0, md: '250px' }} flex="1">
        <RouteChangeHandler /> {/* Add this */}
        {children}
        <Footer appName="Caterflow" />

        {/* Add overlay and loader */}
        {isLoading && (
          <Box
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="blackAlpha.800"
            zIndex="overlay"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Spinner size="xl" color="white" />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <MainContentLayout>{children}</MainContentLayout>
        </Providers>
      </body>
    </html>
  );
}