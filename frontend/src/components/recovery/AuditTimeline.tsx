import { cn } from "@/lib/utils";
import { timeOnly } from "@/lib/format";
import type { AuditEvent } from "@/types";

const RESULT_TONE: Record<AuditEvent["result"], string> = {
  Success: "bg-success text-success-foreground",
  Passed: "bg-success text-success-foreground",
  Pending: "bg-warning text-warning-foreground",
  Failed: "bg-destructive text-destructive-foreground",
  Stopped: "bg-muted-foreground text-background",
};

export function AuditTimeline({ events, className }: { events: AuditEvent[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-1", className)}>
      {events.map((e, i) => (
        <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", RESULT_TONE[e.result])} />
            {i < events.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-xs text-muted-foreground">{timeOnly(e.timestamp)}</span>
              <p className="text-sm font-medium">{e.event}</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  e.result === "Success" || e.result === "Passed"
                    ? "bg-success-soft text-success"
                    : e.result === "Failed"
                      ? "bg-destructive-soft text-destructive"
                      : e.result === "Stopped"
                        ? "bg-muted text-muted-foreground"
                        : "bg-warning-soft text-warning",
                )}
              >
                {e.result}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground/90">{e.aiDecision}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{e.reason}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Actor: <span className="font-medium text-foreground/80">{e.actor}</span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const FLOW = ["Detected", "Diagnosed", "AI Decision", "Approval", "Recovery Action", "Result"];

export function WorkflowStrip({
  reachedIndex,
  failedAt,
  className,
}: {
  reachedIndex: number;
  failedAt?: number | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {FLOW.map((step, i) => {
        const done = i <= reachedIndex;
        const failed = failedAt === i;
        return (
          <div key={step} className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                failed
                  ? "border-destructive/25 bg-destructive-soft text-destructive"
                  : done
                    ? "border-primary/20 bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground",
              )}
            >
              {step}
            </span>
            {i < FLOW.length - 1 ? (
              <span className="h-px w-4 bg-border sm:w-6" aria-hidden />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
