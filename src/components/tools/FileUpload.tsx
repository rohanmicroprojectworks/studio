
/**
 * @fileoverview Reusable File Upload Component
 * Responsibility: Handle drag-and-drop and input-based file selection with local processing hints.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useCallback, useState } from 'react';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [dragActive, setDragActive] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.psd'));
    if (files.length > 0) {
      onFilesSelected(multiple ? files : [files[0]]);
    }
  }, [multiple, onFilesSelected]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-80 border-4 border-dashed rounded-[3rem] transition-all duration-700 ease-in-out",
        dragActive 
          ? "border-secondary dark:border-primary bg-secondary/5 dark:bg-primary/5 scale-[1.02] shadow-[0_0_80px_rgba(59,130,246,0.1)] dark:shadow-[0_0_80px_rgba(251,146,60,0.1)]" 
          : "border-white/40 dark:border-zinc-800 bg-white/10 dark:bg-zinc-900/10 hover:border-white/60 dark:hover:border-zinc-700 hover:bg-white/20 dark:hover:bg-zinc-800/20",
        "glass shadow-2xl overflow-hidden",
        className
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type="file"
        multiple={multiple}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        onChange={onInputChange}
      />
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={dragActive ? 'active' : 'idle'}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          className="flex flex-col items-center space-y-8 pointer-events-none z-10"
        >
          <div className={cn(
            "p-8 rounded-[2.5rem] transition-all duration-500 shadow-inner",
            dragActive ? "bg-secondary dark:bg-primary text-white dark:text-black scale-110" : "bg-white/40 dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-400"
          )}>
            {dragActive ? <CheckCircle2 className="w-12 h-12" /> : <Upload className="w-12 h-12" />}
          </div>
          
          <div className="text-center space-y-3 px-8">
            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {dragActive ? "Drop to Process" : "Start your Session"}
            </p>
            <p className="text-lg text-slate-500 dark:text-zinc-400 font-bold max-w-md mx-auto leading-tight">
              {dragActive 
                ? "Release files to begin instant local extraction." 
                : "Select PDF or PSD files from your device to begin secure browser-native processing."
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.3em] bg-white/50 dark:bg-zinc-900/50 px-6 py-2 rounded-full border border-white/60 dark:border-white/5 shadow-sm">
            <span>Secure Sandbox</span>
            <span className="text-emerald-500">•</span>
            <span>Local Engine</span>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Background Decorative Element */}
      <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 dark:from-primary/5 to-transparent pointer-events-none -z-10"></div>
    </div>
  );
};
