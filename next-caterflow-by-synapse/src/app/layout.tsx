// src/app/layout.tsx
'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Sidebar } from '../components/Sidebar';
import { Footer } from '../components/Footer';
import { Box, Spinner } from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

const MainContentLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAuthReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only redirect if we're not already on the login page
    if (isAuthReady && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthReady, router, pathname]);

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
    <Box display="flex" minHeight="100vh">
      <Sidebar />
      <Box ml={{ base: 0, md: '250px' }} flex="1">
        {children}
        <Footer appName="Caterflow" />
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