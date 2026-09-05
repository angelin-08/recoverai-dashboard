import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { FilterBar } from "@/components/common/FilterBar";
import { TransactionDetail } from "@/components/recovery/TransactionDetail";
import { TransactionTable } from "@/components/recovery/TransactionTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTransactions } from "@/api/transactions";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/transactions/")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Transaction Explorer — RecoverAI" },
      {
        name: "description",
        content:
          "Live transaction stream with payment methods, failure categories, and recovery case statuses.",
      },
      { property: "og:title", content: "Transaction Explorer — RecoverAI" },
    ],
  }),
  component: TransactionsPage,
});

const STATUS_TABS = [
  { value: "all", label: "All Transactions" },
  { value: "SUCCESS", label: "Successful" },
  { value: "FAILED", label: "Failed" },
  { value: "ABANDONED", label: "Abandoned Checkout" },
  { value: "OVERDUE", label: "Overdue Invoice" },
  { value: "RECOVERED", label: "Recovered" },
  { value: "ESCALATED", label: "Escalated" },
];

function TransactionsPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [method, setMethod] = useState("all");
  const [txnType, setTxnType] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);

  const setSearch = (value: string) =>
    navigate({ to: "/transactions", search: { q: value }, replace: true });

  const {
    data: transactions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["transactionsList", tab, method, txnType, q],
    queryFn: () =>
      getTransactions({
        status: tab !== "all" ? tab : undefined,
        payment_method: method !== "all" ? method : undefined,
        transaction_type: txnType !== "all" ? txnType : undefined,
        search: q.trim() || undefined,
        limit: 100,
      }),
    staleTime: 5000,
  });

  const all = transactions || [];

  const options = STATUS_TABS.map((t) => ({
    ...t,
    count: t.value === "all" ? all.length : all.filter((x: any) => x.status === t.value).length,
  }));

  return (
    <>
      <PageHeader
        title="Transaction Explorer"
        subtitle={`Tracking ${all.length} merchant payments, checkouts, and invoices.`}
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-4" /> Refresh Stream
          </Button>
        }
      />

      <div className="surface">
        <div className="space-y-3 border-b border-border p-4">
          <FilterBar
            search={q}
            onSearch={setSearch}
            searchPlaceholder="Search by customer, external ID, order ID, failure reason…"
          >
            <Select value={txnType} onValueChange={setTxnType}>
              <SelectTrigger className="h-9 w-[150px] bg-card" aria-label="Transaction Type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PAYMENT">Payment</SelectItem>
                <SelectItem value="CHECKOUT">Checkout</SelectItem>
                <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                <SelectItem value="INVOICE">Invoice</SelectItem>
              </SelectContent>
            </Select>

            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-9 w-[150px] bg-card" aria-label="Payment method">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                <SelectItem value="NETBANKING">Netbanking</SelectItem>
                <SelectItem value="MANDATE">Recurring Mandate</SelectItem>
                <SelectItem value="WALLET">Wallet</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>

          <FilterBar options={options} active={tab} onSelectFilter={setTab} />
        </div>

        {isLoading ? (
          <LoadingState rows={8} />
        ) : error ? (
          <ErrorState
            title="Failed to load transactions"
            description="Unable to reach RecoverAI API backend."
            onRetry={() => refetch()}
          />
        ) : all.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="Try selecting a different filter or clearing your search term."
          />
        ) : (
          <TransactionTable
            rows={all}
            columns={[
              "id",
              "customer",
              "amount",
              "method",
              "issue",
              "status",
              "failureReason",
              "date",
            ]}
            onRowClick={setSelected}
          />
        )}
      </div>

      <TransactionDetail
        tx={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </>
  );
}
