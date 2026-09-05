import { apiClient } from "./client";
import type { AuditLog } from "@/types";

export interface AuditFilterParams {
  transaction_id?: string;
  recovery_case_id?: string;
  event_type?: string;
  actor?: string;
  skip?: number;
  limit?: number;
}

export async function getAuditLogs(params: AuditFilterParams = {}): Promise<AuditLog[]> {
  const q = new URLSearchParams();
  if (params.transaction_id) q.append("transaction_id", params.transaction_id);
  if (params.recovery_case_id) q.append("recovery_case_id", params.recovery_case_id);
  if (params.event_type) q.append("event_type", params.event_type);
  if (params.actor) q.append("actor", params.actor);
  if (params.skip !== undefined) q.append("skip", String(params.skip));
  if (params.limit !== undefined) q.append("limit", String(params.limit));

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  return apiClient<AuditLog[]>(`/audit${queryStr}`);
}

export async function getTransactionTimeline(transactionId: string): Promise<AuditLog[]> {
  return apiClient<AuditLog[]>(`/audit/${encodeURIComponent(transactionId)}`);
}
