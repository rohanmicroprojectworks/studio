
/**
 * @fileoverview Universal PSD Studio Tool
 * Responsibility: High-fidelity PSD rendering with manual composition fallback.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState, useRef } from 'react';
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
  ArrowLeft
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
      
      if (containerRef.current) {
        const padding = 120;
        const availableWidth = containerRef.current.clientWidth - padding;
        const availableHeight = containerRef.current.clientHeight - padding;
        const ratio = Math.min(availableWidth / canvas.width, availableHeight / canvas.height, 1);
        setZoom(ratio);
      }
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Load Error", 
        description: err.message || "Could not render this PSD file." 
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
      toast({ title: "Export Successful", description: `Saved as ${format.toUpperCase()}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Export Failed", description: "Internal processing error." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!sourceFile) {
    return (
      <div className="max-w-4xl mx-auto w-full px-2 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
        <Button 
          variant="ghost" 
          onClick={() => window.location.reload()} 
          className="absolute -top-4 -left-4 h-12 w-12 rounded-full glass hover:bg-white/40 shadow-xl z-50 flex items-center justify-center border-white/20"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">PSD Studio</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold">Universal Photoshop rendering. No uploads, no limits.</p>
        </div>
        <FileUpload onFilesSelected={handleFileSelect} className="h-96" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500 bg-slate-50 dark:bg-zinc-950">
      <div className="flex justify-between items-center p-4 md:p-6 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shrink-0 z-50">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => { setSourceFile(null); setRenderedCanvas(null); }}
            className="rounded-2xl h-11 w-11 glass shadow-md border-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900 dark:text-white truncate max-w-[150px] md:max-w-xs">{sourceFile.name}</h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{(sourceFile.size / 1024 / 1024).toFixed(2)} MB • Universal Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden md:flex glass p-1.5 rounded-2xl items-center space-x-1 border-white/20">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}><Minimize2 className="w-4 h-4" /></Button>
            <span className="text-[10px] font-black w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setZoom(z => Math.min(4, z + 0.1))}><Maximize2 className="w-4 h-4" /></Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              disabled={isProcessing} 
              onClick={() => handleExport('png')}
              variant="outline"
              className="glass-button h-11 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-white/20"
            >
              <ImageIcon className="w-4 h-4 mr-2" /> PNG
            </Button>
            <button 
              disabled={isProcessing} 
              onClick={() => handleExport('pdf')}
              className="liquid-button h-11 px-6 rounded-xl group"
            >
              <span className="liquid-button-text flex items-center text-[10px] font-black uppercase tracking-widest">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                Export PDF
              </span>
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 relative overflow-auto custom-scrollbar flex items-center justify-center p-8 md:p-16"
      >
        <AnimatePresence mode="wait">
          {isProcessing && !renderedCanvas ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-6"
            >
              <Loader2 className="w-16 h-16 animate-spin text-secondary" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Compositing Layers...</p>
            </motion.div>
          ) : renderedCanvas && (
            <motion.div 
              key="canvas"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] rounded-sm overflow-hidden bg-white dark:bg-zinc-900"
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
                className="w-full h-full block"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
