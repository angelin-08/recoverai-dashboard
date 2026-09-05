import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ListChecks,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { FilterBar } from "@/components/common/FilterBar";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { ApprovalDialog } from "@/components/recovery/ApprovalDialog";
import { RecoveryCaseCard } from "@/components/recovery/RecoveryCaseCard";
import { TransactionDetail } from "@/components/recovery/TransactionDetail";
import { Button } from "@/components/ui/button";
import { getRecoveryCases, executeRecoveryCase, analyzeRecoveryCase } from "@/api/recovery";
import { getDashboardSummary } from "@/api/dashboard";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/recovery-center")({
  head: () => ({
    meta: [
      { title: "AI Recovery Operations Center — RecoverAI" },
      {
        name: "description",
        content:
          "Autonomous recovery command center. Supervise AI diagnoses, approve high-value exceptions, execute guardrailed actions, and track recovery rates.",
      },
      { property: "og:title", content: "AI Recovery Operations Center — RecoverAI" },
    ],
  }),
  component: RecoveryCenterPage,
});

const TABS = [
  { value: "all", label: "All Cases" },
  { value: "APPROVAL_REQUIRED", label: "Needs Approval" },
  { value: "READY", label: "Ready to Recover" },
  { value: "ANALYZED", label: "Diagnosed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RECOVERED", label: "Recovered" },
  { value: "STOPPED", label: "Stopped Safely" },
];

function RecoveryCenterPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ caseItem: any; mode: "approve" | "reject" } | null>(null);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  const {
    data: cases,
    isLoading: loadingCases,
    error: casesError,
    refetch: refetchCases,
  } = useQuery({
    queryKey: ["recoveryCases"],
    queryFn: () => getRecoveryCases(),
    staleTime: 5000,
  });

  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: getDashboardSummary,
    staleTime: 5000,
  });

  const allCases = cases || [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCases.filter((c: any) => {
      if (tab !== "all" && c.status !== tab) return false;
      if (q) {
        const custName = c.transaction?.customer?.name || "";
        const txnId = c.transaction?.external_transaction_id || c.transaction_id || "";
        const action = c.recommended_action || "";
        const root = c.root_cause || "";
        const full = `${custName} ${txnId} ${action} ${root}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [allCases, tab, search]);

  const options = TABS.map((t) => ({
    ...t,
    count:
      t.value === "all"
        ? allCases.length
        : allCases.filter((c: any) => c.status === t.value).length,
  }));

  const estimatedRecoverable =
    summary?.estimated_recoverable_revenue ??
    allCases.reduce((s, c: any) => s + (c.estimated_recoverable_amount || 0), 0);
  const avgProb =
    summary?.average_recovery_probability ??
    (allCases.length
      ? Math.round(
          allCases.reduce((s, c: any) => s + (c.recovery_probability || 0), 0) / allCases.length,
        )
      : 0);

  const readyCount = allCases.filter(
    (c: any) => c.status === "READY" || c.status === "ANALYZED" || c.status === "APPROVED",
  ).length;
  const approvalCount = allCases.filter((c: any) => c.status === "APPROVAL_REQUIRED").length;
  const recoveredCount = allCases.filter((c: any) => c.status === "RECOVERED").length;

  return (
    <>
      <PageHeader
        title="AI Recovery Operations Center"
        subtitle="Supervise autonomous cognitive recovery cases and approve financial exceptions."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchCases();
              refetchSummary();
            }}
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />

      {/* Hero KPI Band */}
      <section className="surface animate-rise flex flex-wrap items-center justify-between gap-6 border-primary/20 bg-primary-soft p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Autonomous Recovery Pipeline
          </p>
          <p className="num mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {inr(estimatedRecoverable)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Across {allCases.length} recovery cases · average win probability {avgProb}%
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Ready / Approved</dt>
            <dd className="num text-xl font-bold text-foreground">{readyCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Needs Approval</dt>
            <dd className="num text-xl font-bold text-warning">{approvalCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Recovered (Settled)</dt>
            <dd className="num text-xl font-bold text-success">{recoveredCount}</dd>
          </div>
        </dl>
      </section>

      {/* Filter Tabs */}
      <FilterBar
        className="mt-6"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search cases by customer, transaction ID, or recommended action…"
        options={options}
        active={tab}
        onSelectFilter={setTab}
      />

      {/* Grid of Recovery Cards */}
      {loadingCases ? (
        <div className="mt-5">
          <LoadingState rows={6} />
        </div>
      ) : casesError ? (
        <div className="mt-5">
          <ErrorState
            title="Failed to load recovery cases"
            description="Unable to connect to backend server. Make sure RecoverAI FastAPI server is running."
            onRetry={() => refetchCases()}
          />
        </div>
      ) : rows.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((caseItem: any) => (
            <RecoveryCaseCard
              key={caseItem.id}
              tx={caseItem}
              onApprove={(c) => setDialog({ caseItem: c, mode: "approve" })}
              onReject={(c) => setDialog({ caseItem: c, mode: "reject" })}
              onViewDetails={(c) => setSelectedCase(c)}
            />
          ))}
        </div>
      ) : (
        <div className="surface mt-5">
          <EmptyState
            title="No recovery cases in this category"
            description="Switch filter tabs or scan the transaction stream for new leakage opportunities."
          />
        </div>
      )}

      {/* Approval Modal */}
      <ApprovalDialog
        recoveryCase={dialog?.caseItem ?? null}
        mode={dialog?.mode ?? "approve"}
        open={!!dialog}
        onOpenChange={(v) => !v && setDialog(null)}
        onSuccess={() => {
          refetchCases();
          refetchSummary();
        }}
      />

      {/* Case Detailed Inspection Drawer */}
      {selectedCase ? (
        <TransactionDetail
          tx={selectedCase}
          open={!!selectedCase}
          onOpenChange={(v) => !v && setSelectedCase(null)}
          onApprove={() => {
            setSelectedCase(null);
            refetchCases();
            refetchSummary();
          }}
          onReject={() => {
            setSelectedCase(null);
            refetchCases();
            refetchSummary();
          }}
        />
      ) : null}
    </>
  );
}
