import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import LoggerInit from "./components/LoggerInit";
// Ensure logger runs in browser bundle and exposes window.logger
import "../utils/logger";
import { getContent } from "../lib/content";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Title and description are admin-editable, so metadata is generated per
// request rather than being a static export.
export async function generateMetadata() {
  const content = await getContent();
  return {
    title: content.site_title,
    description: content.site_description,
  };
}

export default async function RootLayout({ children }) {
  const content = await getContent();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-slate-100 flex flex-col min-h-screen bg-gradient-to-b from-sky-950 via-indigo-950 to-slate-950`}
      >
        {/* Initialize client-side logger */}
        <LoggerInit />
        <Header brandName={content.brand_name} />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">{children}</main>
        <Footer content={content} />
      </body>
    </html>
  );
}
