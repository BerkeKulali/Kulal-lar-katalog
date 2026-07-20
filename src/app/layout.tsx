import type { Metadata, Viewport } from "next";
import { CatalogChrome } from "@/components/CatalogChrome";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kulalılar Seramik Katalog",
  description: "Kulalılar tablet seramik katalog uygulaması",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kulalılar Katalog",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full">
      <body className="min-h-full antialiased">
        <ThemeProvider>
          <CatalogChrome>{children}</CatalogChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
