import { apiClient } from "./client";
import type { SimulationRequest, SimulationResponse } from "@/types";

export async function runSimulation(req: SimulationRequest): Promise<SimulationResponse> {
  return apiClient<SimulationResponse>("/simulator", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
