/**
 * Mock service layer.
 *
 * Every read below is synchronous over local mock data today, but the API
 * shape is promise-based so it can be swapped for real HTTP/AI calls later
 * without touching a single component.
 */
import { auditEvents, transactions, TRANSACTIONS_ANALYZED, issueLabel } from "@/data/mockData";
import type {
  AuditEvent,
  DashboardMetrics,
  IssueType,
  RecoveryRules,
  Transaction,
  TransactionStatus,
  TrendPoint,
} from "@/types";

const AT_RISK_STATUSES: TransactionStatus[] = ["at_risk", "recovering", "escalated", "failed"];

export const isAtRisk = (t: Transaction) => AT_RISK_STATUSES.includes(t.status);

export function getTransactions(): Transaction[] {
  return transactions;
}

export function getTransaction(id: string): Transaction | undefined {
  return transactions.find((t) => t.id === id);
}

export function getRiskTransactions(): Transaction[] {
  return transactions.filter(isAtRisk).sort((a, b) => b.priorityScore - a.priorityScore);
}

export function getRecoveryCases(): Transaction[] {
  return transactions
    .filter((t) => t.status !== "successful")
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function getMetrics(): DashboardMetrics {
  const risk = transactions.filter(isAtRisk);
  const recovered = transactions.filter((t) => t.status === "recovered");
  const revenueAtRisk = risk.reduce((s, t) => s + t.atRiskAmount, 0);
  const estimatedRecoverable = risk.reduce((s, t) => s + t.estimatedRecoverable, 0);
  const revenueRecovered = recovered.reduce((s, t) => s + t.recoveredAmount, 0);
  const failedRecoveries = transactions.filter((t) => t.status === "failed").length;
  const escalatedCases = transactions.filter((t) => t.caseStatus === "pending_approval").length;
  const attempts = recovered.length + failedRecoveries + escalatedCases;

  return {
    revenueAtRisk,
    estimatedRecoverable,
    revenueRecovered,
    transactionsAnalyzed: TRANSACTIONS_ANALYZED,
    activeCases: transactions.filter(
      (t) => t.caseStatus === "ready" || t.caseStatus === "in_progress",
    ).length,
    exceptions: transactions.filter((t) => t.caseStatus === "stopped" || t.amount > 12000).length,
    recoveryPotentialPct: Math.round((estimatedRecoverable / revenueAtRisk) * 100),
    recoveryRatePct:
      Math.round((revenueRecovered / (revenueRecovered + estimatedRecoverable)) * 1000) / 10,
    atRiskChangePct: 8.4,
    attempts,
    successfulRecoveries: recovered.length,
    failedRecoveries,
    escalatedCases,
    avgRecoveryProbability:
      Math.round(
        (risk.reduce((s, t) => s + t.recoveryProbability, 0) / Math.max(risk.length, 1)) * 100,
      ) / 100,
  };
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getTrend(): TrendPoint[] {
  const m = getMetrics();
  const weights = [0.11, 0.13, 0.15, 0.14, 0.16, 0.15, 0.16];
  const start = new Date("2026-08-17T00:00:00Z");
  return weights.map((w, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    const drift = 1 + (i - 3) * 0.03;
    return {
      date: WEEKDAYS[d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1]!,
      atRisk: Math.round(m.revenueAtRisk * w * drift),
      recoverable: Math.round(m.estimatedRecoverable * w * drift),
      recovered: Math.round(m.revenueRecovered * w * (2 - drift)),
    };
  });
}

export function getLeakBreakdown(): { name: string; value: number; key: IssueType }[] {
  const risk = transactions.filter(isAtRisk);
  const keys: IssueType[] = [
    "failed_payment",
    "checkout_abandonment",
    "subscription_failure",
    "overdue_invoice",
  ];
  return keys.map((key) => ({
    key,
    name: issueLabel(key),
    value: risk.filter((t) => t.issueType === key).reduce((s, t) => s + t.atRiskAmount, 0),
  }));
}

export function getMethodPerformance() {
  const risk = transactions.filter(isAtRisk);
  const methods = Array.from(new Set(transactions.map((t) => t.method)));
  return methods
    .map((method) => ({
      method,
      atRisk: risk.filter((t) => t.method === method).reduce((s, t) => s + t.atRiskAmount, 0),
      recovered: transactions
        .filter((t) => t.method === method && t.status === "recovered")
        .reduce((s, t) => s + t.recoveredAmount, 0),
    }))
    .sort((a, b) => b.atRisk - a.atRisk);
}

export function getAuditEvents(): AuditEvent[] {
  return auditEvents;
}

export function getAuditForTransaction(id: string): AuditEvent[] {
  return auditEvents
    .filter((e) => e.transactionId === id)
    .slice()
    .reverse();
}

export const defaultRecoveryRules: RecoveryRules = {
  maxAutomatedAttempts: 2,
  maxAutomaticValue: 10000,
  humanApprovalThreshold: 10000,
  recoveryWindowHours: 48,
};

export interface SimulationInput {
  windowHours: 24 | 48 | 72;
  maxAttempts: 1 | 2 | 3;
  minProbability: 0.5 | 0.7 | 0.8;
}

export interface SimulationResult {
  current: number;
  projected: number;
  delta: number;
  eligibleCases: number;
  totalCases: number;
  liftPct: number;
}

export function simulate(input: SimulationInput): SimulationResult {
  const m = getMetrics();
  const risk = transactions.filter(isAtRisk);
  const eligible = risk.filter((t) => t.recoveryProbability >= input.minProbability);

  const windowFactor = { 24: 0.82, 48: 1, 72: 1.09 }[input.windowHours];
  const attemptFactor = { 1: 0.86, 2: 1, 3: 1.07 }[input.maxAttempts];
  const thresholdFactor = { 0.5: 1.06, 0.7: 1, 0.8: 0.93 }[input.minProbability];

  const projected = Math.round(
    m.revenueRecovered * windowFactor * attemptFactor * thresholdFactor +
      eligible.reduce((s, t) => s + t.estimatedRecoverable, 0) * 0.06,
  );

  return {
    current: m.revenueRecovered,
    projected,
    delta: projected - m.revenueRecovered,
    eligibleCases: eligible.length,
    totalCases: risk.length,
    liftPct: Math.round(((projected - m.revenueRecovered) / m.revenueRecovered) * 1000) / 10,
  };
}

export interface AiInsight {
  title: string;
  body: string;
  recommendation: string;
  tone: "warning" | "success" | "info";
}

export function getInsights(): AiInsight[] {
  return [
    {
      title: "Payment failures increased 18% this week.",
      body: "UPI declines drive the majority of the increase, concentrated between 7pm and 11pm.",
      recommendation: "Review payment-method performance.",
      tone: "warning",
    },
    {
      title: "Customers who failed once have a 73% recovery probability.",
      body: "First-failure cases convert far better than repeat failures across every value band.",
      recommendation: "Prioritize first-failure recovery.",
      tone: "success",
    },
    {
      title: "8 high-value cases require merchant review.",
      body: "Each exceeds the ₹10,000 automatic recovery threshold and is waiting on approval.",
      recommendation: "Review escalated recovery cases.",
      tone: "info",
    },
  ];
}
