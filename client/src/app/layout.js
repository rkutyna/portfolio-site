import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import LoggerInit from "./components/LoggerInit";
// Ensure logger runs in browser bundle and exposes window.logger
import "../utils/logger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "R. Kutyna | Full-Stack Developer Portfolio",
  description: "A portfolio of full-stack development projects by R. Kutyna.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-sky-100 flex flex-col min-h-screen`}
      >
        {/* Initialize client-side logger */}
        <LoggerInit />
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
