export default function Hero() {
  return (
    <section className="text-center mt-8 mb-10 rounded-2xl p-10 sm:p-16 bg-white/10 backdrop-blur-xl border border-white/10 shadow-sm">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-sky-100">Roger Kutyna</h1>
      <p className="text-lg sm:text-xl mt-4 text-slate-300"> Aspiring ML Engineer and Bird Photography Enthusiast - BA in Computer Science, Master&apos;s of IT student</p>
      <a
        href="#projects"
        className="mt-8 inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-5 rounded-lg shadow transition-colors"
      >
        View My Work
        <span aria-hidden>→</span>
      </a>
    </section>
  );
}
