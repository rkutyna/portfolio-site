"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
    const [mobileOpen, setMobileOpen] = useState(false);
    return (
      // Sticky translucent header with a light blue theme
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-sky-100/60 border-b border-sky-300/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <Link href="/" aria-label="Go to home" className="inline-block px-2 py-1 rounded-md text-xl sm:text-2xl font-bold tracking-tight text-sky-900 hover:bg-sky-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                Roger Kutyna
              </Link>
            </div>
            {/* Desktop nav */}
            <nav className="hidden md:block">
              <ul className="flex gap-1 sm:gap-2">
                <li>
                  <Link href="/" className="px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/#about" className="px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/#projects" className="px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors">
                    Projects
                  </Link>
                </li>
                <li>
                  <Link href="/#blogs" className="px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors">
                    Blog Posts
                  </Link>
                </li>
                <li>
                  <Link href="/photos" className="px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors">
                    Photos
                  </Link>
                </li>
                <li>
                  <Link href="/resume" className="px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors">
                    Resume
                  </Link>
                </li>
                <li>
                  <Link href="/#contact" className="px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </nav>
            {/* Mobile hamburger */}
            <div className="md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                aria-controls="mobile-menu"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileOpen ? (
                  // X icon
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  // Hamburger icon
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {/* Mobile dropdown */}
          {mobileOpen && (
            <div id="mobile-menu" className="md:hidden pb-4">
              <ul className="space-y-1 rounded-lg border border-sky-300/60 bg-sky-100/60 backdrop-blur-lg p-2 shadow-sm">
                <li>
                  <Link href="/" className="block px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors" onClick={() => setMobileOpen(false)}>
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/#about" className="block px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors" onClick={() => setMobileOpen(false)}>
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/#projects" className="block px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors" onClick={() => setMobileOpen(false)}>
                    Projects
                  </Link>
                </li>
                <li>
                  <Link href="/#blogs" className="block px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors" onClick={() => setMobileOpen(false)}>
                    Blog Posts
                  </Link>
                </li>
                <li>
                  <Link href="/photos" className="block px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors" onClick={() => setMobileOpen(false)}>
                    Photos
                  </Link>
                </li>
                <li>
                  <Link href="/resume" className="block px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors" onClick={() => setMobileOpen(false)}>
                    Resume
                  </Link>
                </li>
                <li>
                  <Link href="/#contact" className="block px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors" onClick={() => setMobileOpen(false)}>
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>
    );
  }