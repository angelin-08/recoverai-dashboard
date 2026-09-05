import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Sparkles,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { ChartCard } from "@/components/common/ChartCard";
import { MetricCard } from "@/components/common/MetricCard";
import { MethodBars, TrendChart } from "@/components/charts/RecoveryCharts";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { getInsights } from "@/api/insights";
import { getDashboardSummary, getRecoveryTrend } from "@/api/dashboard";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "AI Executive Revenue Insights — RecoverAI" },
      {
        name: "description",
        content:
          "AI-synthesized merchant intelligence: largest leakage categories, highest-value recovery opportunities, and strategic action recommendations.",
      },
      { property: "og:title", content: "AI Executive Revenue Insights — RecoverAI" },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const {
    data: insights,
    isLoading: loadingInsights,
    error: insightsError,
    refetch: refetchInsights,
  } = useQuery({
    queryKey: ["aiInsights"],
    queryFn: getInsights,
    staleTime: 10000,
  });

  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: getDashboardSummary,
    staleTime: 10000,
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

  const handleRefresh = () => {
    refetchInsights();
    refetchSummary();
    refetchTrend();
  };

  if (loadingInsights && !insights) {
    return (
      <>
        <PageHeader
          title="AI Revenue Insights"
          subtitle="Synthesizing merchant transaction intelligence…"
        />
        <LoadingState rows={6} />
      </>
    );
  }

  if (insightsError) {
    return (
      <ErrorState
        title="Unable to load AI Insights"
        description="Could not connect to the RecoverAI backend API."
        onRetry={handleRefresh}
      />
    );
  }

  const methodBreakdown = (insights?.payment_method_failure_breakdown || []).map((m: any) => ({
    method: m.category,
    atRisk: m.amount,
    recovered: Math.round(m.amount * 0.6),
  }));

  const highestOpp = insights?.highest_value_recovery_opportunity;

  return (
    <>
      <PageHeader
        title="AI Revenue Insights"
        subtitle="Where revenue is leaking, what is recoverable, and data-backed recommendations."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Live Agent Intelligence
            </span>
          </div>
        }
      />

      {/* Top 2 Highlight Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface animate-rise border-destructive/25 bg-destructive-soft/30 p-6 rounded-xl">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-destructive">
            <TrendingDown className="size-4" /> Largest Revenue Leak
          </p>
          <h2 className="mt-2 text-xl font-bold text-foreground">
            {insights?.largest_revenue_leak_category || "Payment Gateway Drop-offs"}
          </h2>
          <p className="num mt-1 text-3xl font-extrabold text-destructive">
            {inr(insights?.largest_revenue_leak_amount || 0)}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Most common root cause:{" "}
            <span className="font-semibold text-foreground">
              {insights?.most_common_failure_reason || "Gateway Switch Timeout"}
            </span>
          </p>
        </section>

        <section className="surface animate-rise border-success/25 bg-success-soft/30 p-6 rounded-xl">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-success">
            <TrendingUp className="size-4" /> Highest-Value Recovery Opportunity
          </p>
          <h2 className="mt-2 text-xl font-bold text-foreground">
            {highestOpp
              ? `${highestOpp.customer_name} (${inr(highestOpp.amount)})`
              : "High-Value Staged Recoveries"}
          </h2>
          <p className="num mt-1 text-3xl font-extrabold text-success">
            {inr(highestOpp?.estimated_recoverable || highestOpp?.amount || 0)}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Win Probability:{" "}
            <span className="font-semibold text-foreground">
              {highestOpp?.recovery_probability || 85}%
            </span>{" "}
            · Action:{" "}
            <span className="font-semibold text-foreground">
              {(highestOpp?.recommended_action || "PAYMENT_RECOVERY_LINK").replace(/_/g, " ")}
            </span>
          </p>
        </section>
      </div>

      {/* KPI Cards */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Recovery Rate"
          value={`${summary?.recovery_rate_percentage || 0}%`}
          hint="Of addressable revenue"
          accent="success"
        />
        <MetricCard
          label="Actual Recovered"
          value={inr(summary?.actual_recovered_revenue || 0)}
          hint="Settled back to merchant"
          accent="primary"
        />
        <MetricCard
          label="Average Win Probability"
          value={`${summary?.average_recovery_probability || 0}%`}
          hint="Across active cases"
        />
        <MetricCard
          label="Exceptions Under Review"
          value={String(summary?.escalated_cases || 0)}
          hint="Requiring human authorization"
          accent="warning"
        />
      </div>

      {/* Visual Analytics */}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Recovery Performance History"
          description="14-day daily recovery trajectory"
        >
          <TrendChart data={trend || []} />
        </ChartCard>
        <ChartCard
          title="Payment Method Leak Breakdown"
          description="Revenue at risk distributed by payment method"
        >
          <MethodBars data={methodBreakdown} />
        </ChartCard>
      </div>

      {/* AI Recommendations */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">
            Data-Driven AI Executive Recommendations
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Generated in real-time from aggregate merchant transaction failure patterns and cognitive
          recovery win rates.
        </p>

        <div className="grid gap-4 lg:grid-cols-3">
          {(insights?.ai_recommendations || []).map((rec: string, idx: number) => (
            <article
              key={idx}
              className="surface animate-rise flex flex-col p-5 rounded-xl border border-primary/20 bg-card hover:shadow-raised transition-shadow"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary font-bold text-sm">
                #{idx + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">Optimization Directive</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">{rec}</p>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="mt-4 -ml-2 self-start text-primary"
              >
                <Link to="/recovery-center">
                  Execute in Recovery Center <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
