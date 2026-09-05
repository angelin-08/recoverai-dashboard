# RecoverAI Dashboard

Build a polished, production-quality FRONTEND ONLY for a fintech AI product called RecoverAI — Autonomous Revenue Recovery Agent.

IMPORTANT:

This request is for the FRONTEND ONLY.

Do NOT build or require a real backend.

Do NOT connect Razorpay APIs yet.

Do NOT create fake API endpoints.

Do NOT implement real payment processing yet.

Use realistic MOCK DATA stored locally so the entire UI works and can be demonstrated.

Later, the backend, AI agent, database, Razorpay Test Mode and real APIs will be connected separately using Antigravity.

Therefore, structure the frontend cleanly so the mock data/services can easily be replaced with real APIs later.

PRODUCT PURPOSE

RecoverAI helps merchants identify revenue at risk, understand why revenue is being lost, prioritize recoverable transactions, recommend safe recovery actions, and track recovery performance.

The eventual AI workflow will be:

Detect → Diagnose → Calculate Recovery Probability → Prioritize → Recommend Action → Apply Guardrails → Execute → Measure → Audit

For this frontend, visually represent this workflow using mock data.

DESIGN DIRECTION

Create a premium modern fintech SaaS interface.

Visual inspiration:

Stripe Dashboard

Razorpay Dashboard

Linear

Vercel

Modern AI SaaS products

Style:

Clean

Professional

Minimal

Premium

Data-driven

Trustworthy

Not flashy or cartoonish

Excellent spacing and typography

Responsive on desktop and tablet

Use a primarily light interface with:

White / very light gray backgrounds

Dark navy/charcoal text

Subtle borders

Soft shadows

Blue/indigo accent color

Green for successful recovery

Amber for warnings

Red only for failures/high-risk states

Do not overuse gradients.

Use cards, tables, badges, charts, timelines and clear visual hierarchy.

APPLICATION LAYOUT

Create a persistent left sidebar and top header.

Sidebar:

RecoverAI logo

Overview

Revenue Risk

Recovery Center

Transactions

Insights

What-If Simulator

Audit Trail

Settings

Bottom of sidebar:

Merchant profile

"Demo Merchant"

Online status indicator

Top header:

Page title

Search

Notifications

Merchant/Test Mode indicator

Profile menu

Include a clearly visible "Test Mode" badge because the eventual application will use Razorpay Test Mode.

PAGE 1 — OVERVIEW DASHBOARD

Create a high-quality executive dashboard.

Header:

"Good morning, Demo Merchant"

Subtitle:

"Your AI revenue recovery overview"

Top metric cards:

Revenue at Risk
₹5,00,000
Change: +8.4%

Estimated Recoverable
₹3,10,000
Recovery potential: 62%

Revenue Recovered
₹2,15,000
Recovery rate: 69.4%

Transactions Analyzed
1,248
This month

Active Recovery Cases
47

Exceptions Requiring Review
8

Use realistic numbers and ensure all dashboard calculations are internally consistent.

Main sections:

A. Revenue Recovery Trend
Interactive-looking line/area chart showing:

Revenue at risk

Revenue recovered

Estimated recoverable

Use the last 7 days.

B. Revenue Leak Breakdown
Donut/pie chart:

Failed Payments

Checkout Abandonment

Subscription Failures

Overdue Invoices

C. AI Recovery Performance
Show:

Recovery attempts

Successful recoveries

Failed recoveries

Escalated cases

Average recovery probability

D. Priority Recovery Opportunities

Show 5 high-priority cases with:

Customer

Amount

Issue

Recovery probability

Priority score

Recommended action

Status

Example:

Priya Nair
₹3,000
Payment failure
92%
Priority 94
Recovery Link
Ready

Arjun Kumar
₹8,500
Subscription failure
81%
Priority 86
Retry Payment
Pending Approval

E. AI Insight card

Title:
"AI detected a revenue leak"

Content:
"UPI payment failures increased 18% this week and account for ₹84,200 of revenue at risk. 73% of these cases appear recoverable."

Button:
"View Recovery Opportunities"

PAGE 2 — REVENUE RISK

Purpose:
Show all revenue currently at risk.

Header:
"Revenue Risk"

Subtitle:
"Identify and understand where revenue is leaking."

Top cards:

Total Revenue at Risk

High Priority

Recoverable

Escalated

Add filters:

All

Failed Payment

Checkout Abandonment

Subscription

Invoice

High Priority

Add date range selector.

Create a professional data table with:

Customer
Transaction ID
Revenue at Risk
Issue
Root Cause
Recovery Probability
Priority Score
Recommended Action
Status

Use realistic mock records.

Clicking a row should open a detailed transaction/recovery panel.

PAGE 3 — RECOVERY CENTER

This is the most important page.

Header:
"AI Recovery Center"

Subtitle:
"Review and manage AI-generated recovery opportunities."

Show a large summary:

"₹3,10,000 estimated recoverable revenue"

Then create recovery opportunity cards/table.

Each case should display:

Customer

Amount

Problem

Recovery probability

Priority score

AI recommended action

Confidence

Guardrail status

Current status

Example actions:

Send Payment Recovery Link

Retry Payment

Send Reminder

Escalate to Merchant

Stop Recovery

Each case has buttons:

View Analysis

Approve

Reject

For high-value or low-confidence cases, show:
"Human Approval Required"

Do NOT make the AI automatically execute anything in this frontend version.

PAGE 4 — TRANSACTIONS

Create a complete transaction management page.

Features:

Search

Filters

Status tabs

Date filter

Transaction type filter

Table columns:

Transaction ID
Customer
Amount
Payment Method
Status
Failure Reason
Recovery Status
Date

Statuses:

Successful

Failed

At Risk

Recovering

Recovered

Escalated

Click a transaction to open a detailed side panel.

PAGE 5 — TRANSACTION / AI ANALYSIS DETAIL

Create a beautiful detailed view.

Show:

Customer:
Priya Nair

Transaction:
TXN-10482

Amount:
₹3,000

Status:
At Risk

Then create an AI analysis section:

AI Diagnosis

"Payment failed once. Customer has 4 previous successful transactions and the cart remains active."

Recovery Probability

92%

Show a circular progress indicator.

Priority Score

94 / 100

Recommended Action

"Send Payment Recovery Link"

Why this action?

"High recovery probability, first payment failure, active checkout and transaction value within the merchant's automatic recovery threshold."

Guardrails

Show checklist:

✓ Amount within permitted limit
✓ First automated recovery attempt
✓ No previous successful payment
✓ Recovery action allowed
✓ No duplicate transaction detected

Recovery Timeline

Detected
↓
Diagnosed
↓
AI Decision
↓
Approval
↓
Recovery Action
↓
Result

For the mock frontend, show one successful case and one failed case.

PAGE 6 — INSIGHTS

Create a merchant intelligence page.

Header:
"AI Revenue Insights"

Show:

Biggest Revenue Leak

"Payment failures"

₹84,200 at risk

Highest Recovery Opportunity

"Customers with one failed payment"

₹61,500 estimated recoverable

Recovery Performance

Charts showing:

Recovery rate

Revenue recovered

Average recovery probability

Recovery attempts

AI Recommendations

Create 3 recommendation cards:

"Payment failures increased 18% this week."
Recommended action:
"Review payment-method performance."

"Customers who failed once have a 73% recovery probability."
Recommended action:
"Prioritize first-failure recovery."

"8 high-value cases require merchant review."
Recommended action:
"Review escalated recovery cases."

PAGE 7 — WHAT-IF SIMULATOR

Make this one of the visually impressive pages.

Header:
"What-If Recovery Simulator"

Subtitle:
"Estimate how recovery strategies could affect revenue."

Create controls:

Recovery Window:
24 hours
48 hours
72 hours

Maximum Automated Attempts:
1
2
3

Minimum Recovery Probability:
50%
70%
80%

Then dynamically update mock results.

Example:

Current estimated recovery:
₹2,15,000

Projected recovery:
₹2,47,000

Potential additional recovery:
+₹32,000

Show a chart comparing:
Current Strategy vs Simulated Strategy.

Include a clear disclaimer:

"Simulation only. Results are estimates based on historical/demo data."

PAGE 8 — AUDIT TRAIL

This is extremely important.

Header:
"AI Audit Trail"

Subtitle:
"Every AI decision is explainable and traceable."

Create a searchable/filterable audit table.

Columns:

Timestamp
Transaction
Event
AI Decision
Reason
Action
Result
Actor

Create timeline details for individual transactions.

Example:

10:42 AM
Revenue detected at risk

10:43 AM
Root cause identified:
Payment failure

10:43 AM
Recovery probability:
92%

10:44 AM
Action selected:
Payment Recovery Link

10:44 AM
Guardrail check:
Passed

10:45 AM
Recovery result:
Successful

Show both successful and failed workflows.

For the failed example:

"Recovery stopped safely"

Reason:
"Maximum automated recovery attempts reached."

"Human review required."

PAGE 9 — SETTINGS

Create a simple settings page.

Sections:

Merchant Profile
Recovery Rules
Notification Preferences
AI Guardrails
Test Mode

Recovery Rules should visually show:

Maximum automated attempts: 2
Maximum automatic transaction value: ₹10,000
Human approval threshold: ₹10,000
Recovery window: 48 hours

These are FRONTEND DEMO SETTINGS only.

Clearly indicate:
"Demo configuration — backend enforcement will be implemented later."

MOCK DATA

Create enough realistic mock data to make the application look alive.

At minimum:

100+ transactions

30+ customers

Multiple payment methods

Multiple failure reasons

Successful and failed recoveries

Various recovery probabilities

Various priority scores

Audit events

Do not hard-code every table row manually if possible. Create reusable mock-data structures and generate records programmatically.

Make sure:

Dashboard numbers derive from mock data where practical.

Filters actually work.

Search actually works.

Sorting works.

Tabs work.

Detail panels open.

Navigation works.

Buttons produce frontend-only state changes where appropriate.

IMPORTANT AI REPRESENTATION

Do not pretend that a real AI backend exists yet.

Where AI reasoning is displayed, label it appropriately as:

"AI Analysis — Demo"

Use structured mock AI responses.

The architecture should make it easy later to replace mock AI responses with a real API.

COMPONENT STRUCTURE

Build reusable components:

Sidebar

Topbar

MetricCard

ChartCard

StatusBadge

PriorityBadge

RecoveryCaseCard

TransactionTable

TransactionDetail

AIAnalysisCard

GuardrailChecklist

AuditTimeline

ApprovalDialog

FilterBar

EmptyState

LoadingState

ErrorState

UX REQUIREMENTS

Fully responsive

Smooth transitions

Accessible buttons

Clear hover states

Good loading states

Good empty states

Good error states

No broken links

No placeholder lorem ipsum

No unfinished sections

No "coming soon" screens for the core pages

Every sidebar item should lead to a functional frontend page.

VISUAL QUALITY

This is a buildathon project and the frontend will be shown to judges.

Prioritize:

Premium fintech appearance

Strong typography

Excellent spacing

Clear charts

Strong information hierarchy

Professional data tables

Subtle animations

High-quality empty/loading/error states

The UI should look like a real startup product that could be shown to a merchant.

TECHNICAL FRONTEND REQUIREMENTS

Use:

React

TypeScript

Tailwind CSS

Modern component architecture

Reusable components

Local mock data/state for now

Keep the code organized so a real backend can later replace the mock services without redesigning the UI.

Create a clear mock service/data layer such as:

src/
components/
pages/
data/
services/
types/
hooks/
utils/

The future backend will provide:

transactions

revenue-risk analysis

AI recovery recommendations

recovery actions

audit logs

metrics

Do not implement those backend services now.

FINAL REQUIREMENT

Before finishing, ensure the application feels like a complete, polished fintech product rather than a generic admin dashboard.

The primary demo journey should be:

Dashboard
→ Revenue Risk
→ Select high-priority transaction
→ View AI Diagnosis
→ View Recovery Probability
→ View Recommended Action
→ View Guardrails
→ Approve/Reject
→ View Audit Trail
→ View Recovery Result

Make this journey visually excellent because it will be the main buildathon demo flow.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a03a83b3-dda5-40b5-8fef-780d8ad6651b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
