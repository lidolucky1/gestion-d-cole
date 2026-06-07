import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/matieres")({
  head: () => ({ meta: [{ title: "Matières — ScolaireApp" }] }),
  component: MatieresPage,
});

type Matiere = { id: string; nom: string; coefficient: number };

function MatieresPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Matiere | null>(null);
  const [form, setForm] = useState({ nom: "", coefficient: "1" });

  const { data: matieres = [] } = useQuery({
    queryKey: ["matieres"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matieres").select("*").order("nom");
      if (error) throw error;
      return data as Matiere[];
    },
  });

  const openCreate = () => { setEditing(null); setForm({ nom: "", coefficient: "1" }); setOpen(true); };
  const openEdit = (m: Matiere) => { setEditing(m); setForm({ nom: m.nom, coefficient: String(m.coefficient) }); setOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { nom: form.nom, coefficient: Number(form.coefficient) || 1 };
    const res = editing
      ? await supabase.from("matieres").update(payload).eq("id", editing.id)
      : await supabase.from("matieres").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Matière modifiée" : "Matière ajoutée");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["matieres"] });
  };

  const remove = async (m: Matiere) => {
    if (!confirm(`Supprimer la matière ${m.nom} ? Toutes les notes associées seront supprimées.`)) return;
    const { error } = await supabase.from("matieres").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Matière supprimée");
    qc.invalidateQueries({ queryKey: ["matieres"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Matières</h1>
          <p className="text-muted-foreground mt-1">{matieres.length} matière(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Modifier la matière" : "Nouvelle matière"}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2"><Label>Nom *</Label><Input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Mathématiques, Français…" /></div>
              <div className="space-y-2"><Label>Coefficient</Label><Input type="number" step="0.5" min="0.5" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit">{editing ? "Enregistrer" : "Ajouter"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {matieres.map((m) => (
          <Card key={m.id} className="p-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold">{m.nom}</h3>
                <p className="text-sm text-muted-foreground">Coefficient {m.coefficient}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
        {!matieres.length && (
          <Card className="p-8 text-center text-muted-foreground col-span-full">
            Aucune matière. Cliquez sur "Ajouter" pour commencer.
          </Card>
        )}
      </div>
    </div>
  );
}
