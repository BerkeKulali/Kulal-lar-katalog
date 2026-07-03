import type { Metadata, Viewport } from "next";
import { CatalogChrome } from "@/components/CatalogChrome";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kulalılar Seramik Katalog",
  description: "Kulalılar tablet seramik katalog uygulaması",
  manifest: "/manifest.json",
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
