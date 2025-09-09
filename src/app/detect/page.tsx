import TopNav from "@/components/TopNav";
import LiveDetectionPanel from "@/components/LiveDetectionPanel";

export default function DetectPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-[#0a0a12] dark:via-[#0b0b15] dark:to-[#121229] text-foreground">
      <TopNav />
      <div className="container mx-auto px-6 py-8">
        <LiveDetectionPanel />
      </div>
    </div>
  );
}