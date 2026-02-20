
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './FileUpload';
import { splitPDF, splitAndMergePDF, downloadBlob } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Scissors, Plus, X, Eye, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PageRange {
  start: string;
  end: string;
  id: string;
}

const PageThumbnail = ({ file, pageNum }: { file: File; pageNum: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const renderPage = async () => {
      if (!canvasRef.current || !pageNum || pageNum <= 0) return;
      setLoading(true);
      setError(false);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (pageNum > pdf.numPages) {
          setError(true);
          setLoading(false);
          return;
        }

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (context && active) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (err) {
        console.error("Preview error:", err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    renderPage();
    return () => { active = false; };
  }, [file, pageNum]);

  return (
    <div className="relative w-24 h-32 bg-white/10 rounded-lg border border-white/20 overflow-hidden flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
      {loading && <Loader2 className="w-5 h-5 animate-spin text-secondary" />}
      {error && <span className="text-[10px] text-destructive font-black uppercase tracking-tighter text-center px-1">Invalid<br/>Page</span>}
      <canvas ref={canvasRef} className={`w-full h-full object-contain ${loading || error ? 'hidden' : ''}`} />
      <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md text-[9px] text-white px-1.5 py-0.5 rounded font-bold">P.{pageNum}</div>
    </div>
  );
};

export const SplitTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [ranges, setRanges] = useState<PageRange[]>([{ start: '1', end: '', id: '1' }]);
  const [mergeAll, setMergeAll] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (file) {
      const getPages = async () => {
        try {
          const buffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          setTotalPages(pdf.numPages);
          // Auto-set the end of the first range to the last page if it's empty
          setRanges([{ start: '1', end: pdf.numPages.toString(), id: '1' }]);
        } catch (e) {
          toast({ variant: "destructive", title: "Error", description: "Could not read PDF metadata." });
        }
      };
      getPages();
    }
  }, [file, toast]);

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const validRanges = ranges.map(r => {
        const start = Math.max(1, parseInt(r.start) || 1);
        const end = Math.min(totalPages, parseInt(r.end || r.start) || totalPages);
        return { start, end };
      }).filter(r => r.start <= r.end);

      if (validRanges.length === 0) {
        toast({ variant: "destructive", title: "Invalid Ranges", description: "Please ensure start pages are not greater than end pages." });
        setIsProcessing(false);
        return;
      }

      if (mergeAll) {
        const result = await splitAndMergePDF(file, validRanges);
        downloadBlob(result, `extracted-${file.name}`);
      } else {
        const results = await splitPDF(file, validRanges);
        results.forEach((data, i) => {
          const range = validRanges[i];
          downloadBlob(data, `split-${range.start}-${range.end}-${file.name}`);
        });
      }
      toast({ title: "Extraction Complete", description: `Successfully processed ${validRanges.length} range(s).` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Split operation failed locally." });
    } finally {
      setIsProcessing(false);
    }
  };

  const addRange = () => {
    setRanges([...ranges, { start: '', end: '', id: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeRange = (id: string) => {
    if (ranges.length > 1) {
      setRanges(ranges.filter(r => r.id !== id));
    }
  };

  const updateRange = (id: string, field: 'start' | 'end', value: string) => {
    setRanges(ranges.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  if (!file) {
    return <FileUpload onFilesSelected={(files) => setFile(files[0])} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-headline font-black text-secondary-foreground tracking-tight">Split Workspace</h2>
          <p className="text-muted-foreground mt-1">Extract specific page segments with visual confirmation.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setFile(null)} className="glass-button rounded-2xl h-12 px-6">
            New File
          </Button>
          <Button 
            className="bg-secondary hover:bg-secondary/90 text-white font-bold h-12 px-8 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
            onClick={handleSplit}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Scissors className="w-5 h-5 mr-2" />}
            {isProcessing ? "Processing..." : "Export Extraction"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* File Overview Sidebar */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
           <div className="glass-card p-8 rounded-[2rem] flex flex-col items-center justify-center space-y-6">
              <div className="p-10 bg-primary/20 rounded-[2.5rem] shadow-inner relative group">
                 <FileText className="w-20 h-20 text-secondary-foreground group-hover:rotate-6 transition-transform" />
                 <div className="absolute -bottom-2 -right-2 bg-secondary text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-2xl border border-white/20">
                   {totalPages} PAGES
                 </div>
              </div>
              <div className="text-center w-full">
                 <p className="font-bold text-xl truncate px-4 text-foreground">{file.name}</p>
                 <p className="text-sm text-muted-foreground font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              
              <div className="w-full pt-6 border-t border-white/10 space-y-4">
                 <div 
                   className="flex items-center space-x-3 bg-white/10 p-5 rounded-2xl cursor-pointer hover:bg-white/20 transition-all border border-white/5 group" 
                   onClick={() => setMergeAll(!mergeAll)}
                 >
                   <Checkbox 
                     checked={mergeAll} 
                     onCheckedChange={(checked) => setMergeAll(!!checked)}
                     id="merge-toggle"
                     className="rounded-md border-secondary/50 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                   />
                   <div className="flex flex-col">
                      <label htmlFor="merge-toggle" className="text-sm font-bold leading-none cursor-pointer text-foreground group-hover:text-secondary transition-colors">
                        Combine all ranges
                      </label>
                      <span className="text-[10px] text-muted-foreground mt-1">Export as a single PDF document</span>
                   </div>
                 </div>
              </div>
           </div>

           <div className="glass-card p-6 rounded-3xl bg-secondary/5 border-secondary/10">
              <div className="flex items-center space-x-2 text-secondary mb-2">
                <Info className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Local Processing</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your file is processed entirely in your browser using the MuPDF engine. No data is ever uploaded to a server.
              </p>
           </div>
        </div>

        {/* Range Settings Workspace */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="font-headline font-black text-xl flex items-center text-secondary-foreground">
                <Eye className="w-6 h-6 mr-3 text-secondary" /> 
                Extraction Map
             </h3>
             <Button 
                variant="ghost" 
                size="sm"
                className="text-secondary hover:text-white hover:bg-secondary rounded-xl px-4 py-5 font-bold transition-all shadow-sm"
                onClick={addRange}
              >
                <Plus className="w-5 h-5 mr-2" /> New Range
              </Button>
          </div>

          <div className="space-y-6">
            {ranges.map((range, index) => (
              <div key={range.id} className="glass-card p-8 rounded-[2.5rem] relative group border-white/10 shadow-2xl hover:bg-white/40 transition-all">
                {ranges.length > 1 && (
                  <button 
                    onClick={() => removeRange(range.id)}
                    className="absolute -top-3 -right-3 bg-white shadow-xl text-destructive p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-white border border-destructive/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                
                <div className="flex flex-col xl:flex-row gap-10 items-center">
                  <div className="flex-1 w-full space-y-6">
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-black text-secondary uppercase tracking-[0.2em] bg-secondary/10 px-3 py-1 rounded-lg">Segment {index + 1}</span>
                    </div>
                    
                    <div className="flex items-end space-x-6">
                      <div className="flex-1 space-y-3">
                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Start Page</label>
                        <Input 
                          type="number" 
                          value={range.start} 
                          min="1"
                          max={totalPages}
                          onChange={(e) => updateRange(range.id, 'start', e.target.value)}
                          className="glass focus:ring-4 focus:ring-primary/20 border-none rounded-2xl h-14 text-xl font-black text-center"
                          placeholder="1"
                        />
                      </div>
                      <div className="pb-4 text-muted-foreground font-headline font-black opacity-30 text-2xl">→</div>
                      <div className="flex-1 space-y-3">
                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">End Page</label>
                        <Input 
                          type="number" 
                          min="1"
                          max={totalPages}
                          placeholder={range.start || "..."}
                          value={range.end} 
                          onChange={(e) => updateRange(range.id, 'end', e.target.value)}
                          className="glass focus:ring-4 focus:ring-primary/20 border-none rounded-2xl h-14 text-xl font-black text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-6 shrink-0 bg-white/20 p-6 rounded-[2rem] border border-white/20 shadow-inner">
                    <div className="text-center space-y-3 group/thumb">
                      <PageThumbnail file={file} pageNum={parseInt(range.start) || 1} />
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block opacity-60 group-hover/thumb:text-secondary transition-colors">Start</span>
                    </div>
                    <div className="text-center space-y-3 group/thumb">
                      <PageThumbnail file={file} pageNum={parseInt(range.end || range.start) || 1} />
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block opacity-60 group-hover/thumb:text-secondary transition-colors">End</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {ranges.length > 0 && (
              <div className="pt-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-black opacity-40">End of Extraction Map</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
