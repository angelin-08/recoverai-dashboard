export type TransactionStatus =
  | "SUCCESS"
  | "FAILED"
  | "PENDING"
  | "ABANDONED"
  | "OVERDUE"
  | "RECOVERING"
  | "RECOVERED"
  | "ESCALATED";

export type TransactionType = "PAYMENT" | "CHECKOUT" | "SUBSCRIPTION" | "INVOICE";

export type PaymentMethod = "UPI" | "CARD" | "NETBANKING" | "MANDATE" | "WALLET";

export type RecoveryCaseStatus =
  | "DETECTED"
  | "ANALYZED"
  | "READY"
  | "APPROVAL_REQUIRED"
  | "APPROVED"
  | "IN_PROGRESS"
  | "RECOVERED"
  | "FAILED"
  | "STOPPED"
  | "ESCALATED";

export type RecoveryActionType =
  | "PAYMENT_RETRY"
  | "PAYMENT_RECOVERY_LINK"
  | "CUSTOMER_REMINDER"
  | "SUBSCRIPTION_RECOVERY"
  | "INVOICE_REMINDER"
  | "ESCALATE"
  | "STOP";

export interface Customer {
  id: string;
  merchant_id: string;
  name: string;
  email: string;
  phone: string;
  total_successful_transactions: number;
  total_failed_transactions: number;
  lifetime_value: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  merchant_id: string;
  customer_id: string;
  external_transaction_id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_type: string;
  status: string;
  failure_reason: string | null;
  failure_category: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface RecoveryAction {
  id: string;
  recovery_case_id: string;
  action_type: string;
  attempt_number: number;
  amount: number;
  status: string;
  reason: string | null;
  result_message: string | null;
  executed_at: string | null;
  created_at: string;
}

export interface RecoveryCase {
  id: string;
  transaction_id: string;
  revenue_at_risk: number;
  estimated_recoverable_amount: number;
  recovery_probability: number;
  priority_score: number;
  root_cause: string;
  recommended_action: string;
  confidence_score: number;
  status: RecoveryCaseStatus;
  created_at: string;
  updated_at: string;
  transaction?: Transaction;
  recovery_actions?: RecoveryAction[];
}

export interface DiagnosisResult {
  root_cause: string;
  explanation: string;
  recommended_action: string;
  confidence_score: number;
  factors: string[];
}

export interface ScoringResult {
  recovery_probability: number;
  confidence_score: number;
  contributing_factors: string[];
  expected_recovery_value: number;
}

export interface PriorityResult {
  priority_score: number;
  priority_level: "HIGH" | "MEDIUM" | "LOW";
  urgency_reason: string;
}

export interface GuardrailEvaluation {
  allowed: boolean;
  requires_approval: boolean;
  rule_triggered: string | null;
  reason: string;
}

export interface AnalysisResponse {
  case_id: string;
  transaction_id: string;
  diagnosis: DiagnosisResult;
  scoring: ScoringResult;
  priority: PriorityResult;
  guardrail: GuardrailEvaluation;
  recommended_action: string;
  status: string;
}

export interface ExecutionResult {
  case_id: string;
  action_type: string;
  attempt_number: number;
  status: string;
  result_message: string;
  mode: "DEMO" | "RAZORPAY_TEST";
  amount_recovered: number;
  guardrail_decision?: GuardrailEvaluation;
  details?: Record<string, unknown>;
}

export interface DashboardSummary {
  total_transactions: number;
  failed_transactions: number;
  total_revenue_at_risk: number;
  estimated_recoverable_revenue: number;
  actual_recovered_revenue: number;
  recovery_rate_percentage: number;
  active_recovery_cases: number;
  escalated_cases: number;
  successful_recoveries: number;
  failed_recovery_attempts: number;
  average_recovery_probability: number;
  average_priority_score: number;
}

export interface RecoveryTrendPoint {
  date: string;
  revenue_at_risk: number;
  recovered_revenue: number;
  cases_count: number;
}

export interface LeakBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface InsightsResponse {
  largest_revenue_leak_category: string;
  largest_revenue_leak_amount: number;
  highest_value_recovery_opportunity: {
    case_id: string;
    transaction_id: string;
    customer_name: string;
    amount: number;
    recovery_probability: number;
    estimated_recoverable: number;
    recommended_action: string;
    status: string;
  } | null;
  most_common_failure_reason: string;
  payment_method_failure_breakdown: LeakBreakdownItem[];
  recovery_performance_by_category: {
    category: string;
    leak_amount: number;
    case_count: number;
    share_percentage: number;
  }[];
  ai_recommendations: string[];
}

export interface SimulationRequest {
  recovery_window_hours: number;
  max_automated_attempts: number;
  minimum_recovery_probability: number;
}

export interface SimulationResponse {
  current_expected_recovery: number;
  simulated_expected_recovery: number;
  additional_recovery: number;
  affected_cases: number;
  total_cases_analyzed: number;
  assumptions: string[];
  parameters: Record<string, unknown>;
  label: string;
}

export interface AuditLog {
  id: string;
  merchant_id: string;
  transaction_id: string | null;
  recovery_case_id: string | null;
  event_type: string;
  actor: string;
  decision: string | null;
  reason: string | null;
  action: string | null;
  result: string | null;
  metadata_json: string | null;
  timestamp: string;
}

export interface DemoScenario {
  scenario: string;
  customer: string;
  amount: number;
  external_id: string;
  case_id: string | null;
  status: string;
  action: string;
  description: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
