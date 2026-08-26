// Pin the zone so the year the server renders matches the browser's, which
// otherwise disagree for a few hours either side of New Year.
const currentYear = () =>
  new Date().toLocaleDateString('en-US', { year: 'numeric', timeZone: 'America/New_York' });

export default function Footer({ content }) {
  const name = content?.brand_name || 'Roger Kutyna';
  return (
    <footer className="mt-12 border-t border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
        <p className="text-slate-300">
          &copy; {currentYear()}{' '}
          <span className="text-sky-200 font-semibold">{name}</span>
          {content?.footer_text ? `. ${content.footer_text}` : '.'}
        </p>
      </div>
    </footer>
  );
}
