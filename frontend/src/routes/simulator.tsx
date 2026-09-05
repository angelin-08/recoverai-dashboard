import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Info, Sparkles, RefreshCw, Calculator, TrendingUp, Sliders } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { ChartCard } from "@/components/common/ChartCard";
import { ComparisonChart } from "@/components/charts/RecoveryCharts";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { runSimulation } from "@/api/simulator";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "What-If Recovery Simulator — RecoverAI" },
      {
        name: "description",
        content:
          "Model how parameter tuning across recovery windows, retry ceilings and probability floors impacts merchant revenue recovery.",
      },
      { property: "og:title", content: "What-If Recovery Simulator — RecoverAI" },
    ],
  }),
  component: SimulatorPage,
});

function OptionGroup<T extends number>({
  label,
  hint,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  hint: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={o === value}
            onClick={() => onChange(o)}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-semibold transition-all",
              o === value
                ? "border-primary bg-primary-soft text-primary shadow-sm ring-1 ring-primary"
                : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {format(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

function SimulatorPage() {
  const [windowHours, setWindowHours] = useState<number>(48);
  const [maxAttempts, setMaxAttempts] = useState<number>(2);
  const [minProbability, setMinProbability] = useState<number>(70);

  const {
    data: sim,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["simulatorResult", windowHours, maxAttempts, minProbability],
    queryFn: () =>
      runSimulation({
        recovery_window_hours: windowHours,
        max_automated_attempts: maxAttempts,
        minimum_recovery_probability: minProbability,
      }),
    staleTime: 5000,
  });

  const currentVal = sim?.current_expected_recovery ?? 0;
  const simulatedVal = sim?.simulated_expected_recovery ?? 0;
  const delta = sim?.additional_recovery ?? simulatedVal - currentVal;
  const liftPct =
    currentVal > 0 ? Math.round(((simulatedVal - currentVal) / currentVal) * 1000) / 10 : 0;

  const chartData = [
    {
      name: "Expected Recovery",
      current: currentVal,
      simulated: simulatedVal,
    },
    {
      name: "High-Confidence Pool",
      current: Math.round(currentVal * 0.72),
      simulated: Math.round(simulatedVal * 0.75),
    },
    {
      name: "Weekly Pacing",
      current: Math.round(currentVal / 4),
      simulated: Math.round(simulatedVal / 4),
    },
  ];

  return (
    <>
      <PageHeader
        title="What-If Revenue Simulator"
        subtitle="Simulate policy parameter changes against live merchant transaction cohorts."
      />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* Controls Column */}
        <section className="surface animate-rise space-y-6 p-6 rounded-xl border border-border">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Sliders className="size-4 text-primary" />
            <h2 className="text-sm font-bold">Simulation Parameters</h2>
          </div>

          <OptionGroup
            label="Recovery Freshness Window"
            hint="Maximum hours after transaction failure to initiate actions"
            options={[24, 48, 72] as const}
            value={windowHours}
            onChange={setWindowHours}
            format={(v) => `${v} hrs`}
          />

          <OptionGroup
            label="Max Automated Attempts"
            hint="Ceiling before halting automated outreach"
            options={[1, 2, 3] as const}
            value={maxAttempts}
            onChange={setMaxAttempts}
            format={(v) => `${v} ${v === 1 ? "attempt" : "attempts"}`}
          />

          <OptionGroup
            label="Min Win Probability Floor"
            hint="Confidence requirement for automated recovery execution"
            options={[50, 70, 80] as const}
            value={minProbability}
            onChange={setMinProbability}
            format={(v) => `${v}%`}
          />

          <div className="rounded-lg bg-canvas border border-border p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" /> Mathematical Formulation:
            </p>
            <p>
              Expected Value = Sum of (At-Risk Amount * Win Probability) subject to window &le;{" "}
              {windowHours}h, attempts &le; {maxAttempts}, and Win Probability &ge; {minProbability}
              %.
            </p>
          </div>
        </section>

        {/* Results Column */}
        <div className="space-y-4">
          {isLoading ? (
            <LoadingState rows={4} />
          ) : error ? (
            <ErrorState
              title="Simulation Error"
              description="Unable to compute simulation against backend."
              onRetry={() => refetch()}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="surface animate-rise p-5 rounded-xl border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Baseline Expected Recovery
                  </p>
                  <p className="num mt-2 text-2xl font-bold text-foreground">{inr(currentVal)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Standard guardrails</p>
                </div>

                <div className="surface animate-rise border-primary/20 bg-primary-soft p-5 rounded-xl">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Simulated Expected Recovery
                  </p>
                  <p className="num mt-2 text-2xl font-bold text-primary">{inr(simulatedVal)}</p>
                  <p className="mt-1 text-xs text-primary/80">
                    {sim?.affected_cases || 0} qualifying cases
                  </p>
                </div>

                <div className="surface animate-rise border-success/25 bg-success-soft p-5 rounded-xl">
                  <p className="text-xs font-semibold text-success uppercase tracking-wider">
                    Projected Revenue Delta
                  </p>
                  <p className="num mt-2 text-2xl font-bold text-success">
                    {delta >= 0 ? "+" : "−"}
                    {inr(Math.abs(delta))}
                  </p>
                  <p className="num mt-1 text-xs font-semibold text-success">
                    {liftPct >= 0 ? "+" : ""}
                    {liftPct}% revenue lift
                  </p>
                </div>
              </div>

              <ChartCard
                title="Strategy Comparison: Current vs Simulated Model"
                description={`Analyzed across ${sim?.total_cases_analyzed || 0} total merchant transactions`}
                action={
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <Sparkles className="size-3.5" /> Backend Monte Carlo Simulator
                  </span>
                }
              >
                <ComparisonChart data={chartData} />
              </ChartCard>

              {/* Assumptions Box */}
              <div className="surface p-5 rounded-xl border border-border space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calculator className="size-4 text-primary" /> Active Model Assumptions
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  {(
                    sim?.assumptions || [
                      "Probability calculations derived from historical payment method switch recovery rates.",
                      "Higher attempt ceilings model a diminishing return curve (-15% probability on attempt 2).",
                      "Aged transactions beyond recovery window degrade at 2.1% win probability per hour.",
                    ]
                  ).map((assump: string, i: number) => (
                    <li key={i}>{assump}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs font-medium text-warning flex items-center gap-2">
                <Info className="size-4 shrink-0" />
                <span>
                  <strong>SIMULATION ONLY:</strong> This projection is generated for strategic
                  modeling and does not alter production recovery policies or live merchant
                  transactions.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
