/**
 * @fileoverview Security Studio Tool Component
 * Responsibility: Handle PDF encryption (protect) and decryption (unlock).
 * Author: GlassPDF Team
 * License: MIT
 */

"use client";

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { protectPDF, unlockPDF, triggerDownload } from '@/lib/pdf-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Unlock, ShieldAlert, Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const ProtectTool: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'protect' | 'unlock'>('protect');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleProcess = async () => {
    if (!sourceFile || !password) return;
    setProcessing(true);
    try {
      const result = mode === 'protect' 
        ? await protectPDF(sourceFile, password) 
        : await unlockPDF(sourceFile, password);
      
      triggerDownload(result, `${mode === 'protect' ? 'protected' : 'unlocked'}_${sourceFile.name}`);
      toast({ title: "Security Applied", description: `File has been ${mode === 'protect' ? 'encrypted' : 'unlocked'}.` });
    } catch (err) {
      toast({ 
        variant: "destructive", 
        title: "Security Failed", 
        description: mode === 'unlock' ? "Invalid password provided." : "Could not protect this document." 
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!sourceFile) return <FileUpload onFilesSelected={(f) => setSourceFile(f[0])} />;

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white">Security Studio</h2>
          <p className="text-slate-500 font-bold mt-2">Professional AES encryption and removal.</p>
        </div>
        <Button variant="outline" onClick={() => setSourceFile(null)} className="glass-button h-12 px-8 rounded-2xl">
          Swap File
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="glass-card p-12 rounded-[3.5rem] flex flex-col items-center justify-center space-y-8 border-white/60 dark:border-white/5 shadow-2xl">
          <div className="p-10 bg-rose-500/10 dark:bg-rose-500/20 rounded-[3rem] relative">
            <Lock className="w-20 h-20 text-rose-500" />
            <div className="absolute -inset-2 bg-rose-500/10 blur-2xl -z-10 rounded-full animate-pulse"></div>
          </div>
          <div className="text-center space-y-2">
            <p className="font-black text-2xl text-slate-900 dark:text-white truncate max-w-[250px]">{sourceFile.name}</p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ready for Security Sync</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex p-2 bg-white/30 dark:bg-zinc-900/30 rounded-3xl glass border-white/20">
            <button 
              onClick={() => setMode('protect')}
              className={cn("flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all", mode === 'protect' ? "bg-white dark:bg-zinc-800 shadow-xl text-slate-900 dark:text-white" : "text-slate-400")}
            >
              Protect
            </button>
            <button 
              onClick={() => setMode('unlock')}
              className={cn("flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all", mode === 'unlock' ? "bg-white dark:bg-zinc-800 shadow-xl text-slate-900 dark:text-white" : "text-slate-400")}
            >
              Unlock
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <KeyRound className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
              <Input 
                type="password"
                placeholder="Enter Secure Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass dark:bg-zinc-900 h-20 pl-16 rounded-[2rem] text-xl font-black border-white/40 focus:ring-rose-500/20"
              />
            </div>
            
            <button 
              className="liquid-button w-full h-20 rounded-[2.5rem] mt-6 group"
              onClick={handleProcess}
              disabled={processing || !password}
            >
              <span className="liquid-button-text flex items-center text-xl font-black uppercase tracking-tight">
                {processing ? <Loader2 className="w-7 h-7 animate-spin mr-3" /> : mode === 'protect' ? <Lock className="w-7 h-7 mr-3" /> : <Unlock className="w-7 h-7 mr-3" />}
                {processing ? 'Processing Vault...' : mode === 'protect' ? 'Apply Protection' : 'Unlock Document'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
