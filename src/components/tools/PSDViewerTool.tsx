
/**
 * @fileoverview PSD Viewer & Converter Tool
 * Responsibility: High-fidelity PSD rendering with batch export options and Apple-style UI.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './FileUpload';
import { renderPSDToCanvas, exportCanvasAsImage, exportCanvasAsPDF } from '@/lib/psd-service';
import { triggerDownload } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { 
  FileImage, 
  Download, 
  Image as ImageIcon, 
  FileText, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  X,
  FileOutput,
  Layers
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
    try {
      const canvas = await renderPSDToCanvas(file);
      setRenderedCanvas(canvas);
      // Auto-zoom to fit container
      if (containerRef.current) {
        const ratio = Math.min(
          (containerRef.current.clientWidth - 80) / canvas.width,
          (containerRef.current.clientHeight - 80) / canvas.height,
          1
        );
        setZoom(ratio);
      }
    } catch (err) {
      toast({ 
        variant: "destructive", 
        title: "Load Error", 
        description: "This PSD structure is currently unsupported for browser-native rendering." 
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
      <div className="max-w-4xl mx-auto w-full px-2 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">PSD Studio</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold">Local, high-quality Photoshop preview & conversion.</p>
        </div>
        <div 
          className="relative flex flex-col items-center justify-center w-full h-80 border-4 border-dashed rounded-[3rem] transition-all duration-700 glass"
          style={{ borderStyle: 'dashed' }}
        >
          <input
            type="file"
            accept=".psd"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            onChange={(e) => e.target.files && handleFileSelect(Array.from(e.target.files))}
          />
          <div className="flex flex-col items-center space-y-6 pointer-events-none">
            <div className="p-8 bg-blue-500/10 dark:bg-orange-500/10 rounded-[2.5rem] text-blue-600 dark:text-orange-500">
              <Layers className="w-12 h-12" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">Upload PSD File</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Dynamic Header */}
      <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => { setSourceFile(null); setRenderedCanvas(null); }}
            className="rounded-2xl h-12 w-12 glass shadow-lg"
          >
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white truncate max-w-[200px]">{sourceFile.name}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{(sourceFile.size / 1024 / 1024).toFixed(2)} MB • Native Render</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="glass p-1.5 rounded-2xl flex items-center space-x-1 border-white/20">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}><Minimize2 className="w-4 h-4" /></Button>
            <span className="text-[10px] font-black w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setZoom(z => Math.min(3, z + 0.1))}><Maximize2 className="w-4 h-4" /></Button>
          </div>
          
          <div className="h-10 w-px bg-white/10 mx-2" />
          
          <div className="flex items-center space-x-2">
            <Button 
              disabled={isProcessing} 
              onClick={() => handleExport('png')}
              className="glass-button h-12 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest"
            >
              <ImageIcon className="w-4 h-4 mr-2" /> PNG
            </Button>
            <Button 
              disabled={isProcessing} 
              onClick={() => handleExport('jpg')}
              className="glass-button h-12 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest"
            >
              <FileOutput className="w-4 h-4 mr-2" /> JPG
            </Button>
            <button 
              disabled={isProcessing} 
              onClick={() => handleExport('pdf')}
              className="liquid-button h-12 px-6 rounded-2xl group min-w-[120px]"
            >
              <span className="liquid-button-text flex items-center text-[10px] font-black uppercase tracking-widest">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                Save PDF
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Workspace */}
      <div 
        ref={containerRef}
        className="flex-1 bg-slate-100 dark:bg-zinc-950/50 relative overflow-auto custom-scrollbar flex items-center justify-center p-12"
      >
        <AnimatePresence mode="wait">
          {isProcessing && !renderedCanvas ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-4"
            >
              <Loader2 className="w-12 h-12 animate-spin text-secondary" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Processing PSD Data...</p>
            </motion.div>
          ) : renderedCanvas && (
            <motion.div 
              key="canvas"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="shadow-2xl ring-1 ring-black/5"
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
