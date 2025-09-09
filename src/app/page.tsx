"use client";

import TopNav from '@/components/TopNav';
import LiveDetectionPanel from '@/components/LiveDetectionPanel';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="container mx-auto px-6 py-8">
        <LiveDetectionPanel />
      </main>
    </div>
  );
}