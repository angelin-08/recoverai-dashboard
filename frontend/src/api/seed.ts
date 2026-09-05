import { apiClient } from "./client";

export async function triggerSeed(): Promise<{
  merchant_id: string;
  merchant_name: string;
  customers: number;
  transactions: number;
  recovery_cases: number;
  revenue_at_risk: number;
  estimated_recoverable: number;
}> {
  return apiClient<{
    merchant_id: string;
    merchant_name: string;
    customers: number;
    transactions: number;
    recovery_cases: number;
    revenue_at_risk: number;
    estimated_recoverable: number;
  }>("/seed", {
    method: "POST",
  });
}
