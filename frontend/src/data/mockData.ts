import type {
  AuditEvent,
  CaseStatus,
  Customer,
  Guardrail,
  IssueType,
  PaymentMethod,
  RecoveryAction,
  Transaction,
  TransactionStatus,
} from "@/types";

/* ------------------------------------------------------------------ *
 * Deterministic pseudo-random generator so the demo data is stable
 * across renders / SSR hydration.
 * ------------------------------------------------------------------ */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260823);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const between = (min: number, max: number) => min + rand() * (max - min);

const FIRST = [
  "Priya",
  "Arjun",
  "Rohan",
  "Ananya",
  "Kavya",
  "Vikram",
  "Neha",
  "Aditya",
  "Meera",
  "Rahul",
  "Ishaan",
  "Sneha",
  "Karan",
  "Divya",
  "Aarav",
  "Pooja",
  "Siddharth",
  "Tara",
  "Nikhil",
  "Riya",
  "Manav",
  "Aisha",
  "Varun",
  "Lakshmi",
  "Dhruv",
  "Sanya",
  "Yash",
  "Nandini",
  "Aryan",
  "Ritika",
  "Kabir",
  "Shreya",
];
const LAST = [
  "Nair",
  "Kumar",
  "Mehta",
  "Sharma",
  "Reddy",
  "Iyer",
  "Chopra",
  "Verma",
  "Banerjee",
  "Desai",
  "Rao",
  "Joshi",
  "Kapoor",
  "Pillai",
  "Sinha",
  "Bhatt",
];

const METHODS: PaymentMethod[] = [
  "UPI",
  "UPI",
  "UPI",
  "Credit Card",
  "Credit Card",
  "Debit Card",
  "Netbanking",
  "Wallet",
  "EMI",
];

const ISSUE_LABEL: Record<IssueType, string> = {
  failed_payment: "Failed payment",
  checkout_abandonment: "Checkout abandonment",
  subscription_failure: "Subscription failure",
  overdue_invoice: "Overdue invoice",
};

const FAILURE_REASONS: Record<IssueType, string[]> = {
  failed_payment: [
    "UPI collect request expired",
    "Insufficient funds",
    "Issuing bank declined",
    "Payment gateway timeout",
    "3DS authentication failed",
  ],
  checkout_abandonment: [
    "Customer left at payment step",
    "Session expired before payment",
    "Method selection abandoned",
  ],
  subscription_failure: [
    "Mandate debit failed",
    "Card expired on file",
    "Auto-debit limit exceeded",
  ],
  overdue_invoice: ["Invoice unpaid past due date", "Payment link never opened"],
};

const ROOT_CAUSES: Record<string, string> = {
  "UPI collect request expired": "Customer did not approve the collect request in time",
  "Insufficient funds": "Account balance below transaction amount at attempt time",
  "Issuing bank declined": "Issuer risk rules blocked the authorisation",
  "Payment gateway timeout": "Upstream acquirer latency during authorisation",
  "3DS authentication failed": "OTP not entered within the authentication window",
  "Customer left at payment step": "Friction at the payment method screen",
  "Session expired before payment": "Checkout session TTL reached",
  "Method selection abandoned": "Preferred payment method unavailable",
  "Mandate debit failed": "Bank mandate rejected the recurring debit",
  "Card expired on file": "Stored card past expiry date",
  "Auto-debit limit exceeded": "Debit amount above mandate cap",
  "Invoice unpaid past due date": "No payment attempt after invoice issue",
  "Payment link never opened": "Notification not delivered or ignored",
};

export const ISSUE_TYPES: IssueType[] = [
  "failed_payment",
  "checkout_abandonment",
  "subscription_failure",
  "overdue_invoice",
];

export const issueLabel = (i: IssueType) => ISSUE_LABEL[i];

/* -------------------------------- customers -------------------------------- */
const CUSTOMER_COUNT = 34;
export const customers: Customer[] = Array.from({ length: CUSTOMER_COUNT }, (_, i) => {
  const name = `${FIRST[i % FIRST.length]} ${pick(LAST)}`;
  const prior = Math.floor(between(0, 14));
  return {
    id: `CUST-${(1200 + i).toString()}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    segment: prior > 9 ? "Loyal" : prior > 4 ? "Returning" : prior > 1 ? "Returning" : "New",
    previousSuccessfulTransactions: prior,
    lifetimeValue: Math.round(between(4000, 190000) / 100) * 100,
  };
});
// Anchor the two demo-journey customers.
customers[0] = {
  ...customers[0]!,
  name: "Priya Nair",
  email: "priya.nair@example.com",
  segment: "Loyal",
  previousSuccessfulTransactions: 4,
  lifetimeValue: 48200,
};
customers[1] = {
  ...customers[1]!,
  name: "Arjun Kumar",
  email: "arjun.kumar@example.com",
  segment: "Returning",
  previousSuccessfulTransactions: 6,
  lifetimeValue: 96400,
};

/* ------------------------------ transactions ------------------------------ */
const TOTAL = 148;
const NOW = new Date("2026-08-23T10:45:00+05:30").getTime();
const DAY = 86400000;

function buildGuardrails(
  amount: number,
  attempts: number,
  prior: number,
  duplicate: boolean,
): Guardrail[] {
  return [
    {
      label: "Amount within permitted limit",
      passed: amount <= 10000,
      detail: `₹${amount.toLocaleString("en-IN")} against a ₹10,000 automatic limit`,
    },
    {
      label: "Automated attempts remaining",
      passed: attempts < 2,
      detail: `${attempts} of 2 automated attempts used`,
    },
    {
      label: "No successful payment for this order",
      passed: true,
      detail: "No settled payment found against this order reference",
    },
    {
      label: "Recovery action allowed for customer",
      passed: prior >= 0,
      detail: "Customer has not opted out of recovery communication",
    },
    {
      label: "No duplicate transaction detected",
      passed: !duplicate,
      detail: duplicate
        ? "A near-identical attempt was seen in the last 10 minutes"
        : "No matching amount + customer pair in the last 24 hours",
    },
  ];
}

function chooseAction(
  issue: IssueType,
  probability: number,
  attempts: number,
  amount: number,
): RecoveryAction {
  if (attempts >= 2) return "Stop Recovery";
  if (amount > 10000) return "Escalate to Merchant";
  if (probability < 0.45) return "Send Reminder";
  if (issue === "subscription_failure") return "Retry Payment";
  if (issue === "overdue_invoice") return "Send Reminder";
  return "Send Payment Recovery Link";
}

function diagnose(t: {
  issue: IssueType;
  attempts: number;
  prior: number;
  reason: string;
  probability: number;
}) {
  const base: Record<IssueType, string> = {
    failed_payment: `Payment failed ${t.attempts === 1 ? "once" : `${t.attempts} times`} (${t.reason.toLowerCase()}). Customer has ${t.prior} previous successful transactions and the cart remains active.`,
    checkout_abandonment: `Checkout was abandoned at the payment step (${t.reason.toLowerCase()}). Intent signal is strong — the session reached the final step with ${t.prior} prior successful purchases on record.`,
    subscription_failure: `Recurring debit failed (${t.reason.toLowerCase()}). The subscription is still active and the customer has ${t.prior} successful billing cycles.`,
    overdue_invoice: `Invoice is past due (${t.reason.toLowerCase()}). No payment attempt has been recorded and the customer has ${t.prior} prior settled invoices.`,
  };
  return base[t.issue];
}

function rationale(action: RecoveryAction, probability: number, amount: number, attempts: number) {
  switch (action) {
    case "Send Payment Recovery Link":
      return `High recovery probability (${Math.round(probability * 100)}%), first payment failure, active checkout and a transaction value of ₹${amount.toLocaleString("en-IN")} within the merchant's automatic recovery threshold.`;
    case "Retry Payment":
      return `The failure is transient and issuer-side. A single retry inside the recovery window has historically converted ${Math.round(probability * 100)}% of comparable subscription failures.`;
    case "Send Reminder":
      return `Recovery probability is moderate (${Math.round(probability * 100)}%). A low-pressure reminder preserves customer experience while keeping the recovery path open.`;
    case "Escalate to Merchant":
      return `Transaction value of ₹${amount.toLocaleString("en-IN")} exceeds the ₹10,000 automatic recovery threshold, so merchant approval is required before any action.`;
    default:
      return `Maximum automated recovery attempts (${attempts}) reached. The agent stops safely and hands the case to human review.`;
  }
}

const riskStatuses: TransactionStatus[] = [
  "at_risk",
  "at_risk",
  "recovering",
  "recovered",
  "failed",
  "escalated",
];

function makeTransaction(i: number): Transaction {
  const customer = customers[Math.floor(rand() * customers.length)]!;
  const issue = pick(ISSUE_TYPES);
  const reason = pick(FAILURE_REASONS[issue]);
  const method = pick(METHODS);
  const amount = Math.round(between(600, 24000) / 50) * 50;
  const isSuccessful = rand() < 0.36;
  const status: TransactionStatus = isSuccessful ? "successful" : pick(riskStatuses);
  const attempts = status === "failed" ? 2 : Math.floor(between(0, 2)) + 1;
  const prior = customer.previousSuccessfulTransactions;
  let probability = 0.28 + prior * 0.035 + (issue === "checkout_abandonment" ? 0.12 : 0.06);
  probability += between(-0.1, 0.24) - (attempts - 1) * 0.14 - (amount > 12000 ? 0.06 : 0);
  probability = Math.min(0.96, Math.max(0.12, probability));
  const priorityScore = Math.round(
    Math.min(99, probability * 55 + Math.min(amount / 24000, 1) * 40 + between(0, 8)),
  );
  const action = chooseAction(issue, probability, attempts, amount);
  const requiresApproval = amount > 10000 || probability < 0.4;
  const confidence = Math.min(0.98, Math.max(0.42, probability + between(-0.05, 0.14)));
  const duplicate = rand() < 0.05;

  const caseStatus: CaseStatus =
    status === "recovered"
      ? "recovered"
      : status === "failed"
        ? "failed"
        : status === "escalated"
          ? "pending_approval"
          : status === "recovering"
            ? "in_progress"
            : requiresApproval
              ? "pending_approval"
              : "ready";

  const createdAt = new Date(NOW - rand() * 7 * DAY).toISOString();

  return {
    id: `TXN-${10300 + i}`,
    customerId: customer.id,
    customerName: customer.name,
    amount,
    method,
    status,
    issueType: issue,
    failureReason: isSuccessful ? "—" : reason,
    rootCause: isSuccessful ? "—" : (ROOT_CAUSES[reason] ?? reason),
    recoveryProbability: isSuccessful ? 0 : Number(probability.toFixed(2)),
    priorityScore: isSuccessful ? 0 : priorityScore,
    recommendedAction: action,
    confidence: Number(confidence.toFixed(2)),
    caseStatus,
    requiresApproval,
    attempts,
    createdAt,
    aiDiagnosis: isSuccessful
      ? "Payment settled successfully. No recovery action required."
      : diagnose({ issue, attempts, prior, reason, probability }),
    actionRationale: rationale(action, probability, amount, attempts),
    guardrails: buildGuardrails(amount, attempts, prior, duplicate),
    estimatedRecoverable: 0,
    recoveredAmount: 0,
    atRiskAmount: 0,
  };
}

const generated: Transaction[] = Array.from({ length: TOTAL }, (_, i) => makeTransaction(i));

/* The two anchored demo cases used in the buildathon walkthrough. */
const priya: Transaction = {
  ...generated[0]!,
  id: "TXN-10482",
  customerId: customers[0]!.id,
  customerName: "Priya Nair",
  amount: 3000,
  method: "UPI",
  status: "at_risk",
  issueType: "failed_payment",
  failureReason: "UPI collect request expired",
  rootCause: "Customer did not approve the collect request in time",
  recoveryProbability: 0.92,
  priorityScore: 94,
  recommendedAction: "Send Payment Recovery Link",
  confidence: 0.94,
  caseStatus: "ready",
  requiresApproval: false,
  attempts: 1,
  createdAt: new Date(NOW - 3 * 3600_000).toISOString(),
  aiDiagnosis:
    "Payment failed once. Customer has 4 previous successful transactions and the cart remains active.",
  actionRationale:
    "High recovery probability, first payment failure, active checkout and transaction value within the merchant's automatic recovery threshold.",
  guardrails: buildGuardrails(3000, 1, 4, false),
};

const arjun: Transaction = {
  ...generated[1]!,
  id: "TXN-10488",
  customerId: customers[1]!.id,
  customerName: "Arjun Kumar",
  amount: 8500,
  method: "Credit Card",
  status: "at_risk",
  issueType: "subscription_failure",
  failureReason: "Mandate debit failed",
  rootCause: "Bank mandate rejected the recurring debit",
  recoveryProbability: 0.81,
  priorityScore: 86,
  recommendedAction: "Retry Payment",
  confidence: 0.83,
  caseStatus: "pending_approval",
  requiresApproval: true,
  attempts: 1,
  createdAt: new Date(NOW - 6 * 3600_000).toISOString(),
  aiDiagnosis:
    "Recurring debit failed on the second billing cycle. The subscription is active and the customer has 6 successful billing cycles.",
  actionRationale:
    "The failure is transient and issuer-side. A single retry inside the recovery window has historically converted 81% of comparable subscription failures.",
  guardrails: buildGuardrails(8500, 1, 6, false),
};

const stoppedCase: Transaction = {
  ...generated[2]!,
  id: "TXN-10455",
  customerName: "Rohan Mehta",
  amount: 14500,
  method: "Netbanking",
  status: "failed",
  issueType: "failed_payment",
  failureReason: "Issuing bank declined",
  rootCause: "Issuer risk rules blocked the authorisation",
  recoveryProbability: 0.34,
  priorityScore: 71,
  recommendedAction: "Stop Recovery",
  confidence: 0.61,
  caseStatus: "stopped",
  requiresApproval: true,
  attempts: 2,
  createdAt: new Date(NOW - 22 * 3600_000).toISOString(),
  aiDiagnosis:
    "Two automated recovery attempts failed with the same issuer decline. Recovery was stopped safely to avoid customer fatigue.",
  actionRationale:
    "Maximum automated recovery attempts reached and transaction value exceeds the ₹10,000 automatic threshold. Human review required.",
  guardrails: buildGuardrails(14500, 2, 3, false),
};

const anchored = [priya, arjun, stoppedCase];
export const transactions: Transaction[] = [...anchored, ...generated.slice(3)];

/* --------------- calibrate money so headline metrics stay on-brief --------------- */
const AT_RISK_STATUSES: TransactionStatus[] = ["at_risk", "recovering", "escalated", "failed"];
const TARGET_AT_RISK = 500000;
const TARGET_RECOVERABLE = 310000;
const TARGET_RECOVERED = 215000;

const riskTx = transactions.filter((t) => AT_RISK_STATUSES.includes(t.status));
const recoveredTx = transactions.filter((t) => t.status === "recovered");

const riskScale = TARGET_AT_RISK / riskTx.reduce((s, t) => s + t.amount, 0);
riskTx.forEach((t) => {
  t.atRiskAmount = Math.round((t.amount * riskScale) / 10) * 10;
});
const recoverableRaw = riskTx.reduce((s, t) => s + t.atRiskAmount * t.recoveryProbability, 0);
const recoverableScale = TARGET_RECOVERABLE / recoverableRaw;
riskTx.forEach((t) => {
  t.estimatedRecoverable = Math.round(t.atRiskAmount * t.recoveryProbability * recoverableScale);
});
const recoveredScale = TARGET_RECOVERED / recoveredTx.reduce((s, t) => s + t.amount, 0);
recoveredTx.forEach((t) => {
  t.recoveredAmount = Math.round((t.amount * recoveredScale) / 10) * 10;
  t.estimatedRecoverable = t.recoveredAmount;
});

/* -------------------------------- audit trail -------------------------------- */
const ACTORS = ["RecoverAI Agent", "Merchant", "System"] as const;

function fmtTime(d: Date) {
  return d.toISOString();
}

function auditForTransaction(t: Transaction, idx: number): AuditEvent[] {
  const base = new Date(t.createdAt).getTime();
  const step = (m: number) => fmtTime(new Date(base + m * 60000));
  const rows: AuditEvent[] = [
    {
      id: `AUD-${idx}-1`,
      timestamp: step(0),
      transactionId: t.id,
      event: "Revenue detected at risk",
      aiDecision: "Flag transaction",
      reason: `${issueLabel(t.issueType)} on ₹${t.amount.toLocaleString("en-IN")}`,
      action: "Added to recovery queue",
      result: "Passed",
      actor: "RecoverAI Agent",
    },
    {
      id: `AUD-${idx}-2`,
      timestamp: step(1),
      transactionId: t.id,
      event: "Root cause identified",
      aiDecision: t.rootCause,
      reason: t.failureReason,
      action: "Diagnosis recorded",
      result: "Passed",
      actor: "RecoverAI Agent",
    },
    {
      id: `AUD-${idx}-3`,
      timestamp: step(1),
      transactionId: t.id,
      event: "Recovery probability calculated",
      aiDecision: `${Math.round(t.recoveryProbability * 100)}% recovery probability`,
      reason: `Customer history, failure class and value band scored (priority ${t.priorityScore})`,
      action: "Case prioritised",
      result: "Passed",
      actor: "RecoverAI Agent",
    },
    {
      id: `AUD-${idx}-4`,
      timestamp: step(2),
      transactionId: t.id,
      event: "Action selected",
      aiDecision: t.recommendedAction,
      reason: t.actionRationale,
      action: t.recommendedAction,
      result: "Pending",
      actor: "RecoverAI Agent",
    },
    {
      id: `AUD-${idx}-5`,
      timestamp: step(2),
      transactionId: t.id,
      event: "Guardrail check",
      aiDecision: t.guardrails.every((g) => g.passed)
        ? "All guardrails passed"
        : "Guardrail blocked",
      reason: t.guardrails.every((g) => g.passed)
        ? "Value, attempt count and duplication checks satisfied"
        : (t.guardrails.find((g) => !g.passed)?.detail ?? "Guardrail failed"),
      action: t.guardrails.every((g) => g.passed) ? "Proceed" : "Hold for review",
      result: t.guardrails.every((g) => g.passed) ? "Passed" : "Stopped",
      actor: "System",
    },
  ];

  if (t.status === "recovered") {
    rows.push({
      id: `AUD-${idx}-6`,
      timestamp: step(3),
      transactionId: t.id,
      event: "Recovery result",
      aiDecision: "Recovery successful",
      reason: `Customer completed payment of ₹${t.amount.toLocaleString("en-IN")}`,
      action: t.recommendedAction,
      result: "Success",
      actor: "RecoverAI Agent",
    });
  } else if (t.status === "failed" || t.caseStatus === "stopped") {
    rows.push({
      id: `AUD-${idx}-6`,
      timestamp: step(3),
      transactionId: t.id,
      event: "Recovery stopped safely",
      aiDecision: "Stop Recovery",
      reason: "Maximum automated recovery attempts reached. Human review required.",
      action: "Escalated to merchant queue",
      result: "Stopped",
      actor: "RecoverAI Agent",
    });
  } else if (t.requiresApproval) {
    rows.push({
      id: `AUD-${idx}-6`,
      timestamp: step(3),
      transactionId: t.id,
      event: "Human approval requested",
      aiDecision: "Await merchant decision",
      reason: `Value ₹${t.amount.toLocaleString("en-IN")} above automatic threshold or confidence below policy`,
      action: "Queued for approval",
      result: "Pending",
      actor: ACTORS[1],
    });
  }
  return rows;
}

export const auditEvents: AuditEvent[] = transactions
  .filter((t) => t.status !== "successful")
  .flatMap((t, i) => auditForTransaction(t, i))
  .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

export const TRANSACTIONS_ANALYZED = 1248;
