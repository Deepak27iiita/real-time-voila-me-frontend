"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Video, 
  Webcam, 
  VideoOff, 
  SquarePlay, 
  CircleStop, 
  MonitorPlay, 
  FileVideo2,
  Cctv,
  PanelsLeftBottom
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface DetectionEvent {
  id: string;
  timestamp: Date;
  confidence: number;
  model: string;
  thumbnail?: string;
  note?: string;
  isFalsePositive?: boolean;
}

interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
}

interface LiveMetrics {
  fps: number;
  latency: number;
  lastConfidence: number;
  bufferFullness: number;
}

type InputMode = 'camera' | 'stream' | 'file';
type DetectionState = 'idle' | 'streaming' | 'detecting';
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const MODELS = [
  { id: 'movinet-a0', name: 'MoviNet-A0' },
  { id: 'movinet-a1', name: 'MoviNet-A1' },
  { id: 'movinet-a2', name: 'MoviNet-A2' }
];

const SENSITIVITY_OPTIONS = [
  { id: 'short', name: 'Short', value: 500 },
  { id: 'medium', name: 'Medium', value: 1000 },
  { id: 'long', name: 'Long', value: 2000 }
];

export default function LiveDetectionPanel() {
  // Core state
  const [inputMode, setInputMode] = useState<InputMode>('camera');
  const [detectionState, setDetectionState] = useState<DetectionState>('idle');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  
  // Video and canvas refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Configuration state
  const [selectedModel, setSelectedModel] = useState('movinet-a1');
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [sensitivity, setSensitivity] = useState('medium');
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [autoExport, setAutoExport] = useState(false);
  
  // Stream configuration
  const [streamUrl, setStreamUrl] = useState('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('default-camera');
  
  // Detection data
  const [detectionBoxes, setDetectionBoxes] = useState<DetectionBox[]>([]);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    fps: 0,
    latency: 0,
    lastConfidence: 0,
    bufferFullness: 0
  });
  
  // UI state
  const [dragOver, setDragOver] = useState(false);
  const [eventFilter, setEventFilter] = useState('');
  const [showHighConfidenceOnly, setShowHighConfidenceOnly] = useState(false);
  const [selectedBox, setSelectedBox] = useState<DetectionBox | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Advanced settings
  const [useGpuAcceleration, setUseGpuAcceleration] = useState(true);
  const [frameSamplingRate, setFrameSamplingRate] = useState(3);
  const [clipLength, setClipLength] = useState(10);
  const [highContrastMode, setHighContrastMode] = useState(false);
  
  // WebSocket and media stream refs
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const router = useRouter();

  // Load preferences from localStorage
  useEffect(() => {
    const savedPrefs = localStorage.getItem('detection-preferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        setSelectedModel(prefs.model || 'movinet-a1');
        setConfidenceThreshold(prefs.threshold || 70);
        setInputMode(prefs.inputMode || 'camera');
        setSensitivity(prefs.sensitivity || 'medium');
        setUseGpuAcceleration(prefs.useGpu ?? true);
        setFrameSamplingRate(prefs.frameSampling || 3);
        setClipLength(prefs.clipLength || 10);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback(() => {
    const prefs = {
      model: selectedModel,
      threshold: confidenceThreshold,
      inputMode,
      sensitivity,
      useGpu: useGpuAcceleration,
      frameSampling: frameSamplingRate,
      clipLength
    };
    localStorage.setItem('detection-preferences', JSON.stringify(prefs));
  }, [selectedModel, confidenceThreshold, inputMode, sensitivity, useGpuAcceleration, frameSamplingRate, clipLength]);

  useEffect(() => {
    savePreferences();
  }, [savePreferences]);

  // Sync connection status to TopNav via localStorage
  useEffect(() => {
    try {
      const pretty =
        connectionState === 'connected'
          ? 'Connected'
          : connectionState === 'connecting'
          ? 'Reconnecting'
          : 'Disconnected';
      localStorage.setItem('connectionStatus', pretty);
    } catch {}
  }, [connectionState]);

  // Get available cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const validCameras = devices
          .filter(device => device.kind === 'videoinput')
          .filter(device => device.deviceId && device.deviceId.trim() !== '')
          .map((device, index) => ({
            ...device,
            // Ensure we have a unique, non-empty deviceId
            deviceId: device.deviceId || `camera-fallback-${index}`,
            // Ensure we have a readable label
            label: device.label || `Camera ${index + 1}`
          }));
        
        setAvailableCameras(validCameras);
        
        // Set first available camera if we're on default
        if (validCameras.length > 0 && selectedCamera === 'default-camera') {
          setSelectedCamera(validCameras[0].deviceId);
        }
      } catch (error) {
        console.error('Failed to enumerate cameras:', error);
        setAvailableCameras([]);
      }
    };
    getCameras();
  }, []);

  // Start camera stream
  const startCamera = async () => {
    try {
      setConnectionState('connecting');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCamera !== 'default-camera' ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setConnectionState('connected');
        setDetectionState('streaming');
        toast.success('Camera connected successfully');
      }
    } catch (error) {
      setConnectionState('error');
      toast.error('Failed to access camera. Please check permissions.');
      console.error('Camera error:', error);
    }
  };

  // Connect to stream
  const connectStream = async () => {
    if (!streamUrl.trim()) {
      toast.error('Please enter a valid stream URL');
      return;
    }

    try {
      setConnectionState('connecting');
      
      // For demo purposes, we'll simulate stream connection
      // In a real implementation, this would connect to RTSP/WebSocket/HTTP stream
      setTimeout(() => {
        if (videoRef.current) {
          // Simulate stream by using a test video
          videoRef.current.src = streamUrl;
          setConnectionState('connected');
          setDetectionState('streaming');
          toast.success('Stream connected successfully');
        }
      }, 2000);
      
    } catch (error) {
      setConnectionState('error');
      toast.error('Failed to connect to stream');
      console.error('Stream error:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
      setConnectionState('connected');
      setDetectionState('streaming');
      toast.success('Video file loaded successfully');
    }
  };

  // Start detection
  const startDetection = () => {
    if (detectionState !== 'streaming') {
      toast.error('Please connect a video source first');
      return;
    }

    try {
      // Initialize WebSocket connection for real-time detection
      const wsUrl = process.env.NEXT_PUBLIC_DETECT_WS || 'ws://localhost:8080/detect';
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setDetectionState('detecting');
        toast.success('Detection started');
        startDetectionLoop();
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleDetectionResult(data);
        } catch (error) {
          console.error('Failed to parse detection result:', error);
        }
      };
      
      ws.onerror = (error) => {
        toast.error('Detection service unavailable');
        console.error('WebSocket error:', error);
      };
      
      wsRef.current = ws;
    } catch (error) {
      // Fallback to simulated detection for demo
      setDetectionState('detecting');
      startSimulatedDetection();
      toast.success('Detection started (demo mode)');
    }
  };

  // Stop detection
  const stopDetection = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setDetectionState('streaming');
    setDetectionBoxes([]);
    toast.success('Detection stopped');
  };

  // Simulated detection for demo
  const startSimulatedDetection = () => {
    const simulate = () => {
      // Randomly generate detection boxes for demo
      if (Math.random() < 0.1) { // 10% chance of detection
        const box: DetectionBox = {
          x: Math.random() * 0.6 + 0.1,
          y: Math.random() * 0.6 + 0.1,
          width: Math.random() * 0.2 + 0.1,
          height: Math.random() * 0.2 + 0.1,
          confidence: Math.random() * 40 + 60, // 60-100%
          label: 'Violence'
        };
        
        setDetectionBoxes([box]);
        
        // Add to events if above threshold
        if (box.confidence >= confidenceThreshold) {
          const event: DetectionEvent = {
            id: `event-${Date.now()}`,
            timestamp: new Date(),
            confidence: box.confidence,
            model: selectedModel,
            thumbnail: captureFrame()
          };
          
          setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
          
          // Update live metrics
          setLiveMetrics(prev => ({
            ...prev,
            lastConfidence: box.confidence,
            fps: Math.random() * 5 + 25, // 25-30 FPS
            latency: Math.random() * 50 + 50 // 50-100ms
          }));
        }
        
        // Clear boxes after 2 seconds
        setTimeout(() => setDetectionBoxes([]), 2000);
      }
      
      if (detectionState === 'detecting') {
        animationFrameRef.current = requestAnimationFrame(simulate);
      }
    };
    
    simulate();
  };

  // Start detection loop for real WebSocket
  const startDetectionLoop = () => {
    const sendFrame = () => {
      if (videoRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob && wsRef.current) {
              wsRef.current.send(blob);
            }
          }, 'image/jpeg', 0.8);
        }
      }
      
      if (detectionState === 'detecting') {
        setTimeout(sendFrame, 1000 / frameSamplingRate); // Respect sampling rate
      }
    };
    
    sendFrame();
  };

  // Handle detection results from WebSocket
  const handleDetectionResult = (data: any) => {
    if (data.detections && Array.isArray(data.detections)) {
      const boxes: DetectionBox[] = data.detections
        .filter((det: any) => det.confidence >= confidenceThreshold / 100)
        .map((det: any) => ({
          x: det.bbox[0],
          y: det.bbox[1],
          width: det.bbox[2] - det.bbox[0],
          height: det.bbox[3] - det.bbox[1],
          confidence: det.confidence * 100,
          label: det.class || 'Violence'
        }));
      
      setDetectionBoxes(boxes);
      
      // Add events for high-confidence detections
      boxes.forEach(box => {
        if (box.confidence >= confidenceThreshold) {
          const event: DetectionEvent = {
            id: `event-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            confidence: box.confidence,
            model: selectedModel,
            thumbnail: captureFrame()
          };
          
          setEvents(prev => [event, ...prev.slice(0, 49)]);
        }
      });
    }
  };

  // Capture current frame as thumbnail
  const captureFrame = (): string => {
    if (!videoRef.current) return '';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    canvas.width = 160;
    canvas.height = 90;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Take snapshot
  const takeSnapshot = () => {
    const thumbnail = captureFrame();
    if (thumbnail) {
      // Save latest snapshot for results page
      try { localStorage.setItem('lastSnapshot', thumbnail); } catch {}
      const link = document.createElement('a');
      link.download = `snapshot-${new Date().toISOString()}.jpg`;
      link.href = thumbnail;
      link.click();
      toast.success('Snapshot saved');
    }
  };

  // View Results - persist and navigate
  const viewResults = () => {
    try {
      const safeEvents = events.map(e => ({
        ...e,
        timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
      }));
      localStorage.setItem('detection-events', JSON.stringify(safeEvents));
      const src = videoRef.current?.srcObject ? '' : (videoRef.current?.currentSrc || videoRef.current?.src || '');
      if (src) localStorage.setItem('lastVideoSrc', src); else localStorage.removeItem('lastVideoSrc');
      const shot = captureFrame();
      if (shot) localStorage.setItem('lastSnapshot', shot);
    } catch (e) {
      console.error('Failed to persist results:', e);
    }
    router.push('/results');
  };

  // Disconnect
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
    
    setConnectionState('disconnected');
    setDetectionState('idle');
    setDetectionBoxes([]);
    toast.success('Disconnected');
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setSelectedModel('movinet-a1');
    setConfidenceThreshold(70);
    setSensitivity('medium');
    setUseGpuAcceleration(true);
    setFrameSamplingRate(3);
    setClipLength(10);
    setHighContrastMode(false);
    localStorage.removeItem('detection-preferences');
    toast.success('Settings reset to defaults');
  };

  // Filter events
  const filteredEvents = events.filter(event => {
    if (showHighConfidenceOnly && event.confidence < confidenceThreshold) {
      return false;
    }
    if (eventFilter && !event.timestamp.toLocaleString().includes(eventFilter)) {
      return false;
    }
    return !event.isFalsePositive;
  });

  // Export CSV
  const exportCSV = () => {
    const csvContent = [
      ['Timestamp', 'Confidence', 'Model', 'Note'],
      ...filteredEvents.map(event => [
        event.timestamp.toISOString(),
        event.confidence.toFixed(1),
        event.model,
        event.note || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `detection-events-${new Date().toISOString().split('T')[0]}.csv`;
    link.href = url;
    link.click();
    toast.success('CSV exported successfully');
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    
    if (videoFile) {
      handleFileUpload(videoFile);
    } else {
      toast.error('Please drop a valid video file');
    }
  };

  // Render detection overlays
  const renderOverlays = () => {
    if (!overlayVisible || detectionBoxes.length === 0 || !videoRef.current) return null;
    
    const video = videoRef.current;
    const videoRect = video.getBoundingClientRect();
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        {detectionBoxes.map((box, index) => (
          <div
            key={index}
            className="absolute border-2 border-red-500 pointer-events-auto cursor-pointer"
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`
            }}
            onClick={() => setSelectedBox(box)}
          >
            <div className="absolute -top-8 left-0 bg-destructive text-destructive-foreground px-2 py-1 text-xs rounded">
              {box.label} {box.confidence.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`w-full ${highContrastMode ? 'contrast-125' : ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Area - Video and Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Input Mode Selection */}
          <Card className="bg-card border-border dark:bg-white/10 dark:border-white/15 backdrop-blur-md shadow-xl">
            <CardContent className="p-4">
              <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as InputMode)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="camera" className="flex items-center gap-2">
                    <Webcam className="w-4 h-4" />
                    Camera
                  </TabsTrigger>
                  <TabsTrigger value="stream" className="flex items-center gap-2">
                    <Cctv className="w-4 h-4" />
                    Stream
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <FileVideo2 className="w-4 h-4" />
                    File
                  </TabsTrigger>
                </TabsList>
                
                <div className="mt-4">
                  <TabsContent value="camera" className="space-y-3">
                    <div className="flex gap-2">
                      <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select camera" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCameras.length === 0 ? (
                            <SelectItem value="no-cameras-available" disabled>
                              No cameras available
                            </SelectItem>
                          ) : (
                            availableCameras.map((camera, index) => (
                              <SelectItem 
                                key={`camera-${index}`}
                                value={camera.deviceId}
                              >
                                {camera.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={startCamera}
                        disabled={connectionState === 'connecting' || availableCameras.length === 0}
                        variant={connectionState === 'connected' ? 'outline' : 'default'}
                      >
                        {connectionState === 'connecting' ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="stream" className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="rtsp://camera.local/stream or ws://server/stream"
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={connectStream}
                        disabled={connectionState === 'connecting'}
                        variant={connectionState === 'connected' ? 'outline' : 'default'}
                      >
                        {connectionState === 'connecting' ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="file" className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="video/*"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="flex-1"
                      />
                      <Button onClick={() => fileInputRef.current?.click()}>
                        Browse
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>

          {/* Video Display */}
          <Card className="relative bg-card border-border dark:bg-white/10 dark:border-white/15 backdrop-blur-md shadow-2xl">
            <CardContent className="p-0">
              <div 
                className={`relative bg-black rounded-lg overflow-hidden ${dragOver ? 'ring-2 ring-primary' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {connectionState === 'disconnected' && (
                  <div className="aspect-video flex flex-col items-center justify-center bg-muted text-muted-foreground">
                    <VideoOff className="w-16 h-16 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Video Source</h3>
                    <p className="text-sm text-center mb-4">
                      Connect a camera, stream, or upload a video file to get started
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setInputMode('camera')}>
                        <Webcam className="w-4 h-4 mr-2" />
                        Use Webcam
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <FileVideo2 className="w-4 h-4 mr-2" />
                        Upload File
                      </Button>
                    </div>
                  </div>
                )}
                
                {connectionState === 'connecting' && (
                  <div className="aspect-video flex items-center justify-center bg-black">
                    <div className="text-center text-foreground">
                      <div className="animate-spin w-8 h-8 border-2 border-foreground border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p>Connecting...</p>
                    </div>
                  </div>
                )}
                
                {connectionState === 'error' && (
                  <div className="aspect-video flex items-center justify-center bg-destructive/10 text-destructive">
                    <div className="text-center">
                      <VideoOff className="w-12 h-12 mb-4 mx-auto" />
                      <h3 className="font-semibold mb-2">Connection Failed</h3>
                      <p className="text-sm mb-4">Please check your settings and try again</p>
                      <Button size="sm" onClick={disconnect}>
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
                
                {(connectionState === 'connected' || detectionState !== 'idle') && (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full aspect-video object-contain"
                      autoPlay
                      muted
                      playsInline
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                    {renderOverlays()}
                    
                    {/* Live Metrics HUD */}
                    {detectionState === 'detecting' && (
                      <div className="absolute top-4 left-4 bg-background/80 dark:bg-black/70 text-foreground p-3 rounded-lg text-xs space-y-1">
                        <div>FPS: {liveMetrics.fps.toFixed(1)}</div>
                        <div>Latency: {liveMetrics.latency.toFixed(0)}ms</div>
                        <div>Last: {liveMetrics.lastConfidence.toFixed(1)}%</div>
                        <div className="w-20 h-1 bg-gray-600 rounded">
                          <div 
                            className="h-full bg-green-500 rounded"
                            style={{ width: `${liveMetrics.bufferFullness}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Connection Status */}
                    <div className="absolute top-4 right-4">
                      <Badge variant={connectionState === 'connected' ? 'default' : 'destructive'}>
                        {connectionState}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Control Strip */}
          <Card className="bg-card border-border dark:bg-white/10 dark:border-white/15 backdrop-blur-md shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {detectionState === 'detecting' ? (
                    <Button onClick={stopDetection} variant="destructive" size="sm">
                      <CircleStop className="w-4 h-4 mr-2" />
                      Stop Detection
                    </Button>
                  ) : (
                    <Button 
                      onClick={startDetection}
                      disabled={detectionState === 'idle'}
                      size="sm"
                    >
                      <SquarePlay className="w-4 h-4 mr-2" />
                      Start Detection
                    </Button>
                  )}
                  
                  <Button onClick={takeSnapshot} variant="outline" size="sm">
                    <MonitorPlay className="w-4 h-4 mr-2" />
                    Snapshot
                  </Button>
                  
                  <Button 
                    onClick={disconnect}
                    variant="outline" 
                    size="sm"
                    disabled={connectionState === 'disconnected'}
                  >
                    Disconnect
                  </Button>
                  <Button onClick={viewResults} size="sm" variant="secondary">
                    View Results
                  </Button>
                </div>
                
                <Separator orientation="vertical" className="h-6" />
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="overlay-toggle" className="text-sm">Overlay</Label>
                  <Switch
                    id="overlay-toggle"
                    checked={overlayVisible}
                    onCheckedChange={setOverlayVisible}
                  />
                </div>
                
                <div className="flex items-center gap-2 ml-auto">
                  <Badge variant="outline">
                    {detectionState === 'detecting' ? 'Detecting' : 
                     detectionState === 'streaming' ? 'Ready' : 'Idle'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Area - Detection Summary, Timeline, Controls */}
        <div className="space-y-4">
          {/* Detection Summary */}
          <Card className="bg-card border-border dark:bg-white/10 dark:border-white/15 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PanelsLeftBottom className="w-5 h-5" />
                Detection Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Events</div>
                  <div className="text-2xl font-bold">{events.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">High Confidence</div>
                  <div className="text-2xl font-bold">
                    {events.filter(e => e.confidence >= 90).length}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg Confidence</div>
                  <div className="text-lg font-semibold">
                    {events.length > 0 
                      ? (events.reduce((sum, e) => sum + e.confidence, 0) / events.length).toFixed(1)
                      : '0'}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <Badge variant={detectionState === 'detecting' ? 'default' : 'secondary'}>
                    {detectionState}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model & Threshold Controls */}
          <Card className="bg-card border-border dark:bg-white/10 dark:border-white/15 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle>Detection Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Confidence Threshold: {confidenceThreshold}%</Label>
                <Slider
                  value={[confidenceThreshold]}
                  onValueChange={(value) => setConfidenceThreshold(value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Sensitivity</Label>
                <Select value={sensitivity} onValueChange={setSensitivity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENSITIVITY_OPTIONS.map(option => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-export">Auto Export</Label>
                <Switch
                  id="auto-export"
                  checked={autoExport}
                  onCheckedChange={setAutoExport}
                />
              </div>
            </CardContent>
          </Card>

          {/* Event Timeline */}
          <Card className="bg-card border-border dark:bg-white/10 dark:border-white/15 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Filter events..."
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showHighConfidenceOnly}
                    onCheckedChange={setShowHighConfidenceOnly}
                  />
                  <Label className="text-sm">High confidence only</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-4" />
                  <p>No events detected yet</p>
                  {detectionState === 'idle' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => {
                        // Simulate a test event
                        const testEvent: DetectionEvent = {
                          id: 'test-event',
                          timestamp: new Date(),
                          confidence: 85,
                          model: selectedModel,
                          thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjkwIiB2aWV3Qm94PSIwIDAgMTYwIDkwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iOTAiIGZpbGw9IiNmMGYwZjAiLz48cGF0aCBkPSJNNTAgMzBMNjAgNDBMNTAgNTBNMTEwIDMwTDEwMCA0MEwxMTAgNTAiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4='
                        };
                        setEvents([testEvent]);
                        toast.success('Test event created');
                      }}
                    >
                      Run Self-Test
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredEvents.map(event => (
                    <div key={event.id} className="flex gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                        {event.thumbnail && (
                          <img 
                            src={event.thumbnail} 
                            alt="Event thumbnail"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={event.confidence >= 90 ? 'destructive' : 'secondary'}>
                            {event.confidence.toFixed(1)}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {event.model}
                          </span>
                        </div>
                        <div className="text-sm font-medium mb-1">
                          {event.timestamp.toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {event.timestamp.toLocaleDateString()}
                        </div>
                        {event.note && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Note: {event.note}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                          Export
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export & Advanced Settings */}
          <Card className="bg-card border-border dark:bg-white/10 dark:border-white/15 backdrop-blur-md shadow-xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <Button onClick={exportCSV} variant="outline" className="flex-1">
                  Export CSV
                </Button>
                <Button variant="outline" className="flex-1">
                  Download Clips
                </Button>
              </div>
              
              <Accordion type="single" collapsible>
                <AccordionItem value="advanced">
                  <AccordionTrigger>Advanced Settings</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="gpu-accel">GPU Acceleration</Label>
                      <Switch
                        id="gpu-accel"
                        checked={useGpuAcceleration}
                        onCheckedChange={setUseGpuAcceleration}
                      />
                    </div>
                    
                    <div>
                      <Label>Frame Sampling Rate: 1 in {frameSamplingRate}</Label>
                      <Slider
                        value={[frameSamplingRate]}
                        onValueChange={(value) => setFrameSamplingRate(value[0])}
                        min={1}
                        max={10}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    
                    <div>
                      <Label>Clip Length: {clipLength}s</Label>
                      <Slider
                        value={[clipLength]}
                        onValueChange={(value) => setClipLength(value[0])}
                        min={5}
                        max={60}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="high-contrast">High Contrast Mode</Label>
                      <Switch
                        id="high-contrast"
                        checked={highContrastMode}
                        onCheckedChange={setHighContrastMode}
                      />
                    </div>
                    
                    <Button 
                      onClick={resetToDefaults}
                      variant="outline" 
                      className="w-full"
                    >
                      Reset to Defaults
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}