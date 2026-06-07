import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
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
import { Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { generateReceiptPDF } from "@/lib/export-utils";
import { useSettings, formatMontant } from "@/hooks/use-settings";

export const Route = createFileRoute("/_authenticated/paiements")({
  head: () => ({ meta: [{ title: "Paiements — ScolaireApp" }] }),
  component: PaiementsPage,
});

const TYPE_LABEL: Record<string, string> = {
  droit_inscription: "Droit d'inscription",
  ecolage: "Écolage",
  autre: "Autre",
};

function PaiementsPage() {
  const qc = useQueryClient();
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ eleve_id: "", montant: "", motif: "", type_paiement: "ecolage" });

  const { data: eleves = [] } = useQuery({
    queryKey: ["eleves-paiement"],
    queryFn: async () => (await supabase.from("eleves").select("id, nom, prenom, matricule, classes(nom, droit_inscription, frais_scolaire)").order("nom")).data ?? [],
  });

  const { data: paiements = [] } = useQuery({
    queryKey: ["paiements"],
    queryFn: async () => {
      const { data } = await supabase.from("paiements")
        .select("*, eleves(nom, prenom, matricule, classes(nom, droit_inscription, frais_scolaire))")
        .order("date_paiement", { ascending: false });
      return data ?? [];
    },
  });

  // totaux par élève et par type
  const totauxParType: Record<string, { droit_inscription: number; ecolage: number; autre: number; total: number }> = {};
  paiements.forEach((p: any) => {
    const t = totauxParType[p.eleve_id] ?? { droit_inscription: 0, ecolage: 0, autre: 0, total: 0 };
    const m = Number(p.montant);
    t[p.type_paiement as "droit_inscription" | "ecolage" | "autre"] += m;
    t.total += m;
    totauxParType[p.eleve_id] = t;
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("paiements").insert({
      eleve_id: form.eleve_id,
      montant: Number(form.montant),
      motif: form.motif || null,
      type_paiement: form.type_paiement,
    });
    if (error) return toast.error(error.message);
    toast.success("Paiement enregistré");
    setOpen(false);
    setForm({ eleve_id: "", montant: "", motif: "", type_paiement: "ecolage" });
    qc.invalidateQueries({ queryKey: ["paiements"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const printReceipt = (p: any) => {
    generateReceiptPDF({
      recu_numero: p.recu_numero,
      date: new Date(p.date_paiement).toLocaleDateString("fr-FR"),
      eleve_nom: `${p.eleves?.prenom ?? ""} ${p.eleves?.nom ?? ""}`,
      eleve_matricule: p.eleves?.matricule ?? "",
      classe: p.eleves?.classes?.nom,
      montant: Number(p.montant),
      motif: p.motif,
      type_paiement: TYPE_LABEL[p.type_paiement] ?? p.type_paiement,
      devise: settings.devise,
      etablissement: settings.etablissement_nom,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Paiements</h1>
          <p className="text-muted-foreground mt-1">{paiements.length} paiement(s) · montants en {settings.devise}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouveau paiement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Élève *</Label>
                <Select value={form.eleve_id} onValueChange={(v) => setForm({ ...form, eleve_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                  <SelectContent>
                    {eleves.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom} — {e.matricule}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type de paiement *</Label>
                <Select value={form.type_paiement} onValueChange={(v) => setForm({ ...form, type_paiement: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="droit_inscription">Droit d'inscription</SelectItem>
                    <SelectItem value="ecolage">Écolage</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Montant ({settings.devise}) *</Label><Input type="number" min="1" required value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} /></div>
              <div className="space-y-2"><Label>Motif / Note</Label><Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} placeholder="Ex : versement mois d'octobre" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <h2 className="font-display font-semibold mb-3">Historique des paiements</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reçu</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.recu_numero}</TableCell>
                  <TableCell>{new Date(p.date_paiement).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="font-medium">{p.eleves?.prenom} {p.eleves?.nom}</TableCell>
                  <TableCell>{p.eleves?.classes?.nom ?? "—"}</TableCell>
                  <TableCell><span className="text-xs">{TYPE_LABEL[p.type_paiement] ?? "—"}</span></TableCell>
                  <TableCell>{p.motif ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatMontant(p.montant, settings.devise)}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => printReceipt(p)}><Receipt className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {!paiements.length && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucun paiement</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-display font-semibold mb-3">Situation par élève</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-right">Droit dû</TableHead>
                <TableHead className="text-right">Droit payé</TableHead>
                <TableHead className="text-right">Écolage dû</TableHead>
                <TableHead className="text-right">Écolage payé</TableHead>
                <TableHead className="text-right">Reste total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eleves.map((e: any) => {
                const droitDu = Number(e.classes?.droit_inscription ?? 0);
                const ecolageDu = Number(e.classes?.frais_scolaire ?? 0);
                const t = totauxParType[e.id] ?? { droit_inscription: 0, ecolage: 0, autre: 0, total: 0 };
                const reste = Math.max(0, droitDu + ecolageDu - t.droit_inscription - t.ecolage);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.prenom} {e.nom}</TableCell>
                    <TableCell>{e.classes?.nom ?? "—"}</TableCell>
                    <TableCell className="text-right">{droitDu.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right text-success">{t.droit_inscription.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right">{ecolageDu.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right text-success">{t.ecolage.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className={`text-right font-medium ${reste > 0 ? "text-destructive" : "text-success"}`}>{formatMontant(reste, settings.devise)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
