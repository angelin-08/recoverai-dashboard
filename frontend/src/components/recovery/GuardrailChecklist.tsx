import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Guardrail } from "@/types";

export function GuardrailChecklist({
  guardrails,
  className,
}: {
  guardrails: Guardrail[];
  className?: string;
}) {
  const passed = guardrails.filter((g) => g.passed).length;
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Guardrails</h3>
        <span
          className={cn(
            "num rounded-full border px-2 py-0.5 text-xs font-medium",
            passed === guardrails.length
              ? "border-success/20 bg-success-soft text-success"
              : "border-warning/25 bg-warning-soft text-warning",
          )}
        >
          {passed}/{guardrails.length} passed
        </span>
      </div>
      <ul className="space-y-2">
        {guardrails.map((g) => (
          <li
            key={g.label}
            className="flex items-start gap-3 rounded-lg border border-border bg-canvas px-3 py-2.5"
          >
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                g.passed ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive",
              )}
            >
              {g.passed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{g.label}</p>
              <p className="text-xs text-muted-foreground">{g.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
