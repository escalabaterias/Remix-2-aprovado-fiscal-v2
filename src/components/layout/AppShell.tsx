import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  Menu,
  X,
  LogOut,
  Bot,
  Sparkles,
  ChevronRight,
  User,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

import { NAV_GROUP_LABELS, NAV_ITEMS, type NavGroupKey } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CoachProvider, useCoachDrawer } from "@/components/coach/CoachContext";
import { CoachDrawerWidget } from "@/components/coach/CoachDrawerWidget";

const GROUPS: NavGroupKey[] = ["estudo", "edital", "treino", "inteligencia", "sistema"];

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 group shrink-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-sm group-hover:scale-105 transition-transform shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="3" />
          <path d="M12 8v1M12 13v1M9.5 11h1M13.5 11h1" />
        </svg>
      </div>
      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-base font-extrabold tracking-tight text-foreground">
              APROVADO
            </span>
            <span className="font-display text-base font-extrabold tracking-tight text-primary">
              FISCAL
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold tracking-widest text-muted-foreground uppercase -mt-1">
            Inteligência em Concursos
          </span>
        </div>
      )}
    </Link>
  );
}

function NavList({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-4">
      {GROUPS.map((group) => {
        const groupItems = NAV_ITEMS.filter((item) => item.group === group);
        if (groupItems.length === 0) return null;

        return (
          <div key={group}>
            {!collapsed && (
              <p className="px-3 text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest font-mono mb-1">
                {NAV_GROUP_LABELS[group]}
              </p>
            )}
            <ul className="space-y-0.5">
              {groupItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.to &&
                  (pathname === item.to ||
                    (item.to !== "/dashboard" && pathname.startsWith(item.to)));

                return item.to ? (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all relative",
                        isActive
                          ? "bg-primary/10 text-primary font-bold shadow-2xs"
                          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                      )}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground/70 group-hover:text-foreground",
                          )}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!collapsed && isActive && (
                        <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 opacity-80" />
                      )}
                    </Link>
                  </li>
                ) : (
                  <li key={item.label}>
                    <span
                      aria-disabled="true"
                      title={collapsed ? `${item.label} (em breve)` : undefined}
                      className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2 text-xs text-muted-foreground/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 shrink-0 opacity-40" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!collapsed && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[9px] font-normal border-border/40 text-muted-foreground/50 px-1.5 py-0"
                        >
                          {item.badge ?? "em breve"}
                        </Badge>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { toggleCoach } = useCoachDrawer();

  const userDisplayName =
    user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Estudante";

  return (
    <div
      className={cn(
        "min-h-screen bg-background transition-all duration-200",
        collapsed ? "lg:grid lg:grid-cols-[4.5rem_1fr]" : "lg:grid lg:grid-cols-[16rem_1fr]",
      )}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-3.5 py-3.5 flex items-center justify-between border-b border-sidebar-border/60">
          <Brand collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          <NavList collapsed={collapsed} />
        </div>

        <Separator className="bg-sidebar-border/60" />

        <div className="p-2.5 bg-sidebar-accent/10 space-y-2">
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCoach}
              className="w-full justify-start text-xs font-bold gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-xl py-2"
            >
              <Bot className="h-4 w-4 shrink-0" />
              <span>Coach Aprovado Fiscal</span>
            </Button>
          )}

          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-card/60 border border-border/40">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary shrink-0 font-mono text-xs font-extrabold uppercase">
              {userDisplayName.charAt(0)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{userDisplayName}</p>
                <p className="text-[10px] font-mono text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Ciclo Ativo
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                onClick={signOut}
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCoach}
              className="h-8 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
            >
              <Bot className="h-4 w-4" />
              Coach
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen ? (
          <div className="border-b border-border bg-sidebar px-4 py-4 lg:hidden space-y-4">
            <NavList onNavigate={() => setMobileOpen(false)} />
            <Separator className="bg-sidebar-border" />
            <div className="flex items-center justify-between px-2 py-1 text-xs">
              <span className="text-foreground font-bold truncate">
                {userDisplayName} ({user?.email})
              </span>
              <Button variant="ghost" size="sm" onClick={signOut} className="h-7 text-xs">
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Sair
              </Button>
            </div>
          </div>
        ) : null}

        {/* Main View Container */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl font-display">
                {title}
              </h1>
              {description ? (
                <p className="mt-1 max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          <div className="mt-6 sm:mt-8">{children}</div>
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
