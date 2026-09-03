import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import AppNav from "@/components/AppNav";
import BottomTabBar from "@/components/BottomTabBar";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: 'FailTrail — Roz ki galti, ab data me',
  description: 'Daily tasks plan karo, alarm par start karo, rukawat ka kaaran track karo, weekly AI se pattern samjho.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'FailTrail', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  themeColor: '#1e1b4b',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <AppNav />
          {children}
          <BottomTabBar />
        </LanguageProvider>
      </body>
    </html>
  );
}
