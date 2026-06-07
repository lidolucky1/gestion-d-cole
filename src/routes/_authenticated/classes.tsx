import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useSettings, formatMontant } from "@/hooks/use-settings";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({ meta: [{ title: "Classes — ScolaireApp" }] }),
  component: ClassesPage,
});

type Classe = {
  id: string; nom: string; niveau: string | null;
  annee_scolaire: string | null;
  droit_inscription: number; frais_scolaire: number;
};

function ClassesPage() {
  const qc = useQueryClient();
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Classe | null>(null);
  const [form, setForm] = useState({
    nom: "", niveau: "", annee_scolaire: settings.annee_courante,
    droit_inscription: "0", frais_scolaire: "0",
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").order("nom");
      if (error) throw error;
      return data as Classe[];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["classes-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("eleves").select("classe_id");
      const map: Record<string, number> = {};
      (data ?? []).forEach((e) => { if (e.classe_id) map[e.classe_id] = (map[e.classe_id] ?? 0) + 1; });
      return map;
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ nom: "", niveau: "", annee_scolaire: settings.annee_courante, droit_inscription: "0", frais_scolaire: "0" });
    setOpen(true);
  };
  const openEdit = (c: Classe) => {
    setEditing(c);
    setForm({
      nom: c.nom, niveau: c.niveau ?? "",
      annee_scolaire: c.annee_scolaire ?? settings.annee_courante,
      droit_inscription: String(c.droit_inscription ?? 0),
      frais_scolaire: String(c.frais_scolaire),
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nom: form.nom,
      niveau: form.niveau || null,
      annee_scolaire: form.annee_scolaire || null,
      droit_inscription: Number(form.droit_inscription) || 0,
      frais_scolaire: Number(form.frais_scolaire) || 0,
    };
    const res = editing
      ? await supabase.from("classes").update(payload).eq("id", editing.id)
      : await supabase.from("classes").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Classe modifiée" : "Classe ajoutée");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["classes"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const remove = async (c: Classe) => {
    if (!confirm(`Supprimer la classe ${c.nom} ?`)) return;
    const { error } = await supabase.from("classes").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Classe supprimée");
    qc.invalidateQueries({ queryKey: ["classes"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Classes</h1>
          <p className="text-muted-foreground mt-1">{classes.length} classe(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Modifier la classe" : "Nouvelle classe"}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2"><Label>Nom *</Label><Input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
              <div className="space-y-2"><Label>Niveau</Label><Input value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} placeholder="Ex: Primaire, 6ème…" /></div>
              <div className="space-y-2">
                <Label>Année scolaire</Label>
                <Select value={form.annee_scolaire} onValueChange={(v) => setForm({ ...form, annee_scolaire: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {settings.annees_scolaires.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Droit d'inscription ({settings.devise})</Label>
                  <Input type="number" min="0" value={form.droit_inscription} onChange={(e) => setForm({ ...form, droit_inscription: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Frais ponctuel à la rentrée</p>
                </div>
                <div className="space-y-2">
                  <Label>Écolage annuel ({settings.devise})</Label>
                  <Input type="number" min="0" value={form.frais_scolaire} onChange={(e) => setForm({ ...form, frais_scolaire: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Total scolarité sur l'année</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit">{editing ? "Enregistrer" : "Ajouter"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => (
          <Card key={c.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold text-lg">{c.nom}</h3>
                <p className="text-sm text-muted-foreground">{c.niveau ?? "—"} · {c.annee_scolaire ?? "—"}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            <div className="pt-3 border-t space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2"><Users className="h-4 w-4" /> {counts[c.id] ?? 0} élèves</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Droit d'inscription</span><span className="font-medium">{formatMontant(c.droit_inscription ?? 0, settings.devise)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Écolage</span><span className="font-medium">{formatMontant(c.frais_scolaire, settings.devise)}</span></div>
              <div className="flex justify-between pt-1.5 border-t border-dashed"><span>Total dû</span><span className="font-semibold text-primary">{formatMontant(Number(c.frais_scolaire) + Number(c.droit_inscription ?? 0), settings.devise)}</span></div>
            </div>
          </Card>
        ))}
        {!classes.length && (
          <Card className="p-8 text-center text-muted-foreground col-span-full">
            Aucune classe. Cliquez sur "Ajouter" pour commencer.
          </Card>
        )}
      </div>
    </div>
  );
}
