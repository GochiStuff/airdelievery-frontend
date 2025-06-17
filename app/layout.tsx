import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/hooks/socketContext";
import Header from "@/components/header";
import { Oswald } from "next/font/google";

const oswald = Oswald({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Air Delivery",
  description: "airways is the way to transport.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${oswald.variable} ${geistMono.variable} antialiased`}
      >
        <SocketProvider>
          <Header/>
        {children}
        </SocketProvider>
      </body>
    </html>
  );
}
