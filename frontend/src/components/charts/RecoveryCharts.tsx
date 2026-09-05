import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { inr } from "@/lib/format";

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--card)",
    boxShadow: "var(--shadow-raised)",
    fontSize: 12,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 4 },
} as const;

export function TrendChart({ data }: { data: any[] }) {
  const chartData = (data || []).map((d: any) => ({
    date: d.date,
    atRisk: d.atRisk ?? d.revenue_at_risk ?? 0,
    recovered: d.recovered ?? d.recovered_revenue ?? 0,
    recoverable: d.recoverable ?? (d.revenue_at_risk ? d.revenue_at_risk * 0.65 : 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--warning)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" {...axis} />
        <YAxis {...axis} width={54} tickFormatter={(v) => inr(Number(v), { compact: true })} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => inr(v)} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area
          type="monotone"
          name="Revenue at risk"
          dataKey="atRisk"
          stroke="var(--warning)"
          strokeWidth={2}
          fill="url(#gRisk)"
        />
        <Area
          type="monotone"
          name="Revenue recovered"
          dataKey="recovered"
          stroke="var(--success)"
          strokeWidth={2}
          fill="url(#gRec)"
        />
        <Line
          type="monotone"
          name="Estimated recoverable"
          dataKey="recoverable"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = [
  "var(--chart-4)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-2)",
];

export function LeakDonut({
  data,
}: {
  data: { name?: string; category?: string; value?: number; amount?: number }[];
}) {
  const normalized = (data || []).map((d) => ({
    name: d.name || d.category || "Uncategorized",
    value: d.value ?? d.amount ?? 0,
  }));
  const total = normalized.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={normalized}
              dataKey="value"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {normalized.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v: number) => inr(v)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">At risk</span>
          <span className="num text-lg font-semibold">{inr(total, { compact: true })}</span>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {normalized.map((d, i) => (
          <li key={d.name} className="flex items-center gap-3 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="flex-1 text-muted-foreground truncate">{d.name}</span>
            <span className="num font-medium">{inr(d.value)}</span>
            <span className="num w-11 text-right text-xs text-muted-foreground">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComparisonChart({
  data,
}: {
  data: { name: string; current: number; simulated: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }} barGap={8}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" {...axis} />
        <YAxis {...axis} width={54} tickFormatter={(v) => inr(Number(v), { compact: true })} />
        <Tooltip
          {...tooltipStyle}
          cursor={{ fill: "var(--muted)" }}
          formatter={(v: number) => inr(v)}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar
          name="Current strategy"
          dataKey="current"
          fill="var(--chart-5)"
          radius={[6, 6, 0, 0]}
        />
        <Bar
          name="Simulated strategy"
          dataKey="simulated"
          fill="var(--chart-1)"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MethodBars({
  data,
}: {
  data: { method: string; atRisk: number; recovered: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" {...axis} tickFormatter={(v) => inr(Number(v), { compact: true })} />
        <YAxis type="category" dataKey="method" {...axis} width={86} />
        <Tooltip
          {...tooltipStyle}
          cursor={{ fill: "var(--muted)" }}
          formatter={(v: number) => inr(v)}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar name="At risk" dataKey="atRisk" fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
        <Bar name="Recovered" dataKey="recovered" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SparkLine({ data }: { data: any[] }) {
  const chartData = (data || []).map((d: any) => ({
    recovered: d.recovered ?? d.recovered_revenue ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={64}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="recovered"
          stroke="var(--success)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
