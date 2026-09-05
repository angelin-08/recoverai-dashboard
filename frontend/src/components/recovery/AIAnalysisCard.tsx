import { Sparkles } from "lucide-react";
import { ProbabilityRing } from "@/components/common/PriorityBadge";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary",
        className,
      )}
    >
      <Sparkles className="size-3.5" />
      AI Analysis — Demo
    </span>
  );
}

export function AIAnalysisCard({ tx, className }: { tx: Transaction; className?: string }) {
  return (
    <section className={cn("surface overflow-hidden", className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">AI Diagnosis</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Structured mock reasoning — replaceable with a live agent response
          </p>
        </div>
        <AiBadge />
      </header>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-foreground">{tx.aiDiagnosis}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-canvas p-4">
              <p className="text-xs text-muted-foreground">Priority score</p>
              <p className="num mt-1 text-xl font-semibold">{tx.priorityScore} / 100</p>
            </div>
            <div className="rounded-lg border border-border bg-canvas p-4">
              <p className="text-xs text-muted-foreground">Model confidence</p>
              <p className="num mt-1 text-xl font-semibold">{Math.round(tx.confidence * 100)}%</p>
            </div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary-soft p-4">
            <p className="text-xs font-medium text-primary">Recommended action</p>
            <p className="mt-1 text-base font-semibold">{tx.recommendedAction}</p>
            <p className="mt-2 text-xs font-medium text-muted-foreground">Why this action?</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90">{tx.actionRationale}</p>
          </div>
        </div>

        <div className="flex items-center justify-center lg:w-[190px]">
          <ProbabilityRing value={tx.recoveryProbability} />
        </div>
      </div>
    </section>
  );
}
