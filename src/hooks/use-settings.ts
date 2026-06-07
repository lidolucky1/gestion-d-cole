import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppSettings = {
  id: boolean;
  etablissement_nom: string;
  periode_type: "trimestre" | "semestre";
  nb_periodes: number;
  annees_scolaires: string[];
  annee_courante: string;
  devise: string;
  annee_debut_mois: number;
  annee_debut_jour: number;
  annee_fin_mois: number;
  annee_fin_jour: number;
};

const DEFAULTS: AppSettings = {
  id: true,
  etablissement_nom: "Mon École",
  periode_type: "trimestre",
  nb_periodes: 3,
  annees_scolaires: ["2025-2026"],
  annee_courante: "2025-2026",
  devise: "Ar",
  annee_debut_mois: 8,
  annee_debut_jour: 1,
  annee_fin_mois: 7,
  annee_fin_jour: 31,
};

export function useSettings() {
  const q = useQuery({
    queryKey: ["app_settings"],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("id", true).maybeSingle();
      if (error) throw error;
      return (data as AppSettings) ?? DEFAULTS;
    },
  });
  return q.data ?? DEFAULTS;
}

export function formatMontant(n: number, devise = "Ar") {
  return `${Number(n).toLocaleString("fr-FR")} ${devise}`;
}

export function periodeLabel(s: AppSettings, n: number) {
  const prefix = s.periode_type === "trimestre" ? "Trimestre" : "Semestre";
  return `${prefix} ${n}`;
}

export function periodesList(s: AppSettings): number[] {
  return Array.from({ length: s.nb_periodes }, (_, i) => i + 1);
}

/**
 * Calcule l'année scolaire correspondant à une date donnée,
 * d'après les bornes (début/fin) configurées dans app_settings.
 * Retourne par ex. "2025-2026".
 */
export function computeAnneeScolaire(s: AppSettings, date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const afterStart =
    m > s.annee_debut_mois || (m === s.annee_debut_mois && d >= s.annee_debut_jour);
  const startYear = afterStart ? y : y - 1;
  return `${startYear}-${startYear + 1}`;
}

export function nextAnneeScolaire(annee: string): string {
  const m = annee.match(/^(\d{4})-(\d{4})$/);
  if (!m) return annee;
  const a = Number(m[1]) + 1;
  return `${a}-${a + 1}`;
}
