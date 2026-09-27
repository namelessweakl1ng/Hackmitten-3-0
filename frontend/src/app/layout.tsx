import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/auth/session-provider";
import { QueryProvider } from "@/components/auth/query-provider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hackmitten 3.0 — Ideas Beyond the Horizon",
  description:
    "24 hours. Limitless possibilities. Enter the event horizon at Hackmitten 3.0.",
  keywords: ["hackathon", "hackmitten", "innovation", "code", "build break rebuild"],
  openGraph: {
    title: "Hackmitten 3.0",
    description: "Ideas beyond the horizon. 24 hours of build, break, rebuild.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <SessionProvider>
          <QueryProvider>
            {children}
            <Toaster />
            <SonnerToaster />
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
