import { apiClient } from "./client";

export interface HealthStatus {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
  razorpay_mode: "RAZORPAY_TEST" | "DEMO";
  ai_mode: "OPENAI" | "MOCK_AI";
}

export async function checkHealth(): Promise<HealthStatus> {
  return apiClient<HealthStatus>("/health");
}
