import { cn } from "@/lib/utils";

export function PriorityBadge({ score, className }: { score: number; className?: string }) {
  const normalized = Math.round(score);
  const tone =
    normalized >= 75
      ? "bg-destructive-soft text-destructive border-destructive/20"
      : normalized >= 45
        ? "bg-warning-soft text-warning border-warning/25"
        : "bg-muted text-muted-foreground border-border";
  const label = normalized >= 75 ? "High" : normalized >= 45 ? "Medium" : "Low";
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold",
        tone,
        className,
      )}
      title={`Priority score ${normalized} / 100`}
    >
      {normalized}
      <span className="font-medium opacity-70">{label}</span>
    </span>
  );
}

export function ProbabilityBar({ value, className }: { value: number; className?: string }) {
  // If value is 0-1, convert to 0-100, if already > 1 keep it
  const p = Math.round(value <= 1 && value > 0 ? value * 100 : value);
  const tone = p >= 70 ? "bg-success" : p >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${Math.min(100, Math.max(0, p))}%` }}
        />
      </div>
      <span className="num text-sm font-medium">{p}%</span>
    </div>
  );
}

export function ProbabilityRing({
  value,
  size = 132,
  label = "Recovery probability",
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const p = Math.round(value <= 1 && value > 0 ? value * 100 : value);
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const stroke = p >= 70 ? "var(--success)" : p >= 40 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={10}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * Math.min(100, Math.max(0, p))) / 100}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-3xl font-semibold">{p}%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
