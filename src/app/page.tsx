
/**
 * @fileoverview Main Landing Page for GlassPDF
 * Responsibility: Application layout, tool switching, and viewport-responsive state management.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState, useEffect } from 'react';
import { MergeTool } from '@/components/tools/MergeTool';
import { SplitTool } from '@/components/tools/SplitTool';
import { CompressTool } from '@/components/tools/CompressTool';
import { ImageConverterTool } from '@/components/tools/ImageConverterTool';
import { PDFViewerTool } from '@/components/tools/PDFViewerTool';
import { PSDViewerTool } from '@/components/tools/PSDViewerTool';
import { ProtectTool } from '@/components/tools/ProtectTool';
import { ArrowLeft, Layers, Scissors, Minimize2, Github, Image as ImageIcon, Eye, Lock, FileImage } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ActiveTool = 'merge' | 'split' | 'compress' | 'image-converter' | 'pdf-viewer' | 'psd-viewer' | 'protect' | null;

export default function PDFWorkspace() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [preloadedFile, setPreloadedFile] = useState<File | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const availableTools = [
    { 
      id: 'merge' as const, 
      name: 'Merge PDF', 
      description: 'Combine multiple files into one seamless document', 
      icon: Layers, 
      themeColor: 'bg-blue-500 dark:bg-orange-500' 
    },
    { 
      id: 'split' as const, 
      name: 'Split PDF', 
      description: 'Extract ranges or separate pages with visual precision', 
      icon: Scissors, 
      themeColor: 'bg-indigo-500 dark:bg-amber-600' 
    },
    { 
      id: 'compress' as const, 
      name: 'Compress PDF', 
      description: 'Reduce size while keeping crystal clear quality', 
      icon: Minimize2, 
      themeColor: 'bg-sky-500 dark:bg-orange-400' 
    },
    { 
      id: 'psd-viewer' as const, 
      name: 'PSD Studio', 
      description: 'Preview Photoshop files and export to PNG, JPG, or PDF', 
      icon: FileImage, 
      themeColor: 'bg-blue-600 dark:bg-blue-500' 
    },
    { 
      id: 'image-converter' as const, 
      name: 'Image Converter', 
      description: 'Convert images to PDF or between formats instantly', 
      icon: ImageIcon, 
      themeColor: 'bg-emerald-500 dark:bg-teal-500' 
    },
    { 
      id: 'pdf-viewer' as const, 
      name: 'PDF Viewer', 
      description: 'Instant local preview with fast navigation and zoom', 
      icon: Eye, 
      themeColor: 'bg-purple-500 dark:bg-violet-600' 
    },
    { 
      id: 'protect' as const, 
      name: 'Security Studio', 
      description: 'Add password protection or unlock restricted files', 
      icon: Lock, 
      themeColor: 'bg-rose-500 dark:bg-pink-600' 
    },
  ];

  const handleToolSwitch = (toolId: ActiveTool, file?: File) => {
    setPreloadedFile(file || null);
    setActiveTool(toolId);
  };

  const renderActiveWorkspace = () => {
    switch (activeTool) {
      case 'merge': return <MergeTool initialFile={preloadedFile} />;
      case 'split': return <SplitTool initialFile={preloadedFile} />;
      case 'compress': return <CompressTool initialFile={preloadedFile} />;
      case 'image-converter': return <ImageConverterTool />;
      case 'psd-viewer': return <PSDViewerTool />;
      case 'pdf-viewer': return (
        <PDFViewerTool 
          onExit={() => setActiveTool(null)} 
          onSwitchTool={handleToolSwitch}
        />
      );
      case 'protect': return <ProtectTool initialFile={preloadedFile} />;
      default: return null;
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col font-body overflow-hidden text-slate-900 dark:text-slate-100 selection:bg-secondary/20 relative bg-transparent">
      <AnimatePresence>
        {activeTool !== 'pdf-viewer' && activeTool !== 'psd-viewer' && (
          <motion.header 
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="z-50 px-4 md:px-8 h-14 flex justify-between items-center bg-white/20 dark:bg-black/20 backdrop-blur-2xl border-b border-white/20 dark:border-white/10 shrink-0 shadow-sm"
          >
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => setActiveTool(null)}
            >
              <div className="Btn scale-75 md:scale-90">
                <div className="svgContainer">
                  <span className="text-white font-black text-xl select-none">G</span>
                </div>
                <div className="BG"></div>
              </div>
              <h1 className="text-lg md:text-xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:text-secondary transition-all duration-300">GlassPDF</h1>
            </div>
            
            <nav className="flex items-center space-x-6">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  className="theme-checkbox" 
                  checked={theme === 'dark'}
                  onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
                  aria-label="Toggle theme"
                />
              </div>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/40 dark:hover:bg-white/10">
                <Github className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Button>
            </nav>
          </motion.header>
        )}
      </AnimatePresence>

      <main className={cn(
        "flex-1 relative flex flex-col overflow-hidden",
        !activeTool && "items-center justify-start overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8"
      )}>
        <AnimatePresence mode="wait">
          {!activeTool ? (
            <motion.div 
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-6xl w-full text-center space-y-12 py-16"
            >
              <div className="space-y-4">
                 <motion.h2 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.1, duration: 0.6 }}
                   className="text-4xl sm:text-6xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tight leading-tight"
                 >
                   The liquid <br/>
                   <span className="text-secondary bg-clip-text text-transparent bg-gradient-to-r from-secondary to-indigo-600 dark:from-orange-400 dark:to-amber-600">PDF Studio.</span>
                 </motion.h2>
                 <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed px-4"
                 >
                   Professional browser-native tools for your documents. <br className="hidden md:block"/> No uploads, no servers, just pure client-side magic.
                 </motion.p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 px-4">
                {availableTools.map((tool, index) => (
                  <motion.div
                    key={tool.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + (index * 0.1), duration: 0.6 }}
                    className="glass-card p-8 md:p-10 rounded-[2.5rem] cursor-pointer group flex flex-col items-center text-center space-y-6"
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <div className={cn(tool.themeColor, "p-6 rounded-3xl shadow-xl group-hover:rotate-6 group-hover:scale-110 transition-all duration-500")}>
                      <tool.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white">{tool.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold leading-snug">{tool.description}</p>
                    </div>
                    <Button variant="outline" className="rounded-full px-8 h-10 glass-button text-sm font-black border-white/60 dark:border-white/10">
                      Open Tool
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="workspace"
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "w-full h-full flex flex-col min-h-0",
                (activeTool !== 'pdf-viewer' && activeTool !== 'psd-viewer') && "max-w-7xl mx-auto p-4 md:p-6 lg:p-8"
              )}
            >
              {(activeTool !== 'pdf-viewer' && activeTool !== 'psd-viewer') && (
                <div className="mb-4 flex items-center shrink-0">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setActiveTool(null);
                      setPreloadedFile(null);
                    }}
                    className="rounded-2xl w-10 h-10 p-0 glass-button hover:bg-white/80 dark:hover:bg-white/20 shadow-md border-white/40 dark:border-white/10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-4"></div>
                  <div className="flex items-center space-x-3">
                     <span className="font-black uppercase tracking-[0.2em] text-secondary text-xs">Workspace / {availableTools.find(t => t.id === activeTool)?.name}</span>
                  </div>
                </div>
              )}

              <div className={cn(
                "flex-1 relative flex flex-col min-h-0",
                (activeTool !== 'pdf-viewer' && activeTool !== 'psd-viewer') ? "glass p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border-white/60 dark:border-white/10 shadow-2xl overflow-hidden" : "w-full"
              )}>
                <div className={cn(
                  "flex-1 flex flex-col min-h-0",
                  (activeTool !== 'pdf-viewer' && activeTool !== 'psd-viewer') && "overflow-y-auto custom-scrollbar"
                )}>
                  {renderActiveWorkspace()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
