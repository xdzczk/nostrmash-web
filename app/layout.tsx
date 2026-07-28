import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { SiteShell } from "@/components/layout/site-shell";
import { WebVitals } from "@/components/telemetry/web-vitals";
import { appConfig } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.siteUrl),
  title: {
    default: appConfig.siteName,
    template: `%s · ${appConfig.siteName}`,
  },
  description: "Explore Nostr search, trends, profiles, and relay activity in one place.",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [{ url: "/feeds/trending-notes.xml", title: "Trending notes" }],
    },
  },
  openGraph: {
    type: "website",
    siteName: appConfig.siteName,
    title: appConfig.siteName,
    description: "Explore Nostr search, trends, profiles, and relay activity in one place.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: appConfig.siteName,
    description: "Explore Nostr search, trends, profiles, and relay activity in one place.",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const nonce = headerStore.get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Apply the saved theme before first paint to avoid a flash. When no
            choice is stored, the site stays on dark mode. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <WebVitals />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
