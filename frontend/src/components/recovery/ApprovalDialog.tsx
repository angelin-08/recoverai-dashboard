import { ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { inr } from "@/lib/format";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveRecoveryCase, rejectRecoveryCase } from "@/api/recovery";
import { toast } from "sonner";

export function ApprovalDialog({
  recoveryCase,
  mode,
  open,
  onOpenChange,
  onSuccess,
}: {
  recoveryCase: any | null;
  mode: "approve" | "reject";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const approving = mode === "approve";
  const caseId = recoveryCase?.id || "";
  const custName =
    recoveryCase?.transaction?.customer?.name ||
    recoveryCase?.customerName ||
    "Customer";
  const amount = recoveryCase?.revenue_at_risk || recoveryCase?.amount || 0;
  const actionName = (
    recoveryCase?.recommended_action ||
    recoveryCase?.recommendedAction ||
    "PAYMENT_RECOVERY_LINK"
  ).replace(/_/g, " ");

  const approveMutation = useMutation({
    mutationFn: () => approveRecoveryCase(caseId, note || "Approved via Dashboard"),
    onSuccess: (updated) => {
      toast.success(`Approved recovery action for ${custName}`, {
        description: `Case ${updated.id} status updated to APPROVED. Automated execution is now unlocked.`,
      });
      queryClient.invalidateQueries({ queryKey: ["recoveryCases"] });
      queryClient.invalidateQueries({ queryKey: ["revenueRiskCases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      onOpenChange(false);
      setNote("");
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(`Approval failed: ${err.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectRecoveryCase(caseId, note || "Rejected by merchant admin"),
    onSuccess: (updated) => {
      toast.info(`Recovery rejected for ${custName}`, {
        description: `Case ${updated.id} status marked as STOPPED. All autonomous retries halted.`,
      });
      queryClient.invalidateQueries({ queryKey: ["recoveryCases"] });
      queryClient.invalidateQueries({ queryKey: ["revenueRiskCases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      onOpenChange(false);
      setNote("");
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(`Rejection failed: ${err.message}`);
    },
  });

  if (!recoveryCase) return null;

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {approving ? (
              <>
                <CheckCircle2 className="size-5 text-success" />
                Approve Recovery Action
              </>
            ) : (
              <>
                <ShieldAlert className="size-5 text-destructive" />
                Reject Recovery Action
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {approving
              ? `You are authorizing RecoverAI to proceed with “${actionName}” for ${custName} (${inr(
                  amount
                )}).`
              : `The case for ${custName} (${inr(
                  amount
                )}) will be safely transitioned to STOPPED.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-canvas p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID:</span>
              <span className="font-mono text-xs font-semibold">
                {recoveryCase.transaction?.external_transaction_id ||
                  recoveryCase.transaction_id ||
                  recoveryCase.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">{inr(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Root Cause:</span>
              <span className="text-foreground/90 font-medium">
                {recoveryCase.root_cause || recoveryCase.rootCause || "Gateway Timeout"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Win Probability:</span>
              <span className="font-semibold text-success">
                {recoveryCase.recovery_probability || 0}%
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="approval-note" className="text-sm font-medium">
              Decision Note (Recorded in Immutable Audit Trail)
            </label>
            <Textarea
              id="approval-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Verified customer high-tier relationship, approved manual Razorpay link outreach…"
              rows={3}
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-primary-soft border border-primary/20 p-3 text-xs text-foreground/90">
            <ShieldCheck className="mt-0.5 size-4 text-primary shrink-0" />
            <span>
              <strong>Guardrail Protection:</strong> Every decision is verified against
              financial boundaries and permanently logged with timestamp and actor attribution.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={approving ? "default" : "destructive"}
            disabled={isPending}
            onClick={() => {
              if (approving) {
                approveMutation.mutate();
              } else {
                rejectMutation.mutate();
              }
            }}
          >
            {isPending ? (
              <RefreshCw className="size-4 animate-spin mr-1.5" />
            ) : null}
            {approving ? "Confirm Approval" : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
