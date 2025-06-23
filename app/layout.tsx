import type { Metadata } from "next";
import {  Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/hooks/socketContext";
import Header from "@/components/header";
import { Oswald } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import Script from "next/script";
import FooterStrip from "@/components/footer";
import Providers from "./providers";

const oswald = Oswald({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Air Delivery – Secure & Fast P2P File Sharing",
  description:
    "Send files instantly with Air Delivery: peer-to-peer transfers via a simple flight code. No login, no ads, secure and efficient.",
  applicationName: "Air Delivery",
  authors: [{ name: "Yash Jangid", url: "https://x.com/GochiStuff" }],
  keywords: [
    "P2P file sharing",
    "peer-to-peer transfer",
    "Air Delivery",
    "WebRTC",
    "file transfer",
    "secure file sharing",
  ],
  metadataBase: new URL("https://airdelivery.site"),
  openGraph: {
    title: "Air Delivery – Secure & Fast P2P File Sharing",
    description:
      "Send files instantly with Air Delivery: peer-to-peer transfers via a simple flight code. No login, no ads, secure and efficient.",
    url: "https://airdelivery.site",
    siteName: "Air Delivery",
    images: [
      {
        url: "/og-banner.png", 
        width: 1200,
        height: 630,
        alt: "Air Delivery – Peer-to-peer file sharing via flight code",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Air Delivery – Secure & Fast P2P File Sharing",
    description:
      "Send files instantly with Air Delivery: peer-to-peer transfers via a simple flight code. No login, no ads, secure and efficient.",
    images: ["/og-banner.png"],
    creator: "@GochiStuff", // update if needed
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/apple.png",
  },
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://airdelivery.site/#website",
        "url": "https://airdelivery.site/",
        "name": "Air Delivery",
        "description":
          "Send files instantly with Air Delivery: peer-to-peer transfers via a simple flight code. No login, no ads, secure and efficient.",
        "publisher": {
          "@id": "https://airdelivery.site/#organization",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://airdelivery.site/#organization",
        "name": "Air Delivery",
        "url": "https://airdelivery.site/",
        "logo": {
          "@type": "ImageObject",
          "url": "https://airdelivery.site/favicon.ico",
        },
        "sameAs": [
          "https://twitter.com/GochiStuff"
        ],
      },
      {
        "@type": "SoftwareApplication",
        "name": "Air Delivery",
        "operatingSystem": "All",
        "applicationCategory": "WebApplication",
        "browserRequirements": "Requires JavaScript",
        "url": "https://airdelivery.site/",
        "description": "Free peer-to-peer file sharing tool using secure direct browser connections. No upload, no sign-up, just send.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      }

    ],
  };

  


  return (


    <html lang="en">

      <head>


        
        {/* PWA & Performance Hints */}
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />

        {/* Structured Data JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

      </head>
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
      <body
        className={`${oswald.variable} ${geistMono.variable} antialiased`}
      >
        <SocketProvider>
        <Providers>
          
          <Header/>
        {children}
        <FooterStrip/>
        </Providers>
        </SocketProvider>
         <Analytics />
      </body>
    </html>
  );
}
