# Admin Billing & Subscription API

This document covers all billing and subscription-related routes — both the admin-only management endpoints and the user-facing billing routes the admin dashboard may need to call on behalf of users.

---

## Table of Contents

1. [Overview](#overview)
2. [Base URLs & Auth](#base-urls--auth)
3. [Plan Management (Admin)](#plan-management-admin)
4. [User Credit Adjustment (Admin)](#user-credit-adjustment-admin)
5. [View User Subscription & Billing (Admin)](#view-user-subscription--billing-admin)
6. [User-Facing Billing Routes](#user-facing-billing-routes)
7. [Data Models](#data-models)
8. [Error Reference](#error-reference)
9. [Frontend Integration Examples](#frontend-integration-examples)
10. [Testing Mode Notes](#testing-mode-notes)

---

## Overview

The billing system handles:

- **Plans** — tiers with credit limits, storage limits, and per-second credit pricing for AI features
- **Subscriptions** — a user has at most one active subscription at a time; switching plans deactivates the old one
- **Payments** — currently processed via a **mock** method (instant success, no Stripe integration yet)
- **Credits** — consumed when AI jobs run; admins can manually adjust a user's credit balance

---

## Base URLs & Auth

| Base       |           Auth Required           |
| ---------- | :-------------------------------: |
| `/billing` |     ✅ Any authenticated user     |
| `/admin`   | ✅ ADMIN role only (unless noted) |

All requests must include:

```
Authorization: Bearer <token>
```

---

## Plan Management (Admin)

### `POST /billing/plans`

🔒 **ADMIN only**

Create a new subscription plan.

**Request Body**

```json
{
  "name": "Professional",
  "description": "For growing agencies with multiple properties",
  "monthlyPriceUsd": 79,
  "maxAiCredits": 5000,
  "maxStorageMb": 20000
}
```

| Field             | Type     | Required | Description                  |
| ----------------- | -------- | :------: | ---------------------------- |
| `name`            | `string` |    ✅    | Unique plan name             |
| `description`     | `string` |    ❌    | Optional display description |
| `monthlyPriceUsd` | `number` |    ✅    | Monthly price in USD         |
| `maxAiCredits`    | `number` |    ✅    | Monthly AI credit allocation |
| `maxStorageMb`    | `number` |    ✅    | Storage limit in megabytes   |

**Response `201`**

```json
{
  "plan": {
    "id": 4,
    "name": "Professional",
    "description": "For growing agencies with multiple properties",
    "monthlyPriceUsd": "79.00",
    "maxAiCredits": 5000,
    "maxStorageMb": 20000,
    "enhancementCreditsPerSecond": "0.1000",
    "virtualStagingCreditsPerSecond": "0.2000",
    "adGenerationCreditsPerSecond": "0.0500",
    "createdAt": "2026-03-08T12:00:00.000Z"
  }
}
```

> **Note on credit pricing fields**: `enhancementCreditsPerSecond`, `virtualStagingCreditsPerSecond`, `adGenerationCreditsPerSecond` are set to platform defaults on creation. They cannot be customised per-plan via this endpoint yet.

---

### `PATCH /billing/plans/:id`

🔒 **ADMIN only**

Update an existing plan. All fields are optional — only send what you want to change.

**URL Parameter**: `id` — the plan's numeric ID

**Request Body** (all fields optional)

```json
{
  "name": "Professional Plus",
  "description": "Updated description",
  "monthlyPriceUsd": 89,
  "maxAiCredits": 6000,
  "maxStorageMb": 25000
}
```

**Response `200`**

```json
{
  "plan": {
    "id": 4,
    "name": "Professional Plus",
    "description": "Updated description",
    "monthlyPriceUsd": "89.00",
    "maxAiCredits": 6000,
    "maxStorageMb": 25000,
    "enhancementCreditsPerSecond": "0.1000",
    "virtualStagingCreditsPerSecond": "0.2000",
    "adGenerationCreditsPerSecond": "0.0500",
    "createdAt": "2026-03-08T12:00:00.000Z"
  }
}
```

---

### `GET /billing/plans`

🔒 Any authenticated user (admins use this to list all plans in the dashboard)

Returns all plans ordered by price ascending.

**Response `200`**

```json
{
  "plans": [
    {
      "id": 1,
      "name": "Starter",
      "description": "For individual listers",
      "monthlyPriceUsd": "19.00",
      "maxAiCredits": 500,
      "maxStorageMb": 2000,
      "enhancementCreditsPerSecond": "0.1000",
      "virtualStagingCreditsPerSecond": "0.2000",
      "adGenerationCreditsPerSecond": "0.0500",
      "createdAt": "2026-03-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Professional",
      "description": "For growing agencies",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 5000,
      "maxStorageMb": 20000,
      "enhancementCreditsPerSecond": "0.1000",
      "virtualStagingCreditsPerSecond": "0.2000",
      "adGenerationCreditsPerSecond": "0.0500",
      "createdAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

---

## User Credit Adjustment (Admin)

### `POST /admin/users/:userId/credits`

🔒 **ADMIN only**

Manually add or deduct credits from a user's active subscription. The adjustment is recorded as a `CreditUsage` entry for full audit trail visibility.

> ⚠️ The user must have an active subscription. Credits cannot be adjusted on users with no subscription.

**URL Parameter**: `userId` — the target user's numeric ID

**Request Body**

```json
{
  "amount": 500,
  "reason": "Compensation for failed AI job on March 5th"
}
```

| Field    | Type     | Required | Description                                            |
| -------- | -------- | :------: | ------------------------------------------------------ |
| `amount` | `number` |    ✅    | Credits to **add** (positive) or **deduct** (negative) |
| `reason` | `string` |    ✅    | Audit reason — stored in credit usage log              |

**Examples**

Add 500 credits:

```json
{ "amount": 500, "reason": "Promotional bonus" }
```

Deduct 200 credits:

```json
{ "amount": -200, "reason": "Correction for billing error" }
```

**Response `200`**

```json
{
  "subscription": {
    "id": 12,
    "userId": 5,
    "planId": 2,
    "startDate": "2026-03-01T00:00:00.000Z",
    "isActive": true
  }
}
```

> The response returns the user's subscription record. To verify the new credit balance, call `GET /admin/users/:userId` which includes full credit usage stats.

**Error Responses**

| Status | Error                                 | Cause                              |
| ------ | ------------------------------------- | ---------------------------------- |
| `400`  | `Amount (number) and reason required` | Missing or wrong type fields       |
| `400`  | `User has no active subscription`     | User is not subscribed to any plan |

---

## View User Subscription & Billing (Admin)

### `GET /admin/users/:userId`

🔒 **ADMIN only**

Returns comprehensive user details including their active subscription, all historical subscriptions, credit usage stats, and recent jobs.

**Response `200`** (billing-relevant fields)

```json
{
  "id": 5,
  "email": "john@example.com",
  "displayName": "John Smith",
  "subscriptions": [
    {
      "id": 12,
      "planId": 2,
      "startDate": "2026-03-01T00:00:00.000Z",
      "endDate": null,
      "isActive": true,
      "plan": {
        "id": 2,
        "name": "Professional",
        "monthlyPriceUsd": "79.00",
        "maxAiCredits": 5000
      }
    },
    {
      "id": 8,
      "planId": 1,
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-03-01T00:00:00.000Z",
      "isActive": false,
      "plan": {
        "id": 1,
        "name": "Starter",
        "monthlyPriceUsd": "19.00",
        "maxAiCredits": 500
      }
    }
  ],
  "activeSubscription": {
    "id": 12,
    "planId": 2,
    "startDate": "2026-03-01T00:00:00.000Z",
    "isActive": true,
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 5000,
      "maxStorageMb": 20000
    }
  },
  "totalCreditsUsed": 1240,
  "recentJobs": [
    {
      "id": 101,
      "type": "ENHANCEMENT",
      "status": "COMPLETED",
      "creditsCharged": 12,
      "createdAt": "2026-03-08T09:00:00.000Z"
    }
  ],
  "_count": {
    "projects": 3,
    "listings": 7,
    "jobs": 42,
    "listingFavorites": 0,
    "bookings": 2,
    "messagesSent": 15
  }
}
```

---

## User-Facing Billing Routes

These are the routes users call themselves, but the admin dashboard may need to simulate or inspect them.

---

### `POST /billing/subscribe`

🔒 Any authenticated user

Subscribe a user to a plan (or switch plans). Immediately deactivates the old subscription and creates a new one. **Does not process payment** — use `POST /billing/payment/process` for that.

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
    "startDate": "2026-03-08T12:00:00.000Z",
    "isActive": true,
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 5000,
      "maxStorageMb": 20000
    }
  }
}
```

---

### `GET /billing/me/subscription`

🔒 Any authenticated user

Returns the caller's current active subscription.

**Response `200`** — subscribed

```json
{
  "subscription": {
    "id": 13,
    "userId": 5,
    "planId": 2,
    "startDate": "2026-03-08T12:00:00.000Z",
    "endDate": null,
    "isActive": true,
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 5000,
      "maxStorageMb": 20000
    }
  }
}
```

**Response `200`** — not subscribed

```json
{
  "subscription": null
}
```

---

### `GET /billing/me/usage`

🔒 Any authenticated user

Returns the caller's current credit usage against their active plan's limit.

**Response `200`**

```json
{
  "usage": {
    "subscriptionId": 13,
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 5000,
      "maxStorageMb": 20000
    },
    "usage": {
      "usedCredits": 1240,
      "remainingCredits": 3760
    }
  }
}
```

**Error `404`** — user has no active subscription

```json
{ "error": "No active subscription" }
```

---

### `POST /billing/payment/process`

🔒 Any authenticated user

Processes a **mock payment** for a plan. Instantly creates a `COMPLETED` payment record, deactivates any existing subscription, and activates a new one.

> ⚠️ **Mock only** — no real money is charged. This will be replaced with Stripe when payment processing is live.

**Request Body**

```json
{
  "planId": 2
}
```

**Response `201`**

```json
{
  "message": "Payment processed successfully",
  "payment": {
    "id": 7,
    "userId": 5,
    "subscriptionId": 13,
    "planId": 2,
    "amount": "79.00",
    "currency": "USD",
    "status": "COMPLETED",
    "paymentMethod": "MOCK",
    "description": "Mock payment for Professional plan",
    "paidAt": "2026-03-08T12:00:00.000Z",
    "createdAt": "2026-03-08T12:00:00.000Z",
    "user": {
      "id": 5,
      "email": "john@example.com",
      "displayName": "John Smith"
    },
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00"
    },
    "subscription": {
      "id": 13,
      "isActive": true,
      "plan": {
        "name": "Professional"
      }
    }
  },
  "subscription": {
    "id": 13,
    "userId": 5,
    "planId": 2,
    "startDate": "2026-03-08T12:00:00.000Z",
    "isActive": true,
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00",
      "maxAiCredits": 5000,
      "maxStorageMb": 20000
    }
  }
}
```

---

### `GET /billing/me/payments`

🔒 Any authenticated user

Returns the caller's payment history, newest first.

**Query Parameters**

| Param    | Type     | Default | Description       |
| -------- | -------- | ------- | ----------------- |
| `limit`  | `number` | `50`    | Results per page  |
| `offset` | `number` | `0`     | Pagination offset |

**Response `200`**

```json
{
  "payments": [
    {
      "id": 7,
      "amount": "79.00",
      "currency": "USD",
      "status": "COMPLETED",
      "paymentMethod": "MOCK",
      "description": "Mock payment for Professional plan",
      "paidAt": "2026-03-08T12:00:00.000Z",
      "createdAt": "2026-03-08T12:00:00.000Z",
      "plan": {
        "id": 2,
        "name": "Professional",
        "monthlyPriceUsd": "79.00"
      },
      "subscription": {
        "id": 13,
        "isActive": true,
        "plan": { "name": "Professional" }
      }
    }
  ],
  "total": 3,
  "limit": 50,
  "offset": 0
}
```

---

### `GET /billing/me/payments/:id`

🔒 Any authenticated user

Returns a single payment record. Users can only access their own payments.

**Response `200`**

```json
{
  "payment": {
    "id": 7,
    "userId": 5,
    "subscriptionId": 13,
    "planId": 2,
    "amount": "79.00",
    "currency": "USD",
    "status": "COMPLETED",
    "paymentMethod": "MOCK",
    "description": "Mock payment for Professional plan",
    "stripePaymentId": null,
    "stripeCustomerId": null,
    "paypalTransactionId": null,
    "metadata": null,
    "paidAt": "2026-03-08T12:00:00.000Z",
    "createdAt": "2026-03-08T12:00:00.000Z",
    "plan": {
      "id": 2,
      "name": "Professional",
      "monthlyPriceUsd": "79.00"
    },
    "subscription": {
      "id": 13,
      "isActive": true,
      "plan": { "name": "Professional" }
    },
    "user": {
      "id": 5,
      "email": "john@example.com",
      "displayName": "John Smith"
    }
  }
}
```

**Error `404`**

```json
{ "error": "Payment not found" }
```

---

## Data Models

### Plan

| Field                            | Type             | Description                            |
| -------------------------------- | ---------------- | -------------------------------------- |
| `id`                             | `number`         | Unique ID                              |
| `name`                           | `string`         | Unique plan name                       |
| `description`                    | `string \| null` | Optional description                   |
| `monthlyPriceUsd`                | `Decimal`        | Monthly price (e.g. `"79.00"`)         |
| `maxAiCredits`                   | `number`         | Monthly credit quota                   |
| `maxStorageMb`                   | `number`         | Storage limit in MB                    |
| `enhancementCreditsPerSecond`    | `Decimal`        | Credits/sec for photo enhancement jobs |
| `virtualStagingCreditsPerSecond` | `Decimal`        | Credits/sec for virtual staging jobs   |
| `adGenerationCreditsPerSecond`   | `Decimal`        | Credits/sec for ad copy generation     |
| `createdAt`                      | `string`         | ISO 8601 timestamp                     |

### Subscription

| Field       | Type             | Description                         |
| ----------- | ---------------- | ----------------------------------- |
| `id`        | `number`         | Unique ID                           |
| `userId`    | `number`         | Owner user ID                       |
| `planId`    | `number`         | Linked plan ID                      |
| `startDate` | `string`         | Subscription start                  |
| `endDate`   | `string \| null` | Null if currently active            |
| `isActive`  | `boolean`        | `true` for the current subscription |
| `createdAt` | `string`         | Record creation time                |

### Payment

| Field              | Type             | Description                                  |
| ------------------ | ---------------- | -------------------------------------------- |
| `id`               | `number`         | Unique ID                                    |
| `userId`           | `number`         | Payer user ID                                |
| `subscriptionId`   | `number`         | Subscription this pays for                   |
| `planId`           | `number`         | Plan purchased                               |
| `amount`           | `Decimal`        | Charged amount (e.g. `"79.00"`)              |
| `currency`         | `string`         | Always `"USD"` for now                       |
| `status`           | `PaymentStatus`  | `PENDING \| COMPLETED \| FAILED \| REFUNDED` |
| `paymentMethod`    | `PaymentMethod`  | `MOCK \| STRIPE \| PAYPAL \| CREDIT_CARD`    |
| `stripePaymentId`  | `string \| null` | Stripe ID (future use)                       |
| `stripeCustomerId` | `string \| null` | Stripe customer ID (future use)              |
| `description`      | `string \| null` | Human-readable description                   |
| `metadata`         | `object \| null` | Extra data (invoice number, etc.)            |
| `paidAt`           | `string \| null` | Payment confirmation time                    |
| `createdAt`        | `string`         | Record creation time                         |

### PaymentStatus enum

| Value       | Description                         |
| ----------- | ----------------------------------- |
| `PENDING`   | Payment initiated but not confirmed |
| `COMPLETED` | Payment successful                  |
| `FAILED`    | Payment failed                      |
| `REFUNDED`  | Payment reversed                    |

### PaymentMethod enum

| Value         | Description                      |
| ------------- | -------------------------------- |
| `MOCK`        | Development-only instant payment |
| `STRIPE`      | Stripe (not yet integrated)      |
| `PAYPAL`      | PayPal (not yet integrated)      |
| `CREDIT_CARD` | Direct card (not yet integrated) |

---

## Error Reference

| Status | Error                                                            | Cause                                            |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| `400`  | `planId is required and must be a number`                        | Missing or non-numeric `planId`                  |
| `400`  | `name, monthlyPriceUsd, maxAiCredits, maxStorageMb are required` | Missing required fields on plan create           |
| `400`  | `Amount (number) and reason required`                            | Credit adjustment missing fields                 |
| `400`  | `User has no active subscription`                                | Credit adjustment on unsubscribed user           |
| `400`  | `Invalid plan id`                                                | Non-numeric plan ID in URL                       |
| `400`  | `Invalid user ID`                                                | Non-numeric user ID in URL                       |
| `400`  | `Invalid payment id`                                             | Non-numeric payment ID in URL                    |
| `401`  | `Unauthorized`                                                   | Missing or expired token                         |
| `403`  | _(blocked by middleware)_                                        | Non-admin calling admin-only route               |
| `404`  | `Plan not found`                                                 | Plan ID doesn't exist                            |
| `404`  | `No active subscription`                                         | User has no subscription (usage check)           |
| `404`  | `Payment not found`                                              | Payment doesn't exist or belongs to another user |
| `500`  | `Internal server error`                                          | Unexpected server error                          |

---

## Frontend Integration Examples

### Admin — Plan Management Dashboard

```tsx
// hooks/usePlans.ts
export function usePlans() {
  const { data, mutate } = useSWR("/billing/plans", fetcher);
  return { plans: data?.plans ?? [], mutate };
}

// Create plan
async function createPlan(values: CreatePlanInput) {
  const res = await fetch("/billing/plans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error);
  }

  return res.json(); // { plan }
}

// Update plan
async function updatePlan(id: number, values: Partial<CreatePlanInput>) {
  const res = await fetch(`/billing/plans/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error);
  }

  return res.json(); // { plan }
}
```

---

### Admin — Adjust User Credits

```tsx
// pages/admin/users/[userId]/billing.tsx
async function grantCredits(userId: number, amount: number, reason: string) {
  const res = await fetch(`/admin/users/${userId}/credits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ amount, reason }),
  });

  const data = await res.json();

  if (!res.ok) {
    showToast(data.error, 'error');
    return;
  }

  showToast(`Successfully adjusted ${amount} credits`, 'success');
  mutateUser(); // Re-fetch user details to show updated usage
}

// Usage in UI
<button onClick={() => grantCredits(userId, 500, 'Promotional bonus')}>
  + Add 500 Credits
</button>

<button onClick={() => grantCredits(userId, -200, 'Manual correction')}>
  - Deduct 200 Credits
</button>
```

---

### User — Subscription & Payment Flow

```tsx
// Full subscribe + pay flow (user side)
async function subscribeToPlan(planId: number) {
  // Step 1: Process mock payment (creates subscription automatically)
  const res = await fetch("/billing/payment/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ planId }),
  });

  const data = await res.json();

  if (!res.ok) {
    showToast(data.error, "error");
    return;
  }

  // data.payment — the payment receipt
  // data.subscription — the activated subscription
  showToast(`Subscribed to ${data.subscription.plan.name}!`, "success");
  router.push("/dashboard");
}
```

---

### User — Credit Usage Progress Bar

```tsx
// components/CreditUsageBar.tsx
export function CreditUsageBar() {
  const { data } = useSWR("/billing/me/usage", authedFetcher);

  if (!data) return null;

  const { plan, usage } = data.usage;
  const pct = Math.min((usage.usedCredits / plan.maxAiCredits) * 100, 100);
  const isLow = pct > 80;

  return (
    <div className="credit-bar">
      <div className="credit-bar__header">
        <span>AI Credits</span>
        <span className={isLow ? "text-red" : ""}>
          {usage.usedCredits.toLocaleString()} /{" "}
          {plan.maxAiCredits.toLocaleString()} used
        </span>
      </div>
      <div className="credit-bar__track">
        <div
          className={`credit-bar__fill ${isLow ? "credit-bar__fill--low" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="credit-bar__remaining">
        {usage.remainingCredits.toLocaleString()} credits remaining this month
      </p>
    </div>
  );
}
```

---

## Testing Mode Notes

### Payment System

> **All payments are mocked.** `POST /billing/payment/process` always returns `status: "COMPLETED"` with `paymentMethod: "MOCK"`. No real charge is made.

When Stripe is integrated, the flow will change to:

1. Frontend calls Stripe.js to tokenise the card
2. Sends Stripe `paymentMethodId` to the backend
3. Backend calls Stripe API to confirm charge
4. Backend records `stripePaymentId` on the `Payment` record

The `Payment` model already has `stripePaymentId` and `stripeCustomerId` fields reserved for this.

### Seeded Test Accounts

Run `npm run seed` to create test accounts:

| Email                 | Password   | Role      | Notes                               |
| --------------------- | ---------- | --------- | ----------------------------------- |
| `admin@aipix.com`     | `12345678` | ADMIN     | Can manage plans and adjust credits |
| `moderator@aipix.com` | `12345678` | MODERATOR | No billing admin access             |

### Quick Test Sequence

```bash
# 1. Log in as admin
POST /auth/login  { "email": "admin@aipix.com", "password": "12345678" }

# 2. List plans
GET /billing/plans

# 3. Create a plan
POST /billing/plans  { "name": "Enterprise", "monthlyPriceUsd": 199, "maxAiCredits": 20000, "maxStorageMb": 100000 }

# 4. Process a mock payment (as any user)
POST /billing/payment/process  { "planId": 1 }

# 5. Check usage
GET /billing/me/usage

# 6. Admin adjust credits for user ID 5
POST /admin/users/5/credits  { "amount": 1000, "reason": "Test credit grant" }
```
