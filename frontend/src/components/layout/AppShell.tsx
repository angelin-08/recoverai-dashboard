import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  ChevronDown,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  Menu,
  Receipt,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  TrendingDown,
  Play,
  CheckCircle2,
  AlertCircle,
  Database,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { checkHealth } from "@/api/health";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/revenue-risk", label: "Revenue Risk", icon: TrendingDown },
  { to: "/recovery-center", label: "Recovery Center", icon: ListChecks },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/insights", label: "AI Insights", icon: Activity },
  { to: "/simulator", label: "What-If Simulator", icon: FlaskConical },
  { to: "/audit-trail", label: "Audit Trail", icon: ScrollText },
  { to: "/demo", label: "Pitch Demo Hub", icon: Play },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-5 py-5 text-sidebar-foreground"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="text-[16px] font-bold tracking-tight">
          Recover<span className="text-primary">AI</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            activeOptions={{ exact: to === "/" }}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{
              className: "bg-sidebar-accent text-primary font-bold shadow-sm",
            }}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Merchant Profile Footer */}
      <div className="m-3 rounded-xl border border-sidebar-border bg-card p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
            AD
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Apex Digital</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              Agent Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = NAV.find((n) => (n.to === "/" ? pathname === "/" : pathname.startsWith(n.to)));

  const { data: health, isError: healthError } = useQuery({
    queryKey: ["backendHealthCheck"],
    queryFn: checkHealth,
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar lg:hidden">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          <h1 className="truncate text-base font-bold text-foreground">
            {active?.label ?? "RecoverAI"}
          </h1>

          <div className="relative ml-auto hidden w-72 md:block">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions, customers…"
              aria-label="Search"
              className="h-9 bg-canvas pl-9 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const q = (e.target as HTMLInputElement).value;
                  window.location.href = `/transactions?q=${encodeURIComponent(q)}`;
                }
              }}
            />
          </div>

          {/* Backend Status Badge */}
          <div className="ml-auto md:ml-0">
            {healthError ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive-soft px-2.5 py-1 text-xs font-semibold text-destructive">
                <span className="size-1.5 rounded-full bg-destructive animate-ping" />
                Backend Offline
              </span>
            ) : health ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                <span className="size-1.5 rounded-full bg-success" />
                {health.razorpay_mode === "RAZORPAY_TEST" ? "Razorpay Test" : "Demo Mode"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
                Connecting…
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  AD
                </span>
                <span className="hidden text-sm font-semibold sm:inline">
                  Apex Digital Commerce
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-bold">Apex Digital Commerce</p>
                <p className="text-xs font-normal text-muted-foreground">demo-merchant-001</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/demo">Pitch Demo Hub</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">System Diagnostics & Seed</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/audit-trail">Immutable Audit Trail</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
