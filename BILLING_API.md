# Billing, Payment & Subscription API

This document covers the complete billing module — subscription plans, payment processing, and credit usage tracking. All endpoints require a valid JWT bearer token unless noted otherwise.

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Auth](#base-url--auth)
3. [Plans](#plans)
4. [Subscriptions](#subscriptions)
5. [Payments](#payments)
6. [Credit Usage](#credit-usage)
7. [Data Models](#data-models)
8. [Enums Reference](#enums-reference)
9. [Error Reference](#error-reference)
10. [Frontend Integration Examples](#frontend-integration-examples)

---

## Overview

### How It Works

```
User selects a plan
        ↓
POST /billing/payment/process  ←  single call to pay + subscribe
        ↓
Payment record created (status: COMPLETED)
        ↓
Subscription created (isActive: true)
        ↓
User gets access to plan features immediately
```

- **Payment method**: Currently `MOCK` (instant success, no external gateway). Stripe/PayPal fields are prepared in the database for future integration.
- **One active subscription at a time**: Processing a new payment automatically deactivates the previous subscription.
- **Credits**: Each plan allocates a monthly AI credit balance. Credits are consumed per AI job.

---

## Base URL & Auth

```
Base URL: /billing
Auth:     Bearer token in Authorization header
```

All endpoints require authentication. Admin-only endpoints additionally require the `ADMIN` role.

---

## Plans

### GET `/billing/plans`

Returns all available subscription plans, ordered by price ascending. **No authentication required** — safe to call from a public pricing page.

**Response `200`**

```json
{
  "plans": [
    {
      "id": 1,
      "name": "Starter",
      "description": "For individual agents getting started",
      "monthlyPriceUsd": "29.00",
      "maxAiCredits": 500,
      "maxStorageMb": 5120,
      "enhancementCreditsPerSecond": "0.1000",
      "virtualStagingCreditsPerSecond": "0.2000",
      "adGenerationCreditsPerSecond": "0.0500",
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Professional",
      "description": "For growing teams",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 2000,
      "maxStorageMb": 20480,
      "enhancementCreditsPerSecond": "0.1000",
      "virtualStagingCreditsPerSecond": "0.2000",
      "adGenerationCreditsPerSecond": "0.0500",
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": 3,
      "name": "Enterprise",
      "description": "For large brokerages",
      "monthlyPriceUsd": "199.00",
      "maxAiCredits": 10000,
      "maxStorageMb": 102400,
      "enhancementCreditsPerSecond": "0.1000",
      "virtualStagingCreditsPerSecond": "0.2000",
      "adGenerationCreditsPerSecond": "0.0500",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Subscriptions

### GET `/billing/me/subscription`

Returns the authenticated user's current active subscription, or `null` if they have none.

**Response `200` — active subscription**

```json
{
  "subscription": {
    "id": 12,
    "userId": 5,
    "planId": 2,
    "startDate": "2026-03-08T14:00:00.000Z",
    "endDate": null,
    "isActive": true,
    "createdAt": "2026-03-08T14:00:00.000Z",
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 2000,
      "maxStorageMb": 20480
    }
  }
}
```

**Response `200` — no subscription**

```json
{
  "subscription": null
}
```

---

### POST `/billing/subscribe`

> ⚠️ **Legacy endpoint** — creates a subscription record without creating a payment record. Use `POST /billing/payment/process` instead for the full payment + subscription flow.

**Request Body**

```json
{
  "planId": 2
}
```

**Response `201`**

```json
{
  "subscription": {
    "id": 13,
    "userId": 5,
    "planId": 2,
    "startDate": "2026-03-08T14:00:00.000Z",
    "endDate": null,
    "isActive": true,
    "createdAt": "2026-03-08T14:00:00.000Z",
    "plan": { ... }
  }
}
```

---

## Payments

### POST `/billing/payment/process`

The **primary payment endpoint**. Processes a mock payment and instantly activates the subscription. This is the single call a user needs to make when clicking "Buy" or "Upgrade".

What happens server-side:

1. Validates the plan exists
2. Deactivates any existing active subscription
3. Creates a new active subscription
4. Creates a `COMPLETED` payment record linked to the subscription

**Request Body**

```json
{
  "planId": 2
}
```

| Field    | Type     | Required | Description                |
| -------- | -------- | -------- | -------------------------- |
| `planId` | `number` | ✅       | ID of the plan to purchase |

**Response `201`**

```json
{
  "message": "Payment processed successfully",
  "payment": {
    "id": 7,
    "userId": 5,
    "subscriptionId": 12,
    "planId": 2,
    "amount": "79.00",
    "currency": "USD",
    "status": "COMPLETED",
    "paymentMethod": "MOCK",
    "stripePaymentId": null,
    "stripeCustomerId": null,
    "paypalTransactionId": null,
    "description": "Mock payment for Professional plan",
    "metadata": null,
    "paidAt": "2026-03-08T14:00:00.000Z",
    "createdAt": "2026-03-08T14:00:00.000Z",
    "updatedAt": "2026-03-08T14:00:00.000Z",
    "user": {
      "id": 5,
      "email": "john@example.com",
      "displayName": "John Smith"
    },
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 2000,
      "maxStorageMb": 20480
    },
    "subscription": {
      "id": 12,
      "isActive": true,
      "startDate": "2026-03-08T14:00:00.000Z",
      "plan": {
        "id": 2,
        "name": "Professional"
      }
    }
  },
  "subscription": {
    "id": 12,
    "userId": 5,
    "planId": 2,
    "startDate": "2026-03-08T14:00:00.000Z",
    "endDate": null,
    "isActive": true,
    "createdAt": "2026-03-08T14:00:00.000Z",
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 2000,
      "maxStorageMb": 20480
    }
  }
}
```

**Error Responses**

| Status | Error                                     | Reason                          |
| ------ | ----------------------------------------- | ------------------------------- |
| `400`  | `planId is required and must be a number` | Missing or non-numeric `planId` |
| `404`  | `Plan not found`                          | `planId` does not exist         |
| `401`  | `Unauthorized`                            | Missing or invalid token        |

---

### GET `/billing/me/payments`

Returns a paginated list of the authenticated user's payment history, newest first.

**Query Parameters**

| Param    | Type     | Default | Description               |
| -------- | -------- | ------- | ------------------------- |
| `limit`  | `number` | `50`    | Max records to return     |
| `offset` | `number` | `0`     | Number of records to skip |

**Response `200`**

```json
{
  "payments": [
    {
      "id": 7,
      "userId": 5,
      "subscriptionId": 12,
      "planId": 2,
      "amount": "79.00",
      "currency": "USD",
      "status": "COMPLETED",
      "paymentMethod": "MOCK",
      "description": "Mock payment for Professional plan",
      "paidAt": "2026-03-08T14:00:00.000Z",
      "createdAt": "2026-03-08T14:00:00.000Z",
      "plan": {
        "id": 2,
        "name": "Professional",
        "monthlyPriceUsd": "79.00"
      },
      "subscription": {
        "id": 12,
        "isActive": true,
        "startDate": "2026-03-08T14:00:00.000Z"
      }
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### GET `/billing/me/payments/:id`

Returns a single payment record by ID. Users can only retrieve their own payments.

**URL Parameters**

| Param | Type     | Description |
| ----- | -------- | ----------- |
| `id`  | `number` | Payment ID  |

**Response `200`**

```json
{
  "payment": {
    "id": 7,
    "userId": 5,
    "subscriptionId": 12,
    "planId": 2,
    "amount": "79.00",
    "currency": "USD",
    "status": "COMPLETED",
    "paymentMethod": "MOCK",
    "description": "Mock payment for Professional plan",
    "metadata": null,
    "paidAt": "2026-03-08T14:00:00.000Z",
    "createdAt": "2026-03-08T14:00:00.000Z",
    "updatedAt": "2026-03-08T14:00:00.000Z",
    "user": {
      "id": 5,
      "email": "john@example.com",
      "displayName": "John Smith"
    },
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 2000,
      "maxStorageMb": 20480
    },
    "subscription": {
      "id": 12,
      "isActive": true,
      "startDate": "2026-03-08T14:00:00.000Z"
    }
  }
}
```

**Error Responses**

| Status | Error                | Reason                                           |
| ------ | -------------------- | ------------------------------------------------ |
| `400`  | `Invalid payment id` | Non-numeric `:id`                                |
| `404`  | `Payment not found`  | Payment doesn't exist or belongs to another user |

---

## Credit Usage

### GET `/billing/me/usage`

Returns the user's AI credit consumption summary for their active subscription period.

**Response `200`**

```json
{
  "usage": {
    "subscriptionId": 12,
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 2000,
      "maxStorageMb": 20480
    },
    "usage": {
      "usedCredits": 340,
      "remainingCredits": 1660
    }
  }
}
```

**Error Responses**

| Status | Error                    | Reason                          |
| ------ | ------------------------ | ------------------------------- |
| `404`  | `No active subscription` | User has no active subscription |

---

## Admin Endpoints

> Requires `ADMIN` role.

### POST `/billing/plans`

Create a new subscription plan.

**Request Body**

```json
{
  "name": "Enterprise",
  "description": "For large brokerages",
  "monthlyPriceUsd": 199,
  "maxAiCredits": 10000,
  "maxStorageMb": 102400
}
```

| Field             | Type     | Required | Description             |
| ----------------- | -------- | -------- | ----------------------- |
| `name`            | `string` | ✅       | Unique plan name        |
| `description`     | `string` | ❌       | Plan description        |
| `monthlyPriceUsd` | `number` | ✅       | Monthly price in USD    |
| `maxAiCredits`    | `number` | ✅       | Monthly AI credit limit |
| `maxStorageMb`    | `number` | ✅       | Storage limit in MB     |

**Response `201`**

```json
{
  "plan": {
    "id": 3,
    "name": "Enterprise",
    "description": "For large brokerages",
    "monthlyPriceUsd": "199.00",
    "maxAiCredits": 10000,
    "maxStorageMb": 102400,
    "enhancementCreditsPerSecond": "0.1000",
    "virtualStagingCreditsPerSecond": "0.2000",
    "adGenerationCreditsPerSecond": "0.0500",
    "createdAt": "2026-03-08T14:00:00.000Z"
  }
}
```

---

### PATCH `/billing/plans/:id`

Update an existing plan. All fields are optional.

**Request Body** (all fields optional)

```json
{
  "name": "Enterprise Plus",
  "description": "Updated description",
  "monthlyPriceUsd": 249,
  "maxAiCredits": 15000,
  "maxStorageMb": 204800
}
```

**Response `200`**

```json
{
  "plan": {
    "id": 3,
    "name": "Enterprise Plus",
    ...
  }
}
```

---

## Data Models

### Plan

| Field                            | Type             | Description                                      |
| -------------------------------- | ---------------- | ------------------------------------------------ |
| `id`                             | `number`         | Unique identifier                                |
| `name`                           | `string`         | Plan name (unique)                               |
| `description`                    | `string \| null` | Plan description                                 |
| `monthlyPriceUsd`                | `string`         | Monthly price (decimal string)                   |
| `maxAiCredits`                   | `number`         | Monthly AI credit allowance                      |
| `maxStorageMb`                   | `number`         | Storage allowance in MB                          |
| `enhancementCreditsPerSecond`    | `string`         | Credits charged per second for photo enhancement |
| `virtualStagingCreditsPerSecond` | `string`         | Credits charged per second for virtual staging   |
| `adGenerationCreditsPerSecond`   | `string`         | Credits charged per second for ad copy           |
| `createdAt`                      | `string`         | ISO 8601 timestamp                               |

### Subscription

| Field            | Type             | Description                                       |
| ---------------- | ---------------- | ------------------------------------------------- |
| `id`             | `number`         | Unique identifier                                 |
| `userId`         | `number \| null` | Owning user (or `organizationId` for org-level)   |
| `organizationId` | `number \| null` | Owning organization                               |
| `planId`         | `number`         | Associated plan                                   |
| `startDate`      | `string`         | When subscription became active                   |
| `endDate`        | `string \| null` | When subscription was ended (null = still active) |
| `isActive`       | `boolean`        | Whether this subscription is currently active     |
| `createdAt`      | `string`         | ISO 8601 timestamp                                |
| `plan`           | `Plan`           | Nested plan object (included in responses)        |

### Payment

| Field                 | Type             | Description                           |
| --------------------- | ---------------- | ------------------------------------- |
| `id`                  | `number`         | Unique identifier                     |
| `userId`              | `number`         | User who made the payment             |
| `subscriptionId`      | `number`         | Subscription this payment activated   |
| `planId`              | `number`         | Plan that was purchased               |
| `amount`              | `string`         | Amount charged (decimal string)       |
| `currency`            | `string`         | Currency code (default `"USD"`)       |
| `status`              | `PaymentStatus`  | Payment status                        |
| `paymentMethod`       | `PaymentMethod`  | Payment method used                   |
| `stripePaymentId`     | `string \| null` | Stripe payment intent ID (future use) |
| `stripeCustomerId`    | `string \| null` | Stripe customer ID (future use)       |
| `paypalTransactionId` | `string \| null` | PayPal transaction ID (future use)    |
| `description`         | `string \| null` | Human-readable description            |
| `metadata`            | `object \| null` | Arbitrary JSON metadata               |
| `paidAt`              | `string \| null` | Timestamp when payment completed      |
| `createdAt`           | `string`         | ISO 8601 timestamp                    |
| `updatedAt`           | `string`         | ISO 8601 timestamp                    |

---

## Enums Reference

### `PaymentStatus`

| Value       | Description                             |
| ----------- | --------------------------------------- |
| `PENDING`   | Payment initiated but not yet completed |
| `COMPLETED` | Payment successful                      |
| `FAILED`    | Payment failed                          |
| `REFUNDED`  | Payment was refunded                    |

### `PaymentMethod`

| Value         | Description                                                |
| ------------- | ---------------------------------------------------------- |
| `MOCK`        | Instant artificial payment (current — development/testing) |
| `STRIPE`      | Stripe payment gateway (future integration)                |
| `PAYPAL`      | PayPal (future integration)                                |
| `CREDIT_CARD` | Direct card processing (future integration)                |

---

## Error Reference

| Status | Error Message                             | What to do                                            |
| ------ | ----------------------------------------- | ----------------------------------------------------- |
| `400`  | `planId is required and must be a number` | Ensure `planId` is a valid integer                    |
| `400`  | `Invalid payment id`                      | Ensure payment `:id` in URL is an integer             |
| `401`  | `Unauthorized`                            | Attach a valid Bearer token                           |
| `404`  | `Plan not found`                          | The plan ID doesn't exist — re-fetch plans            |
| `404`  | `Payment not found`                       | Payment ID doesn't exist or belongs to another user   |
| `404`  | `No active subscription`                  | User has no active subscription — prompt to subscribe |
| `500`  | `Internal server error`                   | Server-side failure — retry or report                 |

---

## Frontend Integration Examples

### Pricing Page — Fetch Plans

```tsx
// components/PricingPage.tsx
const [plans, setPlans] = useState([]);

useEffect(() => {
  fetch("/billing/plans")
    .then((r) => r.json())
    .then((data) => setPlans(data.plans));
}, []);

return (
  <div className="plans-grid">
    {plans.map((plan) => (
      <PlanCard
        key={plan.id}
        plan={plan}
        onSelect={() => handleSelectPlan(plan.id)}
      />
    ))}
  </div>
);
```

---

### Buy / Upgrade — Process Payment

```tsx
// Single click to pay and activate subscription
async function handleSelectPlan(planId: number) {
  try {
    const res = await fetch("/billing/payment/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ planId }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error);
    }

    const { payment, subscription } = await res.json();

    console.log("Payment ID:", payment.id);
    console.log("Subscription active:", subscription.isActive); // true
    console.log("Plan:", subscription.plan.name);

    // Redirect to dashboard or show success state
    router.push("/dashboard");
  } catch (err) {
    showToast(`Payment failed: ${err.message}`, "error");
  }
}
```

---

### Subscription Status Banner

```tsx
// components/SubscriptionBanner.tsx
const [subscription, setSubscription] = useState(null);
const [usage, setUsage] = useState(null);

useEffect(() => {
  const token = getToken();

  Promise.all([
    fetch("/billing/me/subscription", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()),
    fetch("/billing/me/usage", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .catch(() => null),
  ]).then(([subData, usageData]) => {
    setSubscription(subData.subscription);
    setUsage(usageData?.usage ?? null);
  });
}, []);

if (!subscription) {
  return (
    <div className="banner banner--warning">
      No active plan. <a href="/pricing">Choose a plan →</a>
    </div>
  );
}

const creditsPercent =
  (usage.usage.usedCredits / subscription.plan.maxAiCredits) * 100;

return (
  <div className="banner">
    <span>{subscription.plan.name}</span>
    <div className="credits-bar">
      <div style={{ width: `${creditsPercent}%` }} />
    </div>
    <span>
      {usage.usage.usedCredits} / {subscription.plan.maxAiCredits} credits used
    </span>
  </div>
);
```

---

### Payment History Page

```tsx
// pages/billing/history.tsx
const [data, setData] = useState({ payments: [], total: 0 });
const [page, setPage] = useState(0);
const LIMIT = 10;

useEffect(() => {
  fetch(`/billing/me/payments?limit=${LIMIT}&offset=${page * LIMIT}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
    .then((r) => r.json())
    .then(setData);
}, [page]);

return (
  <div>
    <h2>Payment History</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Plan</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Method</th>
        </tr>
      </thead>
      <tbody>
        {data.payments.map((p) => (
          <tr key={p.id}>
            <td>{new Date(p.paidAt ?? p.createdAt).toLocaleDateString()}</td>
            <td>{p.plan.name}</td>
            <td>
              ${p.amount} {p.currency}
            </td>
            <td>
              <span className={`badge badge--${p.status.toLowerCase()}`}>
                {p.status}
              </span>
            </td>
            <td>{p.paymentMethod}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="pagination">
      <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
        Previous
      </button>
      <span>
        Page {page + 1} of {Math.ceil(data.total / LIMIT)}
      </span>
      <button
        disabled={(page + 1) * LIMIT >= data.total}
        onClick={() => setPage((p) => p + 1)}
      >
        Next
      </button>
    </div>
  </div>
);
```

---

### Check Subscription Before Gated Action

```tsx
// Hook: useSubscription.ts
export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/billing/me/subscription", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSubscription(data.subscription);
        setLoading(false);
      });
  }, []);

  const hasActivePlan = subscription?.isActive === true;
  const planName = subscription?.plan?.name ?? null;
  const maxCredits = subscription?.plan?.maxAiCredits ?? 0;

  return { subscription, loading, hasActivePlan, planName, maxCredits };
}

// Usage in a component
function AIEnhanceButton({ imageId }) {
  const { hasActivePlan, loading } = useSubscription();

  if (loading) return <Spinner />;

  if (!hasActivePlan) {
    return (
      <button onClick={() => router.push("/pricing")} className="btn--upgrade">
        Upgrade to use AI Enhancement
      </button>
    );
  }

  return (
    <button onClick={() => enhance(imageId)} className="btn--primary">
      Enhance with AI
    </button>
  );
}
```

---

## Complete Endpoint Summary

| Method  | Endpoint                   | Auth     | Description                               |
| ------- | -------------------------- | -------- | ----------------------------------------- |
| `GET`   | `/billing/plans`           | ✅       | List all plans                            |
| `GET`   | `/billing/me/subscription` | ✅       | Current user's active subscription        |
| `POST`  | `/billing/payment/process` | ✅       | **Pay for a plan (use this)**             |
| `GET`   | `/billing/me/payments`     | ✅       | Payment history (paginated)               |
| `GET`   | `/billing/me/payments/:id` | ✅       | Single payment details                    |
| `GET`   | `/billing/me/usage`        | ✅       | Credit usage summary                      |
| `POST`  | `/billing/subscribe`       | ✅       | Subscribe without payment record (legacy) |
| `POST`  | `/billing/plans`           | 🔒 Admin | Create a plan                             |
| `PATCH` | `/billing/plans/:id`       | 🔒 Admin | Update a plan                             |

> **Note on payment method**: The system currently uses `MOCK` payments that succeed instantly. When Stripe integration is added, the `POST /billing/payment/process` request body will accept additional fields (`paymentMethodId`, etc.) and the `paymentMethod` field in responses will change from `MOCK` to `STRIPE`. No other frontend changes will be needed.
