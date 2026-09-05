import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  ListChecks,
  Receipt,
  Sparkles,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { ChartCard } from "@/components/common/ChartCard";
import { MetricCard } from "@/components/common/MetricCard";
import { LeakDonut, TrendChart } from "@/components/charts/RecoveryCharts";
import { TransactionTable } from "@/components/recovery/TransactionTable";
import { TransactionDetail } from "@/components/recovery/TransactionDetail";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { getDashboardSummary, getRecoveryTrend, getLeakBreakdown } from "@/api/dashboard";
import { getRevenueRiskCases } from "@/api/revenueRisk";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RecoverAI — Autonomous Revenue Recovery Overview" },
      {
        name: "description",
        content:
          "Real-time overview of revenue at risk, estimated recoverable revenue and autonomous AI recovery metrics.",
      },
      { property: "og:title", content: "RecoverAI — Autonomous Revenue Recovery Overview" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  const {
    data: summary,
    isLoading: loadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: getDashboardSummary,
    staleTime: 5000,
  });

  const {
    data: trend,
    isLoading: loadingTrend,
    refetch: refetchTrend,
  } = useQuery({
    queryKey: ["recoveryTrend"],
    queryFn: () => getRecoveryTrend(14),
    staleTime: 10000,
  });

  const {
    data: leaks,
    isLoading: loadingLeaks,
    refetch: refetchLeaks,
  } = useQuery({
    queryKey: ["leakBreakdown"],
    queryFn: getLeakBreakdown,
    staleTime: 10000,
  });

  const {
    data: riskCases,
    isLoading: loadingCases,
    refetch: refetchCases,
  } = useQuery({
    queryKey: ["revenueRiskCases"],
    queryFn: () => getRevenueRiskCases(),
    staleTime: 5000,
  });

  const handleRefetchAll = () => {
    refetchSummary();
    refetchTrend();
    refetchLeaks();
    refetchCases();
  };

  if (loadingSummary && !summary) {
    return (
      <>
        <PageHeader
          title="Revenue Recovery Overview"
          subtitle="Connecting to RecoverAI autonomous backend…"
        />
        <LoadingState rows={6} />
      </>
    );
  }

  if (summaryError) {
    return (
      <ErrorState
        title="Backend Server Offline"
        description="Could not connect to RecoverAI FastAPI backend. Ensure the backend server is running on http://127.0.0.1:8000."
        onRetry={handleRefetchAll}
      />
    );
  }

  const priorityCases = (riskCases || []).slice(0, 5);

  const perf = [
    {
      label: "Total Transactions Tracked",
      value: summary?.total_transactions ?? 0,
      tone: "text-foreground",
    },
    {
      label: "Failed / Leaked Transactions",
      value: summary?.failed_transactions ?? 0,
      tone: "text-destructive",
    },
    {
      label: "Successful Autonomous Recoveries",
      value: summary?.successful_recoveries ?? 0,
      tone: "text-success",
    },
    {
      label: "Escalated / Pending Approval",
      value: summary?.escalated_cases ?? 0,
      tone: "text-warning",
    },
    {
      label: "Failed Recovery Attempts",
      value: summary?.failed_recovery_attempts ?? 0,
      tone: "text-muted-foreground",
    },
  ];

  return (
    <>
      <PageHeader
        title="Overview & Recovery Intelligence"
        subtitle="Real-time autonomous revenue recovery telemetry"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefetchAll}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button asChild>
              <Link to="/recovery-center">
                Open Recovery Center <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Revenue at Risk"
          value={inr(summary?.total_revenue_at_risk || 0)}
          hint="From failed payments, drop-offs & overdue invoices"
          icon={AlertTriangle}
          accent="warning"
        />
        <MetricCard
          label="Estimated Recoverable Revenue"
          value={inr(summary?.estimated_recoverable_revenue || 0)}
          hint={`Avg probability: ${summary?.average_recovery_probability || 0}%`}
          icon={TrendingUp}
          accent="primary"
        />
        <MetricCard
          label="Actual Recovered Revenue"
          value={inr(summary?.actual_recovered_revenue || 0)}
          hint={`Recovery rate: ${summary?.recovery_rate_percentage || 0}%`}
          icon={CheckCircle2}
          accent="success"
        />
        <MetricCard
          label="Active Recovery Cases"
          value={String(summary?.active_recovery_cases || 0)}
          hint="Under autonomous supervision"
          icon={ListChecks}
          accent="primary"
        />
        <MetricCard
          label="Average AI Priority Score"
          value={`${summary?.average_priority_score || 0} / 100`}
          hint="Ranked by expected recovery value"
          icon={Receipt}
        />
        <MetricCard
          label="Human Approval Exceptions"
          value={String(summary?.escalated_cases || 0)}
          hint="Above safety threshold (> ₹10k or low conf)"
          icon={BadgeIndianRupee}
          accent="destructive"
        />
      </div>

      {/* Charts Section */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <ChartCard
          title="Revenue Recovery Trend"
          description="14-day chronological tracking · Revenue at risk vs Recovered"
        >
          {loadingTrend ? <LoadingState rows={3} /> : <TrendChart data={trend || []} />}
        </ChartCard>
        <ChartCard
          title="Revenue Leak Breakdown"
          description="Distribution of revenue at risk across failure categories"
        >
          {loadingLeaks ? <LoadingState rows={3} /> : <LeakDonut data={leaks || []} />}
        </ChartCard>
      </div>

      {/* Performance & Priority Opportunities */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.55fr]">
        <ChartCard
          title="Autonomous Agent Performance"
          description="Live recovery operations throughput"
        >
          <ul className="space-y-3">
            {perf.map((p) => (
              <li
                key={p.label}
                className="flex items-center justify-between rounded-lg border border-border bg-canvas px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{p.label}</span>
                <span className={`num text-base font-semibold ${p.tone}`}>{p.value}</span>
              </li>
            ))}
            <li className="flex items-center justify-between rounded-lg border border-primary/15 bg-primary-soft px-4 py-3">
              <span className="text-sm font-medium text-primary">Average Win Probability</span>
              <span className="num text-lg font-semibold text-primary">
                {summary?.average_recovery_probability || 0}%
              </span>
            </li>
          </ul>
        </ChartCard>

        <ChartCard
          title="Top Priority Recovery Opportunities"
          description="High-yield recovery cases prioritized by expected recovery value"
          bodyClassName="p-0"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/revenue-risk">
                View all cases <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        >
          {loadingCases ? (
            <LoadingState rows={4} />
          ) : priorityCases.length === 0 ? (
            <EmptyState
              title="No active recovery opportunities"
              description="Run a revenue risk scan to discover leaked transactions."
            />
          ) : (
            <TransactionTable
              rows={priorityCases}
              columns={[
                "customer",
                "atRisk",
                "issue",
                "probability",
                "priority",
                "action",
                "recoveryStatus",
              ]}
              onRowClick={setSelectedCase}
            />
          )}
        </ChartCard>
      </div>

      {/* Live Agent Callout */}
      <section className="surface animate-rise mt-6 flex flex-wrap items-center justify-between gap-5 border-primary/20 bg-primary-soft p-6">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> RecoverAI Cognitive Engine
          </p>
          <h3 className="mt-2 text-lg font-semibold">Autonomous Recovery Active</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
            The agent is actively monitoring transactions for payment drops, checkout abandonments,
            and subscription friction. High-confidence actions are executed autonomously under
            strict safety guardrails.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/recovery-center">
            Go to Recovery Center <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>

      {/* Detail drawer when clicking a priority row */}
      {selectedCase ? (
        <TransactionDetail
          tx={selectedCase}
          open={!!selectedCase}
          onOpenChange={(v) => !v && setSelectedCase(null)}
          onApprove={() => {
            setSelectedCase(null);
            handleRefetchAll();
          }}
          onReject={() => {
            setSelectedCase(null);
            handleRefetchAll();
          }}
        />
      ) : null}
    </>
  );
}
