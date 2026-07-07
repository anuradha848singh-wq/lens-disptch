import React from 'react';
import { motion } from 'framer-motion';

export function PremiumLoader({ size = "md", message }: { size?: "sm" | "md" | "lg", message?: string }) {
  const dimensions = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className={`relative ${dimensions[size]}`}>
        {/* Outer rotating/pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-sm border-[1.5px] border-lens-cyan/30"
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner reverse rotating square */}
        <motion.div
          className="absolute inset-[20%] bg-lens-cyan/10 border border-lens-cyan"
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        {/* Center dot */}
        <motion.div
          className="absolute inset-[40%] bg-lens-cyan rounded-full"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      {message && (
        <motion.p 
          className="text-xs font-mono uppercase tracking-[0.2em] text-ink-muted"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
