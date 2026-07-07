import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, ArrowLeft, ShieldCheck, Zap, Globe, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: "Account required",
        description: "Please sign in or register to upgrade your account.",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }

    setLoading(true);
    try {
      // Create Stripe checkout session
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to initialize billing portal");
      }

      const data = await response.json();
      if (data.url) {
        // Redirect to checkout URL
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({
        title: "Billing Error",
        description: err.message || "Failed to start payment session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMockUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/mock-upgrade", { method: "POST" });
      if (response.ok) {
        toast({
          title: "Premium Unlocked!",
          description: "Your mock developer subscription has been activated successfully.",
        });
        window.location.reload();
      }
    } catch (err: any) {
      toast({ title: "Mock Upgrade Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border py-4 bg-background/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between">
          <button 
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Newsroom
          </button>
          
          <h1 className="text-sm font-serif font-black tracking-widest uppercase text-foreground">
            The Lens Dispatch
          </h1>
          
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-[1200px] mx-auto px-4 py-16 w-full flex flex-col justify-center items-center">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Empower Your News Literacy
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-serif font-black tracking-tight leading-[1.05]"
          >
            Choose how you decode the world's media bias
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed font-medium"
          >
            Access political bias tracking, blindspots analysis, and factual validation. Unlock premium AI models to synthesize narratives.
          </motion.p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-[900px]">
          {/* Free Plan */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="glass-card bg-card/40 border border-border p-8 rounded-2xl flex flex-col"
          >
            <div className="space-y-2 mb-6">
              <h3 className="text-lg font-black uppercase tracking-wider text-muted-foreground">Free Starter</h3>
              <p className="text-xs text-muted-foreground font-bold">Standard media tracking and analytics</p>
              <div className="pt-4 flex items-baseline">
                <span className="text-4xl font-serif font-black">$0</span>
                <span className="text-xs font-bold text-muted-foreground ml-2">/ lifetime free</span>
              </div>
            </div>

            <hr className="border-border/50 my-4" />

            <ul className="space-y-3 flex-1 mb-8 text-xs font-bold text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Standard News Curation & Feeds</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Political Bias Spectrum Indicators</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Factuality & Ownership Metrics</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Interactive Blindspots Feed access</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Bubble Analysis reading logs</span>
              </li>
            </ul>

            <button 
              onClick={() => setLocation("/")}
              className="w-full py-4 border border-border bg-secondary hover:bg-secondary/80 text-foreground font-black text-xs uppercase tracking-widest transition-colors rounded-lg"
            >
              Access Free Feed
            </button>
          </motion.div>

          {/* Premium Plan */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="relative bg-gradient-to-br from-slate-900 via-indigo-950/20 to-purple-950/20 border-2 border-indigo-500/30 p-8 rounded-2xl flex flex-col shadow-xl shadow-indigo-500/5"
          >
            {/* Premium Badge */}
            <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md">
              Most Popular
            </div>

            <div className="space-y-2 mb-6">
              <h3 className="text-lg font-black uppercase tracking-wider text-indigo-400">Premium Pro</h3>
              <p className="text-xs text-indigo-200/60 font-bold">Unlocks deep reasoning AI features</p>
              <div className="pt-4 flex items-baseline">
                <span className="text-4xl font-serif font-black text-foreground">$9.99</span>
                <span className="text-xs font-bold text-muted-foreground ml-2">/ month</span>
              </div>
            </div>

            <hr className="border-indigo-500/20 my-4" />

            <ul className="space-y-3 flex-1 mb-8 text-xs font-bold text-foreground/80">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>Everything in Free Starter</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span className="font-extrabold text-foreground flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" /> Grok Executive Briefings
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span className="font-extrabold text-foreground flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" /> Sarvam AI Local Context & Translation
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>Direct Quote Tracker & Entity Analysis</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>Financial Market Ticker Extraction</span>
              </li>
            </ul>

            <div className="flex flex-col gap-2">
              <button 
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest transition-all rounded-lg shadow-lg shadow-indigo-600/20"
              >
                {loading ? "Processing..." : "Subscribe Now"}
              </button>
              
              {user && !user.isPremium && (
                <button
                  onClick={handleMockUpgrade}
                  disabled={loading}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-[10px] uppercase tracking-widest transition-colors rounded-lg mt-1"
                >
                  Quick Unlock (Developer Mode)
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
