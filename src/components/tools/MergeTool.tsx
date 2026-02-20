
"use client";

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { mergePDFs, downloadBlob, PDFFile } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { FileText, X, GripVertical, Plus } from 'lucide-react';
import { Reorder, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export const MergeTool: React.FC = () => {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFilesSelected = (newFiles: File[]) => {
    const formatted = newFiles.map(f => ({
      file: f,
      id: Math.random().toString(36).substr(2, 9),
      name: f.name,
      size: f.size
    }));
    setFiles(prev => [...prev, ...formatted]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast({ title: "Error", description: "Please add at least 2 PDF files to merge." });
      return;
    }
    setIsProcessing(true);
    try {
      const result = await mergePDFs(files.map(f => f.file));
      downloadBlob(result, "merged-glasspdf.pdf");
      toast({ title: "Success", description: "PDFs merged successfully!" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to merge PDFs." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (files.length === 0) {
    return <FileUpload onFilesSelected={handleFilesSelected} multiple />;
  }

  return (
    <div className="flex flex-col h-full space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-headline font-bold">Merge PDF</h2>
          <p className="text-muted-foreground">Rearrange files by dragging them before merging.</p>
        </div>
        <div className="flex space-x-2">
           <Button variant="outline" onClick={() => setFiles([])} className="glass-button">Clear All</Button>
           <Button onClick={handleMerge} disabled={isProcessing} className="bg-secondary hover:bg-secondary/80 text-white font-semibold px-8 rounded-full shadow-lg">
            {isProcessing ? "Merging..." : "Merge PDF"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <Reorder.Group axis="y" values={files} onReorder={setFiles} className="space-y-3">
          <AnimatePresence mode="popLayout">
            {files.map((file) => (
              <Reorder.Item
                key={file.id}
                value={file}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-4 rounded-xl flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground group-hover:text-foreground">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <FileText className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeFile(file.id)}
                  className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
        
        <div className="mt-4">
           <label className="flex items-center justify-center p-4 border-2 border-dashed border-white/40 rounded-xl cursor-pointer hover:bg-white/10 glass transition-all group">
             <input type="file" multiple accept=".pdf" className="hidden" onChange={(e) => handleFilesSelected(e.target.files ? Array.from(e.target.files) : [])} />
             <Plus className="w-5 h-5 mr-2 text-muted-foreground group-hover:text-foreground" />
             <span className="text-muted-foreground group-hover:text-foreground">Add more files</span>
           </label>
        </div>
      </div>
    </div>
  );
};
