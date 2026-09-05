import { ArrowUpDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { PriorityBadge, ProbabilityBar } from "@/components/common/PriorityBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/States";
import { dateTime, inr } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TxColumn =
  | "customer"
  | "id"
  | "amount"
  | "atRisk"
  | "method"
  | "issue"
  | "rootCause"
  | "failureReason"
  | "probability"
  | "priority"
  | "action"
  | "status"
  | "recoveryStatus"
  | "date";

const HEADERS: Record<TxColumn, string> = {
  customer: "Customer",
  id: "Transaction ID",
  amount: "Amount",
  atRisk: "Revenue at Risk",
  method: "Payment Method",
  issue: "Type / Category",
  rootCause: "Root Cause",
  failureReason: "Failure Reason",
  probability: "Recovery Probability",
  priority: "Priority Score",
  action: "Recommended Action",
  status: "Status",
  recoveryStatus: "Recovery Status",
  date: "Date",
};

const SORTABLE: TxColumn[] = ["amount", "atRisk", "probability", "priority", "date"];

export function TransactionTable({
  rows,
  columns,
  onRowClick,
  emptyTitle = "No records match your filters",
  className,
}: {
  rows: any[];
  columns: TxColumn[];
  onRowClick?: (row: any) => void;
  emptyTitle?: string;
  className?: string;
}) {
  const [sort, setSort] = useState<{ col: TxColumn; dir: "asc" | "desc" }>({
    col: "priority",
    dir: "desc",
  });

  const getVal = (t: any, col: TxColumn): number => {
    switch (col) {
      case "amount":
        return Number(t.amount || t.revenue_at_risk || 0);
      case "atRisk":
        return Number(t.revenue_at_risk || t.atRiskAmount || t.amount || 0);
      case "probability":
        return Number(t.recovery_probability ?? t.recoveryProbability ?? 0);
      case "priority":
        return Number(t.priority_score ?? t.priorityScore ?? 0);
      case "date":
        return new Date(t.created_at || t.occurred_at || t.createdAt || 0).getTime();
      default:
        return 0;
    }
  };

  const sorted = useMemo(() => {
    if (!SORTABLE.includes(sort.col)) return rows;
    return [...rows].sort((a, b) => {
      const d = getVal(a, sort.col) - getVal(b, sort.col);
      return sort.dir === "asc" ? d : -d;
    });
  }, [rows, sort]);

  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description="Try clearing the search box or selecting a different filter."
      />
    );
  }

  const cell = (t: any, col: TxColumn) => {
    const custName = t.customer?.name || t.customerName || t.customer_name || "Customer";
    const custId = t.customer_id || t.customerId || "";
    const txnId = t.id || t.external_transaction_id || t.transaction_id || "";
    const amount = t.amount || t.revenue_at_risk || 0;
    const method = t.payment_method || t.method || "UPI";
    const issue = t.transaction_type || t.issueType || t.failure_category || "PAYMENT";
    const rootCause = t.root_cause || t.rootCause || t.failure_reason || "Gateway Error";
    const failureReason = t.failure_reason || t.failureReason || t.failure_category || "—";
    const prob = t.recovery_probability ?? t.recoveryProbability ?? 0;
    const priority = t.priority_score ?? t.priorityScore ?? 0;
    const action = (t.recommended_action || t.recommendedAction || "PAYMENT_RECOVERY_LINK").replace(
      /_/g,
      " ",
    );
    const status = t.status || "FAILED";
    const dateStr = t.created_at || t.occurred_at || t.createdAt || new Date().toISOString();

    switch (col) {
      case "customer":
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{custName}</p>
            {custId ? <p className="num truncate text-xs text-muted-foreground">{custId}</p> : null}
          </div>
        );
      case "id":
        return <span className="num text-sm text-muted-foreground font-mono text-xs">{txnId}</span>;
      case "amount":
        return <span className="num font-semibold">{inr(amount)}</span>;
      case "atRisk":
        return (
          <span className="num font-semibold text-warning">{inr(t.revenue_at_risk || amount)}</span>
        );
      case "method":
        return <span className="text-sm font-medium">{method}</span>;
      case "issue":
        return <span className="text-sm text-foreground/80">{issue}</span>;
      case "rootCause":
        return (
          <span
            className="text-sm text-muted-foreground max-w-[200px] truncate block"
            title={rootCause}
          >
            {rootCause}
          </span>
        );
      case "failureReason":
        return (
          <span
            className="text-sm text-muted-foreground max-w-[200px] truncate block"
            title={failureReason}
          >
            {failureReason}
          </span>
        );
      case "probability":
        return status === "SUCCESS" || status === "successful" ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <ProbabilityBar value={prob} />
        );
      case "priority":
        return status === "SUCCESS" || status === "successful" ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <PriorityBadge score={priority} />
        );
      case "action":
        return <span className="text-sm font-medium">{action}</span>;
      case "status":
        return <StatusBadge status={status} />;
      case "recoveryStatus":
        return <StatusBadge caseStatus={status} />;
      case "date":
        return <span className="num text-xs text-muted-foreground">{dateTime(dateStr)}</span>;
    }
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-canvas/60">
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {SORTABLE.includes(col) ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    onClick={() =>
                      setSort((s) =>
                        s.col === col
                          ? { col, dir: s.dir === "asc" ? "desc" : "asc" }
                          : { col, dir: "desc" },
                      )
                    }
                  >
                    {HEADERS[col]}
                    <ArrowUpDown
                      className={cn("size-3", sort.col === col ? "text-primary" : "opacity-50")}
                    />
                  </button>
                ) : (
                  HEADERS[col]
                )}
              </th>
            ))}
            {onRowClick ? <th className="w-10 px-2" aria-label="Open" /> : null}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr
              key={t.id || t.transaction_id || Math.random()}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              onClick={() => onRowClick?.(t)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onRowClick(t);
                }
              }}
              className={cn(
                "border-b border-border/70 transition-colors last:border-0",
                onRowClick &&
                  "cursor-pointer hover:bg-accent/60 focus:bg-accent/60 focus:outline-none",
              )}
            >
              {columns.map((col) => (
                <td key={col} className="px-4 py-3 align-middle text-sm">
                  {cell(t, col)}
                </td>
              ))}
              {onRowClick ? (
                <td className="px-2 text-muted-foreground">
                  <ChevronRight className="size-4" />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
