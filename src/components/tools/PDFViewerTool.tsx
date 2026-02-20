/**
 * @fileoverview Professional Immersive PDF Viewer Tool
 * Responsibility: Browser-native PDF viewing with Retina-sharp rendering, 
 * search, auto-hiding controls, and immersive layout.
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
  Type,
  ArrowLeft,
  FileText,
  Download
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Ensure worker is loaded from a reliable CDN
const PDF_JS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;

interface SearchResult {
  pageNumber: number;
  text: string;
}

interface PDFViewerToolProps {
  onExit?: () => void;
}

export const PDFViewerTool: React.FC<PDFViewerToolProps> = ({ onExit }) => {
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

  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  /**
   * Initializes the PDF document from the selected file.
   */
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
          setSearchResults([]);
          setCurrentSearchIndex(-1);
          
          // Initial auto-zoom calculation after load
          setTimeout(() => calculateInitialZoom(pdf), 100);
        } catch (err) {
          console.error("PDF Load Error:", err);
          toast({ 
            variant: "destructive", 
            title: "Load Failed", 
            description: "Could not open this PDF. It might be corrupted or protected." 
          });
          setSourceFile(null);
        } finally {
          setIsLoading(false);
        }
      };
      loadPDF();
    }
  }, [sourceFile, toast]);

  const calculateInitialZoom = async (pdf: pdfjsLib.PDFDocumentProxy) => {
    if (!containerRef.current) return;
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current.clientWidth - 80; // horizontal padding
      const scale = containerWidth / viewport.width;
      setZoom(Math.min(scale, 1.5)); // Don't over-zoom small PDFs
    } catch (e) {
      setZoom(1.0);
    }
  };

  /**
   * Renders the current page to the canvas with high-DPI support.
   */
  const renderPage = useCallback(async () => {
    if (pdfDoc && canvasRef.current && containerRef.current) {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          // Sharp rendering for Retina/High-DPI displays
          const dpr = window.devicePixelRatio || 1;
          canvas.height = viewport.height * dpr;
          canvas.width = viewport.width * dpr;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.width = `${viewport.width}px`;
          
          context.scale(dpr, dpr);
          
          await page.render({ 
            canvasContext: context, 
            viewport: viewport,
            intent: 'display'
          }).promise;
        }
      } catch (err) {
        console.error("Page Render Error:", err);
      }
    }
  }, [pdfDoc, currentPage, zoom]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  /**
   * Auto-hide controls logic
   */
  useEffect(() => {
    const handleMouseMove = () => {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      
      controlsTimeoutRef.current = setTimeout(() => {
        if (isFullscreen) setControlsVisible(false);
      }, 3000);
    };

    const container = viewerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (container) container.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    if (!viewerRef.current) return;
    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().catch(() => {
        toast({ variant: "destructive", title: "Fullscreen Error", description: "Browser blocked fullscreen request." });
      });
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
        toast({ title: "No Results", description: "Text not found." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Search Failed", description: "Text extraction error." });
    } finally {
      setIsSearching(false);
    }
  };

  const downloadFile = () => {
    if (!sourceFile) return;
    const url = URL.createObjectURL(sourceFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = sourceFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!sourceFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Immersive Viewer</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold">Fast, secure, and razor-sharp PDF reading experience.</p>
          </div>
          <FileUpload onFilesSelected={(f) => setSourceFile(f[0])} className="h-96" />
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
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4"
          >
            <div className="flex items-center justify-between p-3 rounded-[2rem] glass border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-3xl">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onExit?.()} 
                  className="rounded-xl h-10 w-10 md:h-12 md:w-12 glass-button"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowThumbnails(!showThumbnails)} 
                  className={cn("rounded-xl h-10 w-10 md:h-12 md:w-12 glass-button transition-all", showThumbnails && "bg-secondary/20 dark:bg-primary/20 text-secondary dark:text-primary")}
                >
                  <SidebarIcon className="w-5 h-5" />
                </Button>
                <div className="hidden lg:flex flex-col min-w-0 max-w-[200px] px-2">
                  <p className="font-black text-xs truncate text-slate-900 dark:text-white leading-none">
                    {sourceFile.name}
                  </p>
                </div>
              </div>

              <div className="flex-1 max-w-sm mx-4">
                <div className="relative w-full group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search text..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="glass h-11 pl-11 pr-24 rounded-2xl border-white/20 dark:border-white/5 bg-white/20 dark:bg-black/20 text-xs font-bold"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    {searchResults.length > 0 && (
                      <span className="text-[9px] font-black text-slate-500 dark:text-zinc-400 px-2">
                        {currentSearchIndex + 1}/{searchResults.length}
                      </span>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={downloadFile} className="glass-button rounded-xl h-10 w-10 md:h-12 md:w-12">
                  <Download className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="glass-button rounded-xl h-10 w-10 md:h-12 md:w-12">
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence>
          {showThumbnails && (
            <motion.aside 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="w-72 bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-white/10 overflow-y-auto custom-scrollbar z-30 pt-24"
            >
              <div className="p-6 space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.4em] mb-4 text-center">Thumbnails</h3>
                {pdfDoc && Array.from({ length: pdfDoc.numPages }).map((_, i) => (
                  <div 
                    key={i} 
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "p-3 rounded-[1.5rem] cursor-pointer transition-all border-2 group",
                      currentPage === i + 1 
                        ? "bg-secondary/10 dark:bg-primary/10 border-secondary dark:border-primary shadow-lg" 
                        : "bg-white/5 dark:bg-white/2 border-transparent hover:bg-white/10 dark:hover:bg-white/5"
                    )}
                  >
                    <div className="aspect-[3/4] bg-slate-200 dark:bg-zinc-900 rounded-2xl flex flex-col items-center justify-center space-y-2 mb-2 shadow-inner group-hover:scale-[1.02] transition-transform">
                       <FileText className={cn("w-6 h-6", currentPage === i + 1 ? "text-secondary dark:text-primary" : "text-slate-400")} />
                       <span className="text-[9px] font-black">PAGE {i + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main 
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-100 dark:bg-zinc-950 flex flex-col items-center custom-scrollbar relative pt-20"
        >
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-white/40 dark:bg-black/40 backdrop-blur-sm z-50">
              <Loader2 className="w-16 h-16 animate-spin text-secondary dark:text-primary" />
              <p className="font-black text-xs uppercase tracking-[0.3em] animate-pulse">Rendering...</p>
            </div>
          ) : (
            <div className="relative py-12 px-8 h-fit">
              <div className="shadow-[0_0_100px_-20px_rgba(0,0,0,0.3)] bg-white dark:bg-zinc-900 rounded-sm border border-black/5 dark:border-white/5 transition-all duration-300">
                <canvas ref={canvasRef} className="block shadow-sm" />
              </div>
            </div>
          )}
        </main>

        <AnimatePresence>
          {controlsVisible && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center bg-white/40 dark:bg-black/60 backdrop-blur-3xl p-3 rounded-[2rem] glass border-white/20 dark:border-white/10 shadow-2xl"
            >
              <div className="flex items-center space-x-2 border-r border-slate-200 dark:border-white/10 pr-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-10 w-10 md:h-12 md:w-12 rounded-2xl">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="px-4 flex flex-col items-center min-w-[100px]">
                  <span className="text-sm font-black tabular-nums">{currentPage} / {pdfDoc?.numPages || '?'}</span>
                  <span className="text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Page</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setCurrentPage(Math.min(pdfDoc?.numPages || 1, currentPage + 1))} disabled={currentPage === pdfDoc?.numPages} className="h-10 w-10 md:h-12 md:w-12 rounded-2xl">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center space-x-2 pl-4">
                <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.max(0.2, prev - 0.2))} className="h-10 w-10 md:h-12 md:w-12 rounded-2xl">
                  <ZoomOut className="w-5 h-5" />
                </Button>
                <div className="px-3 flex flex-col items-center min-w-[70px]">
                  <span className="text-sm font-black tabular-nums">{Math.round(zoom * 100)}%</span>
                  <span className="text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Zoom</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.min(5, prev + 0.2))} className="h-10 w-10 md:h-12 md:w-12 rounded-2xl">
                  <ZoomIn className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
