import type { Metadata } from "next";
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from "@/components/ui/sonner";
import { TopBar } from "@/components/top-bar";
import { ThemeProvider } from "next-themes"; 
import "./globals.css";
import AuthProvider from "./auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobScrub | Your Career Journey, Simplified",
  description: "Find your dream job with JobScrub. Upload your resume, discover personalized job listings, and manage your applications — all in one place.",
  keywords: ["job search", "resume upload", "career tools", "job matching", "application tracking", "employment", "job listings"],
  authors: [{ name: "Harvey Tseng" }, { name: "Karla Cardenas" }, { name: "Ligia Cerna" }, { name: "Arvinder Singh" }, { name: "Eric Paiz" }],
  icons: {
    icon: [{ url: "/favicon.ico" }],
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
          <AuthProvider>
            <TopBar />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}