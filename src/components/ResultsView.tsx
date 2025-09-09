"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

interface DetectionEvent {
  id: string;
  timestamp: string | Date;
  confidence: number;
  model: string;
  thumbnail?: string;
  note?: string;
}

export const ResultsView: React.FC = () => {
  const router = useRouter();
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [snapshot, setSnapshot] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("detection-events");
      if (raw) {
        const parsed: DetectionEvent[] = JSON.parse(raw);
        setEvents(
          parsed.map((e) => ({
            ...e,
            timestamp: typeof e.timestamp === "string" ? e.timestamp : new Date(e.timestamp).toISOString(),
          }))
        );
      }
      const src = localStorage.getItem("lastVideoSrc") || "";
      const shot = localStorage.getItem("lastSnapshot") || "";
      setVideoSrc(src);
      setSnapshot(shot);
    } catch (e) {
      console.error("Failed to load results:", e);
    }
  }, []);

  const highCount = useMemo(() => events.filter((e) => e.confidence >= 90).length, [events]);
  const avg = useMemo(
    () => (events.length ? (events.reduce((s, e) => s + e.confidence, 0) / events.length).toFixed(1) : "0.0"),
    [events]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="container mx-auto px-6 py-8 text-white"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/10 border-white/15 backdrop-blur-md shadow-2xl lg:col-span-2 hover:bg-white/15 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                  Results Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {videoSrc ? (
                    <motion.video 
                      key="video"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      src={videoSrc} 
                      controls 
                      className="w-full aspect-video rounded-lg shadow-lg" 
                    />
                  ) : snapshot ? (
                    <motion.div 
                      key="snapshot"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full aspect-video bg-black/50 rounded-lg flex items-center justify-center overflow-hidden shadow-lg"
                    >
                      <img src={snapshot} alt="Last snapshot" className="w-full h-full object-contain" />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full aspect-video bg-gradient-to-br from-gray-800/40 to-gray-700/40 rounded-lg flex items-center justify-center text-sm text-gray-300 border border-white/10 backdrop-blur-sm"
                    >
                      No video source saved. Return to Detect and start a camera, stream, or upload.
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-white/10 border-white/15 backdrop-blur-md shadow-2xl hover:bg-white/15 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-200">
                <motion.div 
                  className="grid grid-cols-2 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="group">
                    <div className="text-gray-400 text-sm">Total Events</div>
                    <motion.div 
                      className="text-2xl font-bold text-white group-hover:text-brand transition-colors duration-200"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {events.length}
                    </motion.div>
                  </div>
                  <div className="group">
                    <div className="text-gray-400 text-sm">High Confidence (≥90%)</div>
                    <motion.div 
                      className="text-2xl font-bold text-green-400 group-hover:text-green-300 transition-colors duration-200"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {highCount}
                    </motion.div>
                  </div>
                  <div className="group">
                    <div className="text-gray-400 text-sm">Avg Confidence</div>
                    <motion.div 
                      className="text-2xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors duration-200"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {avg}%
                    </motion.div>
                  </div>
                  <div className="group">
                    <div className="text-gray-400 text-sm">Model</div>
                    <div className="text-lg font-semibold text-gray-300">{events[0]?.model || "-"}</div>
                  </div>
                </motion.div>
                <Separator className="bg-white/10" />
                <motion.div 
                  className="flex gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button 
                    variant="outline" 
                    className="border-white/30 text-gray-200 hover:bg-white/10 hover:text-white transition-all duration-200"
                    onClick={() => router.push("/detect")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Back to Detect
                  </Button>
                  <Button 
                    className="bg-brand/80 hover:bg-brand text-white border border-brand/50 transition-all duration-200"
                    onClick={() => window.print()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Print Report
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <Card className="bg-white/10 border-white/15 backdrop-blur-md shadow-2xl hover:bg-white/15 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                Detected Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-gray-400 text-sm py-10 text-center"
                >
                  No events detected yet.
                </motion.div>
              ) : (
                <motion.div 
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <AnimatePresence>
                    {events.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
                        whileHover={{ y: -2 }}
                      >
                        <div className="w-full h-24 bg-gray-800/40 rounded-lg mb-3 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                          {event.thumbnail ? (
                            <img src={event.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No preview</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={event.confidence >= 90 ? "destructive" : "default"}
                            className="text-xs font-medium px-2 py-1"
                          >
                            {event.confidence.toFixed(1)}%
                          </Badge>
                          <span className="text-xs text-gray-400 font-medium">{event.model}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-300 mb-2">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                        {event.note && (
                          <div className="text-xs text-gray-400 mt-1 bg-white/5 rounded px-2 py-1 border-l-2 border-brand/50">
                            Note: {event.note}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResultsView;