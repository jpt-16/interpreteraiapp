import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { DataProvider } from "@/lib/data/store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Décalage — Interpreter performance training", template: "%s · Décalage" },
  description:
    "Professional training for interpreters: auditory memory, consecutive and simultaneous interpreting, with meaning-based performance feedback.",
};

export const viewport: Viewport = {
  themeColor: "#0a0d14",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
