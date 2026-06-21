import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { NavLinks } from "./components/NavLinks";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Search Hub",
  description: "Harshal's job hunt dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-zinc-950">
        <header className="border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-13 flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight"
            >
              Job Search Hub
            </Link>
            <NavLinks />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
