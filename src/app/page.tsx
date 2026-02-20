"use client";

import React, { useState } from 'react';
import { MergeTool } from '@/components/tools/MergeTool';
import { SplitTool } from '@/components/tools/SplitTool';
import { CompressTool } from '@/components/tools/CompressTool';
import { ArrowLeft, Layers, Scissors, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

type Tool = 'merge' | 'split' | 'compress' | null;

export default function GlassPDF() {
  const [activeTool, setActiveTool] = useState<Tool>(null);

  const tools = [
    { 
      id: 'merge' as const, 
      name: 'Merge PDF', 
      desc: 'Combine multiple PDF files into one easily', 
      icon: Layers, 
      color: 'bg-blue-400' 
    },
    { 
      id: 'split' as const, 
      name: 'Split PDF', 
      desc: 'Separate one page or whole ranges into individual PDFs', 
      icon: Scissors, 
      color: 'bg-indigo-400' 
    },
    { 
      id: 'compress' as const, 
      name: 'Compress PDF', 
      desc: 'Reduce file size while keeping visual quality', 
      icon: Minimize2, 
      color: 'bg-sky-400' 
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
    <div className="min-h-screen relative flex flex-col font-body">
      {/* Navbar / Header */}
      <header className="z-50 px-8 py-6 flex justify-between items-center bg-white/10 backdrop-blur-md border-b border-white/20">
        <div 
          className="flex items-center space-x-4 cursor-pointer"
          onClick={() => setActiveTool(null)}
        >
          <button className="Btn">
            <div className="svgContainer">
              <span className="text-white font-black text-xl">G</span>
            </div>
            <div className="BG"></div>
          </button>
          <h1 className="text-2xl font-headline font-black tracking-tight text-secondary-foreground">GlassPDF</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">About</Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Contact</Button>
          <div className="h-6 w-px bg-white/20"></div>
          <p className="text-xs font-medium text-secondary opacity-70">MuPDF Engine V1.0</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden">
        <AnimatePresence mode="wait">
          {!activeTool ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="max-w-6xl w-full"
            >
              <div className="text-center mb-16 space-y-4">
                 <motion.h2 
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.2 }}
                   className="text-6xl font-headline font-black text-secondary-foreground leading-tight"
                 >
                   Simplified PDF workflow.<br/>
                   <span className="text-secondary/80">Beautifully fast.</span>
                 </motion.h2>
                 <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl text-muted-foreground max-w-2xl mx-auto"
                 >
                   The world's most elegant PDF toolkit, processed entirely locally for your privacy.
                 </motion.p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {tools.map((tool, index) => (
                  <motion.div
                    key={tool.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + (index * 0.1) }}
                    className="glass-card p-10 rounded-3xl cursor-pointer group flex flex-col items-center text-center space-y-6"
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <div className={`${tool.color} p-6 rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                      <tool.icon className="w-10 h-10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-headline font-bold text-foreground">{tool.name}</h3>
                      <p className="text-muted-foreground text-sm px-4">{tool.desc}</p>
                    </div>
                    <div className="pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" className="rounded-full px-8 glass-button">Open Tool</Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="tool"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-6xl flex-1 flex flex-col"
            >
              <div className="mb-8 flex items-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTool(null)}
                  className="mr-4 rounded-full w-12 h-12 p-0 glass-button"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="h-6 w-px bg-white/20 mx-2"></div>
                <div className="ml-4 flex items-center space-x-2">
                   {activeTool === 'merge' && <Layers className="w-5 h-5 text-secondary" />}
                   {activeTool === 'split' && <Scissors className="w-5 h-5 text-secondary" />}
                   {activeTool === 'compress' && <Minimize2 className="w-5 h-5 text-secondary" />}
                   <span className="font-headline font-bold uppercase tracking-widest text-secondary text-sm">Workspace</span>
                </div>
              </div>

              <div className="flex-1 glass p-10 rounded-[2.5rem] relative overflow-hidden flex flex-col no-scrollbar">
                {/* Decorative background element for the tool area */}
                <div className="absolute top-0 right-0 -mr-24 -mt-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar">
                  {renderTool()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 flex justify-between items-center text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em]">
        <p>&copy; 2024 GlassPDF - Zero-Upload Local Processing</p>
        <div className="flex space-x-6">
          <span className="hover:text-secondary cursor-pointer">Privacy First</span>
          <span className="hover:text-secondary cursor-pointer">Fast & Light</span>
          <span className="hover:text-secondary cursor-pointer">MuPDF Enabled</span>
        </div>
      </footer>
    </div>
  );
}
