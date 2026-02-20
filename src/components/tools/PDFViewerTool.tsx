/**
 * @fileoverview PDF Viewer Tool Component
 * Responsibility: Browser-native PDF viewing with navigation and zoom.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Loader2, Sidebar } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

const PDF_JS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;

export const PDFViewerTool: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sourceFile) {
      const loadPDF = async () => {
        const buffer = await sourceFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        setPdfDoc(pdf);
        setCurrentPage(1);
      };
      loadPDF();
    }
  }, [sourceFile]);

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      const renderPage = async () => {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
        }
      };
      renderPage();
    }
  }, [pdfDoc, currentPage, zoom]);

  if (!sourceFile) return <FileUpload onFilesSelected={(f) => setSourceFile(f[0])} />;

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-2">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={() => setShowThumbnails(!showThumbnails)} className="glass-button rounded-xl">
            <Sidebar className="w-5 h-5" />
          </Button>
          <div className="h-10 w-px bg-slate-200 dark:bg-zinc-800" />
          <p className="font-black text-lg truncate max-w-[200px] text-slate-900 dark:text-white">{sourceFile.name}</p>
        </div>

        <div className="flex items-center bg-white/40 dark:bg-zinc-900/40 p-1.5 rounded-2xl glass border-white/20">
          <Button variant="ghost" size="icon" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="px-4 font-black text-sm text-slate-900 dark:text-white">
            {currentPage} / {pdfDoc?.numPages || '?'}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentPage(Math.min(pdfDoc?.numPages || 1, currentPage + 1))} disabled={currentPage === pdfDoc?.numPages}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-white/40 dark:bg-zinc-900/40 p-1.5 rounded-2xl glass border-white/20">
            <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="px-3 font-black text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => setSourceFile(null)} className="glass-button rounded-xl h-11 px-6">Close</Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden rounded-[2.5rem] border border-white/20 glass shadow-2xl relative">
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-100/50 dark:bg-black/20 custom-scrollbar" ref={containerRef}>
          <div className="shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] bg-white dark:bg-zinc-900 h-fit">
            <canvas ref={canvasRef} className="max-w-full h-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};
