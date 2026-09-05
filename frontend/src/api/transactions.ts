import { apiClient } from "./client";
import type { Transaction } from "@/types";

export interface TransactionFilterParams {
  status?: string;
  transaction_type?: string;
  payment_method?: string;
  search?: string;
  min_amount?: number;
  max_amount?: number;
  skip?: number;
  limit?: number;
}

export async function getTransactions(
  params: TransactionFilterParams = {},
): Promise<Transaction[]> {
  const q = new URLSearchParams();
  if (params.status) q.append("status", params.status);
  if (params.transaction_type) q.append("transaction_type", params.transaction_type);
  if (params.payment_method) q.append("payment_method", params.payment_method);
  if (params.search) q.append("search", params.search);
  if (params.min_amount !== undefined) q.append("min_amount", String(params.min_amount));
  if (params.max_amount !== undefined) q.append("max_amount", String(params.max_amount));
  if (params.skip !== undefined) q.append("skip", String(params.skip));
  if (params.limit !== undefined) q.append("limit", String(params.limit));

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  return apiClient<Transaction[]>(`/transactions${queryStr}`);
}

export async function getTransaction(id: string): Promise<Transaction> {
  return apiClient<Transaction>(`/transactions/${encodeURIComponent(id)}`);
}
