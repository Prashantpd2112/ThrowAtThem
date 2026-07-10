import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ThrowAtThem - Throw Fun at the World!",
  description:
    "A fun cartoon world where you can anonymously throw silly objects at countries around the globe. No signup needed!",
  keywords: ["world throw", "fun", "game", "cartoon", "anonymous", "entertainment"],
  openGraph: {
    title: "ThrowAtThem - Throw Fun at the World!",
    description:
      "A fun cartoon world where you can anonymously throw silly objects at countries around the globe.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-wt-cream dark:bg-wt-dark text-gray-800 dark:text-gray-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
