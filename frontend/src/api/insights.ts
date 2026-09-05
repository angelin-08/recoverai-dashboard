import { apiClient } from "./client";
import type { InsightsResponse } from "@/types";

export async function getInsights(): Promise<InsightsResponse> {
  return apiClient<InsightsResponse>("/insights");
}
