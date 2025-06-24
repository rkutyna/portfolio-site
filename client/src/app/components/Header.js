import Link from 'next/link';

export default function Header() {
    return (
      // <header> is the main container for our header.
      // We add Tailwind classes to it for styling.
      // - `flex`: Turns on Flexbox layout.
      // - `justify-between`: Puts space between its children (pushes title and nav apart).
      // - `items-center`: Aligns the children vertically to the center.
      // - `p-4`: Adds padding of 1rem (16px) on all sides.
      // - `border-b`: Adds a light gray border to the bottom.
      <header className="flex justify-between items-center p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">My Portfolio</h1>
        </div>
        <nav>
          {/* This is the list of navigation links. */}
          {/* - `flex`: Turns on Flexbox for the list items as well. */}
          {/* - `gap-4`: Adds a gap of 1rem (16px) between each link. */}
          <ul className="flex gap-4">
            <li><Link href="/" className="hover:underline">Home</Link></li>
            <li><Link href="/#about" className="hover:underline">About</Link></li>
            <li><Link href="/#projects" className="hover:underline">Projects</Link></li>
            <li><Link href="/#contact" className="hover:underline">Contact</Link></li>
          </ul>
        </nav>
      </header>
    );
  }