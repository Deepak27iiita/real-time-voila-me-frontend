"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LayoutPanelTop } from "lucide-react";
import { toast } from "sonner";

type ConnectionStatus = "Connected" | "Disconnected" | "Reconnecting";

export default function TopNav() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("Disconnected");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Read connection status from localStorage if available
    if (typeof window !== "undefined") {
      const storedStatus = localStorage.getItem("connectionStatus") as ConnectionStatus;
      if (storedStatus && ["Connected", "Disconnected", "Reconnecting"].includes(storedStatus)) {
        setConnectionStatus(storedStatus);
      }
    }
  }, []);

  const handleUserAction = (action: string) => {
    toast(`${action} clicked`, {
      description: `You clicked on ${action}. This is a demo action.`,
    });
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleOpenDemo = () => {
    toast("Opening demo", {
      description: "Demo functionality would open here.",
    });
    setIsHelpOpen(false);
    setIsMobileMenuOpen(false);
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case "Connected":
        return "bg-green-500";
      case "Reconnecting":
        return "bg-amber-500";
      case "Disconnected":
      default:
        return "bg-red-500";
    }
  };

  // Server-side render: only show brand
  if (!isClient) {
    return (
      <header className="bg-card border-b border-border" role="banner">
        <div className="flex items-center h-14 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <LayoutPanelTop className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">VoilaDetect</h1>
              <p className="text-xs text-muted-foreground">Real-time monitoring</p>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-white/10 bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/5" role="banner">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <LayoutPanelTop className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">VoilaDetect</h1>
            <p className="text-xs text-muted-foreground">Real-time monitoring</p>
          </div>
        </div>

        {/* Center: Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          <Link href="/detect" className="text-muted-foreground hover:text-foreground transition-colors">Detect</Link>
          <Link href="/results" className="text-muted-foreground hover:text-foreground transition-colors">Results</Link>
        </nav>

        {/* Right: Desktop utilities */}
        <div className="hidden md:flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus)}`} />
            <span className="text-muted-foreground">{connectionStatus}</span>
          </div>

          {/* User Menu */}
          <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
                aria-label="User menu"
              >
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  U
                </div>
                <span className="text-sm font-medium">User</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleUserAction("Profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUserAction("Settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUserAction("Sign out")}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help Button */}
          <Popover open={isHelpOpen} onOpenChange={setIsHelpOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Help and quick tips">
                ?
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Quick Usage Tips</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. Connect your video stream using the connection panel</p>
                  <p>2. Start detection to begin monitoring</p>
                  <p>3. Adjust threshold settings as needed</p>
                  <p>4. Review events in the timeline</p>
                </div>
                <Button 
                  onClick={handleOpenDemo} 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                >
                  Open Demo
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: Mobile menu button */}
        <div className="md:hidden">
          <DropdownMenu open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Menu">
                <Menu className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b">
                Status: {connectionStatus}
              </div>
              <DropdownMenuItem asChild>
                <Link href="/">Home</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/detect">Detect</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/results">Results</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUserAction("Profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUserAction("Settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenDemo}>
                Open Demo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUserAction("Sign out")}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}