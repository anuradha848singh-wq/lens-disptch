import React from "react";
import { Link } from "wouter";
import { Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface PremiumGateProps {
  isPremium: boolean;
  children: React.ReactNode;
}

export function PremiumGate({ isPremium, children }: PremiumGateProps) {
  if (isPremium) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-500/10 bg-card/60 p-1 shadow-sm">
      {/* Locked Overlay overlay */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-md flex flex-col items-center justify-center z-10 p-6 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full text-white shadow-lg mb-4"
        >
          <Lock className="w-5 h-5" />
        </motion.div>
        
        <h4 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-1.5 justify-center">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          Premium AI Feature
        </h4>
        
        <p className="text-[11px] font-bold text-muted-foreground mt-2 max-w-xs leading-relaxed">
          Unlock this deep analysis (briefings by Grok, local context, quote tracker, & market intelligence).
        </p>
        
        <div className="flex gap-2 mt-4">
          <Link href="/pricing" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 transition-opacity text-white text-[11px] font-black uppercase tracking-widest rounded-md shadow-md">
            Upgrade Plan
          </Link>
        </div>
      </div>

      {/* Blurred background content */}
      <div className="opacity-10 select-none pointer-events-none filter blur-[4px] select-none p-3">
        {children}
      </div>
    </div>
  );
}
