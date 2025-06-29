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
  title: {
    default: "Air Delivery",
    template: "%s | Secure & Instant P2P File Sharing"
  },
  description:
    "Air Delivery: Instantly send large files via peer-to-peer WebRTC—no cloud, no sign-up, no limits. Secure, encrypted, browser-to-browser transfer.",
  applicationName: "Air Delivery",
  authors: [
    { name: "Yash Jangid", url: "https://x.com/GochiStuff" }
  ],
  keywords: [
    "Air Delivery",
    "P2P file sharing",
    "WebRTC file transfer",
    "p2p file sharing",
    "peer-to-peer file transfer",
    "encrypted file sharing",
    "send large files",
    "no cloud sharing",
    "file sharing",
    "sharing p2p",
    "send files",
    "share it",
    "sharedrop",
    "airdrop",
    "peer-to-peer file transfer",
    "instant file sharing",
    "large file transfer without cloud",
    "direct browser file transfer",
    "secure peer-to-peer sharing",
    "encrypted file sharing",
    "privacy-focused file transfer",
    "send large files browser to browser",
    "no-install file sharing",
    "zero configuration file transfer",
    "firewall friendly P2P transfer",
    "anonymous file transfer online",
    "fast browser P2P file sharing",
    "transfer files without cloud storage",
    "web-based peer-to-peer file sharing",
    "secure WebRTC file sharing",
    "instant P2P file send",
    "direct device-to-device file transfer",
    "file sharing without upload",
    "peer-to-peer WebRTC app",
    "unlimited file size transfer",
    "no signup file sharing",
  ],
  metadataBase: new URL("https://airdelivery.site"),
  openGraph: {
    title: "Air Delivery – Secure & Instant P2P File Sharing",
    description:
      "Instantly send large files via peer-to-peer WebRTC—no cloud, no sign-up, no limits. Secure, encrypted, browser-to-browser transfer.",
    url: "https://airdelivery.site",
    siteName: "Air Delivery",
    images: [
      {
        url: "/og-banner.png", 
        width: 1200,
        height: 630,
        alt: "Air Delivery – Secure & Instant P2P File Sharing",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Air Delivery – Secure & Instant P2P File Sharing",
    description:
      "Instantly send large files via peer-to-peer WebRTC—no cloud, no sign-up, no limits. Secure, encrypted, browser-to-browser transfer.",
    images: ["/og-banner.png"],
    creator: "@GochiStuff",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/apple.png",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://airdelivery.site",
  },
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
               "p2p file sharing with no size limits, no cloud, end‑to‑end encryption.",
        "publisher": {
          "@id": "https://airdelivery.site/#organization",
        },
         "logo": {
          "@type": "ImageObject",
          "url": "https://airdelivery.site/icons/192.png",
        }
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



        <meta charSet="utf-8" />
        <meta itemProp="image" content="https://airdelivery.site/icons/512.png"/>
        
        {/* PWA & Performance Hints */}
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="author" content="Yash Jangid" />
        <link rel="canonical" href="https://airdelivery.site" />

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
