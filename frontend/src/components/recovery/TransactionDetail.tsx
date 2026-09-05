import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { AIAnalysisCard } from "./AIAnalysisCard";
import { AuditTimeline, WorkflowStrip } from "./AuditTimeline";
import { GuardrailChecklist } from "./GuardrailChecklist";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getAuditForTransaction } from "@/services/recoveryService";
import { issueLabel } from "@/data/mockData";
import { dateTime, inr } from "@/lib/format";
import { useCaseStatus } from "@/hooks/useRecoveryStore";
import type { Transaction } from "@/types";

export function workflowIndex(tx: Transaction) {
  if (tx.status === "recovered") return 5;
  if (tx.status === "failed" || tx.caseStatus === "stopped") return 4;
  if (tx.caseStatus === "in_progress") return 4;
  if (tx.caseStatus === "pending_approval") return 3;
  return 2;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function TransactionDetail({
  tx,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: {
  tx: Transaction | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApprove?: (tx: Transaction) => void;
  onReject?: (tx: Transaction) => void;
}) {
  const caseStatus = useCaseStatus(tx?.id ?? "", tx?.caseStatus ?? "ready");
  if (!tx) return null;
  const events = getAuditForTransaction(tx.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-lg">{tx.customerName}</SheetTitle>
            <StatusBadge status={tx.status} />
            {tx.status !== "successful" ? <StatusBadge caseStatus={caseStatus} /> : null}
          </div>
          <p className="num text-sm text-muted-foreground">
            {tx.id} · {inr(tx.amount)} · {tx.method}
          </p>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <WorkflowStrip
            reachedIndex={workflowIndex(tx)}
            failedAt={tx.status === "failed" ? 4 : undefined}
          />

          <div className="surface p-4">
            <Row label="Issue" value={issueLabel(tx.issueType)} />
            <Row label="Failure reason" value={tx.failureReason} />
            <Row label="Root cause" value={tx.rootCause} />
            <Row label="Revenue at risk" value={inr(tx.atRiskAmount || tx.amount)} />
            <Row label="Estimated recoverable" value={inr(tx.estimatedRecoverable)} />
            <Row label="Detected" value={dateTime(tx.createdAt)} />
            <Row label="Automated attempts" value={`${tx.attempts} of 2`} />
          </div>

          {tx.status !== "successful" ? (
            <>
              <AIAnalysisCard tx={tx} />
              <div className="surface p-5">
                <GuardrailChecklist guardrails={tx.guardrails} />
              </div>
              <div className="surface p-5">
                <h3 className="mb-4 text-sm font-semibold">Recovery timeline</h3>
                <AuditTimeline events={events} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to="/transactions/$transactionId" params={{ transactionId: tx.id }}>
                    View full analysis <ExternalLink className="size-4" />
                  </Link>
                </Button>
                {onApprove ? (
                  <Button onClick={() => onApprove(tx)} disabled={caseStatus === "recovered"}>
                    Approve
                  </Button>
                ) : null}
                {onReject ? (
                  <Button variant="outline" onClick={() => onReject(tx)}>
                    Reject
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="surface p-5 text-sm text-muted-foreground">
              This payment settled successfully. No recovery workflow was triggered.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
