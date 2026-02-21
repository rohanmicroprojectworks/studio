
/**
 * @fileoverview Universal PSD Studio Tool
 * Responsibility: High-fidelity PSD rendering with full layer composition support and professional UI.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { renderPSDToCanvas, exportCanvasAsImage, exportCanvasAsPDF } from '@/lib/psd-service';
import { triggerDownload } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { 
  Image as ImageIcon, 
  FileText, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  X,
  Layers,
  ArrowLeft,
  Download,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const PSDViewerTool: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [renderedCanvas, setRenderedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (files: File[]) => {
    const file = files[0];
    setSourceFile(file);
    setIsProcessing(true);
    setRenderedCanvas(null);
    try {
      const canvas = await renderPSDToCanvas(file);
      setRenderedCanvas(canvas);
      
      // Auto-fit initial zoom with padding
      if (containerRef.current) {
        const padding = 160;
        const availableWidth = containerRef.current.clientWidth - padding;
        const availableHeight = containerRef.current.clientHeight - padding;
        const ratio = Math.min(availableWidth / canvas.width, availableHeight / canvas.height, 1);
        setZoom(ratio);
      }
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Load Error", 
        description: err.message || "Could not composite this PSD document." 
      });
      setSourceFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async (format: 'png' | 'jpg' | 'pdf') => {
    if (!renderedCanvas || !sourceFile) return;
    setIsProcessing(true);
    try {
      if (format === 'pdf') {
        const pdfBytes = await exportCanvasAsPDF(renderedCanvas, sourceFile.name);
        triggerDownload(pdfBytes, `${sourceFile.name.split('.')[0]}.pdf`);
      } else {
        exportCanvasAsImage(renderedCanvas, format, sourceFile.name);
      }
      toast({ title: "Studio Export", description: `File saved successfully as ${format.toUpperCase()}.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Export Failed", description: "Memory limit exceeded during export composition." });
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard zoom support (Ctrl + / -)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          setZoom(z => Math.min(5, z + 0.1));
        } else if (e.key === '-') {
          e.preventDefault();
          setZoom(z => Math.max(0.05, z - 0.1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!sourceFile) {
    return (
      <div className="max-w-5xl mx-auto w-full px-4 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-6 bg-blue-500/10 dark:bg-blue-500/5 rounded-3xl mb-4">
            <Layers className="w-16 h-16 text-blue-500" />
          </div>
          <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">PSD Studio</h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-bold max-w-2xl">
            Professional high-fidelity Photoshop rendering. <br/>Full layer hierarchy and mask composition.
          </p>
        </div>
        
        <FileUpload onFilesSelected={handleFileSelect} className="h-[400px]" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
           <div className="glass-card p-8 rounded-3xl space-y-3">
              <Zap className="w-8 h-8 text-amber-500" />
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Direct Composition</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">Hardware-accelerated rendering from the original layer stack.</p>
           </div>
           <div className="glass-card p-8 rounded-3xl space-y-3">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Sandbox Privacy</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">Your creative work never leaves your device. No cloud uploads.</p>
           </div>
           <div className="glass-card p-8 rounded-3xl space-y-3">
              <Layers className="w-8 h-8 text-blue-500" />
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Full Fidelity</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">Handles complex PSDs even without "Maximize Compatibility" enabled.</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-700 bg-slate-50 dark:bg-zinc-950">
      {/* Studio Toolbar */}
      <div className="flex justify-between items-center p-4 md:px-8 border-b border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/60 backdrop-blur-3xl shrink-0 z-50">
        <div className="flex items-center space-x-6">
          <Button 
            variant="ghost" 
            onClick={() => { setSourceFile(null); setRenderedCanvas(null); }}
            className="rounded-2xl h-12 w-12 glass shadow-lg border-white/20 hover:scale-110 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-slate-900 dark:text-white truncate max-w-[150px] md:max-w-lg leading-none">{sourceFile.name}</h2>
            <div className="flex items-center space-x-2 mt-1.5">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary dark:text-primary">Studio Render</span>
               <span className="text-slate-300 dark:text-zinc-700">•</span>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{(sourceFile.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex glass p-1.5 rounded-2xl items-center space-x-1 border-white/20 shadow-sm">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setZoom(z => Math.max(0.05, z - 0.15))}><Minimize2 className="w-4 h-4" /></Button>
            <div className="w-16 text-center">
              <span className="text-[11px] font-black tabular-nums">{Math.round(zoom * 100)}%</span>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setZoom(z => Math.min(5, z + 0.15))}><Maximize2 className="w-4 h-4" /></Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative group">
               <Button 
                  disabled={isProcessing || !renderedCanvas} 
                  variant="outline"
                  className="glass-button h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border-white/20 shadow-md flex items-center"
                >
                  <Download className="w-4 h-4 mr-3" /> Export
                </Button>
                
                <div className="absolute top-full right-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 pt-3 z-50">
                  <div className="glass p-3 rounded-[2rem] flex flex-col space-y-1.5 border-white/30 shadow-2xl min-w-[160px] backdrop-blur-3xl">
                    <Button variant="ghost" className="h-10 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest justify-start" onClick={() => handleExport('png')}><ImageIcon className="w-3.5 h-3.5 mr-3" /> PNG Image</Button>
                    <Button variant="ghost" className="h-10 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest justify-start" onClick={() => handleExport('jpg')}><ImageIcon className="w-3.5 h-3.5 mr-3" /> JPG Image</Button>
                    <div className="h-px bg-white/10 mx-2"></div>
                    <Button variant="ghost" className="h-10 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest justify-start" onClick={() => handleExport('pdf')}><FileText className="w-3.5 h-3.5 mr-3" /> PDF Document</Button>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-auto custom-scrollbar flex items-center justify-center p-12 md:p-24 bg-slate-100 dark:bg-zinc-950/50"
      >
        <AnimatePresence mode="wait">
          {isProcessing && !renderedCanvas ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-8"
            >
              <div className="relative">
                <Loader2 className="w-20 h-20 animate-spin text-secondary dark:text-primary" />
                <Layers className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-secondary/40" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 animate-pulse">Reconstructing Studio Stack</p>
                <p className="text-[9px] font-bold text-slate-400">Performing high-fidelity layer composition...</p>
              </div>
            </motion.div>
          ) : renderedCanvas && (
            <motion.div 
              key="canvas"
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="shadow-[0_60px_120px_-30px_rgba(0,0,0,0.3)] dark:shadow-[0_60px_120px_-30px_rgba(0,0,0,0.8)] rounded-sm overflow-hidden bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5"
              style={{ 
                width: renderedCanvas.width * zoom, 
                height: renderedCanvas.height * zoom,
                minWidth: renderedCanvas.width * zoom,
                minHeight: renderedCanvas.height * zoom
              }}
            >
              <canvas 
                ref={(el) => {
                  if (el && renderedCanvas) {
                    el.width = renderedCanvas.width;
                    el.height = renderedCanvas.height;
                    const ctx = el.getContext('2d');
                    ctx?.drawImage(renderedCanvas, 0, 0);
                  }
                }}
                className="w-full h-full block image-render-auto"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .image-render-auto {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
};
