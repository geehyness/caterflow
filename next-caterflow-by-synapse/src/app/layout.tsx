// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { MobileTopbar } from "@/components/MobileTopbar";
import { SidebarProvider } from "@/context/SidebarContext";
import { Box } from "@chakra-ui/react";
import { Footer } from "@/components/Footer"; // Import the Footer component
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Caterflow",
  description: "Caterflow Inventory Management System",
  manifest: "/manifest.json",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
              display="flex"
              flexDirection="column"
            >
              <Box flex="1">
                {children}
              </Box>
              <Footer appName="Caterflow" />
            </Box>
            <ServiceWorkerRegister />
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}