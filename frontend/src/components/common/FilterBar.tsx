import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  options,
  active,
  onSelectFilter,
  children,
  className,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  options?: FilterOption[];
  active?: string;
  onSelectFilter?: (value: string) => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {onSearch ? (
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 bg-card pl-9"
          />
        </div>
      ) : null}

      {options?.length ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelectFilter?.(o.value)}
              aria-pressed={active === o.value}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                active === o.value
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {o.label}
              {typeof o.count === "number" ? (
                <span className="num ml-1.5 opacity-60">{o.count}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {children}
    </div>
  );
}
