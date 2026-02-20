/**
 * @fileoverview Enhanced Immersive PDF Viewer Tool
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
  Type
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PDF_JS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/api/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;

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

  // Load PDF Document
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
          toast({ variant: "destructive", title: "Error", description: "Failed to load PDF." });
          setSourceFile(null);
        } finally {
          setIsLoading(false);
        }
      };
      loadPDF();
    }
  }, [sourceFile, toast]);

  // Render Page to Canvas
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
        console.error("Render error", err);
      }
    }
  }, [pdfDoc, currentPage, zoom]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!viewerRef.current) return;
    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().catch((err) => {
        toast({ variant: "destructive", title: "Fullscreen Error", description: err.message });
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

  // Handle Search
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
        toast({ title: "Found", description: `${results.length} matches found.` });
      } else {
        toast({ variant: "destructive", title: "No results", description: "No matches found in document." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Search Error", description: "Could not complete text search." });
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

  if (!sourceFile) return <FileUpload onFilesSelected={(f) => setSourceFile(f[0])} />;

  return (
    <div 
      ref={viewerRef}
      className={cn(
        "flex flex-col h-full bg-background relative overflow-hidden transition-all duration-700",
        isFullscreen ? "p-0" : "p-0 rounded-[2.5rem]"
      )}
    >
      {/* Immersive Top Bar */}
      <header className="flex items-center justify-between px-6 h-16 bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-b border-white/20 z-30 shrink-0">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowThumbnails(!showThumbnails)} 
            className={cn("glass-button rounded-xl h-10 w-10", showThumbnails && "bg-secondary/20 dark:bg-primary/20")}
          >
            <SidebarIcon className="w-5 h-5" />
          </Button>
          <div className="h-6 w-px bg-white/20" />
          <div className="flex flex-col min-w-0">
            <p className="font-black text-sm truncate max-w-[200px] text-slate-900 dark:text-white leading-none">
              {sourceFile.name}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              {pdfDoc ? `${pdfDoc.numPages} Pages` : "Loading..."}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-secondary transition-colors" />
            <Input 
              placeholder="Find text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="glass h-10 pl-11 pr-24 rounded-2xl border-white/20 bg-white/10 dark:bg-black/10 text-sm font-bold focus:ring-secondary/20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {searchResults.length > 0 && (
                <span className="text-[10px] font-black text-slate-500 mr-2">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg"
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              </Button>
              {searchResults.length > 0 && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={prevSearchResult}><ChevronLeft className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={nextSearchResult}><ChevronRight className="w-3 h-3" /></Button>
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
            className="glass-button rounded-xl h-10 w-10"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
          {!isFullscreen && (
            <Button 
              variant="outline" 
              onClick={() => setSourceFile(null)} 
              className="glass-button rounded-xl h-10 px-6 font-black text-xs uppercase tracking-widest"
            >
              Close
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Thumbnails Sidebar */}
        <aside className={cn(
          "w-64 bg-white/20 dark:bg-black/20 backdrop-blur-2xl border-r border-white/10 transition-all duration-500 overflow-y-auto custom-scrollbar z-20",
          showThumbnails ? "translate-x-0" : "-translate-x-full absolute"
        )}>
          <div className="p-4 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Document Overview</h3>
            {pdfDoc && Array.from({ length: pdfDoc.numPages }).map((_, i) => (
              <div 
                key={i} 
                onClick={() => setCurrentPage(i + 1)}
                className={cn(
                  "p-2 rounded-2xl cursor-pointer transition-all border-2",
                  currentPage === i + 1 
                    ? "bg-secondary/10 dark:bg-primary/10 border-secondary dark:border-primary" 
                    : "bg-white/5 dark:bg-white/2 border-transparent hover:bg-white/10 dark:hover:bg-white/5"
                )}
              >
                <div className="aspect-[3/4] bg-slate-200 dark:bg-zinc-800 rounded-xl flex flex-col items-center justify-center space-y-2 mb-2 shadow-inner">
                   <Type className="w-6 h-6 text-slate-400" />
                   <span className="text-[10px] font-black text-slate-500">Page {i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main 
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-100/30 dark:bg-black/30 p-8 flex flex-col items-center custom-scrollbar relative"
        >
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-secondary dark:text-primary" />
              <p className="font-black text-sm uppercase tracking-widest text-slate-500">Preparing Document...</p>
            </div>
          ) : (
            <div className="shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] bg-white dark:bg-zinc-900 h-fit rounded-sm transition-transform duration-500 transform-gpu">
              <canvas ref={canvasRef} className="max-w-full h-auto block" />
            </div>
          )}
        </main>

        {/* Floating Controls Bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center bg-white/40 dark:bg-black/60 backdrop-blur-3xl p-2 rounded-2xl glass border-white/20 shadow-2xl">
          <div className="flex items-center space-x-1 border-r border-white/10 pr-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
              disabled={currentPage === 1}
              className="h-10 w-10 rounded-xl"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="px-4 flex flex-col items-center min-w-[80px]">
              <span className="text-xs font-black text-slate-900 dark:text-white">{currentPage} / {pdfDoc?.numPages || '?'}</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Current Page</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentPage(Math.min(pdfDoc?.numPages || 1, currentPage + 1))} 
              disabled={currentPage === pdfDoc?.numPages}
              className="h-10 w-10 rounded-xl"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center space-x-1 pl-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
              className="h-10 w-10 rounded-xl"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="px-3 font-black text-xs text-slate-500 dark:text-zinc-400 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
              className="h-10 w-10 rounded-xl"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
