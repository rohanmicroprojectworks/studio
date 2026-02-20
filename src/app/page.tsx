/**
 * @fileoverview Main Landing Page for GlassPDF
 * Responsibility: Application layout, tool switching, and high-level state management.
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState } from 'react';
import { MergeTool } from '@/components/tools/MergeTool';
import { SplitTool } from '@/components/tools/SplitTool';
import { CompressTool } from '@/components/tools/CompressTool';
import { ArrowLeft, Layers, Scissors, Minimize2, ShieldCheck, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ActiveTool = 'merge' | 'split' | 'compress' | null;

export default function PDFWorkspace() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);

  const availableTools = [
    { 
      id: 'merge' as const, 
      name: 'Merge PDF', 
      description: 'Combine multiple files into one seamless document', 
      icon: Layers, 
      themeColor: 'bg-blue-500' 
    },
    { 
      id: 'split' as const, 
      name: 'Split PDF', 
      description: 'Extract ranges or separate pages with visual precision', 
      icon: Scissors, 
      themeColor: 'bg-indigo-500' 
    },
    { 
      id: 'compress' as const, 
      name: 'Compress PDF', 
      description: 'Reduce size while keeping crystal clear quality', 
      icon: Minimize2, 
      themeColor: 'bg-sky-500' 
    },
  ];

  const renderActiveWorkspace = () => {
    switch (activeTool) {
      case 'merge': return <MergeTool />;
      case 'split': return <SplitTool />;
      case 'compress': return <CompressTool />;
      default: return null;
    }
  };

  return (
    <div className="h-screen relative flex flex-col font-body overflow-hidden text-slate-900">
      {/* 
          Glass Navigation Bar 
          Reduced height for better workspace visibility.
      */}
      <header className="z-50 px-8 h-14 flex justify-between items-center bg-white/10 backdrop-blur-2xl border-b border-white/20 shrink-0 shadow-[0_1px_10px_rgba(0,0,0,0.05)]">
        <div 
          className="flex items-center space-x-4 cursor-pointer group"
          onClick={() => setActiveTool(null)}
        >
          <div className="Btn scale-90">
            <div className="svgContainer">
              <span className="text-white font-black text-xl select-none">G</span>
            </div>
            <div className="BG"></div>
          </div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900 group-hover:text-secondary transition-all duration-300">GlassPDF</h1>
        </div>
        
        <nav className="flex items-center space-x-4">
          <div className="hidden md:flex items-center px-4 py-1.5 rounded-full bg-slate-900/5 border border-slate-900/10 text-[10px] font-bold tracking-widest text-slate-500">
            <ShieldCheck className="w-3 h-3 mr-2 text-emerald-500" />
            100% PRIVATE • BROWSER-ONLY
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/40">
            <Github className="w-5 h-5 text-slate-600" />
          </Button>
        </nav>
      </header>

      <main className={cn(
        "flex-1 flex flex-col p-6 md:p-12 overflow-hidden relative",
        !activeTool && "items-center justify-center"
      )}>
        {/* Dynamic Background Effects */}
        <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-blue-400/15 blur-[160px] rounded-full -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[40rem] h-[40rem] bg-indigo-400/15 blur-[160px] rounded-full -z-10 animate-pulse" style={{ animationDelay: '3s' }}></div>

        <AnimatePresence mode="wait">
          {!activeTool ? (
            <motion.div 
              key="hero"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-7xl w-full text-center space-y-16"
            >
              <div className="space-y-6">
                 <motion.h2 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.2, duration: 0.8 }}
                   className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight leading-[0.9] drop-shadow-sm"
                 >
                   The liquid <br/>
                   <span className="text-secondary bg-clip-text text-transparent bg-gradient-to-r from-secondary to-indigo-600">PDF Studio.</span>
                 </motion.h2>
                 <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl md:text-2xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed"
                 >
                   Professional browser-native tools for your documents. <br className="hidden md:block"/> No uploads, no servers, just pure client-side processing.
                 </motion.p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {availableTools.map((tool, index) => (
                  <motion.div
                    key={tool.id}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + (index * 0.1), duration: 0.8 }}
                    className="glass-card p-12 rounded-[3rem] cursor-pointer group flex flex-col items-center text-center space-y-8"
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <div className={cn(tool.themeColor, "p-8 rounded-[2.5rem] shadow-2xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 ease-[0.34,1.56,0.64,1]")}>
                      <tool.icon className="w-12 h-12 text-white" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-black text-slate-900">{tool.name}</h3>
                      <p className="text-slate-500 font-semibold text-base leading-snug">{tool.description}</p>
                    </div>
                    <div className="pt-4">
                      <Button variant="outline" className="rounded-full px-10 h-12 glass-button text-lg font-black border-white/60">
                        Launch Tool
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="workspace"
              initial={{ opacity: 0, scale: 0.97, filter: 'blur(15px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.03, filter: 'blur(15px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-7xl mx-auto flex-1 flex flex-col min-h-0"
            >
              <div className="mb-8 flex items-center shrink-0">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTool(null)}
                  className="mr-6 rounded-2xl w-12 h-12 p-0 glass-button hover:bg-white/80 shadow-lg border-white/40"
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="h-8 w-px bg-slate-300 mx-2"></div>
                <div className="ml-6 flex items-center space-x-4">
                   {activeTool === 'merge' && <Layers className="w-6 h-6 text-secondary" />}
                   {activeTool === 'split' && <Scissors className="w-6 h-6 text-secondary" />}
                   {activeTool === 'compress' && <Minimize2 className="w-6 h-6 text-secondary" />}
                   <span className="font-black uppercase tracking-[0.3em] text-secondary text-sm">Active Workspace</span>
                </div>
              </div>

              <div className="flex-1 glass p-10 md:p-14 rounded-[4rem] relative flex flex-col min-h-0 border-white/60 shadow-2xl overflow-hidden">
                <div className="relative z-10 flex-1 overflow-y-auto pr-4 custom-scrollbar">
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
