/**
 * @fileoverview Immersive High-Fidelity PDF Viewer Tool
 * Responsibility: Browser-native PDF viewing with hardware-accelerated zoom and auto-hiding controls.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize,
  Search, 
  Loader2, 
  Sidebar as SidebarIcon,
  X,
  ArrowLeft,
  FileText,
  MoreVertical,
  Layers,
  Scissors,
  Minimize2,
  Lock
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const PDF_JS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;

interface SearchResult {
  pageNumber: number;
  text: string;
}

interface PDFViewerToolProps {
  onExit?: () => void;
  onSwitchTool?: (toolId: any, file: File) => void;
}

export const PDFViewerTool: React.FC<PDFViewerToolProps> = ({ onExit, onSwitchTool }) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0); 
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (sourceFile) {
      const loadPDF = async () => {
        setIsLoading(true);
        try {
          const buffer = await sourceFile.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: buffer });
          const pdf = await loadingTask.promise;
          setPdfDoc(pdf);
          setCurrentPage(1);
          setZoom(1.0); 
        } catch (err) {
          toast({ variant: "destructive", title: "Load Failed", description: "This file is encrypted or invalid." });
          setSourceFile(null);
        } finally {
          setIsLoading(false);
        }
      };
      loadPDF();
    }
  }, [sourceFile, toast]);

  const renderPage = useCallback(async () => {
    if (pdfDoc && canvasRef.current && containerRef.current) {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          const dpr = window.devicePixelRatio || 1;
          canvas.height = viewport.height * dpr;
          canvas.width = viewport.width * dpr;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.width = `${viewport.width}px`;
          context.scale(dpr, dpr);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (err) {
        console.error("Render Error:", err);
      }
    }
  }, [pdfDoc, currentPage, zoom]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Native Trackpad & Mouse Wheel Zooming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomStep = 0.08;
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        setZoom((prev) => {
           const next = prev + delta;
           return Math.min(6, Math.max(0.1, next));
        });
      }
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Control visibility logic
  useEffect(() => {
    const handleMouseMove = () => {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSearchInput) setControlsVisible(false);
      }, 3500);
    };
    const viewer = viewerRef.current;
    if (viewer) viewer.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (viewer) viewer.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showSearchInput]);

  const toggleFullscreen = () => {
    if (!viewerRef.current) return;
    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleSearch = async () => {
    if (!pdfDoc || !searchQuery.trim()) return;
    setIsSearching(true);
    const results: SearchResult[] = [];
    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');
        if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({ pageNumber: i, text });
        }
      }
      setSearchResults(results);
      if (results.length > 0) {
        setCurrentSearchIndex(0);
        setCurrentPage(results[0].pageNumber);
      } else {
        toast({ title: "No Results", description: "Search query not found." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Search Error", description: "Failed to parse text content." });
    } finally {
      setIsSearching(false);
    }
  };

  const quickSwitch = (toolId: string) => {
    if (sourceFile && onSwitchTool) {
      onSwitchTool(toolId, sourceFile);
    }
  };

  if (!sourceFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-zinc-950 relative">
        <Button 
          variant="ghost" 
          onClick={() => onExit?.()} 
          className="absolute top-8 left-8 h-12 w-12 rounded-full glass hover:bg-white/40 shadow-2xl z-50 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Immersive Viewer</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold">Hardware-accelerated PDF reading experience.</p>
          </div>
          <FileUpload onFilesSelected={(f) => setSourceFile(f[0])} className="h-[450px]" />
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={viewerRef}
      className={cn(
        "flex flex-col h-full bg-slate-100 dark:bg-zinc-950 relative overflow-hidden transition-all duration-700",
        isFullscreen ? "fixed inset-0 z-[100] rounded-none" : "w-full"
      )}
    >
      <AnimatePresence>
        {controlsVisible && (
          <motion.div 
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="absolute top-8 left-0 w-full px-8 z-50 flex items-center justify-between pointer-events-none"
          >
            {/* Left Zone: Navigation */}
            <div className="flex items-center space-x-3 pointer-events-auto">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onExit?.()} 
                className="h-14 w-14 rounded-full glass hover:bg-white/40 border-white/40 shadow-2xl"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowThumbnails(!showThumbnails)} 
                className={cn(
                  "h-14 w-14 rounded-full glass hover:bg-white/40 border-white/40 shadow-2xl",
                  showThumbnails && "bg-secondary/20 text-secondary"
                )}
              >
                <SidebarIcon className="w-6 h-6" />
              </Button>
            </div>

            {/* Right Zone: Commands */}
            <div className="flex items-center space-x-3 pointer-events-auto">
              <AnimatePresence>
                {showSearchInput && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="glass h-14 rounded-full flex items-center px-4 border-white/40 overflow-hidden shadow-2xl mr-3"
                  >
                    <Input 
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="bg-transparent border-none focus:ring-0 text-sm font-bold"
                    />
                    <div className="flex items-center ml-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSearch} disabled={isSearching}>
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSearchInput(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Hub */}
              <div className="relative group">
                <div className="h-14 w-14 glass flex items-center justify-center rounded-full cursor-pointer hover:scale-110 transition-all duration-500 border-white/40 shadow-2xl">
                  <MoreVertical className="w-6 h-6" />
                </div>
                
                <div className="absolute top-full right-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-500 pt-4 z-50">
                  <div className="glass p-3 rounded-[2rem] flex flex-col space-y-2 border-white/30 shadow-2xl min-w-[200px] backdrop-blur-3xl">
                    <Button variant="ghost" className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest justify-start" onClick={() => setShowSearchInput(true)}><Search className="w-4 h-4 mr-3" /> Search Text</Button>
                    <div className="h-px bg-white/10 mx-2"></div>
                    <Button variant="ghost" className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest justify-start" onClick={() => quickSwitch('merge')}><Layers className="w-4 h-4 mr-3" /> Merge PDF</Button>
                    <Button variant="ghost" className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest justify-start" onClick={() => quickSwitch('split')}><Scissors className="w-4 h-4 mr-3" /> Split PDF</Button>
                    <Button variant="ghost" className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest justify-start" onClick={() => quickSwitch('compress')}><Minimize2 className="w-4 h-4 mr-3" /> Compress</Button>
                    <Button variant="ghost" className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest justify-start" onClick={() => quickSwitch('protect')}><Lock className="w-4 h-4 mr-3" /> Security</Button>
                  </div>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleFullscreen} 
                className="h-14 w-14 rounded-full glass hover:bg-white/40 border-white/40 shadow-2xl"
              >
                {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence>
          {showThumbnails && (
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="w-72 bg-white/10 dark:bg-black/40 backdrop-blur-3xl border-r border-white/10 overflow-y-auto custom-scrollbar z-30 pt-28">
              <div className="p-6 space-y-4">
                {pdfDoc && Array.from({ length: pdfDoc.numPages }).map((_, i) => (
                  <div key={i} onClick={() => setCurrentPage(i + 1)} className={cn("p-2 rounded-2xl cursor-pointer transition-all border-2", currentPage === i + 1 ? "bg-secondary/10 border-secondary" : "bg-white/5 border-transparent hover:bg-white/10")}>
                    <div className="aspect-[3/4] bg-slate-200 dark:bg-zinc-900 rounded-xl flex items-center justify-center">
                       <span className="text-[10px] font-black">PAGE {i + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main ref={containerRef} className="flex-1 overflow-auto bg-slate-100 dark:bg-zinc-950 flex flex-col items-center custom-scrollbar relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-white/10 backdrop-blur-sm z-50">
              <Loader2 className="w-16 h-16 animate-spin text-secondary" />
              <p className="font-black text-xs uppercase tracking-[0.4em]">Rendering Document...</p>
            </div>
          ) : (
            <div className="py-24 px-10 h-fit">
              <div className="shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] bg-white dark:bg-zinc-900 rounded-sm">
                <canvas ref={canvasRef} className="block" />
              </div>
            </div>
          )}
        </main>

        <AnimatePresence>
          {controlsVisible && (
            <motion.div 
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center bg-white/40 dark:bg-black/60 backdrop-blur-3xl p-2 rounded-full glass border-white/20 shadow-2xl"
            >
              <div className="flex items-center space-x-1 pr-4 border-r border-white/10">
                <Button variant="ghost" size="icon" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-10 w-10"><ChevronLeft className="w-5 h-5" /></Button>
                <div className="px-3 min-w-[80px] text-center">
                  <span className="text-[11px] font-black tabular-nums">{currentPage} / {pdfDoc?.numPages || '?'}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setCurrentPage(Math.min(pdfDoc?.numPages || 1, currentPage + 1))} disabled={currentPage === pdfDoc?.numPages} className="h-10 w-10"><ChevronRight className="w-5 h-5" /></Button>
              </div>
              <div className="flex items-center space-x-1 pl-4">
                <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.max(0.1, prev - 0.15))} className="h-10 w-10"><ZoomOut className="w-4 h-4" /></Button>
                <div className="px-3 min-w-[70px] text-center">
                  <span className="text-[11px] font-black tabular-nums">{Math.round(zoom * 100)}%</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.min(6, prev + 0.15))} className="h-10 w-10"><ZoomIn className="w-4 h-4" /></Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
