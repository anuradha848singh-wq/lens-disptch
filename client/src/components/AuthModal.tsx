import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: "Welcome back!" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-black">
            <span className="text-primary">G</span>ROUND NEWS
          </DialogTitle>
        </DialogHeader>
        <div className="flex border-b mb-4">
          <button
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${mode === "login" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            onClick={() => setMode("login")}
            data-testid="tab-login"
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${mode === "register" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            onClick={() => setMode("register")}
            data-testid="tab-register"
          >
            Create Account
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                data-testid="input-display-name"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              data-testid="input-email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              data-testid="input-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-auth">
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
          {mode === "login" && (
            <p className="text-xs text-center text-muted-foreground">
              Demo: admin@newshub.com / admin123
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
