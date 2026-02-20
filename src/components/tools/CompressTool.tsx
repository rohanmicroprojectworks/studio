
"use client";

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { compressPDF, downloadBlob } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { FileText, Zap, ShieldCheck, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const CompressTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const result = await compressPDF(file, level);
      downloadBlob(result, `compressed-${file.name}`);
      toast({ title: "Success", description: "PDF compressed successfully!" });
    } catch (err) {
      toast({ title: "Error", description: "Compression failed." });
    } finally {
      setIsProcessing(false);
    }
  };

  const getEstimatedSize = () => {
    if (!file) return "0 MB";
    const multipliers = { low: 0.9, medium: 0.7, high: 0.4 };
    const est = (file.size * multipliers[level]) / (1024 * 1024);
    return `~${est.toFixed(2)} MB`;
  };

  if (!file) {
    return <FileUpload onFilesSelected={(files) => setFile(files[0])} />;
  }

  const levels = [
    { id: 'low', label: 'Basic Compression', desc: 'High quality, large file size', icon: ShieldCheck },
    { id: 'medium', label: 'Recommended', desc: 'Good quality and compression', icon: Gauge },
    { id: 'high', label: 'Extreme Compression', desc: 'Lower quality, smallest file size', icon: Zap },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-headline font-bold">Compress PDF</h2>
          <p className="text-muted-foreground">Reduce the file size of your PDF while maintaining quality.</p>
        </div>
        <Button variant="outline" onClick={() => setFile(null)} className="glass-button">Change File</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="glass-card p-10 rounded-2xl flex flex-col items-center justify-center space-y-6">
           <div className="relative">
             <div className="p-10 bg-primary/20 rounded-full animate-pulse opacity-50 absolute inset-0 -m-2"></div>
             <div className="relative p-10 bg-primary/20 rounded-full">
                <FileText className="w-20 h-20 text-secondary-foreground" />
             </div>
           </div>
           <div className="text-center">
              <p className="font-bold text-xl truncate max-w-xs">{file.name}</p>
              <div className="flex items-center justify-center space-x-4 mt-2">
                 <div className="text-sm">
                    <p className="text-muted-foreground">Original</p>
                    <p className="font-semibold">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                 </div>
                 <div className="h-8 w-px bg-white/20"></div>
                 <div className="text-sm">
                    <p className="text-muted-foreground">Estimated</p>
                    <p className="font-semibold text-secondary">{getEstimatedSize()}</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-4">
           {levels.map((item) => (
             <button
               key={item.id}
               onClick={() => setLevel(item.id as any)}
               className={cn(
                 "w-full text-left p-4 rounded-xl transition-all duration-200 glass-card flex items-center space-x-4",
                 level === item.id ? "bg-white/60 border-primary ring-2 ring-primary ring-opacity-50" : "opacity-70 hover:opacity-100"
               )}
             >
               <div className={cn("p-3 rounded-lg", level === item.id ? "bg-primary text-white" : "bg-white/20")}>
                  <item.icon className="w-6 h-6" />
               </div>
               <div>
                  <p className="font-bold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
               </div>
             </button>
           ))}
           
           <Button 
            className="w-full bg-secondary hover:bg-secondary/80 text-white font-bold h-14 rounded-full shadow-xl mt-6 text-lg"
            onClick={handleCompress}
            disabled={isProcessing}
          >
            {isProcessing ? "Optimizing..." : "Compress PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
};
