import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import AppNav from "@/components/AppNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'FailTrail — Roz ki galti, ab data me',
  description: 'Daily tasks plan karo, alarm par start karo, rukawat ka kaaran track karo, weekly AI se pattern samjho.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'FailTrail', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  themeColor: '#1e1b4b',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <AppNav />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
