import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { DevtoolsProvider } from "@/providers/DevtoolsProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/custom/General/AppSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Melina Studio",
  description:
    "Cursor for canvas. Turn thoughts into visual clarity with Melina, exactly the way you imagine it.",

  // openGraph: {
  //   title: "Melina Studio",
  //   description:
  //     "Cursor for canvas. Bring out the visual representation you’ve always wanted with Melina.",
  //   url: "https://melinastudio.com",
  //   siteName: "Melina Studio",
  //   images: [
  //     {
  //       url: "https://melinastudio.com/og.png",
  //       width: 1200,
  //       height: 630,
  //       alt: "Melina Studio – Cursor for Canvas",
  //     },
  //   ],
  //   type: "website",
  // },

  // twitter: {
  //   card: "summary_large_image",
  //   title: "Melina Studio",
  //   description:
  //     "Cursor for canvas. Bring out the visual representation you’ve always wanted with Melina.",
  //   images: ["https://melinastudio.com/og.png"],
  // },
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <DevtoolsProvider>{children}</DevtoolsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
