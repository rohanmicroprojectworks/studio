
"use client";

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { splitPDF, downloadBlob } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, ChevronRight, Download, Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SplitTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [ranges, setRanges] = useState<{ start: string; end: string }[]>([{ start: '1', end: '' }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const splitRanges = ranges.map(r => ({ start: parseInt(r.start), end: parseInt(r.end || r.start) }));
      const results = await splitPDF(file, splitRanges);
      results.forEach((data, i) => {
        downloadBlob(data, `split-part-${i + 1}.pdf`);
      });
      toast({ title: "Success", description: "PDF split completed!" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to split PDF." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file) {
    return <FileUpload onFilesSelected={(files) => setFile(files[0])} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-headline font-bold">Split PDF</h2>
          <p className="text-muted-foreground">Define page ranges to extract into new PDF files.</p>
        </div>
        <Button variant="outline" onClick={() => setFile(null)} className="glass-button">Change File</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center space-y-4">
           <div className="p-8 bg-primary/20 rounded-2xl">
              <FileText className="w-16 h-16 text-secondary-foreground" />
           </div>
           <div className="text-center">
              <p className="font-bold text-lg truncate max-w-xs">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
           </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="font-semibold text-lg flex items-center">
              <Scissors className="w-5 h-5 mr-2 text-secondary" /> 
              Extraction Settings
            </h3>
            {ranges.map((range, index) => (
              <div key={index} className="flex items-end space-x-3">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">From Page</label>
                  <Input 
                    type="number" 
                    value={range.start} 
                    onChange={(e) => {
                      const newRanges = [...ranges];
                      newRanges[index].start = e.target.value;
                      setRanges(newRanges);
                    }}
                    className="glass focus:ring-primary border-none rounded-lg"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">To Page</label>
                  <Input 
                    type="number" 
                    placeholder="Same as start"
                    value={range.end} 
                    onChange={(e) => {
                      const newRanges = [...ranges];
                      newRanges[index].end = e.target.value;
                      setRanges(newRanges);
                    }}
                    className="glass focus:ring-primary border-none rounded-lg"
                  />
                </div>
              </div>
            ))}
            <Button 
              variant="ghost" 
              className="w-full text-secondary hover:text-secondary-foreground hover:bg-secondary/10"
              onClick={() => setRanges([...ranges, { start: '', end: '' }])}
            >
              + Add another range
            </Button>
          </div>
          
          <Button 
            className="w-full bg-secondary hover:bg-secondary/80 text-white font-bold h-12 rounded-full shadow-lg"
            onClick={handleSplit}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Split and Download"}
          </Button>
        </div>
      </div>
    </div>
  );
};
