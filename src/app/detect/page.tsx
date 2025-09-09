import TopNav from "@/components/TopNav";
import LiveDetectionPanel from "@/components/LiveDetectionPanel";

export default function DetectPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1020] via-[#12142a] to-[#1a1f3b] text-white">
      <TopNav />
      <div className="container mx-auto px-6 py-8">
        <LiveDetectionPanel />
      </div>
    </div>
  );
}