import type { Metadata } from "next";
import {  Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/hooks/socketContext";
import Header from "@/components/header";
import { Oswald } from "next/font/google";
import Head from "next/head";
import { Analytics } from "@vercel/analytics/next"
import Script from "next/script";

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
  description: "Fast, secure, and efficient peer-to-peer file transfer via airways.",
  applicationName: "Air Delivery",
  authors: [{ name: "Yash Jangid", url: "https://x.com/GochiStuff" }],
  keywords: ["File Transfer", "P2P", "WebRTC", "Air Delivery", "Fast Transfer"],
  openGraph: {
    title: "Air Delivery",
    description: "airways is the way to transport.",
    url: "https://air-delivery.vercel.app",
    siteName: "Air Delivery",
    images: [
      {
        url: "https://air-delivery.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Air Delivery File Transfer App",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Air Delivery",
    description: "Fast peer-to-peer file transfer via airways.",
    images: ["https://air-delivery.vercel.app/twitter-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">

      <Head>


        
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />


         {/*Google Analytics Scripts */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5Y4FH5R2V3"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5Y4FH5R2V3');
          `}
        </Script>
      </Head>
      <body
        className={`${oswald.variable} ${geistMono.variable} antialiased`}
      >
        <SocketProvider>
          <Header/>
        {children}
         <Analytics />
        </SocketProvider>
      </body>
    </html>
  );
}
