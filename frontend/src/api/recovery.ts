import { apiClient } from "./client";
import type { RecoveryCase, AnalysisResponse, ExecutionResult } from "@/types";

export interface RecoveryFilterParams {
  status?: string;
  min_priority?: number;
  skip?: number;
  limit?: number;
}

export async function getRecoveryCases(params: RecoveryFilterParams = {}): Promise<RecoveryCase[]> {
  const q = new URLSearchParams();
  if (params.status) q.append("status", params.status);
  if (params.min_priority !== undefined) q.append("min_priority", String(params.min_priority));
  if (params.skip !== undefined) q.append("skip", String(params.skip));
  if (params.limit !== undefined) q.append("limit", String(params.limit));

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  return apiClient<RecoveryCase[]>(`/recovery${queryStr}`);
}

export async function getRecoveryCase(caseId: string): Promise<RecoveryCase> {
  return apiClient<RecoveryCase>(`/recovery/${encodeURIComponent(caseId)}`);
}

export async function analyzeRecoveryCase(caseId: string): Promise<AnalysisResponse> {
  return apiClient<AnalysisResponse>(`/recovery/${encodeURIComponent(caseId)}/analyze`, {
    method: "POST",
  });
}

export async function approveRecoveryCase(
  caseId: string,
  notes?: string,
  reviewer: string = "MERCHANT_ADMIN",
): Promise<RecoveryCase> {
  return apiClient<RecoveryCase>(`/recovery/${encodeURIComponent(caseId)}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes, reviewer }),
  });
}

export async function rejectRecoveryCase(
  caseId: string,
  notes?: string,
  reviewer: string = "MERCHANT_ADMIN",
): Promise<RecoveryCase> {
  return apiClient<RecoveryCase>(`/recovery/${encodeURIComponent(caseId)}/reject`, {
    method: "POST",
    body: JSON.stringify({ notes, reviewer }),
  });
}

export async function executeRecoveryCase(
  caseId: string,
  customAction?: string,
  forceOverride: boolean = false,
): Promise<ExecutionResult> {
  return apiClient<ExecutionResult>(`/recovery/${encodeURIComponent(caseId)}/execute`, {
    method: "POST",
    body: JSON.stringify({
      custom_action: customAction,
      force_override: forceOverride,
    }),
  });
}
