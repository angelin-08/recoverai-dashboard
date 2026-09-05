import { apiClient } from "./client";
import type { DashboardSummary, RecoveryTrendPoint, LeakBreakdownItem } from "@/types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient<DashboardSummary>("/dashboard/summary");
}

export async function getRecoveryTrend(days: number = 14): Promise<RecoveryTrendPoint[]> {
  return apiClient<RecoveryTrendPoint[]>(`/dashboard/recovery-trend?days=${days}`);
}

export async function getLeakBreakdown(): Promise<LeakBreakdownItem[]> {
  return apiClient<LeakBreakdownItem[]>("/dashboard/leak-breakdown");
}
