
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './FileUpload';
import { splitPDF, splitAndMergePDF, downloadBlob } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Scissors, Plus, X, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

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
    <div className="relative w-24 h-32 bg-white/10 rounded-lg border border-white/20 overflow-hidden flex items-center justify-center shadow-inner">
      {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      {error && <span className="text-[8px] text-destructive font-bold uppercase">Invalid Page</span>}
      <canvas ref={canvasRef} className={`w-full h-full object-contain ${loading || error ? 'hidden' : ''}`} />
      <div className="absolute bottom-1 right-1 bg-black/50 text-[8px] text-white px-1 rounded">P.{pageNum}</div>
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
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        setTotalPages(pdf.numPages);
      };
      getPages();
    }
  }, [file]);

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const validRanges = ranges.map(r => ({ 
        start: Math.max(1, parseInt(r.start) || 1), 
        end: Math.min(totalPages, parseInt(r.end || r.start) || totalPages) 
      })).filter(r => r.start <= r.end);

      if (validRanges.length === 0) {
        toast({ title: "Error", description: "Please enter valid page ranges." });
        return;
      }

      if (mergeAll) {
        const result = await splitAndMergePDF(file, validRanges);
        downloadBlob(result, `extracted-ranges-${file.name}`);
      } else {
        const results = await splitPDF(file, validRanges);
        results.forEach((data, i) => {
          downloadBlob(data, `split-part-${i + 1}-${file.name}`);
        });
      }
      toast({ title: "Success", description: `PDF split completed! ${mergeAll ? 'Merged into one file.' : ''}` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to split PDF." });
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
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-headline font-black text-secondary-foreground">Advanced Split PDF</h2>
          <p className="text-muted-foreground">Extract specific page ranges with live visual confirmation.</p>
        </div>
        <Button variant="outline" onClick={() => setFile(null)} className="glass-button rounded-full">Change File</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* File Overview Card */}
        <div className="lg:col-span-4 glass-card p-8 rounded-3xl flex flex-col items-center justify-center space-y-6 sticky top-8">
           <div className="p-8 bg-primary/20 rounded-[2rem] shadow-inner relative">
              <FileText className="w-16 h-16 text-secondary-foreground" />
              <div className="absolute -bottom-2 -right-2 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                {totalPages} PAGES
              </div>
           </div>
           <div className="text-center w-full">
              <p className="font-bold text-lg truncate px-4">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
           </div>
           
           <div className="w-full pt-4 border-t border-white/20 space-y-4">
              <div className="flex items-center space-x-3 bg-white/20 p-4 rounded-2xl cursor-pointer hover:bg-white/30 transition-colors" onClick={() => setMergeAll(!mergeAll)}>
                <Checkbox 
                  checked={mergeAll} 
                  onCheckedChange={(checked) => setMergeAll(!!checked)}
                  id="merge-toggle"
                  className="rounded-md border-secondary text-secondary"
                />
                <label htmlFor="merge-toggle" className="text-sm font-medium leading-none cursor-pointer">
                  Merge all ranges into one PDF
                </label>
              </div>
              
              <Button 
                className="w-full bg-secondary hover:bg-secondary/80 text-white font-bold h-14 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                onClick={handleSplit}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Scissors className="w-5 h-5 mr-2" />}
                {isProcessing ? "Processing..." : "Export Extraction"}
              </Button>
           </div>
        </div>

        {/* Range Settings Area */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
             <h3 className="font-headline font-bold text-lg flex items-center">
                <Eye className="w-5 h-5 mr-2 text-secondary" /> 
                Extraction Workspace
             </h3>
             <Button 
                variant="ghost" 
                size="sm"
                className="text-secondary hover:text-secondary-foreground hover:bg-secondary/10 rounded-full"
                onClick={addRange}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Range
              </Button>
          </div>

          <div className="space-y-4">
            {ranges.map((range, index) => (
              <div key={range.id} className="glass-card p-6 rounded-3xl relative group">
                {ranges.length > 1 && (
                  <button 
                    onClick={() => removeRange(range.id)}
                    className="absolute -top-2 -right-2 bg-destructive/10 text-destructive p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                       <span>Range {index + 1}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Start Page</label>
                        <Input 
                          type="number" 
                          value={range.start} 
                          min="1"
                          max={totalPages}
                          onChange={(e) => updateRange(range.id, 'start', e.target.value)}
                          className="glass focus:ring-primary border-none rounded-xl h-12 text-lg font-bold"
                          placeholder="1"
                        />
                      </div>
                      <div className="pt-6 text-muted-foreground">to</div>
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">End Page</label>
                        <Input 
                          type="number" 
                          min="1"
                          max={totalPages}
                          placeholder={range.start || "End"}
                          value={range.end} 
                          onChange={(e) => updateRange(range.id, 'end', e.target.value)}
                          className="glass focus:ring-primary border-none rounded-xl h-12 text-lg font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 shrink-0 bg-white/10 p-4 rounded-2xl border border-white/10 shadow-inner">
                    <div className="text-center space-y-2">
                      <PageThumbnail file={file} pageNum={parseInt(range.start) || 1} />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Start Preview</span>
                    </div>
                    <div className="text-center space-y-2">
                      <PageThumbnail file={file} pageNum={parseInt(range.end || range.start) || 1} />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">End Preview</span>
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
