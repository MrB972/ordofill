import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute top-[10%] left-[15%] w-64 h-64 rounded-full bg-primary/10 animate-float"
      />
      <div
        className="absolute top-[60%] right-[10%] w-48 h-48 rounded-2xl bg-accent/10 animate-float-slow rotate-45"
      />
      <div
        className="absolute top-[30%] right-[25%] w-32 h-32 rounded-full bg-primary/5 animate-float"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute bottom-[15%] left-[10%] w-40 h-40 rounded-2xl bg-accent/5 animate-float-slow rotate-12"
        style={{ animationDelay: "1s" }}
      />
    </div>
  );
}

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      navigate("/dashboard");
    } catch {
      toast({
        title: "Erreur de connexion",
        description: "Email ou mot de passe invalide",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(regEmail, regPassword, regName);
      navigate("/onboarding");
    } catch {
      toast({
        title: "Erreur d'inscription",
        description: "Cet email est deja utilise",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-background">
      <FloatingShapes />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md mx-4 z-10"
      >
        <div className="glass-strong rounded-2xl p-8" data-testid="auth-card">
          <div className="flex justify-center mb-6">
            <Logo size={40} showText={true} />
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6" data-testid="auth-tabs">
              <TabsTrigger value="login" data-testid="tab-login">
                Connexion
              </TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">
                Inscription
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="marie@cabinet-dupont.fr"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    data-testid="login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Votre mot de passe"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    data-testid="login-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity"
                  disabled={loading}
                  data-testid="login-submit"
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nom complet</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Marie Dupont"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    data-testid="register-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="marie@cabinet-dupont.fr"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    data-testid="register-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Mot de passe</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Choisissez un mot de passe"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    data-testid="register-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity"
                  disabled={loading}
                  data-testid="register-submit"
                >
                  {loading ? "Inscription..." : "S'inscrire"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}
