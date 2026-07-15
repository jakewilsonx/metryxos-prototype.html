import type { Metadata } from "next";
import { Russo_One, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const russoOne = Russo_One({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MetryxOS",
  description: "Know your reps are working LinkedIn the right way, and see the meetings it produces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${russoOne.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="min-h-full bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
