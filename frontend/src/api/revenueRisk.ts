import { apiClient } from "./client";
import type { RecoveryCase } from "@/types";

export interface RevenueOpportunitySummary {
  total_revenue_at_risk: number;
  estimated_recoverable_revenue: number;
  expected_recovery_value: number;
  total_cases: number;
  actionable_opportunities: number;
}

export async function scanAndAnalyzeRisks(): Promise<RecoveryCase[]> {
  return apiClient<RecoveryCase[]>("/revenue-risk/analyze", {
    method: "POST",
  });
}

export async function getRevenueRiskCases(statusFilter?: string): Promise<RecoveryCase[]> {
  const queryStr = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
  return apiClient<RecoveryCase[]>(`/revenue-risk${queryStr}`);
}

export async function getRevenueRiskSummary(): Promise<RevenueOpportunitySummary> {
  return apiClient<RevenueOpportunitySummary>("/revenue-risk/summary");
}

export async function getRevenueRiskCase(id: string): Promise<RecoveryCase> {
  return apiClient<RecoveryCase>(`/revenue-risk/${encodeURIComponent(id)}`);
}
