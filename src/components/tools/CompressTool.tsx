/**
 * @fileoverview Compress PDF Tool Component
 * Responsibility: Handle PDF file size reduction with quality presets.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { compressPDFDocument, triggerDownload } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { FileText, Zap, ShieldCheck, Gauge, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const CompressTool: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [qualityLevel, setQualityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  /**
   * Performs the compression operation.
   */
  const onCompressStart = async () => {
    if (!sourceFile) return;
    setProcessing(true);
    try {
      const result = await compressPDFDocument(sourceFile, qualityLevel);
      triggerDownload(result, `compressed_${sourceFile.name}`);
      toast({ title: "Success", description: "PDF has been optimized and is ready for download." });
    } catch (err) {
      toast({ 
        variant: "destructive",
        title: "Process Failed", 
        description: "Compression could not be completed for this specific file structure." 
      });
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Simple heuristic for showing potential savings in the UI.
   */
  const calculateEstimate = () => {
    if (!sourceFile) return "0 MB";
    const multipliers = { low: 0.85, medium: 0.65, high: 0.45 };
    const est = (sourceFile.size * multipliers[qualityLevel]) / (1024 * 1024);
    return `~${est.toFixed(2)} MB`;
  };

  if (!sourceFile) {
    return <FileUpload onFilesSelected={(files) => setSourceFile(files[0])} />;
  }

  const compressionModes = [
    { 
      id: 'low', 
      label: 'Light Compression', 
      desc: 'Max quality, small reduction', 
      icon: ShieldCheck,
      color: 'text-emerald-500'
    },
    { 
      id: 'medium', 
      label: 'Balanced Strategy', 
      desc: 'Optimal quality and size', 
      icon: Gauge,
      color: 'text-secondary'
    },
    { 
      id: 'high', 
      label: 'Extreme Optimization', 
      desc: 'Smallest size, lower quality', 
      icon: Zap,
      color: 'text-amber-500'
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Compress Studio</h2>
          <p className="text-slate-500 font-bold mt-2">Optimize file size without sacrificing professional integrity.</p>
        </div>
        <Button variant="outline" onClick={() => setSourceFile(null)} className="glass-button h-12 md:h-14 px-6 md:px-10 rounded-2xl text-xs font-black uppercase tracking-widest">
          Swap File
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div className="glass-card p-12 rounded-[3.5rem] flex flex-col items-center justify-center space-y-10 border-white/60 shadow-2xl">
           <div className="relative group">
             <div className="p-14 bg-primary/20 rounded-[3rem] shadow-inner relative z-10">
                <FileText className="w-28 h-28 text-secondary group-hover:scale-105 transition-transform" />
             </div>
             <div className="absolute -inset-4 bg-secondary/5 blur-3xl -z-10 rounded-full animate-pulse"></div>
           </div>
           
           <div className="text-center w-full space-y-6">
              <p className="font-black text-3xl truncate px-4 text-slate-900">{sourceFile.name}</p>
              
              <div className="flex items-center justify-center space-x-8">
                 <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current</p>
                    <p className="font-black text-xl text-slate-900">{(sourceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                 </div>
                 <div className="h-10 w-px bg-slate-900/10"></div>
                 <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected</p>
                    <p className="font-black text-xl text-secondary">{calculateEstimate()}</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="flex items-center space-x-3 mb-4 px-2">
              <Info className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Optimization Level</span>
           </div>
           
           <div className="space-y-4">
             {compressionModes.map((mode) => (
               <button
                 key={mode.id}
                 onClick={() => setQualityLevel(mode.id as any)}
                 className={cn(
                   "w-full text-left p-6 rounded-[2rem] transition-all duration-500 glass-card flex items-center space-x-6 border-white/40",
                   qualityLevel === mode.id ? "bg-white/90 ring-4 ring-secondary/10 scale-[1.02] shadow-2xl" : "opacity-60 hover:opacity-100"
                 )}
               >
                 <div className={cn("p-5 rounded-2xl shadow-inner", qualityLevel === mode.id ? "bg-secondary text-white" : "bg-slate-900/5")}>
                    <mode.icon className="w-8 h-8" />
                 </div>
                 <div className="flex-1">
                    <p className={cn("font-black text-xl", qualityLevel === mode.id ? "text-slate-900" : "text-slate-600")}>{mode.label}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{mode.desc}</p>
                 </div>
               </button>
             ))}
           </div>
           
           <Button 
            className="w-full bg-secondary hover:bg-secondary/90 text-white font-black h-20 rounded-[2.5rem] shadow-2xl mt-10 text-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={onCompressStart}
            disabled={processing}
          >
            {processing ? (
              <div className="flex items-center">
                <Loader2 className="w-8 h-8 animate-spin mr-4" />
                Optimizing Stream...
              </div>
            ) : "Compress PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
};
