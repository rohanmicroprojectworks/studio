
"use client";

import React, { useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFilesSelected, 
  multiple = false,
  className 
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) {
      onFilesSelected(multiple ? files : [files[0]]);
    }
  }, [multiple, onFilesSelected]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all duration-300",
        isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-white/40 bg-white/10",
        "glass",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple={multiple}
        accept=".pdf"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileInput}
      />
      <div className="flex flex-col items-center space-y-4 pointer-events-none">
        <div className="p-4 rounded-full bg-primary/20">
          <Upload className="w-8 h-8 text-secondary-foreground" />
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold font-headline">Drop your PDFs here</p>
          <p className="text-sm text-muted-foreground">or click to browse files from your computer</p>
        </div>
      </div>
    </div>
  );
};
