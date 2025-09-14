import type { Metadata } from "next";
import { Geist, Geist_Mono, Advent_Pro, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const adventPro = Advent_Pro({
  variable: "--font-advent-pro",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Granny Squares",
  description: "Granny Squares",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/final%20meatball.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${adventPro.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
