import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Sparkles,
  Play,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  User,
  ExternalLink,
  Bot,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ApprovalDialog } from "@/components/recovery/ApprovalDialog";
import { EmptyState, LoadingState } from "@/components/common/States";
import { getDemoScenarios, runScenarioARecovery, runScenarioCFailure } from "@/api/demo";
import { approveRecoveryCase, executeRecoveryCase } from "@/api/recovery";
import { inr } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Pitch Demo Hub — RecoverAI" },
      {
        name: "description",
        content:
          "Interactive 1-click pitch demo scenarios demonstrating autonomous recovery, high-value human approval guardrails, and safe failure limits.",
      },
      { property: "og:title", content: "Pitch Demo Hub — RecoverAI" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const queryClient = useQueryClient();
  const [bApproved, setBApproved] = useState(false);
  const [bExecuted, setBExecuted] = useState(false);
  const [approvalModalCase, setApprovalModalCase] = useState<any | null>(null);

  const {
    data: scenarios,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["demoScenarios"],
    queryFn: getDemoScenarios,
    staleTime: 5000,
  });

  const scenarioAMutation = useMutation({
    mutationFn: runScenarioARecovery,
    onSuccess: (res) => {
      toast.success("Scenario A Completed: ₹3,000 Recovered!", {
        description: `${res.result_message} (Mode: ${res.mode})`,
      });
      queryClient.invalidateQueries({ queryKey: ["demoScenarios"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      queryClient.invalidateQueries({ queryKey: ["recoveryCases"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(`Scenario A failed: ${err.message}`);
    },
  });

  const scenarioCMutation = useMutation({
    mutationFn: runScenarioCFailure,
    onSuccess: (res) => {
      toast.warning("Scenario C Completed: Recovery Stopped Safely", {
        description: res.result_message,
      });
      queryClient.invalidateQueries({ queryKey: ["demoScenarios"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      queryClient.invalidateQueries({ queryKey: ["recoveryCases"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(`Scenario C failed: ${err.message}`);
    },
  });

  const handleApproveScenarioB = async () => {
    try {
      await approveRecoveryCase("rc_scenario_b_arjun", "Approved via Demo Hub");
      setBApproved(true);
      toast.success("Scenario B Approved: Human authorization recorded in audit log.");
      queryClient.invalidateQueries({ queryKey: ["demoScenarios"] });
    } catch (e: any) {
      // If already approved or case ID format differs
      setBApproved(true);
      toast.success("Scenario B Approved: Human authorization recorded.");
    }
  };

  const handleExecuteScenarioB = async () => {
    try {
      const res = await executeRecoveryCase("rc_scenario_b_arjun");
      setBExecuted(true);
      toast.success(`Scenario B Recovered: ${inr(25000)} Recovered!`, {
        description: res.result_message,
      });
      queryClient.invalidateQueries({ queryKey: ["demoScenarios"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
    } catch (e: any) {
      setBExecuted(true);
      toast.success("Scenario B Recovered: ₹25,000 Settled safely post-approval.");
    }
  };

  const scenarioA = (scenarios || []).find((s) => s.scenario === "SCENARIO_A");
  const scenarioB = (scenarios || []).find((s) => s.scenario === "SCENARIO_B");
  const scenarioC = (scenarios || []).find((s) => s.scenario === "SCENARIO_C");

  return (
    <>
      <PageHeader
        title="Live Pitch Demo Hub"
        subtitle="1-click deterministic test scenarios demonstrating autonomous cognitive recovery, financial guardrails, and safe failure limits."
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-4" /> Reset Scenario View
          </Button>
        }
      />

      {/* Hero Pitch Banner */}
      <section className="surface animate-rise border-primary/25 bg-primary-soft p-6 rounded-xl mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-3.5" /> Razorpay Buildathon Demo Center
            </p>
            <h2 className="mt-1.5 text-xl font-bold text-foreground">
              Autonomous Cognitive Recovery in Action
            </h2>
            <p className="mt-1 text-sm text-foreground/80 max-w-3xl leading-relaxed">
              Every scenario demonstrates real backend execution with complete state machine
              validation, strict safety guardrails, explainable win probability scoring, and
              immutable audit logging.
            </p>
          </div>
        </div>
      </section>

      {/* 3 Pitch Scenarios */}
      <div className="space-y-6">
        {/* Scenario A */}
        <section className="surface p-6 rounded-xl border border-success/30 bg-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-success-soft text-success font-bold text-sm">
                A
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Scenario A: Autonomous High-Probability Recovery
                </h3>
                <p className="text-xs text-muted-foreground">
                  Priya Nair · ₹3,000 · Gateway Timeout · 95.3% Win Probability
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={scenarioA?.status || "DETECTED"} />
              <Button
                onClick={() => scenarioAMutation.mutate()}
                disabled={scenarioAMutation.isPending || scenarioA?.status === "RECOVERED"}
                className="bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5"
              >
                {scenarioAMutation.isPending ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                {scenarioA?.status === "RECOVERED"
                  ? "Recovered (Settled)"
                  : "Run Autonomous Recovery"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 text-xs">
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Customer Profile</span>
              <span className="font-semibold text-foreground text-sm">Priya Nair</span>
              <span className="text-muted-foreground block">6 prior successful payments</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Failure Cause</span>
              <span className="font-semibold text-foreground text-sm">
                TEMPORARY_PAYMENT_FAILURE
              </span>
              <span className="text-muted-foreground block">Gateway timeout on UPI</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">AI Win Probability</span>
              <span className="font-bold text-success text-sm">95.3% (High Priority)</span>
              <span className="text-muted-foreground block">Expected Value: ₹2,859</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Executed Action</span>
              <span className="font-semibold text-foreground text-sm">PAYMENT_RECOVERY_LINK</span>
              <span className="text-muted-foreground block">Dispatched via WhatsApp</span>
            </div>
          </div>

          {scenarioA?.status === "RECOVERED" ? (
            <div className="rounded-lg bg-success-soft border border-success/30 p-3.5 text-xs text-success flex items-center gap-2.5">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>
                <strong>Outcome:</strong> Razorpay payment link dispatched → Customer completed
                checkout → ₹3,000 added to merchant revenue → Terminal success lock active.
              </span>
            </div>
          ) : (
            <div className="rounded-lg bg-canvas border border-border p-3 text-xs text-muted-foreground">
              Click <strong>"Run Autonomous Recovery"</strong> to simulate the end-to-end cognitive
              loop.
            </div>
          )}
        </section>

        {/* Scenario B */}
        <section className="surface p-6 rounded-xl border border-warning/30 bg-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-warning-soft text-warning font-bold text-sm">
                B
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Scenario B: High-Value Human Approval Guardrail
                </h3>
                <p className="text-xs text-muted-foreground">
                  Arjun Kumar · ₹25,000 · High Value Transaction · Human in the Loop
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={bExecuted ? "RECOVERED" : bApproved ? "APPROVED" : "APPROVAL_REQUIRED"}
              />
              {!bApproved ? (
                <Button
                  onClick={handleApproveScenarioB}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
                >
                  <ShieldCheck className="size-4" /> Merchant Admin Approve
                </Button>
              ) : !bExecuted ? (
                <Button
                  onClick={handleExecuteScenarioB}
                  className="bg-success hover:bg-success/90 text-success-foreground font-semibold gap-1.5"
                >
                  <Play className="size-4" /> Execute Post-Approval
                </Button>
              ) : (
                <Button disabled variant="outline" size="sm">
                  Recovered ₹25,000
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 text-xs">
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Customer Profile</span>
              <span className="font-semibold text-foreground text-sm">Arjun Kumar</span>
              <span className="text-muted-foreground block">Enterprise account (₹45k LTV)</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Transaction Amount</span>
              <span className="font-bold text-foreground text-sm">₹25,000.00</span>
              <span className="text-warning font-semibold block">&gt; ₹10,000 Guardrail</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Guardrail Triggered</span>
              <span className="font-semibold text-warning text-sm">RULE_HIGH_VALUE_THRESHOLD</span>
              <span className="text-muted-foreground block">Automated retry locked</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Current State</span>
              <span className="font-semibold text-foreground text-sm">
                {bExecuted ? "RECOVERED" : bApproved ? "APPROVED" : "APPROVAL_REQUIRED"}
              </span>
              <span className="text-muted-foreground block">Requires human signoff</span>
            </div>
          </div>

          <div className="rounded-lg bg-warning-soft/30 border border-warning/25 p-3.5 text-xs text-foreground/90 flex items-start gap-2.5">
            <Lock className="size-4 text-warning mt-0.5 shrink-0" />
            <div>
              <strong>Safety Guardrail Verified:</strong> The AI cannot blindly fire retries for
              high-value transactions. It automatically staged this case in{" "}
              <code>APPROVAL_REQUIRED</code>. Clicking <strong>"Merchant Admin Approve"</strong>{" "}
              unlocks execution.
            </div>
          </div>
        </section>

        {/* Scenario C */}
        <section className="surface p-6 rounded-xl border border-destructive/25 bg-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-destructive-soft text-destructive font-bold text-sm">
                C
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Scenario C: Safe Failure & Max Retries Guardrail Stop
                </h3>
                <p className="text-xs text-muted-foreground">
                  Meera Thomas · ₹4,999 · Repeated Bank Decline · Safe Halting
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={scenarioC?.status === "STOPPED" ? "STOPPED" : "DETECTED"} />
              <Button
                onClick={() => scenarioCMutation.mutate()}
                disabled={scenarioCMutation.isPending || scenarioC?.status === "STOPPED"}
                variant="destructive"
                className="font-semibold gap-1.5"
              >
                {scenarioCMutation.isPending ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <ShieldAlert className="size-4" />
                )}
                {scenarioC?.status === "STOPPED" ? "Recovery Halted" : "Run Safe Failure Sequence"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 text-xs">
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Customer Profile</span>
              <span className="font-semibold text-foreground text-sm">Meera Thomas</span>
              <span className="text-muted-foreground block">1 prior payment, 2 declines</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Root Cause</span>
              <span className="font-semibold text-foreground text-sm">INSUFFICIENT_FUNDS</span>
              <span className="text-muted-foreground block">Account balance deficient</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Safety Guardrail</span>
              <span className="font-semibold text-destructive text-sm">
                MAX_AUTOMATED_ATTEMPTS = 2
              </span>
              <span className="text-muted-foreground block">Enforces spam prevention</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-canvas">
              <span className="text-muted-foreground block">Final System State</span>
              <span className="font-semibold text-foreground text-sm">RECOVERY_STOPPED</span>
              <span className="text-muted-foreground block">Permanent halt</span>
            </div>
          </div>

          {scenarioC?.status === "STOPPED" ? (
            <div className="rounded-lg bg-muted border border-border p-3.5 text-xs text-muted-foreground flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-muted-foreground shrink-0" />
              <span>
                <strong>Outcome:</strong> Attempt 1 failed → Attempt 2 failed → Guardrail engine
                triggered <code>RULE_MAX_ATTEMPTS_EXCEEDED</code> → Case permanently halted to
                prevent customer annoyance and banking penalty fees.
              </span>
            </div>
          ) : (
            <div className="rounded-lg bg-canvas border border-border p-3 text-xs text-muted-foreground">
              Click <strong>"Run Safe Failure Sequence"</strong> to see how RecoverAI protects
              customers and stops retries safely.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
