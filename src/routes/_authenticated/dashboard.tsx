import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, UserRound, School, GraduationCap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useSettings } from "@/hooks/use-settings";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — ScolaireApp" }] }),
  component: Dashboard,
});

const fetchStats = async () => {
  const [eleves, classes, presences, paiements] = await Promise.all([
    supabase.from("eleves").select("id, sexe, classe_id"),
    supabase.from("classes").select("id, nom"),
    supabase.from("presences").select("statut, date_presence"),
    supabase.from("paiements").select("montant, date_paiement"),
  ]);
  return {
    eleves: eleves.data ?? [],
    classes: classes.data ?? [],
    presences: presences.data ?? [],
    paiements: paiements.data ?? [],
  };
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl grid place-items-center ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-display font-bold">{value}</p>
      </div>
    </Card>
  );
}

function Dashboard() {
  const settings = useSettings();
  const { data } = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchStats });

  const eleves = data?.eleves ?? [];
  const classes = data?.classes ?? [];
  const garcons = eleves.filter((e) => e.sexe === "M").length;
  const filles = eleves.filter((e) => e.sexe === "F").length;

  const byClass = classes.map((c) => ({
    name: c.nom,
    Élèves: eleves.filter((e) => e.classe_id === c.id).length,
  }));

  const presenceData = [
    { name: "Présents", value: data?.presences.filter((p) => p.statut === "present").length ?? 0 },
    { name: "Absents", value: data?.presences.filter((p) => p.statut === "absent").length ?? 0 },
    { name: "Retards", value: data?.presences.filter((p) => p.statut === "retard").length ?? 0 },
  ];
  const COLORS = ["oklch(0.66 0.16 162)", "oklch(0.58 0.24 27)", "oklch(0.78 0.15 80)"];

  const totalPaye = (data?.paiements ?? []).reduce((s, p) => s + Number(p.montant), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de votre établissement</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total élèves" value={eleves.length} icon={Users} color="bg-primary/10 text-primary" />
        <StatCard label="Garçons" value={garcons} icon={GraduationCap} color="bg-chart-1/10 text-chart-1" />
        <StatCard label="Filles" value={filles} icon={UserRound} color="bg-chart-5/10 text-chart-5" />
        <StatCard label="Classes" value={classes.length} icon={School} color="bg-success/10 text-success" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-display font-semibold mb-4">Effectifs par classe</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byClass}>
                <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="Élèves" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display font-semibold mb-4">Répartition des présences</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={presenceData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {presenceData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Total des paiements encaissés</p>
        <p className="text-3xl font-display font-bold text-success mt-1">
          {totalPaye.toLocaleString("fr-FR")} {settings.devise}
        </p>
      </Card>

    </div>
  );
}
