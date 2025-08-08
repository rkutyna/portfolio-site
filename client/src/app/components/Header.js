import Link from 'next/link';

export default function Header() {
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
            <nav>
              {/* Navigation links */}
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
                  <Link href="/#contact" className="px-3 py-2 rounded-md text-sky-900 hover:text-sky-950 hover:bg-sky-200/50 transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>
    );
  }