import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Pencil, Trash2, Search, Upload, Download, FileText, Loader2, UserCheck, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { exportToExcel, exportToPDF, readExcel } from "@/lib/export-utils";
import { useSettings, nextAnneeScolaire } from "@/hooks/use-settings";

export const Route = createFileRoute("/_authenticated/eleves")({
  head: () => ({ meta: [{ title: "Élèves — ScolaireApp" }] }),
  component: ElevesPage,
});

type Eleve = {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: "M" | "F";
  date_naissance: string | null;
  adresse: string | null;
  telephone_parents: string | null;
  classe_id: string | null;
  photo_url: string | null;
  date_inscription: string;
};

const emptyForm = {
  nom: "", prenom: "", sexe: "M" as "M" | "F",
  date_naissance: "", adresse: "", telephone_parents: "", classe_id: "",
};

function ElevesPage() {
  const qc = useQueryClient();
  const settings = useSettings();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Eleve | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Réinscription
  const [reOpen, setReOpen] = useState(false);
  const [reEleve, setReEleve] = useState<Eleve | null>(null);
  const [reAnnee, setReAnnee] = useState("");
  const [reClasse, setReClasse] = useState<string>("");
  const [reSubmitting, setReSubmitting] = useState(false);

  const nextYear = nextAnneeScolaire(settings.annee_courante);

  const { data: reinscriptions = [] } = useQuery({
    queryKey: ["reinscriptions", nextYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reinscriptions")
        .select("eleve_id, annee_scolaire")
        .eq("annee_scolaire", nextYear);
      if (error) throw error;
      return data as { eleve_id: string; annee_scolaire: string }[];
    },
  });

  const reinscritIds = new Set(reinscriptions.map((r) => r.eleve_id));

  const { data: eleves = [] } = useQuery({
    queryKey: ["eleves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eleves")
        .select("*, classes(nom)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (Eleve & { classes: { nom: string } | null })[];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-list"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, nom").order("nom");
      return data ?? [];
    },
  });

  const filtered = eleves.filter((e) => {
    const s = search.toLowerCase();
    return !s || e.nom.toLowerCase().includes(s) || e.prenom.toLowerCase().includes(s) || e.matricule.toLowerCase().includes(s);
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setPhoto(null);
    setOpen(true);
  };

  const openEdit = (e: Eleve) => {
    setEditing(e);
    setForm({
      nom: e.nom, prenom: e.prenom, sexe: e.sexe,
      date_naissance: e.date_naissance ?? "",
      adresse: e.adresse ?? "",
      telephone_parents: e.telephone_parents ?? "",
      classe_id: e.classe_id ?? "",
    });
    setPhoto(null);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let photo_url = editing?.photo_url ?? null;
      if (photo) {
        const path = `${Date.now()}-${photo.name}`;
        const { error: upErr } = await supabase.storage.from("eleves-photos").upload(path, photo);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("eleves-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        photo_url = signed?.signedUrl ?? null;
      }
      const payload = {
        nom: form.nom, prenom: form.prenom, sexe: form.sexe,
        date_naissance: form.date_naissance || null,
        adresse: form.adresse || null,
        telephone_parents: form.telephone_parents || null,
        classe_id: form.classe_id || null,
        photo_url,
      };
      if (editing) {
        const { error } = await supabase.from("eleves").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Élève modifié");
      } else {
        const { error } = await supabase.from("eleves").insert(payload);
        if (error) throw error;
        toast.success("Élève ajouté");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["eleves"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (e: Eleve) => {
    if (!confirm(`Supprimer ${e.prenom} ${e.nom} ?`)) return;
    const { error } = await supabase.from("eleves").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Élève supprimé");
    qc.invalidateQueries({ queryKey: ["eleves"] });
  };

  const openReinscrire = (e: Eleve) => {
    const targetYear = nextAnneeScolaire(settings.annee_courante);
    if (reinscritIds.has(e.id)) {
      toast.error(`${e.prenom} ${e.nom} est déjà réinscrit(e) pour ${targetYear}.`);
      return;
    }
    setReEleve(e);
    setReAnnee(targetYear);
    setReClasse(e.classe_id ?? "");
    setReOpen(true);
  };

  const confirmReinscription = async () => {
    if (!reEleve) return;
    if (!/^\d{4}-\d{4}$/.test(reAnnee)) return toast.error("Année invalide (AAAA-AAAA)");
    if (reinscritIds.has(reEleve.id)) {
      toast.error(`${reEleve.prenom} ${reEleve.nom} est déjà réinscrit(e) pour ${reAnnee}.`);
      return;
    }
    setReSubmitting(true);
    try {
      const { error: rErr } = await supabase.from("reinscriptions").upsert({
        eleve_id: reEleve.id,
        annee_scolaire: reAnnee,
        classe_id: reClasse || null,
      }, { onConflict: "eleve_id,annee_scolaire" });
      if (rErr) throw rErr;
      // Met aussi à jour la classe actuelle de l'élève
      if (reClasse && reClasse !== reEleve.classe_id) {
        const { error: uErr } = await supabase.from("eleves").update({ classe_id: reClasse }).eq("id", reEleve.id);
        if (uErr) throw uErr;
      }
      toast.success(`Réinscription confirmée pour ${reEleve.prenom} ${reEleve.nom} (${reAnnee})`);
      setReOpen(false);
      qc.invalidateQueries({ queryKey: ["eleves"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setReSubmitting(false);
    }
  };



  const handleImport = async (file: File) => {
    try {
      const rows = await readExcel(file);
      const payload = rows.map((r: any) => ({
        nom: r.nom ?? r.Nom,
        prenom: r.prenom ?? r.Prenom ?? r.Prénom,
        sexe: ((r.sexe ?? r.Sexe ?? "M").toString().toUpperCase().startsWith("F") ? "F" : "M") as "M" | "F",
        date_naissance: r.date_naissance ?? r["Date de naissance"] ?? null,
        adresse: r.adresse ?? r.Adresse ?? null,
        telephone_parents: r.telephone_parents ?? r.Téléphone ?? null,
      })).filter((r) => r.nom && r.prenom);
      if (!payload.length) return toast.error("Aucune ligne valide trouvée");
      const { error } = await supabase.from("eleves").insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} élèves importés`);
      qc.invalidateQueries({ queryKey: ["eleves"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const exportXlsx = () => {
    exportToExcel(
      filtered.map((e) => ({
        Matricule: e.matricule, Nom: e.nom, Prenom: e.prenom, Sexe: e.sexe,
        "Date de naissance": e.date_naissance ?? "",
        Adresse: e.adresse ?? "", Téléphone: e.telephone_parents ?? "",
        Classe: e.classes?.nom ?? "", "Date inscription": e.date_inscription,
      })),
      "eleves",
    );
  };

  const exportPdf = () => {
    exportToPDF({
      title: "Liste des élèves",
      filename: "eleves",
      subtitle: `${filtered.length} élève(s) — ${new Date().toLocaleDateString("fr-FR")}`,
      columns: [
        { header: "Matricule", dataKey: "matricule" },
        { header: "Nom", dataKey: "nom" },
        { header: "Prénom", dataKey: "prenom" },
        { header: "Sexe", dataKey: "sexe" },
        { header: "Classe", dataKey: "classe" },
      ],
      rows: filtered.map((e) => ({
        matricule: e.matricule, nom: e.nom, prenom: e.prenom,
        sexe: e.sexe, classe: e.classes?.nom ?? "",
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Élèves</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} élève(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importer Excel
          </Button>
          <Button variant="outline" onClick={exportXlsx}>
            <Download className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={exportPdf}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Modifier l'élève" : "Nouvel élève"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <Input required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Sexe *</Label>
                  <Select value={form.sexe} onValueChange={(v) => setForm({ ...form, sexe: v as "M" | "F" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date de naissance</Label>
                  <Input type="date" value={form.date_naissance} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Adresse</Label>
                  <Input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone des parents</Label>
                  <Input value={form.telephone_parents} onChange={(e) => setForm({ ...form, telephone_parents: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Classe</Label>
                  <Select value={form.classe_id} onValueChange={(v) => setForm({ ...form, classe_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Photo</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                </div>
                <DialogFooter className="md:col-span-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editing ? "Enregistrer" : "Ajouter"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher par nom, prénom ou matricule…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Matricule</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Sexe</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={e.photo_url ?? undefined} />
                      <AvatarFallback>{e.prenom[0]}{e.nom[0]}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.matricule}</TableCell>
                  <TableCell className="font-medium">{e.nom}</TableCell>
                  <TableCell>{e.prenom}</TableCell>
                  <TableCell>{e.sexe === "M" ? "Garçon" : "Fille"}</TableCell>
                  <TableCell>{e.classes?.nom ?? "—"}</TableCell>
                  <TableCell>{new Date(e.date_inscription).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="text-right">
                    {reinscritIds.has(e.id) ? (
                      <Badge variant="secondary" className="mr-2 gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3" /> Réinscrit
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="icon" title="Réinscrire pour l'année prochaine" onClick={() => openReinscrire(e)}>
                        <UserCheck className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(e)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucun élève</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={reOpen} onOpenChange={setReOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la réinscription</DialogTitle>
          </DialogHeader>
          {reEleve && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={reEleve.photo_url ?? undefined} />
                  <AvatarFallback>{reEleve.prenom[0]}{reEleve.nom[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{reEleve.prenom} {reEleve.nom}</div>
                  <div className="text-xs text-muted-foreground font-mono">{reEleve.matricule}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Confirmez le retour de cet élève pour l'année scolaire à venir.
                Aucune information personnelle n'a besoin d'être ressaisie.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Année scolaire</Label>
                  <Input value={reAnnee} onChange={(e) => setReAnnee(e.target.value)} placeholder="2026-2027" />
                </div>
                <div className="space-y-2">
                  <Label>Nouvelle classe</Label>
                  <Select value={reClasse} onValueChange={setReClasse}>
                    <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReOpen(false)}>Annuler</Button>
            <Button onClick={confirmReinscription} disabled={reSubmitting}>
              {reSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserCheck className="mr-2 h-4 w-4" /> Confirmer la réinscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
