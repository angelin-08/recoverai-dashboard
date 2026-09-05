import { apiClient } from "./client";
import type { DemoScenario, ExecutionResult } from "@/types";

export async function getDemoScenarios(): Promise<DemoScenario[]> {
  return apiClient<DemoScenario[]>("/demo/scenarios");
}

export async function runScenarioARecovery(): Promise<ExecutionResult> {
  return apiClient<ExecutionResult>("/demo/run-recovery", {
    method: "POST",
  });
}

export async function runScenarioCFailure(): Promise<ExecutionResult> {
  return apiClient<ExecutionResult>("/demo/run-failure-scenario", {
    method: "POST",
  });
}
