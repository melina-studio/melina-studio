import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { DevtoolsProvider } from "@/providers/DevtoolsProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Melina Studio – Cursor for Canvas",
  description:
    "Cursor for canvas. Turn thoughts into visual clarity through conversation. Melina is an AI design tool that brings your ideas to life exactly as you imagine.",
  icons: {
    icon: [{ url: "/logo/melina-studio-logo.png", sizes: "1024x1024", type: "image/png" }],
    apple: "/logo/apple-touch-icon.png",
  },

  openGraph: {
    title: "Melina Studio – Cursor for Canvas",
    description:
      "Cursor for canvas. Turn thoughts into visual clarity through conversation. Melina is an AI design tool that brings your ideas to life exactly as you imagine.",
    url: "https://melina.studio",
    siteName: "Melina Studio",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Melina Studio – Cursor for Canvas",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Melina Studio – Cursor for Canvas",
    description:
      "Cursor for canvas. Turn thoughts into visual clarity through conversation. Melina is an AI design tool that brings your ideas to life exactly as you imagine. ",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <DevtoolsProvider>{children}</DevtoolsProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
