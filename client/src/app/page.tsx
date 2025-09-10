import Link from "next/link";
import TopNav from '@/components/TopNav';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-[#0a0a12] dark:via-[#0b0b15] dark:to-[#121229] text-foreground">
      <TopNav />
      <main className="container mx-auto px-6 py-20 flex items-center justify-center">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Real-time Violence Detection</h1>
          <p className="mt-4 text-muted-foreground text-lg md:text-xl">
            Monitor live streams or uploaded videos with MoviNet models. Detect incidents fast with professional insights.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/detect"
              className="inline-flex items-center rounded-xl px-6 py-3 font-semibold bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/30 transition border border-primary/20"
            >
              Start Detection
            </Link>
            <a
              href="#learn-more"
              className="inline-flex items-center rounded-xl px-6 py-3 font-semibold bg-transparent text-foreground hover:bg-muted border border-border transition"
            >
              Learn more
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}