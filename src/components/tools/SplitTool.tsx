/**
 * @fileoverview Split PDF Tool Component
 * Responsibility: Page range extraction with visual live previews.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileUpload } from './FileUpload';
import { splitPDFDocument, extractAndMergePDFRanges, triggerDownload } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Scissors, Plus, X, Eye, Loader2, Info, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker securely via CDN
const PDF_JS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;

interface PageRange {
  start: string;
  end: string;
  id: string;
}

/**
 * PagePreview Component
 * Renders a localized thumbnail of a specific PDF page.
 */
const PagePreview = ({ file, pageIndex }: { file: File; pageIndex: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const renderThumbnail = async () => {
      if (!canvasRef.current || pageIndex <= 0) return;
      setLoading(true);
      setError(false);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (pageIndex > pdf.numPages) {
          if (active) setError(true);
          return;
        }

        const page = await pdf.getPage(pageIndex);
        const viewport = page.getViewport({ scale: 0.4 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (context && active) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (err) {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    renderThumbnail();
    return () => { active = true; };
  }, [file, pageIndex]);

  return (
    <div className="relative w-28 h-40 bg-slate-900/5 rounded-2xl border border-white/20 overflow-hidden flex items-center justify-center shadow-inner">
      {loading && <Loader2 className="w-6 h-6 animate-spin text-secondary" />}
      {error && <span className="text-[10px] text-destructive font-black uppercase text-center px-2">Page<br/>Error</span>}
      <canvas ref={canvasRef} className={`w-full h-full object-contain transition-opacity duration-500 ${loading || error ? 'opacity-0' : 'opacity-100'}`} />
      <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md text-[9px] text-white px-2 py-0.5 rounded-full font-black">PG.{pageIndex}</div>
    </div>
  );
};

export const SplitTool: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [totalPageCount, setTotalPageCount] = useState(0);
  const [extractionRanges, setExtractionRanges] = useState<PageRange[]>([{ start: '1', end: '', id: '1' }]);
  const [mergeOutput, setMergeOutput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  /**
   * Initialize PDF metadata upon file selection.
   */
  useEffect(() => {
    if (sourceFile) {
      const loadMetadata = async () => {
        try {
          const buffer = await sourceFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          setTotalPageCount(pdf.numPages);
          setExtractionRanges([{ start: '1', end: pdf.numPages.toString(), id: crypto.randomUUID() }]);
        } catch (e) {
          toast({ variant: "destructive", title: "Read Error", description: "This PDF appears to be corrupted or encrypted." });
          setSourceFile(null);
        }
      };
      loadMetadata();
    }
  }, [sourceFile, toast]);

  /**
   * Execution logic for PDF splitting.
   */
  const onExecuteSplit = async () => {
    if (!sourceFile) return;
    setIsProcessing(true);
    
    try {
      const validRanges = extractionRanges.map(r => {
        const start = Math.max(1, parseInt(r.start) || 1);
        const endValue = r.end.trim() === '' ? start : parseInt(r.end);
        const end = Math.min(totalPageCount, isNaN(endValue) ? start : endValue);
        return { start, end };
      }).filter(r => r.start <= r.end);

      if (validRanges.length === 0) {
        toast({ 
          variant: "destructive", 
          title: "Invalid Settings", 
          description: "Check your page ranges. Start page cannot exceed end page." 
        });
        return;
      }

      if (mergeOutput) {
        const data = await extractAndMergePDFRanges(sourceFile, validRanges);
        triggerDownload(data, `extracted_glasspdf_${sourceFile.name}`);
      } else {
        const files = await splitPDFDocument(sourceFile, validRanges);
        files.forEach((data, i) => {
          const range = validRanges[i];
          triggerDownload(data, `split_p${range.start}-p${range.end}_${sourceFile.name}`);
        });
      }

      toast({ title: "Export Complete", description: `Successfully processed ${validRanges.length} range(s).` });
    } catch (err) {
      toast({ variant: "destructive", title: "Process Error", description: "Internal processing failed. Try a smaller file." });
    } finally {
      setIsProcessing(false);
    }
  };

  const addExtractionRange = () => {
    setExtractionRanges([...extractionRanges, { start: '', end: '', id: crypto.randomUUID() }]);
  };

  const removeExtractionRange = (id: string) => {
    if (extractionRanges.length > 1) {
      setExtractionRanges(extractionRanges.filter(r => r.id !== id));
    }
  };

  const updateRangeValues = (id: string, key: 'start' | 'end', val: string) => {
    setExtractionRanges(extractionRanges.map(r => r.id === id ? { ...r, [key]: val } : r));
  };

  if (!sourceFile) {
    return <FileUpload onFilesSelected={(files) => setSourceFile(files[0])} />;
  }

  return (
    <div className="w-full space-y-12 animate-in fade-in zoom-in-95 duration-700">
      {/* Workspace Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight">Split Studio</h2>
          <p className="text-slate-500 font-bold mt-2 flex items-center">
            Define your extraction segments with liquid precision.
            <ChevronRight className="w-4 h-4 mx-2 text-secondary" />
            <span className="text-secondary font-black">{totalPageCount} PAGES TOTAL</span>
          </p>
        </div>
        <div className="flex space-x-4 w-full lg:w-auto">
          <Button variant="outline" onClick={() => setSourceFile(null)} className="glass-button rounded-2xl h-14 px-10 text-xs font-black uppercase tracking-widest flex-1 lg:flex-none">
            Swap File
          </Button>
          <Button 
            className="bg-secondary hover:bg-secondary/90 text-white font-black h-14 px-12 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex-1 lg:flex-none text-lg"
            onClick={onExecuteSplit}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Scissors className="w-6 h-6 mr-3" />}
            {isProcessing ? "Processing..." : "Export Extraction"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Sidebar Info Card */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-0">
           <div className="glass-card p-10 rounded-[3rem] space-y-8 border-white/50 shadow-2xl">
              <div className="relative group mx-auto w-fit">
                 <div className="p-12 bg-primary/20 rounded-[3rem] shadow-inner relative z-10">
                    <FileText className="w-24 h-24 text-secondary group-hover:scale-110 transition-transform duration-500" />
                 </div>
                 <div className="absolute -bottom-4 -right-4 bg-slate-900 text-white text-[12px] font-black px-6 py-2 rounded-full shadow-2xl border border-white/20 z-20">
                   READY
                 </div>
              </div>
              
              <div className="text-center space-y-2">
                 <p className="font-black text-2xl truncate px-4 text-slate-900">{sourceFile.name}</p>
                 <p className="text-sm text-slate-400 font-black uppercase tracking-[0.2em]">{(sourceFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              
              <div className="pt-8 border-t border-slate-900/5">
                 <div 
                   className="flex items-center space-x-4 bg-slate-900/5 p-6 rounded-[2rem] cursor-pointer hover:bg-slate-900/10 transition-all group" 
                   onClick={() => setMergeOutput(!mergeOutput)}
                 >
                   <Checkbox 
                     checked={mergeOutput} 
                     onCheckedChange={(checked) => setMergeOutput(!!checked)}
                     id="merge-toggle"
                     className="rounded-lg border-secondary w-6 h-6 data-[state=checked]:bg-secondary"
                   />
                   <div className="flex flex-col">
                      <label htmlFor="merge-toggle" className="text-base font-black leading-none cursor-pointer text-slate-900 group-hover:text-secondary transition-colors">
                        Merge all segments
                      </label>
                      <span className="text-[11px] text-slate-400 mt-1 font-bold">Combine output into one PDF</span>
                   </div>
                 </div>
              </div>
           </div>

           <div className="glass-card p-8 rounded-3xl bg-emerald-500/5 border-emerald-500/10">
              <div className="flex items-center space-x-3 text-emerald-600 mb-3">
                <Info className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">Privacy Protocol</span>
              </div>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Document data is decrypted and processed locally in your browser's RAM. No data ever leaves your device.
              </p>
           </div>
        </div>

        {/* Dynamic Range Editor */}
        <div className="lg:col-span-8 space-y-10 pb-20">
          <div className="flex items-center justify-between px-4">
             <h3 className="font-black text-2xl flex items-center text-slate-900 uppercase tracking-tight">
                <Eye className="w-8 h-8 mr-4 text-secondary" /> 
                Extraction Map
             </h3>
             <Button 
                variant="ghost" 
                className="text-secondary hover:text-white hover:bg-secondary rounded-2xl h-12 px-6 font-black transition-all shadow-md bg-white/40"
                onClick={addExtractionRange}
              >
                <Plus className="w-5 h-5 mr-2" /> Add Range
              </Button>
          </div>

          <div className="space-y-8">
            {extractionRanges.map((range, idx) => (
              <div key={range.id} className="glass-card p-10 rounded-[3.5rem] relative group border-white/60 shadow-xl hover:bg-white/50 transition-all duration-500 overflow-visible">
                {extractionRanges.length > 1 && (
                  <button 
                    onClick={() => removeExtractionRange(range.id)}
                    className="absolute -top-4 -right-4 bg-white shadow-2xl text-destructive p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 border border-destructive/10 z-30"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
                
                <div className="flex flex-col xl:flex-row gap-12 items-center">
                  <div className="flex-1 w-full space-y-8">
                    <div className="flex items-center">
                       <span className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] bg-secondary/10 px-5 py-2 rounded-full border border-secondary/5">
                        Segment {idx + 1}
                       </span>
                    </div>
                    
                    <div className="flex items-center space-x-8">
                      <div className="flex-1 space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Start Page</label>
                        <Input 
                          type="number" 
                          value={range.start} 
                          min="1"
                          max={totalPageCount}
                          onChange={(e) => updateRangeValues(range.id, 'start', e.target.value)}
                          className="glass focus:ring-8 focus:ring-secondary/10 border-none rounded-3xl h-16 text-3xl font-black text-center text-slate-900"
                          placeholder="1"
                        />
                      </div>
                      <div className="pt-6 text-slate-300 font-black text-3xl animate-pulse">→</div>
                      <div className="flex-1 space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">End Page</label>
                        <Input 
                          type="number" 
                          min="1"
                          max={totalPageCount}
                          placeholder={(parseInt(range.start) || totalPageCount).toString()}
                          value={range.end} 
                          onChange={(e) => updateRangeValues(range.id, 'end', e.target.value)}
                          className="glass focus:ring-8 focus:ring-secondary/10 border-none rounded-3xl h-16 text-3xl font-black text-center text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* High Precision Live Previews */}
                  <div className="flex space-x-6 shrink-0 bg-slate-900/5 p-8 rounded-[2.5rem] border border-white/30 shadow-inner">
                    <div className="text-center space-y-4">
                      <PagePreview file={sourceFile} pageIndex={parseInt(range.start) || 1} />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block opacity-70">Entry</span>
                    </div>
                    <div className="text-center space-y-4">
                      <PagePreview file={sourceFile} pageIndex={parseInt(range.end || range.start) || 1} />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block opacity-70">Exit</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
