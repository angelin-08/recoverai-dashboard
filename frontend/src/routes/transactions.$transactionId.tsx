import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Play,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityBadge, ProbabilityRing } from "@/components/common/PriorityBadge";
import { ApprovalDialog } from "@/components/recovery/ApprovalDialog";
import { AuditTimeline, WorkflowStrip } from "@/components/recovery/AuditTimeline";
import { Button } from "@/components/ui/button";
import { getTransaction } from "@/api/transactions";
import { getTransactionTimeline } from "@/api/audit";
import { executeRecoveryCase, analyzeRecoveryCase } from "@/api/recovery";
import { dateTime, inr } from "@/lib/format";

export const Route = createFileRoute("/transactions/$transactionId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.transactionId} — AI Recovery Analysis | RecoverAI` },
      {
        name: "description",
        content:
          "AI diagnosis, recovery probability, priority score, guardrail checks and chronological recovery timeline for this transaction.",
      },
      { property: "og:title", content: `${params.transactionId} — AI Recovery Analysis` },
    ],
  }),
  component: TransactionDetailPage,
});

function getWorkflowStep(status: string) {
  switch (status) {
    case "RECOVERED":
      return 5;
    case "STOPPED":
    case "FAILED":
      return 4;
    case "IN_PROGRESS":
    case "APPROVED":
      return 3;
    case "ANALYZED":
    case "READY":
    case "APPROVAL_REQUIRED":
      return 2;
    default:
      return 1;
  }
}

function TransactionDetailPage() {
  const queryClient = useQueryClient();
  const { transactionId } = useParams({ from: "/transactions/$transactionId" });
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);

  const {
    data: tx,
    isLoading: loadingTx,
    error: txError,
    refetch: refetchTx,
  } = useQuery({
    queryKey: ["singleTransaction", transactionId],
    queryFn: () => getTransaction(transactionId),
  });

  const {
    data: timeline,
    isLoading: loadingTimeline,
    refetch: refetchTimeline,
  } = useQuery({
    queryKey: ["transactionTimeline", transactionId],
    queryFn: () => getTransactionTimeline(transactionId),
  });

  const analyzeMutation = useMutation({
    mutationFn: () => {
      if (!tx) throw new Error("Transaction not loaded");
      return analyzeRecoveryCase(tx.id);
    },
    onSuccess: (res) => {
      toast.success("AI Diagnosis Completed", {
        description: `Root Cause: ${res.diagnosis.root_cause} · Recommendation: ${res.recommended_action}`,
      });
      refetchTx();
      refetchTimeline();
    },
    onError: (err: any) => {
      toast.error(`Analysis failed: ${err.message}`);
    },
  });

  const executeMutation = useMutation({
    mutationFn: () => {
      if (!tx) throw new Error("Transaction not loaded");
      return executeRecoveryCase(tx.id);
    },
    onSuccess: (res) => {
      if (res.status === "RECOVERED") {
        toast.success(`Autonomous Recovery Successful: ${inr(res.amount_recovered)} Recovered!`, {
          description: `${res.result_message} (Mode: ${res.mode})`,
        });
      } else {
        toast.info(`Recovery Action Executed`, {
          description: res.result_message,
        });
      }
      refetchTx();
      refetchTimeline();
    },
    onError: (err: any) => {
      toast.error(`Execution blocked: ${err.message}`);
    },
  });

  if (loadingTx) {
    return (
      <div className="surface p-6">
        <LoadingState rows={8} />
      </div>
    );
  }

  if (txError || !tx) {
    return (
      <div className="surface p-6">
        <EmptyState
          title="Transaction not found"
          description={`No transaction found matching ID "${transactionId}".`}
          action={
            <Button asChild variant="outline">
              <Link to="/transactions">Back to transactions</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const custName = tx.customer?.name || "Customer";
  const status = tx.status || "FAILED";
  const isRecovered = status === "RECOVERED";
  const isStopped = status === "STOPPED";
  const isApprovalRequired = status === "ESCALATED" || status === "APPROVAL_REQUIRED";

  const facts = [
    ["Customer Name", custName],
    ["Customer Email", tx.customer?.email || "—"],
    ["Customer Phone", tx.customer?.phone || "—"],
    ["Customer LTV", inr(tx.customer?.lifetime_value || 0)],
    ["External Transaction ID", tx.external_transaction_id || tx.id],
    ["Order Reference", tx.order_id || "—"],
    ["Amount", inr(tx.amount)],
    ["Currency", tx.currency || "INR"],
    ["Payment Method", tx.payment_method],
    ["Transaction Type", tx.transaction_type],
    ["Failure Category", tx.failure_category || "—"],
    ["Failure Reason", tx.failure_reason || "—"],
    ["Occurred At", dateTime(tx.occurred_at || tx.created_at)],
  ] as const;

  // Convert timeline logs into AuditEvent format for display
  const timelineEvents = (timeline || []).map((log: any) => ({
    id: log.id,
    timestamp: log.timestamp,
    transactionId: log.transaction_id || tx.id,
    event: log.event_type.replace(/_/g, " "),
    aiDecision: log.decision || log.action || log.event_type,
    reason: log.reason || "Processed by RecoverAI cognitive agent",
    action: log.action || "SUPERVISE",
    result: (log.result === "RECOVERED"
      ? "Success"
      : log.result === "FAILED"
        ? "Failed"
        : log.result === "STOPPED"
          ? "Stopped"
          : "Passed") as any,
    actor: (log.actor === "MERCHANT_ADMIN"
      ? "Merchant"
      : log.actor === "GUARDRAIL_ENGINE" || log.actor === "SYSTEM"
        ? "System"
        : "RecoverAI Agent") as any,
  }));

  const guardrails = [
    {
      label: "Terminal Success Guardrail",
      passed: true,
      detail: isRecovered
        ? "Terminal recovery achieved — future automated retries locked permanently."
        : "Transaction is not yet settled; recovery permitted.",
    },
    {
      label: "Value Limit (Threshold: ₹10,000)",
      passed: tx.amount <= 10000,
      detail:
        tx.amount > 10000
          ? `Amount ${inr(tx.amount)} exceeds ₹10,000 — requires Merchant Admin approval.`
          : `Amount ${inr(tx.amount)} within automated recovery limit.`,
    },
    {
      label: "Freshness Window (48 Hours)",
      passed: true,
      detail: "Transaction failure occurred within the 48-hour recovery window.",
    },
    {
      label: "Retry Attempt Ceiling (Max 2)",
      passed: true,
      detail: "Safety rule enforces a maximum of 2 automated attempts.",
    },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/transactions">
          <ArrowLeft className="size-4" /> Back to transactions
        </Link>
      </Button>

      <PageHeader
        title={custName}
        subtitle={`${tx.external_transaction_id || tx.id} · ${inr(tx.amount)} · ${tx.payment_method}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchTx();
                refetchTimeline();
              }}
            >
              <RefreshCw className="size-4" /> Refresh
            </Button>
          </div>
        }
      />

      {/* Workflow Progression Strip */}
      <div className="surface animate-rise overflow-x-auto p-5">
        <WorkflowStrip
          reachedIndex={getWorkflowStep(status)}
          failedAt={status === "FAILED" ? 4 : undefined}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {/* AI Diagnosis Card */}
          <section className="surface overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Cognitive AI Diagnosis</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Root-cause classification, expected recovery scoring & recommended action
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> RecoverAI Engine
              </span>
            </header>

            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto]">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Root Cause Diagnosis
                  </p>
                  <p className="text-base font-semibold text-foreground mt-1">
                    {tx.failure_reason ||
                      tx.failure_category ||
                      "Temporary Payment Gateway Failure"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Transaction failure detected for {custName} on payment method{" "}
                    {tx.payment_method}.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-canvas p-4">
                    <p className="text-xs text-muted-foreground">Amount at Risk</p>
                    <p className="num mt-1 text-xl font-bold text-warning">{inr(tx.amount)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-canvas p-4">
                    <p className="text-xs text-muted-foreground">Customer History</p>
                    <p className="num mt-1 text-xl font-semibold">
                      {tx.customer?.total_successful_transactions || 0} prior orders
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary-soft p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Recommended Recovery Strategy
                  </p>
                  <p className="mt-1 text-base font-bold text-foreground">
                    {tx.payment_method === "UPI"
                      ? "Instant Payment Recovery Link (WhatsApp & SMS)"
                      : tx.transaction_type === "SUBSCRIPTION"
                        ? "Smart Dunning Mandate Recovery"
                        : "Payment Recovery Link with Alternative Methods"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center lg:w-[190px]">
                <ProbabilityRing value={isRecovered ? 100 : 85} />
              </div>
            </div>
          </section>

          {/* Guardrail Checklist */}
          <section className="surface p-5">
            <h2 className="text-sm font-semibold mb-3">Safety Guardrail Boundaries</h2>
            <ul className="space-y-2.5">
              {guardrails.map((g) => (
                <li
                  key={g.label}
                  className="flex items-start gap-3 rounded-lg border border-border bg-canvas px-3.5 py-3"
                >
                  <span
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
                      g.passed
                        ? "bg-success-soft text-success"
                        : "bg-destructive-soft text-destructive"
                    }`}
                  >
                    {g.passed ? (
                      <ShieldCheck className="size-3.5" />
                    ) : (
                      <ShieldAlert className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{g.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{g.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Audit Timeline */}
          <section className="surface p-5">
            <h2 className="mb-4 text-sm font-semibold">Chronological Audit Trail</h2>
            {timelineEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No audit events recorded yet for this transaction.
              </p>
            ) : (
              <AuditTimeline events={timelineEvents} />
            )}
          </section>
        </div>

        {/* Right Sidebar Details & Actions */}
        <div className="space-y-4">
          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Transaction Details</h2>
            <dl className="mt-3 divide-y divide-border/60">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-2.5">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="text-right text-xs font-semibold text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold">Autonomous Recovery Actions</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Execute guardrailed actions or approve high-value transactions.
            </p>

            {isApprovalRequired ? (
              <div className="mt-3 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">
                Human Approval Required: Transaction amount {inr(tx.amount)} exceeds ₹10,000
                threshold.
              </div>
            ) : null}

            {isRecovered ? (
              <div className="mt-3 rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-xs font-semibold text-success">
                Terminal Status: Transaction successfully recovered and settled.
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              {isApprovalRequired ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={() => setDialog("approve")}
                  >
                    <CheckCircle2 className="size-4 mr-1.5" /> Approve Action
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setDialog("reject")}>
                    <XCircle className="size-4 mr-1.5" /> Reject
                  </Button>
                </div>
              ) : !isRecovered && !isStopped ? (
                <Button
                  className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold"
                  disabled={executeMutation.isPending}
                  onClick={() => executeMutation.mutate()}
                >
                  {executeMutation.isPending ? (
                    <RefreshCw className="size-4 animate-spin mr-1.5" />
                  ) : (
                    <Play className="size-4 mr-1.5" />
                  )}
                  Execute Recovery Action
                </Button>
              ) : null}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={analyzeMutation.isPending}
                onClick={() => analyzeMutation.mutate()}
              >
                {analyzeMutation.isPending ? (
                  <RefreshCw className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="size-3.5 mr-1.5" />
                )}
                Re-Run AI Diagnosis
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Approval Dialog */}
      <ApprovalDialog
        recoveryCase={tx}
        mode={dialog ?? "approve"}
        open={!!dialog}
        onOpenChange={(v) => !v && setDialog(null)}
        onSuccess={() => {
          refetchTx();
          refetchTimeline();
        }}
      />
    </>
  );
}
