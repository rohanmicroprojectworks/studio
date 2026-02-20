/**
 * @fileoverview Image Converter Tool Component
 * Responsibility: Handle batch image conversions and Image-to-PDF workflows.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { imagesToPDF, triggerDownload } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, FileType, FileOutput, Loader2, CheckCircle2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const ImageConverterTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [targetFormat, setTargetFormat] = useState<'png' | 'jpg' | 'webp' | 'pdf'>('png');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      if (targetFormat === 'pdf') {
        const pdfBytes = await imagesToPDF(files);
        triggerDownload(pdfBytes, 'converted_images.pdf');
      } else {
        // Handle individual image conversion via Canvas
        for (const file of files) {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise((resolve) => (img.onload = resolve));
          
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          
          const mimeType = `image/${targetFormat === 'jpg' ? 'jpeg' : targetFormat}`;
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${file.name.split('.')[0]}.${targetFormat}`;
              a.click();
              URL.revokeObjectURL(url);
            }
          }, mimeType);
        }
      }
      toast({ title: "Conversion Complete", description: "Your files have been processed." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to convert images." });
    } finally {
      setProcessing(false);
    }
  };

  if (files.length === 0) {
    return <FileUpload onFilesSelected={setFiles} multiple />;
  }

  const formats = [
    { id: 'png', label: 'To PNG' },
    { id: 'jpg', label: 'To JPG' },
    { id: 'webp', label: 'To WebP' },
    { id: 'pdf', label: 'To PDF' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white">Image Studio</h2>
          <p className="text-slate-500 font-bold">Convert between formats or create PDF catalogs.</p>
        </div>
        <Button variant="outline" onClick={() => setFiles([])} className="glass-button rounded-2xl h-12">
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {files.map((file, idx) => (
              <div key={idx} className="glass-card p-4 rounded-3xl relative group">
                <button 
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="aspect-square bg-slate-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-3 overflow-hidden">
                  <ImageIcon className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-xs font-black truncate text-slate-900 dark:text-white">{file.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 rounded-[2.5rem] space-y-6">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Target Format</h3>
            <div className="grid grid-cols-2 gap-3">
              {formats.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTargetFormat(f.id as any)}
                  className={cn(
                    "p-4 rounded-2xl font-black text-xs transition-all border",
                    targetFormat === f.id 
                      ? "bg-secondary dark:bg-primary text-white dark:text-black border-transparent" 
                      : "bg-white/50 dark:bg-zinc-900/50 text-slate-500 border-white/20"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            
            <button 
              className="liquid-button w-full h-16 rounded-3xl group"
              onClick={handleConvert}
              disabled={processing}
            >
              <span className="liquid-button-text flex items-center font-black uppercase tracking-widest text-xs">
                {processing ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <FileOutput className="w-5 h-5 mr-3" />}
                Process {files.length} Files
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
