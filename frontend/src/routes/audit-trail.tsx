import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  User,
  Bot,
  Sliders,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { FilterBar } from "@/components/common/FilterBar";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuditLogs } from "@/api/audit";
import { dateTime, timeOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit-trail")({
  head: () => ({
    meta: [
      { title: "Immutable Audit Trail — RecoverAI" },
      {
        name: "description",
        content:
          "Cryptographically structured chronological audit log recording every autonomous agent decision, guardrail check, and merchant approval.",
      },
      { property: "og:title", content: "Immutable Audit Trail — RecoverAI" },
    ],
  }),
  component: AuditTrailPage,
});

const EVENT_FILTERS = [
  { value: "all", label: "All Audit Events" },
  { value: "REVENUE_DETECTED", label: "Detected Leaks" },
  { value: "DIAGNOSIS_COMPLETED", label: "AI Diagnoses" },
  { value: "GUARDRAIL_CHECKED", label: "Guardrail Checks" },
  { value: "APPROVAL_GRANTED", label: "Approvals" },
  { value: "ACTION_EXECUTED", label: "Executions" },
  { value: "RECOVERY_SUCCESSFUL", label: "Recoveries" },
  { value: "RECOVERY_STOPPED", label: "Stopped Safely" },
];

function getActorBadge(actor: string) {
  if (actor === "MERCHANT_ADMIN" || actor === "MERCHANT") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full border border-primary/20">
        <User className="size-3" /> Merchant Admin
      </span>
    );
  }
  if (actor === "GUARDRAIL_ENGINE") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning bg-warning-soft px-2 py-0.5 rounded-full border border-warning/25">
        <ShieldCheck className="size-3" /> Guardrail Policy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-info bg-info-soft px-2 py-0.5 rounded-full border border-info/25">
      <Bot className="size-3" /> RecoverAI Agent
    </span>
  );
}

function getResultBadge(result: string | null) {
  if (!result) return null;
  const upper = result.toUpperCase();
  if (upper === "RECOVERED" || upper === "SUCCESS" || upper === "PASSED" || upper === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success-soft px-2 py-0.5 rounded-full border border-success/20">
        <CheckCircle2 className="size-3" /> {result}
      </span>
    );
  }
  if (upper === "STOPPED" || upper === "BLOCKED" || upper === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
        <XCircle className="size-3" /> {result}
      </span>
    );
  }
  if (upper === "FAILED" || upper === "DECLINED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive-soft px-2 py-0.5 rounded-full border border-destructive/20">
        <AlertTriangle className="size-3" /> {result}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full border border-primary/20">
      {result}
    </span>
  );
}

function AuditTrailPage() {
  const [eventFilter, setEventFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedTxnId, setSelectedTxnId] = useState("");

  const {
    data: logs,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["auditLogsList", eventFilter, selectedTxnId],
    queryFn: () =>
      getAuditLogs({
        event_type: eventFilter !== "all" ? eventFilter : undefined,
        transaction_id: selectedTxnId || undefined,
        limit: 150,
      }),
    staleTime: 5000,
  });

  const allLogs = logs || [];

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allLogs;
    return allLogs.filter((l: any) => {
      const full =
        `${l.id} ${l.event_type} ${l.transaction_id || ""} ${l.actor} ${l.reason || ""} ${l.decision || ""} ${l.action || ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [allLogs, search]);

  const options = EVENT_FILTERS.map((f) => ({
    ...f,
    count:
      f.value === "all"
        ? allLogs.length
        : allLogs.filter((l: any) => l.event_type === f.value).length,
  }));

  return (
    <>
      <PageHeader
        title="Immutable Financial Audit Trail"
        subtitle="Chronological audit records tracking every autonomous agent decision, reasoning log, and guardrail check."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-4" /> Refresh Audit Trail
            </Button>
          </div>
        }
      />

      <div className="surface rounded-xl border border-border">
        {/* Filters */}
        <div className="p-4 border-b border-border space-y-3">
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search audit events by transaction ID, actor, or reason…"
          />
          <FilterBar options={options} active={eventFilter} onSelectFilter={setEventFilter} />
        </div>

        {/* Audit Stream Table */}
        {isLoading ? (
          <LoadingState rows={10} />
        ) : error ? (
          <ErrorState
            title="Failed to load audit logs"
            description="Unable to connect to the backend server."
            onRetry={() => refetch()}
          />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="No audit events found"
            description="Clear the search term or select 'All Audit Events' to view the full timeline."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-canvas/70 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Transaction / Case</th>
                  <th className="px-4 py-3">Action & Decision</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Reason / Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.map((log: any) => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-accent/40 text-sm align-top"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground num font-mono">
                      {dateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground text-xs whitespace-nowrap">
                      {log.event_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getActorBadge(log.actor)}</td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {log.transaction_id ? (
                        <span className="font-semibold text-foreground">{log.transaction_id}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {log.recovery_case_id ? (
                        <span className="block text-[11px] text-muted-foreground">
                          {log.recovery_case_id}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-xs text-foreground">
                        {log.action ? log.action.replace(/_/g, " ") : "EVALUATE"}
                      </p>
                      {log.decision ? (
                        <p className="text-[11px] text-muted-foreground">{log.decision}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getResultBadge(log.result)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs leading-relaxed">
                      {log.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
