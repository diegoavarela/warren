import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Warren Financial Parser",
  description: "Intelligent multilingual Excel parser for financial statements with LATAM support",
  keywords: ["Excel", "financial", "parser", "LATAM", "Spanish", "P&L", "cash flow"],
  authors: [{ name: "Warren Financial Solutions" }],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Warren Financial Parser",
    description: "Transform your financial Excel files with intelligent parsing and mapping",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full antialiased`}>
        <LocaleProvider>
          <AuthProvider>
            <div className="min-h-full bg-gray-50">
              {children}
            </div>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}