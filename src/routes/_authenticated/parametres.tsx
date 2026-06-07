import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Settings, Wand2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { computeAnneeScolaire, nextAnneeScolaire, type AppSettings } from "@/hooks/use-settings";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — ScolaireApp" }] }),
  component: ParametresPage,
});

function ParametresPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const { data } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", true).maybeSingle()).data as AppSettings | null,
  });

  const [form, setForm] = useState<AppSettings | null>(null);
  const [newAnnee, setNewAnnee] = useState("");

  useEffect(() => { if (data) setForm(data); }, [data]);

  if (!form) return <div className="text-muted-foreground">Chargement…</div>;

  const save = async () => {
    if (!isAdmin) return toast.error("Réservé aux administrateurs");
    if (!form.annees_scolaires.includes(form.annee_courante)) {
      return toast.error("L'année courante doit être dans la liste");
    }
    const { error } = await supabase.from("app_settings").update({
      etablissement_nom: form.etablissement_nom,
      periode_type: form.periode_type,
      nb_periodes: form.nb_periodes,
      annees_scolaires: form.annees_scolaires,
      annee_courante: form.annee_courante,
      devise: form.devise,
      annee_debut_mois: form.annee_debut_mois,
      annee_debut_jour: form.annee_debut_jour,
      annee_fin_mois: form.annee_fin_mois,
      annee_fin_jour: form.annee_fin_jour,
    }).eq("id", true);
    if (error) return toast.error(error.message);
    toast.success("Paramètres enregistrés");
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  };

  const addAnnee = () => {
    const v = newAnnee.trim();
    if (!/^\d{4}-\d{4}$/.test(v)) return toast.error("Format attendu : AAAA-AAAA");
    if (form.annees_scolaires.includes(v)) return;
    setForm({ ...form, annees_scolaires: [...form.annees_scolaires, v].sort() });
    setNewAnnee("");
  };

  const removeAnnee = (a: string) => {
    if (form.annee_courante === a) return toast.error("Impossible de supprimer l'année courante");
    setForm({ ...form, annees_scolaires: form.annees_scolaires.filter((x) => x !== a) });
  };

  // Assistant : calcule l'année scolaire courante d'après les bornes configurées
  const suggestionCourante = computeAnneeScolaire(form);
  const suggestionProchaine = nextAnneeScolaire(suggestionCourante);

  const activerAnnee = async (annee: string) => {
    if (!isAdmin) return toast.error("Réservé aux administrateurs");
    if (!/^\d{4}-\d{4}$/.test(annee)) return toast.error("Format invalide");
    const annees = form.annees_scolaires.includes(annee)
      ? form.annees_scolaires
      : [...form.annees_scolaires, annee].sort();
    const next = { ...form, annees_scolaires: annees, annee_courante: annee };
    setForm(next);
    const { error } = await supabase.from("app_settings").update({
      annees_scolaires: annees,
      annee_courante: annee,
    }).eq("id", true);
    if (error) return toast.error(error.message);
    toast.success(`Année ${annee} activée comme année courante`);
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  };

  const periodesMax = form.periode_type === "trimestre" ? 4 : 2;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Paramètres</h1>
          <p className="text-muted-foreground">Établissement, périodes et années scolaires</p>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="font-display font-semibold">Établissement</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom de l'établissement</Label>
            <Input value={form.etablissement_nom} onChange={(e) => setForm({ ...form, etablissement_nom: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Devise</Label>
            <Input value={form.devise} onChange={(e) => setForm({ ...form, devise: e.target.value })} placeholder="Ar" />
            <p className="text-xs text-muted-foreground">Symbole affiché à côté des montants (ex : Ar pour Ariary).</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-display font-semibold">Périodes scolaires</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type de période</Label>
            <Select value={form.periode_type} onValueChange={(v) => setForm({ ...form, periode_type: v as "trimestre" | "semestre", nb_periodes: v === "semestre" ? 2 : 3 })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trimestre">Trimestre</SelectItem>
                <SelectItem value="semestre">Semestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nombre de périodes</Label>
            <Input
              type="number" min={1} max={periodesMax}
              value={form.nb_periodes}
              onChange={(e) => setForm({ ...form, nb_periodes: Math.max(1, Math.min(periodesMax, Number(e.target.value) || 1)) })}
            />
            <p className="text-xs text-muted-foreground">
              Ex : 3 trimestres ou 2 semestres. Max {periodesMax}.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-display font-semibold">Calendrier de l'année scolaire</h2>
        <p className="text-sm text-muted-foreground">
          Définissez les bornes (mois et jour) qui délimitent une année scolaire.
          L'assistant et le système calculeront automatiquement l'année courante à partir de ces dates.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Mois de début</Label>
            <Input type="number" min={1} max={12}
              value={form.annee_debut_mois}
              onChange={(e) => setForm({ ...form, annee_debut_mois: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Jour de début</Label>
            <Input type="number" min={1} max={31}
              value={form.annee_debut_jour}
              onChange={(e) => setForm({ ...form, annee_debut_jour: Math.max(1, Math.min(31, Number(e.target.value) || 1)) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Mois de fin</Label>
            <Input type="number" min={1} max={12}
              value={form.annee_fin_mois}
              onChange={(e) => setForm({ ...form, annee_fin_mois: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Jour de fin</Label>
            <Input type="number" min={1} max={31}
              value={form.annee_fin_jour}
              onChange={(e) => setForm({ ...form, annee_fin_jour: Math.max(1, Math.min(31, Number(e.target.value) || 1)) })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Exemple : début 01/09, fin 30/06. Aujourd'hui, l'année calculée est <strong>{suggestionCourante}</strong>.
        </p>
      </Card>



      <Card className="p-5 space-y-4 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold">Assistant année scolaire</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          D'après la date du jour, l'année scolaire en cours est <strong>{suggestionCourante}</strong>.
          Activez-la en un clic pour la définir comme année courante, ou préparez déjà <strong>{suggestionProchaine}</strong>.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          {form.annee_courante === suggestionCourante ? (
            <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> {suggestionCourante} déjà active</Badge>
          ) : (
            <Button size="sm" onClick={() => activerAnnee(suggestionCourante)} disabled={!isAdmin}>
              <Wand2 className="mr-2 h-4 w-4" /> Activer {suggestionCourante}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => activerAnnee(suggestionProchaine)} disabled={!isAdmin}>
            <Plus className="mr-2 h-4 w-4" /> Préparer {suggestionProchaine}
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-display font-semibold">Années scolaires</h2>
        <div className="space-y-2">
          <Label>Année courante</Label>
          <Select value={form.annee_courante} onValueChange={(v) => setForm({ ...form, annee_courante: v })}>
            <SelectTrigger className="md:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {form.annees_scolaires.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Liste des années</Label>
          <div className="flex flex-wrap gap-2">
            {form.annees_scolaires.map((a) => (
              <Badge key={a} variant="secondary" className="text-sm py-1 px-3 gap-2">
                {a}
                {a === form.annee_courante && <span className="text-xs text-primary">(courante)</span>}
                <button onClick={() => removeAnnee(a)} className="hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm pt-2">
            <Input placeholder="2026-2027" value={newAnnee} onChange={(e) => setNewAnnee(e.target.value)} />
            <Button type="button" variant="outline" onClick={addAnnee}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!isAdmin}><Save className="mr-2 h-4 w-4" /> Enregistrer</Button>
      </div>
      {!isAdmin && <p className="text-sm text-muted-foreground text-right">Lecture seule — connecté en tant qu'utilisateur.</p>}
    </div>
  );
}
