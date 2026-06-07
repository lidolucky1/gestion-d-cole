import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/use-settings";

export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({ meta: [{ title: "Rapports — ScolaireApp" }] }),
  component: RapportsPage,
});

function RapportsPage() {
  const settings = useSettings();
  const today = new Date();

  const [mois, setMois] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);

  const { data: eleves = [] } = useQuery({
    queryKey: ["rep-eleves"],
    queryFn: async () => (await supabase.from("eleves").select("*, classes(nom, frais_scolaire)").order("nom")).data ?? [],
  });
  const { data: paiements = [] } = useQuery({
    queryKey: ["rep-paiements"],
    queryFn: async () => (await supabase.from("paiements").select("eleve_id, montant")).data ?? [],
  });
  const { data: absences = [] } = useQuery({
    queryKey: ["rep-absences", mois],
    queryFn: async () => {
      const start = `${mois}-01`;
      const [y, m] = mois.split("-").map(Number);
      const end = new Date(y, m, 0).toISOString().slice(0, 10);
      const { data } = await supabase.from("presences")
        .select("*, eleves(nom, prenom, matricule, classes(nom))")
        .eq("statut", "absent").gte("date_presence", start).lte("date_presence", end);
      return data ?? [];
    },
  });

  const totaux: Record<string, number> = {};
  paiements.forEach((p: any) => { totaux[p.eleve_id] = (totaux[p.eleve_id] ?? 0) + Number(p.montant); });

  const impayes = eleves.filter((e: any) => {
    const frais = Number(e.classes?.frais_scolaire ?? 0);
    return frais > (totaux[e.id] ?? 0);
  });

  const elevesParClasse = eleves.reduce((acc: Record<string, any[]>, e: any) => {
    const k = e.classes?.nom ?? "Sans classe";
    (acc[k] = acc[k] || []).push(e);
    return acc;
  }, {});

  const exportElevesClasse = (kind: "xlsx" | "pdf") => {
    const rows = eleves.map((e: any) => ({
      Matricule: e.matricule, Nom: e.nom, Prénom: e.prenom, Sexe: e.sexe,
      Classe: e.classes?.nom ?? "",
    }));
    if (kind === "xlsx") exportToExcel(rows, "eleves-par-classe");
    else exportToPDF({
      title: "Élèves par classe", filename: "eleves-par-classe",
      columns: [
        { header: "Matricule", dataKey: "Matricule" },
        { header: "Nom", dataKey: "Nom" },
        { header: "Prénom", dataKey: "Prénom" },
        { header: "Sexe", dataKey: "Sexe" },
        { header: "Classe", dataKey: "Classe" },
      ],
      rows,
    });
  };

  const exportImpayes = (kind: "xlsx" | "pdf") => {
    const rows = impayes.map((e: any) => {
      const frais = Number(e.classes?.frais_scolaire ?? 0);
      const paye = totaux[e.id] ?? 0;
      return { Matricule: e.matricule, Nom: e.nom, Prénom: e.prenom, Classe: e.classes?.nom ?? "", Frais: frais, Payé: paye, Reste: frais - paye };
    });
    if (kind === "xlsx") exportToExcel(rows, "impayes");
    else exportToPDF({
      title: "Élèves avec impayés", filename: "impayes",
      columns: [
        { header: "Matricule", dataKey: "Matricule" },
        { header: "Nom", dataKey: "Nom" },
        { header: "Prénom", dataKey: "Prénom" },
        { header: "Classe", dataKey: "Classe" },
        { header: "Reste", dataKey: "Reste" },
      ],
      rows,
    });
  };

  const exportAbsences = (kind: "xlsx" | "pdf") => {
    const rows = absences.map((a: any) => ({
      Date: a.date_presence, Matricule: a.eleves?.matricule, Nom: a.eleves?.nom,
      Prénom: a.eleves?.prenom, Classe: a.eleves?.classes?.nom ?? "",
    }));
    if (kind === "xlsx") exportToExcel(rows, `absences-${mois}`);
    else exportToPDF({
      title: `Rapport mensuel des absences (${mois})`, filename: `absences-${mois}`,
      columns: [
        { header: "Date", dataKey: "Date" },
        { header: "Matricule", dataKey: "Matricule" },
        { header: "Nom", dataKey: "Nom" },
        { header: "Prénom", dataKey: "Prénom" },
        { header: "Classe", dataKey: "Classe" },
      ],
      rows,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Rapports</h1>
        <p className="text-muted-foreground mt-1">Listes, absences et impayés — exportables en Excel & PDF</p>
      </div>

      <Tabs defaultValue="classes">
        <TabsList>
          <TabsTrigger value="classes">Par classe</TabsTrigger>
          <TabsTrigger value="absences">Absences</TabsTrigger>
          <TabsTrigger value="impayes">Impayés</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => exportElevesClasse("xlsx")}><Download className="mr-2 h-4 w-4" /> Excel</Button>
            <Button variant="outline" onClick={() => exportElevesClasse("pdf")}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
          </div>
          {Object.entries(elevesParClasse).map(([cls, list]) => (
            <Card key={cls} className="p-4">
              <h3 className="font-display font-semibold mb-3">{cls} <span className="text-muted-foreground text-sm font-normal">({list.length})</span></h3>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Matricule</TableHead><TableHead>Nom</TableHead><TableHead>Prénom</TableHead><TableHead>Sexe</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.matricule}</TableCell>
                      <TableCell>{e.nom}</TableCell>
                      <TableCell>{e.prenom}</TableCell>
                      <TableCell>{e.sexe === "M" ? "Garçon" : "Fille"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="absences" className="space-y-4">
          <Card className="p-4 flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Mois</Label>
              <Input type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => exportAbsences("xlsx")}><Download className="mr-2 h-4 w-4" /> Excel</Button>
              <Button variant="outline" onClick={() => exportAbsences("pdf")}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
            </div>
          </Card>
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Date</TableHead><TableHead>Matricule</TableHead><TableHead>Élève</TableHead><TableHead>Classe</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {absences.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.date_presence).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-mono text-xs">{a.eleves?.matricule}</TableCell>
                    <TableCell>{a.eleves?.prenom} {a.eleves?.nom}</TableCell>
                    <TableCell>{a.eleves?.classes?.nom ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {!absences.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucune absence pour ce mois</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="impayes" className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => exportImpayes("xlsx")}><Download className="mr-2 h-4 w-4" /> Excel</Button>
            <Button variant="outline" onClick={() => exportImpayes("pdf")}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
          </div>
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Matricule</TableHead><TableHead>Élève</TableHead><TableHead>Classe</TableHead><TableHead className="text-right">Reste</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {impayes.map((e: any) => {
                  const frais = Number(e.classes?.frais_scolaire ?? 0);
                  const reste = frais - (totaux[e.id] ?? 0);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.matricule}</TableCell>
                      <TableCell>{e.prenom} {e.nom}</TableCell>
                      <TableCell>{e.classes?.nom ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">{reste.toLocaleString("fr-FR")} {settings.devise}</TableCell>
                    </TableRow>
                  );
                })}
                {!impayes.length && <TableRow><TableCell colSpan={4} className="text-center text-success py-8">Aucun impayé 🎉</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
