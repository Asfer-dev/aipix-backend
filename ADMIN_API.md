# Admin & Moderation API

This document covers all admin and moderation endpoints. These routes are **restricted** — they require authentication plus an elevated role.

---

## Table of Contents

1. [Access Levels](#access-levels)
2. [Base URL & Auth](#base-url--auth)
3. [Dashboard & Analytics](#dashboard--analytics)
4. [User Management](#user-management)
5. [Job Management](#job-management)
6. [Listing Management](#listing-management)
7. [Booking Management](#booking-management)
8. [Content Moderation](#content-moderation)
9. [Enums Reference](#enums-reference)
10. [Error Reference](#error-reference)
11. [Frontend Integration Examples](#frontend-integration-examples)
12. [Endpoint Summary](#endpoint-summary)

---

## Access Levels

| Role | Description | Access |
|------|-------------|--------|
| `ADMIN` | Full system access | All admin endpoints |
| `MODERATOR` | Content review only | Moderation endpoints only |
| `EDITOR` | Internal team | No admin access |
| `LISTER` | Property listers | No admin access |
| `BUYER` | Buyers/browsers | No admin access |

> **Two middleware guards are used**:
> - `requireAdmin` — ADMIN role only
> - `requireModeratorOrAdmin` — ADMIN or MODERATOR

---

## Base URL & Auth

```
Base URL: /admin
Auth:     Bearer token in Authorization header
```

All endpoints require authentication. The specific role requirement per endpoint is noted in each section.

---

## Dashboard & Analytics

### GET `/admin/dashboard`

🔒 **Requires: ADMIN**

Returns a high-level overview of the entire platform — users, listings, bookings, jobs, and revenue.

**Response `200`**

```json
{
  "users": {
    "total": 1245,
    "byRole": {
      "BUYER": 980,
      "LISTER": 240,
      "MODERATOR": 3,
      "ADMIN": 2,
      "EDITOR": 20
    }
  },
  "listings": {
    "total": 580,
    "published": 412,
    "draft": 168
  },
  "bookings": {
    "total": 340,
    "byStatus": {
      "PENDING": 45,
      "APPROVED": 210,
      "REJECTED": 35,
      "CANCELLED": 50
    }
  },
  "jobs": {
    "total": 8200,
    "completed": 7800,
    "failed": 120,
    "running": 14,
    "successRate": 95.12
  },
  "revenue": {
    "last30Days": 0,
    "transactionCount": 0
  }
}
```

> **Note**: Revenue stats are in active development. Values may return `0` until the payment system query is updated.

---

### GET `/admin/analytics/:type`

🔒 **Requires: ADMIN**

Returns time-series analytics for a specific domain. Use the `days` query param to control the time window.

**URL Parameters**

| Param | Values | Description |
|-------|--------|-------------|
| `type` | `users` `revenue` `jobs` `marketplace` | Analytics category |

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | `number` | `30` | Number of days to look back |

---

**`/admin/analytics/users`** — User growth

```json
{
  "newUsers": 87,
  "byRole": {
    "BUYER": 65,
    "LISTER": 20,
    "ADMIN": 1,
    "MODERATOR": 1
  }
}
```

---

**`/admin/analytics/jobs`** — AI job analytics

```json
{
  "total": 1240,
  "byType": {
    "ENHANCEMENT": 800,
    "VIRTUAL_STAGING": 300,
    "AD_GENERATION": 140
  },
  "byStatus": {
    "COMPLETED": 1180,
    "FAILED": 40,
    "PENDING": 20
  }
}
```

---

**`/admin/analytics/marketplace`** — Marketplace activity

```json
{
  "newListings": 45,
  "newBookings": 92,
  "newFavorites": 310,
  "newMessages": 780
}
```

---

**`/admin/analytics/revenue`** — Revenue data *(in development)*

```json
{
  "totalRevenue": 0,
  "transactionCount": 0,
  "avgTransaction": 0
}
```

**Error Responses**

| Status | Error | Reason |
|--------|-------|--------|
| `400` | `Invalid analytics type` | Unsupported `:type` value |

---

## User Management

🔒 **All user management requires: ADMIN**

### GET `/admin/users`

Paginated, searchable, filterable list of all users.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Per page, max 100 (default: 20) |
| `role` | `string` | Filter by role: `BUYER` `LISTER` `ADMIN` `MODERATOR` `EDITOR` |
| `search` | `string` | Search email or display name (case-insensitive) |

**Response `200`**

```json
{
  "users": [
    {
      "id": 5,
      "email": "john@example.com",
      "displayName": "John Smith",
      "roles": ["LISTER"],
      "primaryRole": "LISTER",
      "createdAt": "2026-01-15T09:00:00.000Z",
      "updatedAt": "2026-03-01T12:00:00.000Z",
      "_count": {
        "projects": 3,
        "listings": 12,
        "jobs": 45,
        "subscriptions": 2
      }
    }
  ],
  "total": 1245,
  "page": 1,
  "limit": 20,
  "totalPages": 63,
  "hasMore": true
}
```

---

### GET `/admin/users/:userId`

Detailed view of a single user including subscriptions, credit usage, and recent AI jobs.

**Response `200`**

```json
{
  "user": {
    "id": 5,
    "email": "john@example.com",
    "displayName": "John Smith",
    "primaryRole": "LISTER",
    "roles": ["LISTER"],
    "isActive": true,
    "mfaEnabled": false,
    "onboardingComplete": true,
    "emailVerifiedAt": "2026-01-15T09:10:00.000Z",
    "lastLoginAt": "2026-03-08T08:00:00.000Z",
    "createdAt": "2026-01-15T09:00:00.000Z",
    "updatedAt": "2026-03-08T08:00:00.000Z",
    "subscriptions": [
      {
        "id": 12,
        "planId": 2,
        "isActive": true,
        "startDate": "2026-03-08T14:00:00.000Z",
        "endDate": null,
        "plan": {
          "id": 2,
          "name": "Professional",
          "monthlyPriceUsd": "79.00",
          "maxAiCredits": 2000
        }
      }
    ],
    "_count": {
      "projects": 3,
      "listings": 12,
      "jobs": 45,
      "listingFavorites": 8,
      "bookings": 2,
      "messagesSent": 34
    },
    "activeSubscription": {
      "id": 12,
      "planId": 2,
      "isActive": true,
      "plan": { "name": "Professional", "maxAiCredits": 2000 }
    },
    "totalCreditsUsed": 840,
    "recentJobs": [
      {
        "id": 201,
        "type": "ENHANCEMENT",
        "status": "COMPLETED",
        "creditsCharged": 12,
        "createdAt": "2026-03-07T10:00:00.000Z"
      }
    ]
  }
}
```

---

### PATCH `/admin/users/:userId`

Update a user's role, display name, or email verification status.

**Request Body** (all fields optional)

```json
{
  "role": "MODERATOR",
  "displayName": "John Smith (Mod)",
  "emailVerified": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `role` | `string` | New primary role |
| `displayName` | `string` | New display name |
| `emailVerified` | `boolean` | Manually verify email |

**Response `200`**

```json
{
  "user": {
    "id": 5,
    "email": "john@example.com",
    "displayName": "John Smith (Mod)",
    "primaryRole": "MODERATOR",
    ...
  }
}
```

---

### POST `/admin/users/:userId/credits`

Manually adjust a user's AI credits. Positive `amount` adds credits; negative deducts them.

> The user must have an active subscription.

**Request Body**

```json
{
  "amount": 500,
  "reason": "Compensation for service outage on 2026-03-05"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | `number` | ✅ | Credits to add (positive) or remove (negative) |
| `reason` | `string` | ✅ | Audit trail reason |

**Response `200`**

```json
{
  "subscription": {
    "id": 12,
    "userId": 5,
    "planId": 2,
    "isActive": true,
    "startDate": "2026-03-08T14:00:00.000Z"
  }
}
```

**Error Responses**

| Status | Error | Reason |
|--------|-------|--------|
| `400` | `User has no active subscription` | User isn't subscribed |
| `400` | `Amount (number) and reason required` | Missing fields |

---

### GET `/admin/users/:userId/activity`

Full activity log for a user — jobs, credit usage, subscriptions, and listings.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | `number` | `50` | Max items per activity type |

**Response `200`**

```json
{
  "jobs": [
    {
      "id": 201,
      "type": "ENHANCEMENT",
      "status": "COMPLETED",
      "creditsCharged": 12,
      "createdAt": "2026-03-07T10:00:00.000Z"
    }
  ],
  "creditUsage": [
    {
      "id": 88,
      "subscriptionId": 12,
      "creditsUsed": 12,
      "jobType": "ENHANCEMENT",
      "reason": "Photo enhancement job #201",
      "createdAt": "2026-03-07T10:05:00.000Z"
    }
  ],
  "subscriptions": [
    {
      "id": 12,
      "planId": 2,
      "isActive": true,
      "startDate": "2026-03-08T14:00:00.000Z",
      "plan": { "name": "Professional" }
    }
  ],
  "listings": [
    {
      "id": 33,
      "title": "Modern 3BR in Downtown",
      "status": "ACTIVE",
      "isPublished": true,
      "createdAt": "2026-02-10T08:00:00.000Z"
    }
  ]
}
```

---

## Job Management

🔒 **All job management requires: ADMIN**

### GET `/admin/jobs`

Paginated list of all AI jobs across all users.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Per page, max 100 (default: 20) |
| `status` | `string` | Filter by status: `PENDING` `QUEUED` `RUNNING` `COMPLETED` `FAILED` `CANCELLED` |
| `type` | `string` | Filter by type: `ENHANCEMENT` `VIRTUAL_STAGING` `AD_GENERATION` etc. |
| `userId` | `number` | Filter by specific user |

**Response `200`**

```json
{
  "jobs": [
    {
      "id": 201,
      "type": "ENHANCEMENT",
      "status": "FAILED",
      "retryCount": 2,
      "errorMessage": "AI service timeout",
      "creditsCharged": 0,
      "createdAt": "2026-03-07T10:00:00.000Z",
      "completedAt": null,
      "user": {
        "id": 5,
        "email": "john@example.com",
        "displayName": "John Smith"
      },
      "project": {
        "id": 3,
        "name": "Downtown Portfolio"
      },
      "image": {
        "id": 14,
        "originalUrl": "https://cdn.example.com/images/14/original.jpg"
      }
    }
  ],
  "total": 8200,
  "page": 1,
  "limit": 20,
  "totalPages": 410,
  "hasMore": true
}
```

---

### POST `/admin/jobs/:jobId/retry`

Reset a `FAILED` job back to `PENDING` so it gets re-queued for processing.

**Response `200`**

```json
{
  "job": {
    "id": 201,
    "status": "PENDING",
    "retryCount": 0,
    "errorMessage": null,
    "errorCode": null
  }
}
```

**Error Responses**

| Status | Error | Reason |
|--------|-------|--------|
| `404` | `Job not found` | Job ID doesn't exist |
| `400` | `Job is not in failed state` | Can only retry `FAILED` jobs |

---

### DELETE `/admin/jobs/:jobId`

Permanently delete a job record.

**Response `200`**

```json
{
  "success": true
}
```

---

### GET `/admin/jobs/metrics`

Aggregated performance metrics for the AI job pipeline.

**Response `200`**

```json
{
  "statusCounts": {
    "PENDING": 12,
    "QUEUED": 3,
    "RUNNING": 14,
    "COMPLETED": 7800,
    "FAILED": 120,
    "CANCELLED": 251
  },
  "typeCounts": {
    "ENHANCEMENT": 5200,
    "VIRTUAL_STAGING": 1800,
    "AD_GENERATION": 900,
    "BACKGROUND_REMOVAL": 300
  },
  "totalJobs": 8200,
  "completedJobs": 7800,
  "failedJobs": 120,
  "successRate": 95.12,
  "avgProcessingTimeMs": 4230,
  "avgCreditsCharged": 14.5
}
```

> ⚠️ **Route ordering note**: `GET /admin/jobs/metrics` must be registered **before** `GET /admin/jobs/:jobId` in the router to avoid `"metrics"` being parsed as a job ID. This is already handled correctly in the backend.

---

## Listing Management

🔒 **All listing management requires: ADMIN**

### GET `/admin/listings`

Paginated list of all listings across all users, with optional filters.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Per page, max 100 (default: 20) |
| `status` | `string` | Filter by status: `DRAFT` `ACTIVE` `RENTED` `SOLD` `ARCHIVED` |
| `isPublished` | `boolean` | `true` or `false` |
| `userId` | `number` | Filter by owner |
| `search` | `string` | Search title, description, or city (case-insensitive) |

**Response `200`**

```json
{
  "listings": [
    {
      "id": 33,
      "title": "Modern 3BR in Downtown",
      "status": "ACTIVE",
      "isPublished": true,
      "locationCity": "New York",
      "pricePerMonth": "3500.00",
      "moderationStatus": "APPROVED",
      "moderationScore": 0.98,
      "createdAt": "2026-02-10T08:00:00.000Z",
      "user": {
        "id": 5,
        "email": "john@example.com",
        "displayName": "John Smith"
      },
      "heroImage": {
        "id": 22,
        "url": "https://cdn.example.com/images/22/enhanced.jpg",
        "type": "ENHANCED"
      },
      "_count": {
        "listingFavorites": 14,
        "bookings": 3,
        "messages": 8
      }
    }
  ],
  "total": 580,
  "page": 1,
  "limit": 20,
  "totalPages": 29,
  "hasMore": true
}
```

---

### PATCH `/admin/listings/:listingId/status`

Change a listing's status and optionally its published state.

**Request Body**

```json
{
  "status": "ARCHIVED",
  "isPublished": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | ✅ | `DRAFT` `ACTIVE` `RENTED` `SOLD` `ARCHIVED` |
| `isPublished` | `boolean` | ❌ | Override published state |

**Response `200`**

```json
{
  "listing": {
    "id": 33,
    "status": "ARCHIVED",
    "isPublished": false,
    ...
  }
}
```

---

### POST `/admin/listings/:listingId/unpublish`

Force-unpublish a listing and archive it. A reason is required for the audit trail.

**Request Body**

```json
{
  "reason": "Violates terms of service: misleading photos"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | `string` | ✅ | Reason for unpublishing |

**Response `200`**

```json
{
  "listing": {
    "id": 33,
    "status": "ARCHIVED",
    "isPublished": false,
    ...
  }
}
```

---

## Booking Management

🔒 **All booking management requires: ADMIN**

### GET `/admin/bookings`

Paginated list of all bookings across all listings.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Per page, max 100 (default: 20) |
| `status` | `string` | Filter: `PENDING` `APPROVED` `REJECTED` `CANCELLED` |
| `listingId` | `number` | Filter by listing |
| `buyerId` | `number` | Filter by buyer user |

**Response `200`**

```json
{
  "bookings": [
    {
      "id": 88,
      "status": "PENDING",
      "requestedDate": "2026-04-01T00:00:00.000Z",
      "notes": "Interested in a 12-month lease",
      "createdAt": "2026-03-05T14:00:00.000Z",
      "buyer": {
        "id": 12,
        "displayName": "Jane Doe",
        "email": "jane@example.com"
      },
      "listing": {
        "id": 33,
        "title": "Modern 3BR in Downtown",
        "heroImage": { ... },
        "user": {
          "id": 5,
          "displayName": "John Smith",
          "email": "john@example.com"
        }
      }
    }
  ],
  "total": 340,
  "page": 1,
  "limit": 20,
  "totalPages": 17,
  "hasMore": true
}
```

---

### POST `/admin/bookings/:bookingId/cancel`

Admin force-cancel a booking. A reason is required.

**Request Body**

```json
{
  "reason": "Listing was removed due to policy violation"
}
```

**Response `200`**

```json
{
  "booking": {
    "id": 88,
    "status": "CANCELLED",
    ...
  }
}
```

---

## Content Moderation

The moderation system handles two types of content: **listings** and **messages**. Content is flagged automatically by the AI moderation service and queued for manual review.

| Endpoint Group | Required Role |
|----------------|---------------|
| Listing moderation | ADMIN or MODERATOR |
| Message moderation | ADMIN or MODERATOR |
| Restrict user messaging | ADMIN only |
| Bulk actions | ADMIN or MODERATOR |

---

### GET `/admin/moderation/listings/flagged`

🔒 **Requires: ADMIN or MODERATOR**

Paginated list of listings that the AI has flagged and are awaiting human review.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Per page, max 100 |

**Response `200`**

```json
{
  "listings": [
    {
      "id": 44,
      "title": "Luxury Penthouse",
      "moderationStatus": "FLAGGED",
      "moderationScore": 0.42,
      "aiModerationFlags": ["MISLEADING_PHOTOS", "PRICE_ANOMALY"],
      "createdAt": "2026-03-07T09:00:00.000Z",
      "user": {
        "id": 7,
        "displayName": "Alex Turner",
        "email": "alex@example.com"
      },
      "project": {
        "id": 5,
        "name": "Luxury Portfolio"
      },
      "media": [
        {
          "id": 30,
          "isHero": true,
          "imageVersion": {
            "url": "https://cdn.example.com/images/30/original.jpg",
            "type": "ORIGINAL"
          }
        }
      ],
      "moderationLogs": [
        {
          "id": 1,
          "status": "FLAGGED",
          "reviewNotes": "AI detected misleading photo patterns",
          "createdAt": "2026-03-07T09:01:00.000Z"
        }
      ]
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "hasMore": false
}
```

---

### POST `/admin/moderation/listings/:listingId/approve`

🔒 **Requires: ADMIN or MODERATOR**

Approve a flagged listing. Sets `moderationStatus` to `APPROVED` and re-publishes the listing. Logs the action.

**Request Body** (optional)

```json
{
  "notes": "Reviewed photos — all accurate, AI false positive"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notes` | `string` | ❌ | Review notes added to moderation log |

**Response `200`**

```json
{
  "listing": {
    "id": 44,
    "moderationStatus": "APPROVED",
    "moderatedAt": "2026-03-08T11:00:00.000Z",
    "isPublished": true,
    "user": { "id": 7, "displayName": "Alex Turner", "email": "alex@example.com" },
    "project": { "id": 5, "name": "Luxury Portfolio" }
  }
}
```

**Error Responses**

| Status | Error | Reason |
|--------|-------|--------|
| `404` | `Listing not found` | Listing ID doesn't exist |

---

### POST `/admin/moderation/listings/:listingId/reject`

🔒 **Requires: ADMIN or MODERATOR**

Reject a flagged listing. Sets `moderationStatus` to `REJECTED`, unpublishes the listing, and logs the reason.

**Request Body**

```json
{
  "reason": "Photos do not match the described property"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | `string` | ✅ | Rejection reason (required for audit log) |

**Response `200`**

```json
{
  "listing": {
    "id": 44,
    "moderationStatus": "REJECTED",
    "moderatedAt": "2026-03-08T11:00:00.000Z",
    "isPublished": false,
    ...
  }
}
```

---

### GET `/admin/moderation/messages/flagged`

🔒 **Requires: ADMIN or MODERATOR**

Paginated list of messages that the AI has flagged for review.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Per page |

**Response `200`**

```json
{
  "messages": [
    {
      "id": 77,
      "content": "Message content...",
      "moderationStatus": "FLAGGED",
      "moderationScore": 0.31,
      "aiModerationFlags": ["SPAM", "EXTERNAL_CONTACT_INFO"],
      "createdAt": "2026-03-07T16:00:00.000Z",
      "sender": {
        "id": 12,
        "displayName": "Jane Doe",
        "email": "jane@example.com"
      },
      "receiver": {
        "id": 5,
        "displayName": "John Smith",
        "email": "john@example.com"
      },
      "listing": {
        "id": 33,
        "title": "Modern 3BR in Downtown"
      },
      "moderationLogs": [
        {
          "status": "FLAGGED",
          "reviewNotes": "Contains external contact information",
          "createdAt": "2026-03-07T16:01:00.000Z"
        }
      ]
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "hasMore": false
}
```

---

### POST `/admin/moderation/messages/:messageId/approve`

🔒 **Requires: ADMIN or MODERATOR**

Approve a flagged message, marking it as safe and visible.

**Request Body** (optional)

```json
{
  "notes": "Context reviewed — contact info was landlord's office number, acceptable"
}
```

**Response `200`**

```json
{
  "message": {
    "id": 77,
    "moderationStatus": "APPROVED",
    "sender": { "id": 12, "displayName": "Jane Doe", "email": "jane@example.com" },
    "receiver": { "id": 5, "displayName": "John Smith", "email": "john@example.com" },
    "listing": { "id": 33, "title": "Modern 3BR in Downtown" }
  }
}
```

---

### DELETE `/admin/moderation/messages/:messageId`

🔒 **Requires: ADMIN or MODERATOR**

Permanently delete a flagged message. Logs the deletion with the provided reason before removing.

**Request Body**

```json
{
  "reason": "Contains phone number solicitation — violates messaging policy"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | `string` | ✅ | Required for audit log |

**Response `200`**

```json
{
  "success": true,
  "message": {
    "id": 77,
    "content": "...",
    "sender": { "id": 12, "displayName": "Jane Doe", "email": "jane@example.com" },
    "receiver": { "id": 5, "displayName": "John Smith", "email": "john@example.com" }
  }
}
```

**Error Responses**

| Status | Error | Reason |
|--------|-------|--------|
| `404` | `Message not found` | Message ID doesn't exist |

---

### GET `/admin/moderation/messages/reported`

🔒 **Requires: ADMIN or MODERATOR**

Returns recent messages from the last 7 days for review. This is a general message queue — not filtered by report status yet.

> **Note**: A dedicated user-reporting system is planned. Currently returns all recent messages for review.

**Query Parameters**

| Param | Type | Default |
|-------|------|---------|
| `page` | `number` | `1` |
| `limit` | `number` | `20` |

**Response `200`**

```json
{
  "messages": [ ... ],
  "total": 152,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "hasMore": true
}
```

---

### GET `/admin/moderation/messages/:listingId/:userId1/:userId2`

🔒 **Requires: ADMIN or MODERATOR**

Fetch the full conversation between two users about a specific listing. Used for reviewing message context.

**URL Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `listingId` | `number` | The listing the conversation is about |
| `userId1` | `number` | First participant's user ID |
| `userId2` | `number` | Second participant's user ID |

**Response `200`**

```json
{
  "messages": [
    {
      "id": 70,
      "content": "Hi, is the property still available?",
      "createdAt": "2026-03-06T10:00:00.000Z",
      "moderationStatus": "APPROVED",
      "sender": { "id": 12, "displayName": "Jane Doe", "email": "jane@example.com" },
      "receiver": { "id": 5, "displayName": "John Smith", "email": "john@example.com" },
      "listing": { "id": 33, "title": "Modern 3BR in Downtown" }
    },
    {
      "id": 71,
      "content": "Yes! Would you like to book a viewing?",
      "createdAt": "2026-03-06T10:05:00.000Z",
      "moderationStatus": "APPROVED",
      "sender": { "id": 5, ... },
      "receiver": { "id": 12, ... }
    }
  ]
}
```

---

### GET `/admin/moderation/spam`

🔒 **Requires: ADMIN or MODERATOR**

Returns potential spam activity patterns.

> **Note**: Spam detection is pending re-implementation in the AI moderation system. Currently returns empty arrays.

**Response `200`**

```json
{
  "highVolumeUsers": [],
  "duplicateMessages": []
}
```

---

### GET `/admin/moderation/stats`

🔒 **Requires: ADMIN or MODERATOR**

High-level moderation queue statistics.

> **Note**: Being re-implemented to query the `ModerationLog` table. Currently returns placeholder values.

**Response `200`**

```json
{
  "flaggedListings": 0,
  "flaggedMessages": 0,
  "totalReviewed": 0
}
```

---

### GET `/admin/moderation/users/:userId/history`

🔒 **Requires: ADMIN or MODERATOR**

Moderation history for a specific user.

> **Note**: Being re-implemented to query the `ModerationLog` table.

**Response `200`**

```json
{
  "moderationLogs": [],
  "summary": {}
}
```

---

### POST `/admin/moderation/users/:userId/restrict-messaging`

🔒 **Requires: ADMIN**

Restrict a user's ability to send messages.

> **Note**: Feature is in development. Currently responds with a confirmation but does not enforce restrictions.

**Request Body**

```json
{
  "reason": "Repeated spam violations"
}
```

**Response `200`**

```json
{
  "success": true,
  "userId": 12,
  "reason": "Repeated spam violations",
  "message": "Feature pending"
}
```

---

### POST `/admin/moderation/bulk`

🔒 **Requires: ADMIN or MODERATOR**

Perform a bulk moderation action on multiple content items.

> **Note**: Bulk action logic is in development. Currently acknowledges the request but does not apply changes.

**Request Body**

```json
{
  "ids": [77, 78, 79]
}
```

**Response `200`**

```json
{
  "success": true,
  "affected": 3
}
```

---

## Enums Reference

### User Roles

| Value | Description |
|-------|-------------|
| `BUYER` | Can browse, favorite, book, message |
| `LISTER` | Can create listings, projects, use AI tools |
| `EDITOR` | Internal team — manual AI output review |
| `MODERATOR` | Reviews flagged content |
| `ADMIN` | Full system access |

### Listing Status

| Value | Description |
|-------|-------------|
| `DRAFT` | Not yet published |
| `ACTIVE` | Live and visible |
| `RENTED` | Property has been rented |
| `SOLD` | Property has been sold |
| `ARCHIVED` | Removed from marketplace |

### Moderation Status

| Value | Description |
|-------|-------------|
| `PENDING` | Awaiting AI review |
| `FLAGGED` | AI flagged — awaiting human review |
| `APPROVED` | Cleared by human moderator |
| `REJECTED` | Rejected by human moderator |

### Job Status

| Value | Description |
|-------|-------------|
| `PENDING` | Created, waiting in queue |
| `QUEUED` | Picked up by queue manager |
| `RUNNING` | Being processed by AI |
| `COMPLETED` | Finished successfully |
| `FAILED` | Failed with error |
| `CANCELLED` | Cancelled by user |

### Job Types

| Value | Description |
|-------|-------------|
| `ENHANCEMENT` | Photo enhancement |
| `VIRTUAL_STAGING` | Virtual furniture staging |
| `AD_GENERATION` | Ad copy generation |
| `BACKGROUND_REMOVAL` | Background removal |
| `SKY_REPLACEMENT` | Sky replacement |
| `HDR_PROCESSING` | HDR processing |

### Booking Status

| Value | Description |
|-------|-------------|
| `PENDING` | Awaiting lister response |
| `APPROVED` | Approved by lister |
| `REJECTED` | Rejected by lister |
| `CANCELLED` | Cancelled |

---

## Error Reference

| Status | Error Message | Cause |
|--------|---------------|-------|
| `400` | `Invalid user ID` | Non-numeric `:userId` |
| `400` | `Invalid listing ID` | Non-numeric `:listingId` |
| `400` | `Invalid job ID` | Non-numeric `:jobId` |
| `400` | `Invalid booking ID` | Non-numeric `:bookingId` |
| `400` | `Invalid message ID` | Non-numeric `:messageId` |
| `400` | `Amount (number) and reason required` | Missing credit adjustment fields |
| `400` | `Status is required` | Missing `status` in listing update |
| `400` | `Reason is required` | Missing `reason` in unpublish/cancel/delete |
| `400` | `Job is not in failed state` | Tried to retry non-failed job |
| `400` | `User has no active subscription` | Credit adjustment on unsubscribed user |
| `400` | `Invalid analytics type` | Unsupported `:type` in analytics |
| `401` | `Unauthorized` | Missing or invalid token |
| `403` | *(Middleware blocks)* | Insufficient role |
| `404` | `User not found` | User ID doesn't exist |
| `404` | `Job not found` | Job ID doesn't exist |
| `404` | `Listing not found` | Listing ID doesn't exist |
| `404` | `Message not found` | Message ID doesn't exist |
| `500` | `Internal server error` | Server-side failure |

---

## Frontend Integration Examples

### Admin Dashboard Overview

```tsx
// pages/admin/dashboard.tsx
const [metrics, setMetrics] = useState(null);

useEffect(() => {
  fetch('/admin/dashboard', {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
    .then(r => r.json())
    .then(setMetrics);
}, []);

if (!metrics) return <Spinner />;

return (
  <div className="dashboard-grid">
    <StatCard title="Total Users" value={metrics.users.total} />
    <StatCard title="Published Listings" value={metrics.listings.published} />
    <StatCard title="Active Bookings" value={metrics.bookings.byStatus.APPROVED} />
    <StatCard
      title="Job Success Rate"
      value={`${metrics.jobs.successRate}%`}
      highlight={metrics.jobs.successRate < 90 ? 'warning' : 'success'}
    />
    <StatCard title="Running Jobs" value={metrics.jobs.running} />
  </div>
);
```

---

### User Management Table

```tsx
// pages/admin/users.tsx
const [data, setData] = useState({ users: [], total: 0 });
const [filters, setFilters] = useState({ role: '', search: '', page: 1 });

useEffect(() => {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: '20',
    ...(filters.role && { role: filters.role }),
    ...(filters.search && { search: filters.search }),
  });

  fetch(`/admin/users?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
    .then(r => r.json())
    .then(setData);
}, [filters]);

// Role badge updater
async function changeUserRole(userId: number, newRole: string) {
  const res = await fetch(`/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ role: newRole }),
  });
  const { user } = await res.json();
  // Update local state...
}

// Credit adjuster
async function grantCredits(userId: number, amount: number, reason: string) {
  await fetch(`/admin/users/${userId}/credits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ amount, reason }),
  });
}
```

---

### Moderation Queue

```tsx
// pages/admin/moderation/listings.tsx
const [data, setData] = useState({ listings: [], total: 0 });

async function loadFlagged(page = 1) {
  const res = await fetch(`/admin/moderation/listings/flagged?page=${page}&limit=20`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  setData(await res.json());
}

async function approve(listingId: number, notes?: string) {
  await fetch(`/admin/moderation/listings/${listingId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ notes }),
  });
  loadFlagged(); // Refresh
}

async function reject(listingId: number, reason: string) {
  await fetch(`/admin/moderation/listings/${listingId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ reason }),
  });
  loadFlagged(); // Refresh
}

return (
  <div>
    <h2>Flagged Listings ({data.total})</h2>
    {data.listings.map(listing => (
      <ModerationCard key={listing.id} listing={listing}>
        <div className="ai-flags">
          {listing.aiModerationFlags.map(flag => (
            <span key={flag} className="badge badge--warning">{flag}</span>
          ))}
          <span>AI Score: {(listing.moderationScore * 100).toFixed(0)}%</span>
        </div>
        <div className="actions">
          <button onClick={() => approve(listing.id)}>✅ Approve</button>
          <button onClick={() => {
            const reason = prompt('Rejection reason:');
            if (reason) reject(listing.id, reason);
          }}>
            ❌ Reject
          </button>
        </div>
      </ModerationCard>
    ))}
  </div>
);
```

---

### Job Metrics Dashboard

```tsx
// components/admin/JobMetrics.tsx
const [metrics, setMetrics] = useState(null);

useEffect(() => {
  fetch('/admin/jobs/metrics', {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
    .then(r => r.json())
    .then(setMetrics);
}, []);

async function retryJob(jobId: number) {
  const res = await fetch(`/admin/jobs/${jobId}/retry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const { error } = await res.json();
    alert(error);
  }
}

if (!metrics) return <Spinner />;

return (
  <div>
    <h3>Job Pipeline</h3>
    <div className="metrics-row">
      <Metric label="Total" value={metrics.totalJobs} />
      <Metric label="Completed" value={metrics.completedJobs} />
      <Metric label="Failed" value={metrics.failedJobs} color="red" />
      <Metric label="Success Rate" value={`${metrics.successRate}%`} />
      <Metric label="Avg Time" value={`${(metrics.avgProcessingTimeMs / 1000).toFixed(1)}s`} />
    </div>

    <h4>By Type</h4>
    {Object.entries(metrics.typeCounts).map(([type, count]) => (
      <div key={type}>{type}: {count as number}</div>
    ))}
  </div>
);
```

---

### Analytics Charts

```tsx
// pages/admin/analytics.tsx
const [analyticsType, setAnalyticsType] = useState<'users' | 'jobs' | 'marketplace'>('users');
const [days, setDays] = useState(30);
const [data, setData] = useState(null);

useEffect(() => {
  fetch(`/admin/analytics/${analyticsType}?days=${days}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
    .then(r => r.json())
    .then(setData);
}, [analyticsType, days]);

// analyticsType === 'users' → data.newUsers, data.byRole
// analyticsType === 'jobs'  → data.total, data.byType, data.byStatus
// analyticsType === 'marketplace' → data.newListings, data.newBookings, etc.
```

---

## Endpoint Summary

### Admin-Only Endpoints (require `ADMIN` role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/dashboard` | Platform overview metrics |
| `GET` | `/admin/analytics/:type` | Time-series analytics (`users` `jobs` `marketplace` `revenue`) |
| `GET` | `/admin/users` | All users (paginated, filterable) |
| `GET` | `/admin/users/:userId` | User detail with activity |
| `PATCH` | `/admin/users/:userId` | Update user role/name/verification |
| `POST` | `/admin/users/:userId/credits` | Manually adjust AI credits |
| `GET` | `/admin/users/:userId/activity` | Full activity log |
| `GET` | `/admin/jobs` | All AI jobs (paginated, filterable) |
| `GET` | `/admin/jobs/metrics` | Aggregated job pipeline metrics |
| `POST` | `/admin/jobs/:jobId/retry` | Retry a failed job |
| `DELETE` | `/admin/jobs/:jobId` | Delete a job |
| `GET` | `/admin/listings` | All listings (paginated, filterable) |
| `PATCH` | `/admin/listings/:listingId/status` | Change listing status |
| `POST` | `/admin/listings/:listingId/unpublish` | Force unpublish listing |
| `GET` | `/admin/bookings` | All bookings (paginated, filterable) |
| `POST` | `/admin/bookings/:bookingId/cancel` | Force cancel a booking |
| `POST` | `/admin/moderation/users/:userId/restrict-messaging` | Restrict user messaging *(pending)* |

### Moderator + Admin Endpoints (require `MODERATOR` or `ADMIN` role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/moderation/listings/flagged` | Flagged listings queue |
| `POST` | `/admin/moderation/listings/:listingId/approve` | Approve a flagged listing |
| `POST` | `/admin/moderation/listings/:listingId/reject` | Reject a flagged listing |
| `GET` | `/admin/moderation/messages/flagged` | Flagged messages queue |
| `POST` | `/admin/moderation/messages/:messageId/approve` | Approve a flagged message |
| `DELETE` | `/admin/moderation/messages/:messageId` | Delete a flagged message |
| `GET` | `/admin/moderation/messages/reported` | Recent messages for review |
| `GET` | `/admin/moderation/messages/:listingId/:u1/:u2` | Full conversation context |
| `GET` | `/admin/moderation/spam` | Spam activity *(pending)* |
| `GET` | `/admin/moderation/stats` | Moderation queue stats *(pending)* |
| `GET` | `/admin/moderation/users/:userId/history` | User moderation history *(pending)* |
| `POST` | `/admin/moderation/bulk` | Bulk moderate content *(pending)* |

> ***(pending)*** — Endpoint exists and responds correctly but full logic is still in development.
