import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, LogOut, Bot, Sparkles } from "lucide-react";

import { NAV_GROUP_LABELS, NAV_ITEMS, type NavItem } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CoachProvider, useCoachDrawer } from "@/components/coach/CoachContext";
import { CoachDrawerWidget } from "@/components/coach/CoachDrawerWidget";

const GROUPS: NavItem["group"][] = [
  "ciclo_planner",
  "edital_vade",
  "treino_inteligencia",
  "sistema",
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group}>
          <p className="label-eyebrow px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {NAV_GROUP_LABELS[group]}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {NAV_ITEMS.filter((item) => item.group === group).map((item) =>
              item.to ? (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      pathname === item.to ||
                        (item.to !== "/dashboard" && pathname.startsWith(item.to))
                        ? "bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ) : (
                <li key={item.label}>
                  <span
                    aria-disabled="true"
                    className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-1.5 text-xs text-muted-foreground/60"
                  >
                    {item.label}
                    <Badge variant="outline" className="ml-2 text-[9px] font-normal">
                      em breve
                    </Badge>
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-baseline gap-2">
      <span className="font-display text-base font-semibold tracking-tight text-foreground">
        APROVADO
      </span>
      <span className="font-display text-base font-semibold tracking-tight text-primary">
        FISCAL
      </span>
    </Link>
  );
}

function AppShellInner({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { toggleCoach } = useCoachDrawer();

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-5 py-4 flex items-center justify-between">
          <Brand />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCoach}
            className="h-7 px-2 text-[11px] gap-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
            title="Abrir Coach IA"
          >
            <Bot className="h-3.5 w-3.5" />
            Coach
          </Button>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <NavList />
        </div>
        <Separator />
        <div className="px-4 py-3">
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-xs h-8"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCoach}
              className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
            >
              <Bot className="h-4 w-4" />
              Coach IA
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {open ? (
          <div className="border-b border-border bg-sidebar px-2 py-4 lg:hidden">
            <NavList onNavigate={() => setOpen(false)} />
            <Separator className="my-3" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          <div className="mt-8">{children}</div>
        </main>
      </div>

      <CoachDrawerWidget />
    </div>
  );
}

export function AppShell(props: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <CoachProvider>
      <AppShellInner {...props} />
    </CoachProvider>
  );
}
