import Link from "next/link";
import TopNav from '@/components/TopNav';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1020] via-[#12142a] to-[#1a1f3b] text-white">
      <TopNav />
      <main className="container mx-auto px-6 py-20 flex items-center justify-center">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Real-time Violence Detection</h1>
          <p className="mt-4 text-muted-foreground/80 text-lg md:text-xl">
            Monitor live streams or uploaded videos with MoviNet models. Detect incidents fast with professional insights.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/detect"
              className="inline-flex items-center rounded-xl px-6 py-3 font-semibold bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md shadow-lg transition"
            >
              Start Detection
            </Link>
            <a
              href="#learn-more"
              className="inline-flex items-center rounded-xl px-6 py-3 font-semibold bg-transparent hover:bg-white/5 border border-white/10 backdrop-blur-md transition"
            >
              Learn more
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}