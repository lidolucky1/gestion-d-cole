import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  School,
  CalendarCheck,
  Wallet,
  FileBarChart,
  BookOpen,
  FileText,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/eleves", label: "Élèves", icon: Users },
  { to: "/classes", label: "Classes", icon: School },
  { to: "/matieres", label: "Matières", icon: BookOpen },
  { to: "/bulletins", label: "Bulletins", icon: FileText },
  { to: "/presences", label: "Présences", icon: CalendarCheck },
  { to: "/paiements", label: "Paiements", icon: Wallet },
  { to: "/rapports", label: "Rapports", icon: FileBarChart },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;



function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { location } = useRouterState();
  return (
    <nav className="flex-1 space-y-1 px-3">
      {nav.map(({ to, label, icon: Icon }) => {
        const active = location.pathname === to || location.pathname.startsWith(to + "/");
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const logout = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="h-10 w-10 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <p className="font-display font-bold text-lg leading-none">ScolaireApp</p>
          <p className="text-xs text-sidebar-foreground/60 mt-1">Gestion scolaire</p>
        </div>
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="px-3 py-2 text-sm">
          <p className="font-medium truncate">{user?.email ?? "—"}</p>
          <p className="text-xs text-sidebar-foreground/60">{isAdmin ? "Administrateur" : "Utilisateur"}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border">
        <SidebarContent />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
                <SidebarContent onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="font-display font-bold">ScolaireApp</span>
          </div>
          <ThemeToggle />
        </header>
        <div className="hidden lg:flex justify-end px-6 pt-4">
          <ThemeToggle />
        </div>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
