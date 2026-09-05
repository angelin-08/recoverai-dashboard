import { Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { PriorityBadge, ProbabilityBar } from "@/components/common/PriorityBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { executeRecoveryCase, analyzeRecoveryCase } from "@/api/recovery";
import { toast } from "sonner";
import { useState } from "react";

export function RecoveryCaseCard({
  tx,
  onApprove,
  onReject,
  onViewDetails,
  className,
}: {
  tx: any;
  onApprove?: (tx: any) => void;
  onReject?: (tx: any) => void;
  onViewDetails?: (tx: any) => void;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  const status = tx.status || "DETECTED";
  const custName = tx.transaction?.customer?.name || tx.customerName || "Customer";
  const txnId = tx.transaction?.external_transaction_id || tx.transaction_id || tx.id;
  const amount = tx.revenue_at_risk || tx.amount || 0;
  const probability = tx.recovery_probability ?? tx.recoveryProbability ?? 0;
  const priority = tx.priority_score ?? tx.priorityScore ?? 0;
  const rootCause = tx.root_cause || tx.rootCause || "Payment Gateway Timeout";
  const actionName = (
    tx.recommended_action ||
    tx.recommendedAction ||
    "PAYMENT_RECOVERY_LINK"
  ).replace(/_/g, " ");
  const confidence = tx.confidence_score ?? 85;

  const isApprovalRequired = status === "APPROVAL_REQUIRED";
  const isRecovered = status === "RECOVERED";
  const isStopped = status === "STOPPED";
  const isReady = status === "READY" || status === "ANALYZED" || status === "APPROVED";
  const isExecutingDisabled = isRecovered || isStopped || isApprovalRequired;

  const executeMutation = useMutation({
    mutationFn: () => executeRecoveryCase(tx.id),
    onSuccess: (res) => {
      if (res.status === "RECOVERED") {
        toast.success(`Autonomous Recovery Succeeded: ${inr(res.amount_recovered)} Recovered!`, {
          description: `${res.result_message} (Mode: ${res.mode})`,
        });
      } else if (res.status === "STOPPED") {
        toast.warning(`Recovery Stopped Safely`, {
          description: res.result_message,
        });
      } else {
        toast.info(`Recovery Action Executed`, {
          description: res.result_message,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["recoveryCases"] });
      queryClient.invalidateQueries({ queryKey: ["revenueRiskCases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
    },
    onError: (err: any) => {
      toast.error(`Execution blocked: ${err.message}`);
    },
  });

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      const res = await analyzeRecoveryCase(tx.id);
      toast.success("AI Diagnosis & Scoring Completed", {
        description: `Root Cause: ${res.diagnosis.root_cause} · Priority: ${res.priority.priority_score} (${res.priority.priority_level})`,
      });
      queryClient.invalidateQueries({ queryKey: ["recoveryCases"] });
    } catch (err: any) {
      toast.error(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <article
      className={cn(
        "surface animate-rise flex flex-col p-5 transition-shadow hover:shadow-raised border",
        isApprovalRequired
          ? "border-warning/40 bg-warning-soft/20"
          : isRecovered
            ? "border-success/30 bg-success-soft/10"
            : "border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{custName}</h3>
          <p className="num font-mono text-xs text-muted-foreground truncate">{txnId}</p>
        </div>
        <p className="num text-lg font-bold text-foreground">{inr(amount)}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Recovery Probability</p>
          <ProbabilityBar className="mt-1.5" value={probability} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Priority Score</p>
          <PriorityBadge className="mt-1.5" score={priority} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-primary/20 bg-primary-soft p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" /> AI Recommended Action
        </p>
        <p className="mt-1 text-sm font-semibold">{actionName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground truncate" title={rootCause}>
          Cause: {rootCause}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge caseStatus={status} />
        {isApprovalRequired ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">
            <ShieldAlert className="size-3.5" /> Human Approval Required
          </span>
        ) : isRecovered ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">
            <CheckCircle2 className="size-3.5" /> Terminal Recovered
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
            <ShieldCheck className="size-3.5" /> Guardrails Checked
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {onViewDetails ? (
          <Button size="sm" variant="outline" onClick={() => onViewDetails(tx)}>
            Inspect Case
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link
              to="/transactions/$transactionId"
              params={{ transactionId: tx.transaction_id || tx.id }}
            >
              Inspect <ExternalLink className="size-3 ml-1" />
            </Link>
          </Button>
        )}

        {status === "DETECTED" ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="gap-1.5"
          >
            {analyzing ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Analyze
          </Button>
        ) : null}

        {isApprovalRequired ? (
          <>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              onClick={() => onApprove?.(tx)}
            >
              Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onReject?.(tx)}>
              Reject
            </Button>
          </>
        ) : !isRecovered && !isStopped ? (
          <Button
            size="sm"
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending || isExecutingDisabled}
            className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
          >
            {executeMutation.isPending ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Execute Recovery
          </Button>
        ) : null}
      </div>
    </article>
  );
}
