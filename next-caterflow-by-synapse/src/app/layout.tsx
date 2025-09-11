// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { MobileTopbar } from "@/components/MobileTopbar";
import { SidebarProvider } from "@/context/SidebarContext";
import { Box } from "@chakra-ui/react";
import { useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Caterflow",
  description: "Caterflow Inventory Management System",
  manifest: "/manifest.json", // Add this line
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#326AA0" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          <SidebarProvider>
            <MobileTopbar />
            <Sidebar />
            <Box
              pt={{ base: "60px", md: 0 }}
              pl={{ base: 0, md: "250px" }}
              minHeight="100vh"
            >
              {children}
            </Box>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}