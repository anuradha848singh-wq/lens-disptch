import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cookie, Info } from "lucide-react";
import { Button } from "./ui/button";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[400px] z-[100]"
        >
          <div className="bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-5 shadow-black/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-foreground">Cookie Policy</h4>
                  <button 
                    onClick={() => setShow(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[12px] leading-relaxed text-muted-foreground mb-4">
                  We use cookies to enhance your experience, analyze site traffic, and support our visual analytics platform. By clicking "Accept", you agree to our use of cookies.
                </p>
                <div className="flex items-center gap-3">
                  <Button 
                    size="sm" 
                    className="h-8 px-4 text-[11px] font-bold rounded-lg"
                    onClick={accept}
                  >
                    Accept All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-4 text-[11px] font-medium text-muted-foreground hover:bg-secondary rounded-lg flex items-center gap-1.5"
                    onClick={() => window.open("/terms", "_blank")}
                  >
                    <Info className="w-3 h-3" /> Learn More
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
