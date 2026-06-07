import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion — ScolaireApp" },
      { name: "description", content: "Connectez-vous pour gérer vos élèves, classes, présences et paiements." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        toast.success("Compte créé. Vous êtes connecté.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue !");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-display font-bold">ScolaireApp</span>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-display font-bold leading-tight">
            La gestion scolaire, <span className="text-sidebar-primary">simplifiée.</span>
          </h1>
          <p className="text-sidebar-foreground/70">
            Élèves, classes, présences, paiements et rapports — tout au même endroit, dans une interface moderne et rapide.
          </p>
          <ul className="space-y-2 text-sm text-sidebar-foreground/80">
            <li>• Suivi des inscriptions et des effectifs</li>
            <li>• Présences quotidiennes et rapports mensuels</li>
            <li>• Reçus PDF automatiques pour chaque paiement</li>
            <li>• Import / Export Excel et PDF</li>
          </ul>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} ScolaireApp</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-display font-bold">
              {mode === "signin" ? "Connexion" : "Créer un compte admin"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Accédez à votre tableau de bord"
                : "Le premier compte créé devient administrateur"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Se connecter" : "Créer le compte"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
          >
            {mode === "signin"
              ? "Pas encore de compte ? S'inscrire"
              : "Déjà un compte ? Se connecter"}
          </button>
        </Card>
      </div>
    </div>
  );
}
