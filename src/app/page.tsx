"use client";

import React, { useState } from 'react';
import { MergeTool } from '@/components/tools/MergeTool';
import { SplitTool } from '@/components/tools/SplitTool';
import { CompressTool } from '@/components/tools/CompressTool';
import { ArrowLeft, Layers, Scissors, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Tool = 'merge' | 'split' | 'compress' | null;

export default function GlassPDF() {
  const [activeTool, setActiveTool] = useState<Tool>(null);

  const tools = [
    { 
      id: 'merge' as const, 
      name: 'Merge PDF', 
      desc: 'Combine multiple files into one seamless document', 
      icon: Layers, 
      color: 'bg-blue-500' 
    },
    { 
      id: 'split' as const, 
      name: 'Split PDF', 
      desc: 'Extract ranges or separate pages with precision', 
      icon: Scissors, 
      color: 'bg-indigo-500' 
    },
    { 
      id: 'compress' as const, 
      name: 'Compress PDF', 
      desc: 'Reduce size while keeping crystal clear quality', 
      icon: Minimize2, 
      color: 'bg-sky-500' 
    },
  ];

  const renderTool = () => {
    switch (activeTool) {
      case 'merge': return <MergeTool />;
      case 'split': return <SplitTool />;
      case 'compress': return <CompressTool />;
      default: return null;
    }
  };

  return (
    <div className="h-screen relative flex flex-col font-body overflow-hidden">
      {/* Navbar - Reduced height and improved contrast */}
      <header className="z-50 px-6 h-14 flex justify-between items-center bg-white/20 backdrop-blur-xl border-b border-white/30 shrink-0">
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => setActiveTool(null)}
        >
          <button className="Btn">
            <div className="svgContainer">
              <span className="text-white font-black text-lg">G</span>
            </div>
            <div className="BG"></div>
          </button>
          <h1 className="text-lg font-black tracking-tight text-slate-900 group-hover:text-secondary transition-colors">GlassPDF</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" className="text-xs font-bold text-slate-600 hover:text-slate-900">Support</Button>
          <Button variant="ghost" className="text-xs font-bold text-slate-600 hover:text-slate-900">Privacy</Button>
        </div>
      </header>

      <main className={cn(
        "flex-1 flex flex-col p-6 md:p-10 overflow-hidden relative",
        !activeTool && "items-center justify-center"
      )}>
        {/* Background Decorative Blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/20 blur-[120px] rounded-full -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

        <AnimatePresence mode="wait">
          {!activeTool ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-6xl w-full text-center"
            >
              <div className="mb-12 space-y-4">
                 <motion.h2 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.2, duration: 0.8 }}
                   className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-none"
                 >
                   Crystal clear <br/>
                   <span className="text-secondary">PDF Workspace.</span>
                 </motion.h2>
                 <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mx-auto"
                 >
                   Elegant tools for your documents, processed entirely in your browser for absolute privacy.
                 </motion.p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tools.map((tool, index) => (
                  <motion.div
                    key={tool.id}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + (index * 0.1), duration: 0.7 }}
                    className="glass-card p-10 rounded-[2.5rem] cursor-pointer group flex flex-col items-center text-center space-y-6"
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <div className={cn(tool.color, "p-6 rounded-3xl shadow-2xl group-hover:rotate-6 group-hover:scale-110 transition-all duration-500")}>
                      <tool.icon className="w-10 h-10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-slate-900">{tool.name}</h3>
                      <p className="text-slate-500 font-medium text-sm leading-relaxed">{tool.desc}</p>
                    </div>
                    <div className="pt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <Button variant="outline" className="rounded-full px-8 glass-button">Get Started</Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="tool"
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-7xl mx-auto flex-1 flex flex-col min-h-0"
            >
              <div className="mb-6 flex items-center shrink-0">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTool(null)}
                  className="mr-4 rounded-full w-10 h-10 p-0 glass-button hover:bg-white/90"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="h-6 w-px bg-slate-300 mx-2"></div>
                <div className="ml-4 flex items-center space-x-3">
                   {activeTool === 'merge' && <Layers className="w-5 h-5 text-secondary" />}
                   {activeTool === 'split' && <Scissors className="w-5 h-5 text-secondary" />}
                   {activeTool === 'compress' && <Minimize2 className="w-5 h-5 text-secondary" />}
                   <span className="font-bold uppercase tracking-[0.2em] text-secondary text-xs">Active Workspace</span>
                </div>
              </div>

              <div className="flex-1 glass p-6 md:p-10 rounded-[3rem] relative flex flex-col min-h-0 border-white/60">
                <div className="relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {renderTool()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}