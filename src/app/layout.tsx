import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ThrowAtThem - Roast Friends. Throw Anything. Just for Fun.",
  description:
    "Create a funny profile, roast your friends, and throw virtual emojis, tomatoes, and hilarious objects at anyone. No signup. No login. Just fun.",
  keywords: [
    "ThrowAtThem",
    "funny profiles",
    "emoji throwing",
    "roast friends",
    "virtual tomato",
    "throw emoji",
    "fun social game",
    "anonymous fun",
    "meme game",
    "humor",
    "joke app",
    "party game",
    "emoji battle",
  ],
  openGraph: {
    title: "ThrowAtThem - Roast Friends. Throw Anything. Just for Fun.",
    description:
      "Create a funny profile, roast your friends, and throw virtual emojis, tomatoes, and hilarious objects at anyone. No signup. No login. Just fun.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ThrowAtThem - Roast Friends. Throw Anything. Just for Fun.",
    description:
      "Create a funny profile, roast your friends, and throw virtual emojis, tomatoes, and hilarious objects at anyone. No signup. No login. Just fun.",
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
