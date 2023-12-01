import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import TRPCProvider from "@/components/providers/trpc-provider";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { ConfettiProvider } from "@/components/providers/confetti-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LMS Platform",
  description: "Best LMS Platform in the world",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <TRPCProvider>
          <body className={inter.className}>
            <ConfettiProvider />
            <Toaster />
            {children}
          </body>
        </TRPCProvider>
      </html>
    </ClerkProvider>
  );
}
