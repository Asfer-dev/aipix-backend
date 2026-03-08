# Content Moderation API

This document covers the complete moderation system — how listings are reviewed before going live, how messages are monitored, and what the admin/moderator dashboard needs to do.

---

## Table of Contents

1. [Overview](#overview)
2. [Listing Publish & Moderation Flow](#listing-publish--moderation-flow)
3. [Lister-Facing Endpoints](#lister-facing-endpoints)
4. [Admin / Moderator Endpoints](#admin--moderator-endpoints)
5. [Moderation Status Reference](#moderation-status-reference)
6. [Data Models](#data-models)
7. [Error Reference](#error-reference)
8. [Frontend Integration Examples](#frontend-integration-examples)
9. [Current Testing Mode](#current-testing-mode)

---

## Overview

All listings go through a moderation pipeline before appearing on the public marketplace. No listing is visible to buyers unless it has been explicitly approved — either automatically by the AI or manually by a moderator.

Messages are also monitored for policy violations and can be flagged, approved, or deleted by moderators.

### Roles

| Role        | Can do                                                        |
| ----------- | ------------------------------------------------------------- |
| `LISTER`    | Create, edit, attach media, submit for publish                |
| `MODERATOR` | Review flagged listings/messages, approve or reject           |
| `ADMIN`     | Everything MODERATOR can do + force unpublish, restrict users |

---

## Listing Publish & Moderation Flow

### Complete State Machine

```
[Lister]
   │
   ├─ POST /listings
   │    └─► status: DRAFT | moderationStatus: PENDING | isPublished: false
   │
   ├─ POST /listings/:id/media
   │    └─► (required before publish)
   │
   └─ POST /listings/:id/publish
              │
              ▼
         AI Moderation runs
              │
     ┌────────┴────────┬────────────────────┐
     │                 │                    │
  score < 0.3     score 0.3–0.69       score ≥ 0.7
     │                 │                    │
  APPROVED          FLAGGED             REJECTED
  auto-published    held for review     error → lister
     │                 │
  isPublished:true  isPublished:false
  status:PUBLISHED  status:DRAFT
  Live on market    In moderator queue
                       │
              [Moderator / Admin]
           GET /admin/moderation/listings/flagged
                       │
            ┌──────────┴──────────┐
         Approve               Reject
            │                    │
       isPublished:true     isPublished:false
       status:PUBLISHED     moderationStatus:REJECTED
       Live on market       Hidden, lister notified
```

> ⚠️ **Testing mode active**: The AI call is mocked. All listings submitted for publish are currently forced to `FLAGGED` with score `0.5`. Every listing will land in the moderation queue until the mock is removed.

---

## Lister-Facing Endpoints

Base URL: `/listings`  
Auth: Bearer token required. Lister role required.

---

### Step 1 — Create the Listing

#### `POST /listings`

Creates a listing as a `DRAFT`. No moderation runs at this point.

**Request Body**

```json
{
  "projectId": 3,
  "title": "Modern 3BR Apartment in Downtown",
  "description": "Spacious apartment with floor-to-ceiling windows...",
  "price": 3500,
  "currency": "USD",
  "locationCity": "New York",
  "locationState": "NY",
  "locationCountry": "US",
  "propertyType": "APARTMENT",
  "bedrooms": 3,
  "bathrooms": 2,
  "areaSqm": 110
}
```

**Response `201`**

```json
{
  "listing": {
    "id": 44,
    "userId": 5,
    "projectId": 3,
    "title": "Modern 3BR Apartment in Downtown",
    "status": "DRAFT",
    "moderationStatus": "PENDING",
    "isPublished": false,
    "createdAt": "2026-03-08T12:00:00.000Z"
  }
}
```

---

### Step 2 — Attach Media

#### `POST /listings/:id/media`

Attaches image versions to the listing. At least one image is required before publishing.

**Request Body**

```json
{
  "imageVersionIds": [14, 15, 16],
  "heroImageVersionId": 14
}
```

- `imageVersionIds`: Array of `ImageVersion` IDs. Must belong to the same project as the listing.
- `heroImageVersionId`: The primary/hero image shown in marketplace cards. Defaults to first in array.

**Response `201`**

```json
{
  "media": [
    {
      "id": 1,
      "listingId": 44,
      "imageVersionId": 14,
      "isHero": true,
      "sortOrder": 0,
      "imageVersion": { "id": 14, "url": "https://...", "type": "ENHANCED" }
    }
  ]
}
```

---

### Step 3 — Submit for Publish

#### `POST /listings/:id/publish`

Triggers the moderation pipeline. This is the only way to publish a listing.

> `PATCH /listings/:id` with `status: "PUBLISHED"` is blocked — it returns `400` directing you here.

**No request body needed.**

**Response `200` — Auto-approved (score < 0.3)**

```json
{
  "listing": {
    "id": 44,
    "status": "PUBLISHED",
    "moderationStatus": "APPROVED",
    "isPublished": true,
    "moderationScore": 0.12,
    "aiModerationFlags": [],
    "moderatedAt": "2026-03-08T12:05:00.000Z"
  },
  "moderation": {
    "status": "APPROVED",
    "score": 0.12,
    "flags": [],
    "autoPublished": true,
    "message": "Your listing is now live."
  }
}
```

**Response `200` — Flagged for review (score 0.3–0.69)**

```json
{
  "listing": {
    "id": 44,
    "status": "DRAFT",
    "moderationStatus": "FLAGGED",
    "isPublished": false,
    "moderationScore": 0.5,
    "aiModerationFlags": ["TESTING_MODE"],
    "moderatedAt": "2026-03-08T12:05:00.000Z"
  },
  "moderation": {
    "status": "FLAGGED",
    "score": 0.5,
    "flags": ["TESTING_MODE"],
    "autoPublished": false,
    "message": "Your listing is under review. It will be published once approved by a moderator."
  }
}
```

**Response `422` — AI rejected (score ≥ 0.7)**

```json
{
  "error": "Listing was rejected by content moderation",
  "detail": "Misleading pricing information, prohibited keywords detected"
}
```

**Pre-publish guards**

| Condition         | Status | Error                                         |
| ----------------- | ------ | --------------------------------------------- |
| No media attached | `400`  | `Attach at least one image before publishing` |
| Already published | `409`  | `Listing is already published`                |
| Listing not found | `404`  | `Listing not found`                           |
| AI rejection      | `422`  | `Listing was rejected by content moderation`  |

---

### Step 4 — Check Listing Status (Lister)

#### `GET /listings/:id`

Lister can poll this to check if their listing has been approved after being flagged.

**Response `200`**

```json
{
  "listing": {
    "id": 44,
    "status": "DRAFT",
    "moderationStatus": "FLAGGED",
    "isPublished": false,
    "aiModerationFlags": ["TESTING_MODE"],
    "moderationScore": 0.5,
    "moderatedAt": "2026-03-08T12:05:00.000Z"
  }
}
```

**`moderationStatus` values the lister will see:**

| Value      | What to show lister                          |
| ---------- | -------------------------------------------- |
| `PENDING`  | "Draft — not submitted yet"                  |
| `FLAGGED`  | "Under review — awaiting moderator approval" |
| `APPROVED` | "Live on marketplace"                        |
| `REJECTED` | "Rejected — please edit and resubmit"        |

---

### Step 5 — Edit & Resubmit (if rejected)

#### `PATCH /listings/:id`

Edit listing content after a rejection. Does **not** re-trigger moderation.

```json
{
  "title": "Spacious 3BR Apartment — Downtown",
  "description": "Updated description..."
}
```

Then re-submit with `POST /listings/:id/publish` again.

---

## Admin / Moderator Endpoints

Base URL: `/admin`  
Auth: Bearer token. `MODERATOR` or `ADMIN` role required (noted per endpoint).

---

### Listings Moderation Queue

#### `GET /admin/moderation/listings/flagged`

🔒 MODERATOR or ADMIN

Returns paginated list of all `FLAGGED` listings awaiting human review.

**Query Parameters**

| Param   | Type   | Default |
| ------- | ------ | ------- |
| `page`  | number | `1`     |
| `limit` | number | `20`    |

**Response `200`**

```json
{
  "listings": [
    {
      "id": 44,
      "title": "Modern 3BR Apartment in Downtown",
      "moderationStatus": "FLAGGED",
      "moderationScore": 0.5,
      "aiModerationFlags": ["TESTING_MODE"],
      "isPublished": false,
      "createdAt": "2026-03-08T12:00:00.000Z",
      "moderatedAt": "2026-03-08T12:05:00.000Z",
      "user": {
        "id": 5,
        "displayName": "John Smith",
        "email": "john@example.com"
      },
      "project": {
        "id": 3,
        "name": "Downtown Portfolio"
      },
      "media": [
        {
          "id": 1,
          "isHero": true,
          "imageVersion": {
            "url": "https://cdn.example.com/images/14/enhanced.jpg",
            "type": "ENHANCED"
          }
        }
      ],
      "moderationLogs": [
        {
          "id": 1,
          "status": "FLAGGED",
          "aiScore": 0.5,
          "aiFlags": ["TESTING_MODE"],
          "reviewNotes": null,
          "createdAt": "2026-03-08T12:05:00.000Z"
        }
      ]
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "hasMore": false
}
```

---

#### `POST /admin/moderation/listings/:listingId/approve`

🔒 MODERATOR or ADMIN

Approves a flagged listing. Sets it live on the marketplace.

**What happens server-side:**

- `moderationStatus` → `APPROVED`
- `isPublished` → `true`
- `moderatedBy` → reviewer's user ID
- `moderatedAt` → now
- Writes a `ModerationLog` record with reviewer ID and notes

**Request Body**

```json
{
  "notes": "Reviewed photos — AI false positive, content is accurate"
}
```

| Field   | Required | Description                     |
| ------- | -------- | ------------------------------- |
| `notes` | ❌       | Review notes added to audit log |

**Response `200`**

```json
{
  "listing": {
    "id": 44,
    "moderationStatus": "APPROVED",
    "isPublished": true,
    "moderatedAt": "2026-03-08T13:00:00.000Z",
    "user": {
      "id": 5,
      "displayName": "John Smith",
      "email": "john@example.com"
    },
    "project": { "id": 3, "name": "Downtown Portfolio" }
  }
}
```

---

#### `POST /admin/moderation/listings/:listingId/reject`

🔒 MODERATOR or ADMIN

Rejects a flagged listing. Keeps it hidden from the marketplace.

**What happens server-side:**

- `moderationStatus` → `REJECTED`
- `isPublished` → `false`
- Writes a `ModerationLog` record with reason

**Request Body**

```json
{
  "reason": "Photos do not match the described property size"
}
```

| Field    | Required | Description              |
| -------- | -------- | ------------------------ |
| `reason` | ✅       | Required for audit trail |

**Response `200`**

```json
{
  "listing": {
    "id": 44,
    "moderationStatus": "REJECTED",
    "isPublished": false,
    "moderatedAt": "2026-03-08T13:00:00.000Z"
  }
}
```

---

### Admin Force-Actions on Listings

#### `POST /admin/listings/:listingId/unpublish`

🔒 ADMIN only

Force-removes a live listing from the marketplace, regardless of moderation status.

```json
{
  "reason": "User reported — terms of service violation"
}
```

**Response `200`**

```json
{
  "listing": {
    "id": 44,
    "status": "ARCHIVED",
    "isPublished": false
  }
}
```

#### `PATCH /admin/listings/:listingId/status`

🔒 ADMIN only

Directly override listing status and published state.

```json
{
  "status": "ARCHIVED",
  "isPublished": false
}
```

---

### Messages Moderation

Messages sent between buyers and listers are also AI-monitored. Flagged messages appear in the queue below.

---

#### `GET /admin/moderation/messages/flagged`

🔒 MODERATOR or ADMIN

Paginated list of AI-flagged messages.

**Query Parameters**

| Param   | Type   | Default |
| ------- | ------ | ------- |
| `page`  | number | `1`     |
| `limit` | number | `20`    |

**Response `200`**

```json
{
  "messages": [
    {
      "id": 77,
      "content": "Message content here...",
      "moderationStatus": "FLAGGED",
      "moderationScore": 0.65,
      "aiModerationFlags": ["EXTERNAL_CONTACT_INFO", "SPAM"],
      "createdAt": "2026-03-08T10:00:00.000Z",
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
      "listing": { "id": 44, "title": "Modern 3BR Apartment in Downtown" },
      "moderationLogs": [
        {
          "status": "FLAGGED",
          "reviewNotes": "Contains phone number",
          "createdAt": "2026-03-08T10:01:00.000Z"
        }
      ]
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "hasMore": false
}
```

---

#### `GET /admin/moderation/messages/:listingId/:userId1/:userId2`

🔒 MODERATOR or ADMIN

View the full conversation thread between two users on a specific listing, for context when reviewing a flagged message.

**URL Parameters**

| Param       | Description                           |
| ----------- | ------------------------------------- |
| `listingId` | The listing the conversation is about |
| `userId1`   | First participant's ID                |
| `userId2`   | Second participant's ID               |

**Response `200`**

```json
{
  "messages": [
    {
      "id": 75,
      "content": "Hi, is this still available?",
      "moderationStatus": "APPROVED",
      "createdAt": "2026-03-08T09:50:00.000Z",
      "sender": { "id": 12, "displayName": "Jane Doe" },
      "receiver": { "id": 5, "displayName": "John Smith" }
    },
    {
      "id": 77,
      "content": "Yes! Call me at 555-0100",
      "moderationStatus": "FLAGGED",
      "createdAt": "2026-03-08T10:00:00.000Z",
      "sender": { "id": 5, "displayName": "John Smith" },
      "receiver": { "id": 12, "displayName": "Jane Doe" }
    }
  ]
}
```

---

#### `POST /admin/moderation/messages/:messageId/approve`

🔒 MODERATOR or ADMIN

Clears a flagged message — marks it safe and visible.

**Request Body** (optional)

```json
{
  "notes": "Context reviewed — phone number is public business line, acceptable"
}
```

**Response `200`**

```json
{
  "message": {
    "id": 77,
    "moderationStatus": "APPROVED",
    "sender": { "id": 5, "displayName": "John Smith" },
    "receiver": { "id": 12, "displayName": "Jane Doe" },
    "listing": { "id": 44, "title": "Modern 3BR Apartment in Downtown" }
  }
}
```

---

#### `DELETE /admin/moderation/messages/:messageId`

🔒 MODERATOR or ADMIN

Permanently deletes a flagged message. Logs the deletion with reason first.

**Request Body**

```json
{
  "reason": "Contained personal phone number — violates messaging policy"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": {
    "id": 77,
    "content": "...",
    "sender": { "id": 5, "displayName": "John Smith" },
    "receiver": { "id": 12, "displayName": "Jane Doe" }
  }
}
```

---

#### `GET /admin/moderation/messages/reported`

🔒 MODERATOR or ADMIN

Returns recent messages (last 7 days) for general review. Not filtered by report status — useful as a general inbox for moderators.

**Query Parameters**: `page`, `limit`

---

### Other Moderation Endpoints (In Development)

| Endpoint                                                  | Status     | Description                                 |
| --------------------------------------------------------- | ---------- | ------------------------------------------- |
| `GET /admin/moderation/spam`                              | ⏳ Pending | High-volume / duplicate message detection   |
| `GET /admin/moderation/stats`                             | ⏳ Pending | Queue stats (total flagged, reviewed, etc.) |
| `GET /admin/moderation/users/:userId/history`             | ⏳ Pending | Full moderation history for a user          |
| `POST /admin/moderation/users/:userId/restrict-messaging` | ⏳ Pending | Prevent user from sending messages          |
| `POST /admin/moderation/bulk`                             | ⏳ Pending | Bulk approve/reject multiple items          |

These endpoints exist and respond, but their full logic is still being implemented.

---

## Moderation Status Reference

### Listing `moderationStatus`

| Value      | `isPublished` | Visible on marketplace | Next action                    |
| ---------- | :-----------: | :--------------------: | ------------------------------ |
| `PENDING`  |    `false`    |           ❌           | Lister must submit for publish |
| `FLAGGED`  |    `false`    |           ❌           | Awaiting moderator review      |
| `APPROVED` |    `true`     |           ✅           | Live                           |
| `REJECTED` |    `false`    |           ❌           | Lister must edit and resubmit  |

### Listing `status`

| Value       | Description                                           |
| ----------- | ----------------------------------------------------- |
| `DRAFT`     | Not yet published (covers PENDING, FLAGGED, REJECTED) |
| `PUBLISHED` | Live — only set when `moderationStatus` is `APPROVED` |
| `ARCHIVED`  | Removed by admin or lister                            |
| `RENTED`    | Property rented                                       |
| `SOLD`      | Property sold                                         |

### `aiModerationFlags` — Common Flag Values

| Flag                    | Meaning                                        |
| ----------------------- | ---------------------------------------------- |
| `TESTING_MODE`          | Mock flag — AI not running (current dev state) |
| `MISLEADING_PHOTOS`     | Images may not match description               |
| `PRICE_ANOMALY`         | Price unusually high/low for area              |
| `PROHIBITED_KEYWORDS`   | Banned words detected                          |
| `EXTERNAL_CONTACT_INFO` | Phone/email in listing text                    |
| `SPAM`                  | Duplicate or spam content                      |

---

## Data Models

### ModerationLog

Every moderation action (AI or human) is recorded.

| Field            | Type             | Description                               |
| ---------------- | ---------------- | ----------------------------------------- |
| `id`             | `number`         | Unique ID                                 |
| `listingId`      | `number \| null` | Associated listing                        |
| `messageId`      | `number \| null` | Associated message                        |
| `userId`         | `number`         | User whose content was moderated          |
| `moderationType` | `string`         | `"LISTING"` or `"MESSAGE"`                |
| `status`         | `string`         | `PENDING` `FLAGGED` `APPROVED` `REJECTED` |
| `reviewedBy`     | `number \| null` | Moderator user ID (null if AI only)       |
| `reviewNotes`    | `string \| null` | Human reviewer notes                      |
| `aiScore`        | `number \| null` | AI confidence score (0–1)                 |
| `aiFlags`        | `string[]`       | Array of AI-detected flag names           |
| `aiModel`        | `string \| null` | AI model identifier                       |
| `createdAt`      | `string`         | ISO 8601 timestamp                        |

---

## Error Reference

| Status | Error                                                 | Cause                                      |
| ------ | ----------------------------------------------------- | ------------------------------------------ |
| `400`  | `Attach at least one image before publishing`         | No media on listing                        |
| `400`  | `Use POST /listings/:id/publish to publish a listing` | Tried `PATCH` with `status: "PUBLISHED"`   |
| `400`  | `Reason is required`                                  | Missing reason in reject/delete            |
| `401`  | `Unauthorized`                                        | Missing or invalid token                   |
| `403`  | _(blocked by middleware)_                             | Insufficient role                          |
| `404`  | `Listing not found`                                   | Listing doesn't exist or not owned by user |
| `404`  | `Message not found`                                   | Message doesn't exist                      |
| `409`  | `Listing is already published`                        | Called publish on a live listing           |
| `422`  | `Listing was rejected by content moderation`          | AI score ≥ 0.7                             |
| `500`  | `Internal server error`                               | Server error                               |

---

## Frontend Integration Examples

### Lister — Publish Button with Status Feedback

```tsx
// components/ListingPublishButton.tsx
async function handlePublish(listingId: number) {
  setLoading(true);

  try {
    const res = await fetch(`/listings/${listingId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    const data = await res.json();

    if (res.status === 422) {
      // AI rejected
      showToast(`Rejected: ${data.detail}`, "error");
      return;
    }

    if (!res.ok) {
      showToast(data.error, "error");
      return;
    }

    const { moderation } = data;

    if (moderation.autoPublished) {
      // Immediately live
      showToast("🎉 Your listing is now live!", "success");
      router.push("/listings/marketplace");
    } else {
      // In review queue
      showToast("⏳ " + moderation.message, "info");
      setModerationStatus("FLAGGED");
    }
  } finally {
    setLoading(false);
  }
}
```

---

### Lister — Moderation Status Badge

```tsx
// components/ModerationBadge.tsx
const STATUS_CONFIG = {
  PENDING: { label: "Draft", color: "gray" },
  FLAGGED: { label: "Under Review", color: "yellow" },
  APPROVED: { label: "Live", color: "green" },
  REJECTED: { label: "Rejected", color: "red" },
};

export function ModerationBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

  return <span className={`badge badge--${config.color}`}>{config.label}</span>;
}

// Usage in lister's listing list
{
  listings.map((listing) => (
    <div key={listing.id} className="listing-card">
      <h3>{listing.title}</h3>
      <ModerationBadge status={listing.moderationStatus} />

      {listing.moderationStatus === "REJECTED" && (
        <p className="rejection-notice">
          Your listing was rejected. Please edit it and resubmit.
        </p>
      )}

      {listing.moderationStatus === "FLAGGED" && (
        <p className="review-notice">
          ⏳ Under review — usually takes a few hours.
        </p>
      )}
    </div>
  ));
}
```

---

### Moderator — Review Queue

```tsx
// pages/admin/moderation/listings.tsx
const [queue, setQueue] = useState({ listings: [], total: 0 });
const [page, setPage] = useState(1);

async function loadQueue() {
  const res = await fetch(
    `/admin/moderation/listings/flagged?page=${page}&limit=10`,
    {
      headers: { Authorization: `Bearer ${getToken()}` },
    },
  );
  setQueue(await res.json());
}

async function approve(listingId: number, notes?: string) {
  await fetch(`/admin/moderation/listings/${listingId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ notes }),
  });
  loadQueue();
}

async function reject(listingId: number, reason: string) {
  await fetch(`/admin/moderation/listings/${listingId}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ reason }),
  });
  loadQueue();
}

return (
  <div>
    <h2>
      Flagged Listings <span className="count">({queue.total})</span>
    </h2>

    {queue.listings.map((listing) => (
      <div key={listing.id} className="review-card">
        <img src={listing.media[0]?.imageVersion?.url} alt="Hero" />

        <div className="review-info">
          <h3>{listing.title}</h3>
          <p>
            By: {listing.user.displayName} ({listing.user.email})
          </p>
          <p>AI Score: {(listing.moderationScore * 100).toFixed(0)}%</p>

          <div className="flags">
            {listing.aiModerationFlags.map((flag) => (
              <span key={flag} className="flag-badge">
                {flag}
              </span>
            ))}
          </div>

          {/* Show moderation history */}
          {listing.moderationLogs.map((log) => (
            <div key={log.id} className="log-entry">
              <span className={`status-${log.status.toLowerCase()}`}>
                {log.status}
              </span>
              {log.reviewNotes && <span> — {log.reviewNotes}</span>}
            </div>
          ))}
        </div>

        <div className="review-actions">
          <button className="btn--approve" onClick={() => approve(listing.id)}>
            ✅ Approve
          </button>
          <button
            className="btn--reject"
            onClick={() => {
              const reason = prompt("Rejection reason:");
              if (reason) reject(listing.id, reason);
            }}
          >
            ❌ Reject
          </button>
          <a
            href={`/admin/moderation/listings/${listing.id}/preview`}
            target="_blank"
            className="btn--preview"
          >
            👁 Preview
          </a>
        </div>
      </div>
    ))}
  </div>
);
```

---

### Moderator — View Conversation Context

```tsx
// Used when reviewing a flagged message to see the full thread
async function loadConversation(
  listingId: number,
  userId1: number,
  userId2: number,
) {
  const res = await fetch(
    `/admin/moderation/messages/${listingId}/${userId1}/${userId2}`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
  const { messages } = await res.json();
  setConversation(messages);
}

async function deleteMessage(messageId: number) {
  const reason = prompt("Reason for deletion:");
  if (!reason) return;

  await fetch(`/admin/moderation/messages/${messageId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ reason }),
  });

  loadFlaggedMessages();
}
```

---

## Current Testing Mode

> **All listings are currently force-flagged for moderation testing.**

The AI moderation call is mocked in [src/modules/listings/listings.service.ts](src/modules/listings/listings.service.ts). Every `POST /listings/:id/publish` will return:

```json
{
  "moderation": {
    "status": "FLAGGED",
    "score": 0.5,
    "flags": ["TESTING_MODE"],
    "autoPublished": false,
    "message": "Your listing is under review..."
  }
}
```

This means:

- All listings go to `/admin/moderation/listings/flagged`
- No listing auto-publishes
- Moderator/Admin must manually approve each one via `POST /admin/moderation/listings/:id/approve`

**To restore real AI moderation**, swap the mock for the real call in [listings.service.ts](src/modules/listings/listings.service.ts) — the commented-out `moderateListing(...)` call is preserved right below the mock.
