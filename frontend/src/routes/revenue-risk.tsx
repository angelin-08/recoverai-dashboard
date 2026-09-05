import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  TrendingUp,
  ScanSearch,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { FilterBar } from "@/components/common/FilterBar";
import { MetricCard } from "@/components/common/MetricCard";
import { TransactionDetail } from "@/components/recovery/TransactionDetail";
import { TransactionTable } from "@/components/recovery/TransactionTable";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { getRevenueRiskCases, getRevenueRiskSummary, scanAndAnalyzeRisks } from "@/api/revenueRisk";
import { inr } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/revenue-risk")({
  head: () => ({
    meta: [
      { title: "Revenue Risk Engine — RecoverAI" },
      {
        name: "description",
        content:
          "Identify and prioritize revenue leakage opportunities with root-cause diagnosis, win probability and priority scores.",
      },
      { property: "og:title", content: "Revenue Risk Engine — RecoverAI" },
    ],
  }),
  component: RevenueRiskPage,
});

const FILTERS = [
  { value: "all", label: "All Cases" },
  { value: "DETECTED", label: "Detected" },
  { value: "ANALYZED", label: "Diagnosed" },
  { value: "APPROVAL_REQUIRED", label: "Approval Required" },
  { value: "RECOVERED", label: "Recovered" },
  { value: "high_priority", label: "High Priority (≥75)" },
];

function RevenueRiskPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const {
    data: cases,
    isLoading: loadingCases,
    error: casesError,
    refetch: refetchCases,
  } = useQuery({
    queryKey: ["revenueRiskCases"],
    queryFn: () => getRevenueRiskCases(),
    staleTime: 5000,
  });

  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["revenueRiskSummary"],
    queryFn: getRevenueRiskSummary,
    staleTime: 5000,
  });

  const scanMutation = useMutation({
    mutationFn: scanAndAnalyzeRisks,
    onSuccess: (newCases) => {
      toast.success(
        `Revenue Risk Scan Complete: ${newCases.length} actionable leakage cases analyzed.`,
      );
      queryClient.invalidateQueries({ queryKey: ["revenueRiskCases"] });
      queryClient.invalidateQueries({ queryKey: ["revenueRiskSummary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to scan transaction stream for revenue leaks.");
    },
  });

  const allCases = cases || [];

  const rows = useMemo(() => {
    return allCases.filter((c: any) => {
      if (filter === "high_priority" && (c.priority_score || 0) < 75) return false;
      if (filter !== "all" && filter !== "high_priority" && c.status !== filter) return false;

      const q = search.trim().toLowerCase();
      if (q) {
        const custName = c.transaction?.customer?.name || "";
        const txnId = c.transaction?.external_transaction_id || c.transaction_id || "";
        const rootCause = c.root_cause || "";
        const reason = c.transaction?.failure_reason || "";
        const full = `${custName} ${txnId} ${rootCause} ${reason}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [allCases, filter, search]);

  const totalAtRisk =
    summary?.total_revenue_at_risk ?? rows.reduce((s, c) => s + (c.revenue_at_risk || 0), 0);
  const totalRecoverable =
    summary?.estimated_recoverable_revenue ??
    rows.reduce((s, c) => s + (c.estimated_recoverable_amount || 0), 0);
  const highPriorityCount = allCases.filter((c: any) => (c.priority_score || 0) >= 75).length;
  const approvalRequiredCount = allCases.filter(
    (c: any) => c.status === "APPROVAL_REQUIRED",
  ).length;

  const options = FILTERS.map((f) => {
    let count = 0;
    if (f.value === "all") count = allCases.length;
    else if (f.value === "high_priority") count = highPriorityCount;
    else count = allCases.filter((c: any) => c.status === f.value).length;
    return { ...f, count };
  });

  return (
    <>
      <PageHeader
        title="Revenue Risk Scanner"
        subtitle="Identify, diagnose, and prioritize active revenue leakage opportunities."
        action={
          <div className="flex items-center gap-2">
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
            <Button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="gap-2"
            >
              {scanMutation.isPending ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <ScanSearch className="size-4" />
              )}
              {scanMutation.isPending ? "Scanning Stream…" : "Scan for Revenue Leaks"}
            </Button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Revenue at Risk"
          value={inr(totalAtRisk)}
          hint={`${allCases.length} identified leak cases`}
          icon={AlertTriangle}
          accent="warning"
        />
        <MetricCard
          label="High Priority Cases"
          value={String(highPriorityCount)}
          hint="Priority score ≥ 75 / 100"
          icon={ArrowUpRight}
          accent="destructive"
        />
        <MetricCard
          label="Estimated Recoverable"
          value={inr(totalRecoverable)}
          hint={
            totalAtRisk
              ? `${Math.round((totalRecoverable / totalAtRisk) * 100)}% recoverable opportunity`
              : "—"
          }
          icon={TrendingUp}
          accent="success"
        />
        <MetricCard
          label="Approval Exceptions"
          value={String(approvalRequiredCount)}
          hint="Awaiting Merchant Admin review"
          icon={ShieldAlert}
          accent="primary"
        />
      </div>

      {/* Main Table Card */}
      <div className="surface mt-6">
        <div className="border-b border-border p-4">
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search customer, transaction, root cause…"
            options={options}
            active={filter}
            onSelectFilter={setFilter}
          />
        </div>

        {loadingCases ? (
          <LoadingState rows={8} />
        ) : casesError ? (
          <ErrorState
            title="Unable to load revenue risk cases"
            description="Could not connect to the backend server. Please verify backend status."
            onRetry={() => refetchCases()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No matching revenue risk cases"
            description="Try changing the filter options or run a fresh scan of the transaction stream."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
              >
                <ScanSearch className="size-4 mr-1.5" /> Scan Transaction Stream
              </Button>
            }
          />
        ) : (
          <TransactionTable
            rows={rows}
            columns={[
              "customer",
              "id",
              "atRisk",
              "issue",
              "rootCause",
              "probability",
              "priority",
              "action",
              "recoveryStatus",
            ]}
            onRowClick={setSelected}
          />
        )}
      </div>

      {/* Case Detail Drawer */}
      {selected ? (
        <TransactionDetail
          tx={selected}
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
          onApprove={() => {
            setSelected(null);
            refetchCases();
            refetchSummary();
          }}
          onReject={() => {
            setSelected(null);
            refetchCases();
            refetchSummary();
          }}
        />
      ) : null}
    </>
  );
}
