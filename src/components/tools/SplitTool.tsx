/**
 * @fileoverview Split PDF Tool Component
 * Responsibility: Page range extraction with visual live previews and Liquid Glass UI.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './FileUpload';
import { splitPDFDocument, extractAndMergePDFRanges, triggerDownload } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Scissors, Plus, X, Eye, Loader2, Info, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

const PDF_JS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;

interface PageRange {
  start: string;
  end: string;
  id: string;
}

interface SplitToolProps {
  initialFile?: File | null;
}

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
    return () => { active = false; };
  }, [file, pageIndex]);

  return (
    <div className="relative w-20 h-28 md:w-28 md:h-40 bg-slate-900/5 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/5 overflow-hidden flex items-center justify-center shadow-inner">
      {loading && <Loader2 className="w-5 h-5 animate-spin text-secondary dark:text-primary" />}
      {error && <span className="text-[8px] text-destructive font-black uppercase text-center px-1">Page Error</span>}
      <canvas ref={canvasRef} className={`w-full h-full object-contain transition-opacity duration-500 ${loading || error ? 'opacity-0' : 'opacity-100'}`} />
      <div className="absolute bottom-1 right-1 bg-slate-900/80 dark:bg-primary/80 backdrop-blur-md text-[8px] text-white px-1.5 py-0.5 rounded-full font-black">PG.{pageIndex}</div>
    </div>
  );
};

export const SplitTool: React.FC<SplitToolProps> = ({ initialFile }) => {
  const [sourceFile, setSourceFile] = useState<File | null>(initialFile || null);
  const [totalPageCount, setTotalPageCount] = useState(0);
  const [extractionRanges, setExtractionRanges] = useState<PageRange[]>([{ start: '1', end: '', id: '1' }]);
  const [mergeOutput, setMergeOutput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (sourceFile) {
      const loadMetadata = async () => {
        try {
          const buffer = await sourceFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          setTotalPageCount(pdf.numPages);
          setExtractionRanges([{ start: '1', end: pdf.numPages.toString(), id: crypto.randomUUID() }]);
        } catch (e) {
          toast({ variant: "destructive", title: "Read Error", description: "Could not read PDF metadata." });
          setSourceFile(null);
        }
      };
      loadMetadata();
    }
  }, [sourceFile, toast]);

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
        toast({ variant: "destructive", title: "Invalid Ranges", description: "Please check your page ranges." });
        return;
      }
      if (mergeOutput) {
        const data = await extractAndMergePDFRanges(sourceFile, validRanges);
        triggerDownload(data, `split_merged_${sourceFile.name}`);
      } else {
        const files = await splitPDFDocument(sourceFile, validRanges);
        files.forEach((data, i) => {
          const range = validRanges[i];
          triggerDownload(data, `split_p${range.start}-p${range.end}_${sourceFile.name}`);
        });
      }
      toast({ title: "Success", description: "Files processed successfully." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to process PDF." });
    } finally {
      setIsProcessing(false);
    }
  };

  const addExtractionRange = () => setExtractionRanges([...extractionRanges, { start: '', end: '', id: crypto.randomUUID() }]);
  const removeExtractionRange = (id: string) => {
    if (extractionRanges.length > 1) setExtractionRanges(extractionRanges.filter(r => r.id !== id));
  };
  const updateRangeValues = (id: string, key: 'start' | 'end', val: string) => {
    setExtractionRanges(extractionRanges.map(r => r.id === id ? { ...r, [key]: val } : r));
  };

  if (!sourceFile) return <FileUpload onFilesSelected={(files) => setSourceFile(files[0])} />;

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Split Studio</h2>
          <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center text-sm md:text-base">
            Configure extraction segments.
            <ChevronRight className="w-4 h-4 mx-2 text-secondary dark:text-primary" />
            <span className="text-secondary dark:text-primary font-black">{totalPageCount} PAGES TOTAL</span>
          </p>
        </div>
        <div className="flex space-x-3 w-full xl:w-auto">
          <Button variant="outline" onClick={() => setSourceFile(null)} className="glass-button rounded-xl h-12 px-6 text-xs font-black uppercase tracking-widest flex-1 xl:flex-none">
            Swap File
          </Button>
          <button 
            className="liquid-button h-12 px-8 rounded-xl flex-1 xl:flex-none group min-w-[180px]"
            onClick={onExecuteSplit}
            disabled={isProcessing}
          >
            <span className="liquid-button-text flex items-center font-black uppercase tracking-widest text-xs">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Scissors className="w-4 h-4 mr-2" />}
              {isProcessing ? "Processing..." : "Export Extraction"}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
           <div className="glass-card p-8 rounded-[2rem] space-y-6 border-white/50 dark:border-white/5 shadow-xl">
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="p-8 bg-primary/10 dark:bg-primary/5 rounded-3xl shadow-inner">
                    <FileText className="w-16 h-16 text-secondary dark:text-primary" />
                 </div>
                 <div className="space-y-1">
                    <p className="font-black text-xl truncate max-w-[200px] text-slate-900 dark:text-white">{sourceFile.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-black uppercase tracking-widest">{(sourceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                 </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                 <div 
                   className="flex items-center space-x-3 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-all group" 
                   onClick={() => setMergeOutput(!mergeOutput)}
                 >
                   <Checkbox 
                     checked={mergeOutput} 
                     onCheckedChange={(checked) => setMergeOutput(!!checked)}
                     id="merge-toggle"
                     className="rounded-md border-secondary dark:border-primary w-5 h-5 data-[state=checked]:bg-secondary dark:data-[state=checked]:bg-primary"
                   />
                   <div className="flex flex-col">
                      <label htmlFor="merge-toggle" className="text-sm font-black cursor-pointer text-slate-900 dark:text-white">Merge output</label>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold">Combine all segments</span>
                   </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="font-black text-xl flex items-center text-slate-900 dark:text-white uppercase tracking-tight">
                <Eye className="w-6 h-6 mr-3 text-secondary dark:text-primary" /> 
                Extraction Map
             </h3>
             <Button 
                variant="ghost" 
                className="text-secondary dark:text-primary hover:text-white dark:hover:text-black hover:bg-secondary dark:hover:bg-primary rounded-xl h-10 px-4 font-black transition-all bg-white/40 dark:bg-zinc-800/40"
                onClick={addExtractionRange}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Range
              </Button>
          </div>

          <div className="space-y-4">
            {extractionRanges.map((range, idx) => (
              <div key={range.id} className="glass-card p-6 md:p-8 rounded-[2rem] relative group border-white/60 dark:border-white/5 shadow-lg hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-all">
                {extractionRanges.length > 1 && (
                  <button 
                    onClick={() => removeExtractionRange(range.id)}
                    className="absolute -top-3 -right-3 bg-white dark:bg-zinc-900 shadow-xl text-destructive p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all border border-destructive/10 z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex flex-col sm:flex-row gap-8 items-center">
                  <div className="flex-1 w-full space-y-6">
                    <span className="text-[8px] font-black text-secondary dark:text-primary uppercase tracking-[0.3em] bg-secondary/10 dark:bg-primary/10 px-4 py-1.5 rounded-full border border-secondary/5 dark:border-primary/5">
                      Segment {idx + 1}
                    </span>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">From</label>
                        <Input 
                          type="number" 
                          value={range.start} 
                          min="1"
                          max={totalPageCount}
                          onChange={(e) => updateRangeValues(range.id, 'start', e.target.value)}
                          className="glass dark:bg-zinc-900 rounded-2xl h-12 text-xl font-black text-center text-slate-900 dark:text-white border-white/20 dark:border-white/5"
                        />
                      </div>
                      <div className="pt-6 text-slate-200 dark:text-zinc-800 font-black text-xl">→</div>
                      <div className="flex-1 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">To</label>
                        <Input 
                          type="number" 
                          min="1"
                          max={totalPageCount}
                          value={range.end} 
                          onChange={(e) => updateRangeValues(range.id, 'end', e.target.value)}
                          className="glass dark:bg-zinc-900 rounded-2xl h-12 text-xl font-black text-center text-slate-900 dark:text-white border-white/20 dark:border-white/5"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 shrink-0 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-white/30 dark:border-white/5">
                    <div className="text-center space-y-2">
                      <PagePreview file={sourceFile} pageIndex={parseInt(range.start) || 1} />
                      <span className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">Entry</span>
                    </div>
                    <div className="text-center space-y-2">
                      <PagePreview file={sourceFile} pageIndex={parseInt(range.end || range.start) || 1} />
                      <span className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">Exit</span>
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
