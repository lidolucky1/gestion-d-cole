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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/presences")({
  head: () => ({ meta: [{ title: "Présences — ScolaireApp" }] }),
  component: PresencesPage,
});

type Statut = "present" | "absent" | "retard";

function PresencesPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [classeId, setClasseId] = useState<string>("all");

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-list"],
    queryFn: async () => (await supabase.from("classes").select("id, nom").order("nom")).data ?? [],
  });

  const { data: eleves = [] } = useQuery({
    queryKey: ["eleves-presence", classeId],
    queryFn: async () => {
      let q = supabase.from("eleves").select("id, nom, prenom, matricule, classe_id, classes(nom)").order("nom");
      if (classeId !== "all") q = q.eq("classe_id", classeId);
      return (await q).data ?? [];
    },
  });

  const { data: presences = [] } = useQuery({
    queryKey: ["presences-day", date],
    queryFn: async () => {
      const { data } = await supabase.from("presences").select("*").eq("date_presence", date);
      return data ?? [];
    },
  });

  const presenceMap = new Map(presences.map((p: any) => [p.eleve_id, p.statut as Statut]));

  const setStatut = async (eleve_id: string, statut: Statut) => {
    const existing = presences.find((p: any) => p.eleve_id === eleve_id);
    if (existing) {
      await supabase.from("presences").update({ statut }).eq("id", (existing as any).id);
    } else {
      const { error } = await supabase.from("presences").insert({ eleve_id, date_presence: date, statut });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["presences-day", date] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const counts = {
    present: presences.filter((p: any) => p.statut === "present").length,
    absent: presences.filter((p: any) => p.statut === "absent").length,
    retard: presences.filter((p: any) => p.statut === "retard").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Présences</h1>
        <p className="text-muted-foreground mt-1">Marquez la présence quotidienne de vos élèves</p>
      </div>

      <Card className="p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2 min-w-48">
          <Label>Classe</Label>
          <Select value={classeId} onValueChange={setClasseId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-4 ml-auto text-sm">
          <span className="text-success font-medium">Présents : {counts.present}</span>
          <span className="text-destructive font-medium">Absents : {counts.absent}</span>
          <span className="text-warning font-medium">Retards : {counts.retard}</span>
        </div>
      </Card>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matricule</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eleves.map((e: any) => {
                const s = presenceMap.get(e.id);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.matricule}</TableCell>
                    <TableCell className="font-medium">{e.prenom} {e.nom}</TableCell>
                    <TableCell>{e.classes?.nom ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant={s === "present" ? "default" : "outline"} className={s === "present" ? "bg-success hover:bg-success/90" : ""}
                          onClick={() => setStatut(e.id, "present")}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant={s === "retard" ? "default" : "outline"} className={s === "retard" ? "bg-warning hover:bg-warning/90 text-warning-foreground" : ""}
                          onClick={() => setStatut(e.id, "retard")}>
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant={s === "absent" ? "destructive" : "outline"}
                          onClick={() => setStatut(e.id, "absent")}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!eleves.length && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun élève</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
