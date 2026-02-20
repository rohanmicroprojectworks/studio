/**
 * @fileoverview Professional Immersive PDF Viewer Tool
 * Responsibility: Browser-native PDF viewing with search, fullscreen, and adaptive scaling.
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
  FileText
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Ensure worker is loaded from a reliable CDN with the correct Ajax/Libs path
const PDF_JS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;

interface SearchResult {
  pageNumber: number;
  text: string;
}

export const PDFViewerTool: React.FC = () => {
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

  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
        } catch (err) {
          console.error("PDF Load Error:", err);
          toast({ 
            variant: "destructive", 
            title: "Load Failed", 
            description: "Could not open this PDF. It might be corrupted or password protected." 
          });
          setSourceFile(null);
        } finally {
          setIsLoading(false);
        }
      };
      loadPDF();
    }
  }, [sourceFile, toast]);

  /**
   * Renders the current page to the canvas with current zoom level.
   */
  const renderPage = useCallback(async () => {
    if (pdfDoc && canvasRef.current) {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
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
   * Toggles native browser fullscreen mode.
   */
  const toggleFullscreen = () => {
    if (!viewerRef.current) return;
    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().catch((err) => {
        toast({ variant: "destructive", title: "Fullscreen Error", description: "Your browser blocked the fullscreen request." });
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

  /**
   * Performs a text search across all pages.
   */
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
        toast({ title: "No Results", description: "The term was not found in this document." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Search Failed", description: "Text extraction failed for this PDF." });
    } finally {
      setIsSearching(false);
    }
  };

  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    setCurrentPage(searchResults[nextIndex].pageNumber);
  };

  const prevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    setCurrentPage(searchResults[prevIndex].pageNumber);
  };

  // Rendering logic for the tool
  if (!sourceFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Immersive Viewer</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold">Fast, secure, and searchable browser-native reading experience.</p>
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
        "flex flex-col h-full bg-slate-50 dark:bg-zinc-950 relative overflow-hidden transition-all duration-700",
        isFullscreen ? "fixed inset-0 z-[100] rounded-none" : "rounded-[1.5rem] md:rounded-[2.5rem]"
      )}
    >
      {/* Immersive Top Navigation */}
      <header className="flex items-center justify-between px-4 md:px-8 h-16 md:h-20 bg-white/60 dark:bg-black/60 backdrop-blur-3xl border-b border-white/20 dark:border-white/5 z-30 shrink-0 shadow-sm">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowThumbnails(!showThumbnails)} 
            className={cn("glass-button rounded-xl h-10 w-10 md:h-12 md:w-12 transition-all", showThumbnails && "bg-secondary/20 dark:bg-primary/20 text-secondary dark:text-primary")}
          >
            <SidebarIcon className="w-5 h-5" />
          </Button>
          <div className="h-8 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />
          <div className="flex flex-col min-w-0">
            <p className="font-black text-xs md:text-sm truncate max-w-[120px] md:max-w-[300px] text-slate-900 dark:text-white leading-none">
              {sourceFile.name}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              {pdfDoc ? `${pdfDoc.numPages} Pages` : "Parsing Metadata..."}
            </p>
          </div>
        </div>

        {/* Responsive Search Interface */}
        <div className="hidden lg:flex flex-1 max-w-lg mx-12">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-secondary dark:group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search document content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="glass h-12 pl-12 pr-28 rounded-2xl border-white/40 dark:border-white/10 bg-white/20 dark:bg-black/20 text-sm font-bold focus:ring-secondary/20 dark:focus:ring-primary/20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 bg-white/50 dark:bg-zinc-900/50 p-1 rounded-xl">
              {searchResults.length > 0 && (
                <span className="text-[10px] font-black text-slate-500 dark:text-zinc-400 px-2 border-r border-slate-200 dark:border-zinc-800">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg"
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
              {searchResults.length > 0 && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={prevSearchResult}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={nextSearchResult}><ChevronRight className="w-4 h-4" /></Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullscreen} 
            className="glass-button rounded-xl h-10 w-10 md:h-12 md:w-12"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
          {!isFullscreen && (
            <Button 
              variant="outline" 
              onClick={() => setSourceFile(null)} 
              className="glass-button rounded-xl h-10 md:h-12 px-6 font-black text-[10px] uppercase tracking-[0.2em] border-white/60 dark:border-white/10"
            >
              Exit
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Thumbnails Sidebar - Smooth Slide Transition */}
        <aside className={cn(
          "w-72 bg-white/30 dark:bg-black/30 backdrop-blur-3xl border-r border-white/10 transition-all duration-500 overflow-y-auto custom-scrollbar z-20",
          showThumbnails ? "translate-x-0" : "-translate-x-full absolute"
        )}>
          <div className="p-6 space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.4em] mb-4">Navigation Pane</h3>
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
                <div className="aspect-[3/4] bg-slate-200 dark:bg-zinc-900 rounded-2xl flex flex-col items-center justify-center space-y-3 mb-3 shadow-inner group-hover:scale-[1.02] transition-transform">
                   <Type className={cn("w-8 h-8 transition-colors", currentPage === i + 1 ? "text-secondary dark:text-primary" : "text-slate-400 dark:text-zinc-700")} />
                   <span className="text-[10px] font-black text-slate-500 dark:text-zinc-400">PAGE {i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Immersive Viewport */}
        <main 
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-100/50 dark:bg-zinc-950/50 p-6 md:p-12 flex flex-col items-center custom-scrollbar relative"
        >
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-white/40 dark:bg-black/40 backdrop-blur-sm z-50">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-secondary dark:text-primary" />
                <div className="absolute inset-0 blur-2xl bg-secondary/20 dark:bg-primary/20 -z-10 rounded-full"></div>
              </div>
              <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-zinc-400 animate-pulse">Syncing Liquid Stream...</p>
            </div>
          ) : (
            <div className="relative h-fit mb-24">
              <div className="shadow-[0_40px_120px_-30px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] bg-white dark:bg-zinc-900 h-fit rounded-sm border border-white/10 transition-all duration-500 transform-gpu ring-1 ring-black/5 dark:ring-white/5">
                <canvas ref={canvasRef} className="max-w-full h-auto block" />
              </div>
              
              {/* Contextual Search Overlay if any */}
              {searchResults.length > 0 && (
                <div className="absolute -top-4 -right-4 bg-secondary dark:bg-primary text-white dark:text-black p-2 rounded-full shadow-2xl animate-bounce">
                  <Search className="w-4 h-4" />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Floating Liquid Interaction Bar */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 flex items-center bg-white/40 dark:bg-black/60 backdrop-blur-3xl p-3 rounded-[2rem] glass border-white/20 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          <div className="flex items-center space-x-2 border-r border-slate-200 dark:border-white/10 pr-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
              disabled={currentPage === 1}
              className="h-10 w-10 md:h-12 md:w-12 rounded-2xl hover:bg-white/60 dark:hover:bg-white/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="px-4 flex flex-col items-center min-w-[100px]">
              <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{currentPage} / {pdfDoc?.numPages || '?'}</span>
              <span className="text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-0.5">Location</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentPage(Math.min(pdfDoc?.numPages || 1, currentPage + 1))} 
              disabled={currentPage === pdfDoc?.numPages}
              className="h-10 w-10 md:h-12 md:w-12 rounded-2xl hover:bg-white/60 dark:hover:bg-white/10"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center space-x-2 pl-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setZoom(prev => Math.max(0.4, prev - 0.2))}
              className="h-10 w-10 md:h-12 md:w-12 rounded-2xl hover:bg-white/60 dark:hover:bg-white/10"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <div className="px-3 flex flex-col items-center min-w-[70px]">
              <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{Math.round(zoom * 100)}%</span>
              <span className="text-[9px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-0.5">Scale</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setZoom(prev => Math.min(4, prev + 0.2))}
              className="h-10 w-10 md:h-12 md:w-12 rounded-2xl hover:bg-white/60 dark:hover:bg-white/10"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
