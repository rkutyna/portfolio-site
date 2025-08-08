export default function Footer() {
    return (
      <footer className="mt-12 border-t border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p className="text-slate-300">
            &copy; {new Date().getFullYear()} <span className="text-sky-200 font-semibold">Roger Kutyna</span>. All rights reserved.
          </p>
        </div>
      </footer>
    );
}
