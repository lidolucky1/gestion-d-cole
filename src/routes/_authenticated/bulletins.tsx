import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSettings, periodesList, periodeLabel } from "@/hooks/use-settings";

export const Route = createFileRoute("/_authenticated/bulletins")({
  head: () => ({ meta: [{ title: "Bulletins — ScolaireApp" }] }),
  component: BulletinsPage,
});

type Eleve = { id: string; matricule: string; nom: string; prenom: string; classe_id: string | null; classes?: { nom: string } | null };
type Matiere = { id: string; nom: string; coefficient: number };
type Note = { id: string; eleve_id: string; matiere_id: string; trimestre: number; annee_scolaire: string; note: number; note_max: number; appreciation: string | null };



function BulletinsPage() {
  const qc = useQueryClient();
  const settings = useSettings();
  const [eleveId, setEleveId] = useState<string>("");
  const [trimestre, setTrimestre] = useState("1");
  const [annee, setAnnee] = useState(settings.annee_courante);

  useEffect(() => {
    if (settings.annee_courante && !settings.annees_scolaires.includes(annee)) {
      setAnnee(settings.annee_courante);
    }
    const max = settings.nb_periodes;
    if (Number(trimestre) > max) setTrimestre(String(max));
  }, [settings.annee_courante, settings.nb_periodes, settings.annees_scolaires, annee, trimestre]);


  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState({ matiere_id: "", note: "", note_max: "20", appreciation: "" });

  const { data: eleves = [] } = useQuery({
    queryKey: ["eleves-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eleves")
        .select("id, matricule, nom, prenom, classe_id, classes(nom)")
        .order("nom");
      if (error) throw error;
      return data as unknown as Eleve[];
    },
  });

  const { data: matieres = [] } = useQuery({
    queryKey: ["matieres"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matieres").select("*").order("nom");
      if (error) throw error;
      return data as Matiere[];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", eleveId, trimestre, annee],
    enabled: !!eleveId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("eleve_id", eleveId)
        .eq("trimestre", Number(trimestre))
        .eq("annee_scolaire", annee);
      if (error) throw error;
      return data as Note[];
    },
  });

  const eleve = useMemo(() => eleves.find((e) => e.id === eleveId), [eleves, eleveId]);
  const matMap = useMemo(() => Object.fromEntries(matieres.map((m) => [m.id, m])), [matieres]);

  const stats = useMemo(() => {
    if (!notes.length) return { moyenne: 0, total: 0, totalCoef: 0 };
    let total = 0, totalCoef = 0;
    notes.forEach((n) => {
      const mat = matMap[n.matiere_id];
      const coef = mat?.coefficient ?? 1;
      const sur20 = (Number(n.note) / Number(n.note_max)) * 20;
      total += sur20 * coef;
      totalCoef += coef;
    });
    return { moyenne: totalCoef ? total / totalCoef : 0, total, totalCoef };
  }, [notes, matMap]);

  const openCreate = () => { setEditing(null); setForm({ matiere_id: "", note: "", note_max: "20", appreciation: "" }); setOpen(true); };
  const openEdit = (n: Note) => { setEditing(n); setForm({ matiere_id: n.matiere_id, note: String(n.note), note_max: String(n.note_max), appreciation: n.appreciation ?? "" }); setOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eleveId) return toast.error("Sélectionnez un élève");
    const payload = {
      eleve_id: eleveId,
      matiere_id: form.matiere_id,
      trimestre: Number(trimestre),
      annee_scolaire: annee,
      note: Number(form.note),
      note_max: Number(form.note_max) || 20,
      appreciation: form.appreciation || null,
    };
    const res = editing
      ? await supabase.from("notes").update(payload).eq("id", editing.id)
      : await supabase.from("notes").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Note modifiée" : "Note ajoutée");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["notes"] });
  };

  const remove = async (n: Note) => {
    if (!confirm("Supprimer cette note ?")) return;
    const { error } = await supabase.from("notes").delete().eq("id", n.id);
    if (error) return toast.error(error.message);
    toast.success("Note supprimée");
    qc.invalidateQueries({ queryKey: ["notes"] });
  };

  const generatePDF = () => {
    if (!eleve) return;
    const doc = new jsPDF();
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(settings.etablissement_nom, 14, 12);
    doc.setTextColor(0);
    doc.setFontSize(18);
    doc.text("Bulletin de notes", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Année scolaire ${annee} · ${periodeLabel(settings, Number(trimestre))}`, 14, 29);
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text(`Élève : ${eleve.nom} ${eleve.prenom}`, 14, 40);
    doc.text(`Matricule : ${eleve.matricule}`, 14, 46);
    doc.text(`Classe : ${eleve.classes?.nom ?? "—"}`, 14, 52);

    autoTable(doc, {
      startY: 60,
      head: [["Matière", "Coef.", "Note", "Sur 20", "Note × Coef", "Appréciation"]],
      body: notes.map((n) => {
        const mat = matMap[n.matiere_id];
        const sur20 = (Number(n.note) / Number(n.note_max)) * 20;
        const coef = mat?.coefficient ?? 1;
        return [
          mat?.nom ?? "—",
          String(coef),
          `${n.note} / ${n.note_max}`,
          sur20.toFixed(2),
          (sur20 * coef).toFixed(2),
          n.appreciation ?? "",
        ];
      }),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Moyenne générale : ${stats.moyenne.toFixed(2)} / 20`, 14, finalY);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Total points : ${stats.total.toFixed(2)} · Total coefficients : ${stats.totalCoef}`, 14, finalY + 6);

    const code = settings.periode_type === "trimestre" ? "T" : "S";
    doc.save(`bulletin-${eleve.matricule}-${code}${trimestre}-${annee}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Bulletins de notes</h1>
        <p className="text-muted-foreground mt-1">
          Saisie des notes et génération du bulletin PDF · {settings.periode_type === "trimestre" ? "Trimestres" : "Semestres"} ({settings.nb_periodes})
        </p>
      </div>

      <Card className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Élève</Label>
          <Select value={eleveId} onValueChange={setEleveId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {eleves.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nom} {e.prenom} · {e.classes?.nom ?? "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{settings.periode_type === "trimestre" ? "Trimestre" : "Semestre"}</Label>
          <Select value={trimestre} onValueChange={setTrimestre}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodesList(settings).map((n) => (
                <SelectItem key={n} value={String(n)}>{periodeLabel(settings, n)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Année scolaire</Label>
          <Select value={annee} onValueChange={setAnnee}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {settings.annees_scolaires.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>



      {eleveId && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-display font-bold text-lg">
                {eleve?.nom} {eleve?.prenom}
              </h2>
              <p className="text-sm text-muted-foreground">
                Moyenne générale :{" "}
                <span className="font-semibold text-foreground">{stats.moyenne.toFixed(2)} / 20</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={generatePDF} disabled={!notes.length}>
                <FileDown className="mr-2 h-4 w-4" /> Bulletin PDF
              </Button>
              <Button onClick={openCreate} disabled={!matieres.length}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter une note
              </Button>
            </div>
          </div>

          {!matieres.length && (
            <p className="text-sm text-muted-foreground">
              Ajoutez d'abord des matières dans la section "Matières".
            </p>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matière</TableHead>
                <TableHead>Coef.</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Sur 20</TableHead>
                <TableHead>Appréciation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((n) => {
                const mat = matMap[n.matiere_id];
                const sur20 = (Number(n.note) / Number(n.note_max)) * 20;
                return (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{mat?.nom ?? "—"}</TableCell>
                    <TableCell>{mat?.coefficient ?? 1}</TableCell>
                    <TableCell>{n.note} / {n.note_max}</TableCell>
                    <TableCell>{sur20.toFixed(2)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{n.appreciation ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(n)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(n)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!notes.length && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aucune note pour ce trimestre.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier la note" : "Nouvelle note"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Matière *</Label>
              <Select value={form.matiere_id} onValueChange={(v) => setForm({ ...form, matiere_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir une matière" /></SelectTrigger>
                <SelectContent>
                  {matieres.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nom} (coef. {m.coefficient})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Note *</Label><Input type="number" step="0.25" min="0" required value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
              <div className="space-y-2"><Label>Sur</Label><Input type="number" step="1" min="1" value={form.note_max} onChange={(e) => setForm({ ...form, note_max: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Appréciation</Label><Textarea value={form.appreciation} onChange={(e) => setForm({ ...form, appreciation: e.target.value })} rows={3} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={!form.matiere_id}>{editing ? "Enregistrer" : "Ajouter"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
