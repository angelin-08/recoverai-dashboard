import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  change,
  changeTone = "auto",
  icon: Icon,
  accent = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  change?: number;
  changeTone?: "auto" | "good" | "bad" | "neutral";
  icon?: LucideIcon;
  accent?: "default" | "warning" | "success" | "primary" | "destructive";
  className?: string;
}) {
  const accentRing = {
    default: "text-muted-foreground bg-muted",
    warning: "text-warning bg-warning-soft",
    success: "text-success bg-success-soft",
    primary: "text-primary bg-primary-soft",
    destructive: "text-destructive bg-destructive-soft",
  }[accent];

  const up = (change ?? 0) >= 0;
  const tone =
    changeTone === "auto"
      ? up
        ? "text-destructive"
        : "text-success"
      : changeTone === "good"
        ? "text-success"
        : changeTone === "bad"
          ? "text-destructive"
          : "text-muted-foreground";

  return (
    <div
      className={cn(
        "surface animate-rise group p-5 transition-shadow hover:shadow-raised",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("grid size-8 place-items-center rounded-lg", accentRing)}>
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="num mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {typeof change === "number" ? (
          <span className={cn("num inline-flex items-center gap-0.5 font-medium", tone)}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(change)}%
          </span>
        ) : null}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}
