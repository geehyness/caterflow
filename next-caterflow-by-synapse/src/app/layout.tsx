// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { MobileTopbar } from "@/components/MobileTopbar";
import { SidebarProvider } from "@/context/SidebarContext";
import { Box } from "@chakra-ui/react"; // Import Box from Chakra UI

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Caterflow",
  description: "Caterflow Inventory Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <SidebarProvider>
            <MobileTopbar />
            <Sidebar />
            <Box
              // Add responsive padding to prevent content from being hidden
              pt={{ base: "60px", md: 0 }} // Pad for the MobileTopbar on small screens
              pl={{ base: 0, md: "250px" }} // Pad for the Sidebar on medium and larger screens
              minHeight="100vh" // Ensure the container fills the viewport height
            >
              {children}
            </Box>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}