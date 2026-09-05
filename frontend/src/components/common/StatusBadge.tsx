import { cn } from "@/lib/utils";

const BADGE_MAP: Record<string, { label: string; className: string }> = {
  // Transaction statuses
  SUCCESS: { label: "Successful", className: "bg-success-soft text-success border-success/20" },
  successful: { label: "Successful", className: "bg-success-soft text-success border-success/20" },
  RECOVERED: { label: "Recovered", className: "bg-success-soft text-success border-success/20" },
  recovered: { label: "Recovered", className: "bg-success-soft text-success border-success/20" },
  FAILED: {
    label: "Failed",
    className: "bg-destructive-soft text-destructive border-destructive/20",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive-soft text-destructive border-destructive/20",
  },
  ABANDONED: { label: "Abandoned", className: "bg-warning-soft text-warning border-warning/25" },
  OVERDUE: {
    label: "Overdue",
    className: "bg-destructive-soft text-destructive border-destructive/20",
  },
  ESCALATED: { label: "Escalated", className: "bg-primary-soft text-primary border-primary/20" },
  escalated: { label: "Escalated", className: "bg-primary-soft text-primary border-primary/20" },
  PENDING: { label: "Pending", className: "bg-warning-soft text-warning border-warning/25" },
  RECOVERING: { label: "Recovering", className: "bg-info-soft text-info border-info/25" },
  at_risk: { label: "At Risk", className: "bg-warning-soft text-warning border-warning/25" },

  // Recovery Case statuses
  DETECTED: { label: "Detected", className: "bg-warning-soft text-warning border-warning/25" },
  ANALYZED: { label: "Diagnosed", className: "bg-info-soft text-info border-info/25" },
  READY: { label: "Ready to Recover", className: "bg-success-soft text-success border-success/20" },
  ready: { label: "Ready", className: "bg-success-soft text-success border-success/20" },
  APPROVAL_REQUIRED: {
    label: "Approval Required",
    className: "bg-warning-soft text-warning border-warning/25",
  },
  pending_approval: {
    label: "Pending Approval",
    className: "bg-warning-soft text-warning border-warning/25",
  },
  APPROVED: { label: "Approved", className: "bg-info-soft text-info border-info/25" },
  IN_PROGRESS: { label: "In Progress", className: "bg-info-soft text-info border-info/25" },
  in_progress: { label: "In Progress", className: "bg-info-soft text-info border-info/25" },
  STOPPED: { label: "Stopped Safely", className: "bg-muted text-muted-foreground border-border" },
  stopped: { label: "Stopped Safely", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({
  status,
  caseStatus,
  className,
}: {
  status?: string;
  caseStatus?: string;
  className?: string;
}) {
  const key = (status || caseStatus || "").trim();
  const cfg = BADGE_MAP[key] || {
    label: key.replace(/_/g, " "),
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        cfg.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  );
}
