/**
 * @fileoverview Merge PDF Tool Component
 * Responsibility: Handle multi-file selection, reordering, and merging logic with Liquid Glass UI.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { mergePDFDocuments, triggerDownload, PDFFileMetadata } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { FileText, X, GripVertical, Plus, Info, Loader2, Layers } from 'lucide-react';
import { Reorder, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export const MergeTool: React.FC = () => {
  const [fileList, setFileList] = useState<PDFFileMetadata[]>([]);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  /**
   * Processes selected files and adds them to the reorderable list.
   */
  const onFilesAdded = (selectedFiles: File[]) => {
    const newItems = selectedFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size
    }));
    setFileList(prev => [...prev, ...newItems]);
  };

  /**
   * Removes a specific file from the merge queue.
   */
  const onFileRemoved = (id: string) => {
    setFileList(prev => prev.filter(item => item.id !== id));
  };

  /**
   * Triggers the merge process and browser download.
   */
  const onMergeTriggered = async () => {
    if (fileList.length < 2) {
      toast({ 
        variant: "destructive",
        title: "Incomplete Queue", 
        description: "Please add at least 2 PDF files to perform a merge." 
      });
      return;
    }

    setProcessing(true);
    try {
      const mergedBytes = await mergePDFDocuments(fileList.map(item => item.file));
      triggerDownload(mergedBytes, "merged_glasspdf.pdf");
      toast({ title: "Success", description: "Your PDF files have been merged successfully." });
    } catch (err) {
      toast({ 
        variant: "destructive",
        title: "Operation Failed", 
        description: "An error occurred during the merge process. Ensure files are valid PDFs." 
      });
    } finally {
      setProcessing(false);
    }
  };

  if (fileList.length === 0) {
    return (
      <div className="max-w-4xl mx-auto w-full px-2">
        <FileUpload onFilesSelected={onFilesAdded} multiple />
        <div className="mt-12 p-8 glass-card rounded-[2.5rem] bg-secondary/5 dark:bg-primary/5 border-secondary/10 dark:border-primary/10 flex items-start space-x-6">
           <div className="p-3 bg-secondary/20 dark:bg-primary/20 rounded-2xl">
             <Info className="w-6 h-6 text-secondary dark:text-primary" />
           </div>
           <div className="space-y-2">
             <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Pro Tip</h4>
             <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
               You can select multiple files at once using the file browser or by dragging them directly. Once selected, you'll be able to reorder them to your liking.
             </p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-8 max-w-5xl mx-auto w-full px-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Merge Queue</h2>
          <p className="text-slate-500 dark:text-slate-400 font-semibold mt-1">Drag handles to rearrange your documents before merging.</p>
        </div>
        <div className="flex space-x-4 w-full md:w-auto">
           <Button variant="outline" onClick={() => setFileList([])} className="glass-button h-14 px-8 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex-1 md:flex-none">
            Reset
           </Button>
           <button 
            onClick={onMergeTriggered} 
            disabled={processing} 
            className="liquid-button h-14 px-12 rounded-[1.5rem] flex-1 md:flex-none group"
           >
            <span className="liquid-button-text flex items-center font-black uppercase tracking-widest text-xs">
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Merging...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  Confirm & Merge
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
        <Reorder.Group axis="y" values={fileList} onReorder={setFileList} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {fileList.map((item) => (
              <Reorder.Item
                key={item.id}
                value={item}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="glass-card p-6 rounded-[2rem] flex items-center justify-between group border-white/40 dark:border-white/10 shadow-xl hover:bg-white/60 dark:hover:bg-zinc-800/60"
              >
                <div className="flex items-center space-x-6">
                  <div className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-zinc-600 group-hover:text-slate-900 dark:group-hover:text-primary transition-colors p-2">
                    <GripVertical className="w-6 h-6" />
                  </div>
                  <div className="p-4 bg-primary/20 dark:bg-primary/10 rounded-2xl shadow-inner">
                    <FileText className="w-8 h-8 text-secondary dark:text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-xl truncate max-w-[120px] sm:max-w-md text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">{(item.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={() => onFileRemoved(item.id)}
                  className="p-4 hover:bg-destructive/10 text-slate-300 dark:text-zinc-700 hover:text-destructive rounded-2xl transition-all duration-300 group-hover:scale-110"
                >
                  <X className="w-6 h-6" />
                </button>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
        
        <div className="mt-8">
           <label className="flex items-center justify-center p-8 border-2 border-dashed border-white/60 dark:border-zinc-800 rounded-[2rem] cursor-pointer hover:bg-white/40 dark:hover:bg-zinc-800/40 glass transition-all duration-500 group">
             <input type="file" multiple accept=".pdf" className="hidden" onChange={(e) => onFilesAdded(e.target.files ? Array.from(e.target.files) : [])} />
             <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-white/50 dark:bg-zinc-800/50 rounded-full group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-slate-600 dark:text-primary" />
                </div>
                <span className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-xs">Append more documents</span>
             </div>
           </label>
        </div>
      </div>
    </div>
  );
};
