import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "login" | "register";
}

export function AuthModal({ open, onOpenChange, defaultMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  useEffect(() => { setMode(defaultMode); }, [defaultMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        await api.auth.register(email, password, displayName);
      }
      await login(email, password);
      toast({ title: mode === "register" ? "Account created!" : "Welcome back!" });
      onOpenChange(false);
      setEmail(""); setPassword(""); setDisplayName("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="bg-zinc-900 px-6 py-5 text-white text-center">
          <div className="font-black text-2xl tracking-tight mb-1">
            Gro<span className="text-red-400">u</span>nd News
          </div>
          <p className="text-xs text-zinc-400">See every side of every story</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex border-b border-border mb-5">
            <button
              className={`flex-1 pb-2 text-sm font-semibold border-b-2 transition-all ${mode === "login" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
              onClick={() => setMode("login")}
              data-testid="tab-login"
            >
              Sign In
            </button>
            <button
              className={`flex-1 pb-2 text-sm font-semibold border-b-2 transition-all ${mode === "register" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
              onClick={() => setMode("register")}
              data-testid="tab-register"
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Smith" required data-testid="input-display-name" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required data-testid="input-email" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required data-testid="input-password" />
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={loading} data-testid="button-submit-auth">
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Free Account"}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-muted rounded text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Demo credentials:</p>
            <p>Admin: admin@newshub.com / admin123</p>
            <p>Editor: sarah@newshub.com / editor123</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
