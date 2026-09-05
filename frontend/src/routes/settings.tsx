import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Settings,
  Database,
  RefreshCw,
  Server,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { triggerSeed } from "@/api/seed";
import { checkHealth } from "@/api/health";
import { inr } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Merchant Settings & Data Controls — RecoverAI" },
      { property: "og:title", content: "Merchant Settings & Data Controls — RecoverAI" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();

  const {
    data: health,
    isLoading: loadingHealth,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ["backendHealth"],
    queryFn: checkHealth,
  });

  const seedMutation = useMutation({
    mutationFn: triggerSeed,
    onSuccess: (res) => {
      toast.success("Database Re-Seeded Successfully!", {
        description: `Seeded ${res.transactions} transactions, ${res.customers} customers, and ${res.recovery_cases} recovery cases (${inr(res.revenue_at_risk)} at risk).`,
      });
      queryClient.invalidateQueries();
      refetchHealth();
    },
    onError: (err: any) => {
      toast.error(`Seeding failed: ${err.message}`);
    },
  });

  return (
    <>
      <PageHeader
        title="Settings & System Diagnostics"
        subtitle="Configure recovery thresholds, inspect backend runtime status, and reset development datasets."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Backend Runtime Diagnostics */}
        <section className="surface p-6 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Server className="size-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Backend Service Health</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchHealth()}>
              <RefreshCw className="size-3.5 mr-1" /> Check
            </Button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border/60">
              <span className="text-muted-foreground">API Status:</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success-soft px-2.5 py-0.5 rounded-full border border-success/20">
                <CheckCircle2 className="size-3" /> {health?.status || "Online"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/60">
              <span className="text-muted-foreground">Service Name:</span>
              <span className="font-mono text-xs font-semibold">
                {health?.service || "RecoverAI"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/60">
              <span className="text-muted-foreground">AI Reasoning Engine:</span>
              <span className="font-semibold text-primary">
                {health?.ai_mode === "OPENAI"
                  ? "OpenAI GPT-4o-mini"
                  : "Deterministic Rule AI Engine"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/60">
              <span className="text-muted-foreground">Payment Gateway Mode:</span>
              <span className="font-semibold text-warning">
                {health?.razorpay_mode === "RAZORPAY_TEST"
                  ? "Razorpay Test API"
                  : "Deterministic DEMO Mode"}
              </span>
            </div>
          </div>
        </section>

        {/* Database Seeder */}
        <section className="surface p-6 rounded-xl border border-border space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Database className="size-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Dataset Reset & Seeder</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Re-seed the local SQLite database with 105 synthetic customers, 264 realistic
            transactions, and the 3 deterministic pitch demo scenarios (Priya Nair, Arjun Kumar,
            Meera Thomas).
          </p>

          <div className="pt-2">
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {seedMutation.isPending ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Database className="size-4" />
              )}
              {seedMutation.isPending
                ? "Seeding Database…"
                : "Re-Seed Synthetic Transaction Database"}
            </Button>
          </div>
        </section>
      </div>

      {/* Safety Guardrails Configuration Summary */}
      <section className="surface p-6 rounded-xl border border-border mt-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Enforced Production Guardrails</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="p-4 rounded-lg border border-border bg-canvas">
            <span className="text-muted-foreground block">Max Automated Retries</span>
            <span className="font-bold text-foreground text-base mt-1 block">2 Attempts</span>
            <span className="text-muted-foreground">Stops automatically on attempt 2 fail</span>
          </div>
          <div className="p-4 rounded-lg border border-border bg-canvas">
            <span className="text-muted-foreground block">Human Approval Threshold</span>
            <span className="font-bold text-warning text-base mt-1 block">₹10,000</span>
            <span className="text-muted-foreground">
              Transactions &gt; ₹10k require merchant signoff
            </span>
          </div>
          <div className="p-4 rounded-lg border border-border bg-canvas">
            <span className="text-muted-foreground block">Min Confidence Floor</span>
            <span className="font-bold text-foreground text-base mt-1 block">70.0%</span>
            <span className="text-muted-foreground">Low confidence routes to human review</span>
          </div>
          <div className="p-4 rounded-lg border border-border bg-canvas">
            <span className="text-muted-foreground block">Recovery Freshness Window</span>
            <span className="font-bold text-foreground text-base mt-1 block">48 Hours</span>
            <span className="text-muted-foreground">Aged transactions escalate to concierge</span>
          </div>
        </div>
      </section>
    </>
  );
}
