# Admin API Reference

All admin endpoints require authentication via JWT token and ADMIN role (or MODERATOR role where specified).

**Base URL**: `/api/admin`

**Authentication**: All endpoints require `Authorization: Bearer <token>` header

---

## Dashboard & Analytics

### GET `/api/admin/dashboard`

**Role**: ADMIN

Get comprehensive dashboard metrics including users, listings, bookings, jobs, and revenue statistics.

**Response**:

```json
{
  "users": {
    "total": 150,
    "byRole": { "BUYER": 100, "LISTER": 40, "ADMIN": 5, "MODERATOR": 5 }
  },
  "listings": {
    "total": 250,
    "published": 200,
    "draft": 50
  },
  "bookings": {
    "total": 80,
    "byStatus": {
      "PENDING": 10,
      "CONFIRMED": 50,
      "CANCELLED": 15,
      "REJECTED": 5
    }
  },
  "jobs": {
    "total": 500,
    "completed": 450,
    "failed": 20,
    "running": 30,
    "successRate": 95.74
  },
  "revenue": {
    "last30Days": 15000,
    "transactionCount": 120
  }
}
```

---

### GET `/api/admin/analytics/:type`

**Role**: ADMIN

Get time-series analytics data for specific category.

**Path Parameters**:

- `type`: `users` | `revenue` | `jobs` | `marketplace`

**Query Parameters**:

- `days` (optional): Number of days to analyze (default: 30)

**Examples**:

- `GET /api/admin/analytics/users?days=30`
- `GET /api/admin/analytics/revenue?days=90`
- `GET /api/admin/analytics/jobs?days=7`
- `GET /api/admin/analytics/marketplace?days=14`

**Response (users)**:

```json
{
  "newUsers": 45,
  "byRole": { "BUYER": 30, "LISTER": 12, "ADMIN": 1, "MODERATOR": 2 }
}
```

**Response (revenue)**:

```json
{
  "totalRevenue": 25000,
  "transactionCount": 150,
  "avgTransaction": 166.67
}
```

**Response (jobs)**:

```json
{
  "total": 300,
  "byType": {
    "VIRTUAL_STAGING": 120,
    "ENHANCEMENT": 80,
    "SKY_REPLACEMENT": 50,
    "OBJECT_REMOVAL": 30,
    "PERSPECTIVE_CORRECTION": 15,
    "HDR_BLENDING": 5
  },
  "byStatus": {
    "COMPLETED": 280,
    "FAILED": 10,
    "PENDING": 5,
    "PROCESSING": 5
  }
}
```

**Response (marketplace)**:

```json
{
  "newListings": 35,
  "newBookings": 25,
  "newFavorites": 100,
  "newMessages": 450
}
```

---

## User Management

### GET `/api/admin/users`

**Role**: ADMIN

Get paginated list of all users with optional filters.

**Query Parameters**:

- `role` (optional): Filter by role (BUYER, LISTER, ADMIN, MODERATOR)
- `status` (optional): Filter by emailVerified status
- `search` (optional): Search in email or displayName
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response**:

```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "LISTER",
      "emailVerified": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "_count": {
        "projects": 5,
        "listings": 3,
        "jobs": 25,
        "subscriptions": 2
      }
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "hasMore": true
}
```

---

### GET `/api/admin/users/:userId`

**Role**: ADMIN

Get detailed information about a specific user.

**Response**:

```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "John Doe",
  "role": "LISTER",
  "emailVerified": true,
  "subscriptions": [
    {
      "id": 5,
      "status": "ACTIVE",
      "creditsRemaining": 150,
      "totalCredits": 200,
      "createdAt": "2024-12-01T00:00:00Z"
    }
  ],
  "activeSubscription": {
    "id": 5,
    "status": "ACTIVE",
    "creditsRemaining": 150
  },
  "creditUsage": {
    "totalUsed": 50
  },
  "recentJobs": [
    {
      "id": 100,
      "type": "VIRTUAL_STAGING",
      "status": "COMPLETED",
      "creditsCharged": 3,
      "createdAt": "2024-12-10T15:30:00Z"
    }
  ],
  "_count": {
    "projects": 5,
    "listings": 3,
    "jobs": 25
  }
}
```

---

### PATCH `/api/admin/users/:userId`

**Role**: ADMIN

Update user information.

**Request Body**:

```json
{
  "role": "ADMIN",
  "emailVerified": true,
  "displayName": "Updated Name"
}
```

**Response**: Updated user object

---

### POST `/api/admin/users/:userId/credits`

**Role**: ADMIN

Manually adjust user's credit balance.

**Request Body**:

```json
{
  "amount": 50, // Positive to add, negative to remove
  "reason": "Refund for failed job"
}
```

**Response**:

```json
{
  "message": "Credits adjusted successfully",
  "newBalance": 200
}
```

---

### GET `/api/admin/users/:userId/activity`

**Role**: ADMIN

Get comprehensive user activity history.

**Query Parameters**:

- `limit` (optional): Number of recent items to fetch

**Response**:

```json
{
  "jobs": [...],
  "creditUsage": [...],
  "subscriptions": [...],
  "listings": [...]
}
```

---

## Job Management

### GET `/api/admin/jobs`

**Role**: ADMIN

Get paginated list of all jobs with filters.

**Query Parameters**:

- `status` (optional): Filter by job status
- `type` (optional): Filter by job type
- `userId` (optional): Filter by user ID
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:

```json
{
  "jobs": [
    {
      "id": 100,
      "type": "VIRTUAL_STAGING",
      "status": "COMPLETED",
      "creditsCharged": 3,
      "processingTime": 45000,
      "createdAt": "2024-12-10T15:30:00Z",
      "user": { "id": 1, "email": "user@example.com" },
      "project": { "id": 5, "name": "Luxury Villa" },
      "image": { "id": 10, "originalUrl": "..." }
    }
  ],
  "total": 500,
  "page": 1,
  "totalPages": 25
}
```

---

### POST `/api/admin/jobs/:jobId/retry`

**Role**: ADMIN

Retry a failed job.

**Response**:

```json
{
  "message": "Job queued for retry",
  "job": { ... }
}
```

**Error Codes**:

- `404`: Job not found
- `400`: Job is not in FAILED status

---

### DELETE `/api/admin/jobs/:jobId`

**Role**: ADMIN

Force delete a job (use with caution).

**Response**:

```json
{
  "message": "Job deleted successfully"
}
```

---

### GET `/api/admin/jobs/metrics`

**Role**: ADMIN

Get aggregated job metrics and performance statistics.

**Response**:

```json
{
  "statusCounts": {
    "COMPLETED": 450,
    "FAILED": 20,
    "PENDING": 15,
    "PROCESSING": 10,
    "CANCELLED": 5
  },
  "typeCounts": {
    "VIRTUAL_STAGING": 200,
    "ENHANCEMENT": 150,
    "SKY_REPLACEMENT": 80
  },
  "totalJobs": 500,
  "completedJobs": 450,
  "failedJobs": 20,
  "successRate": 95.74,
  "avgProcessingTime": 42500,
  "avgCreditsCharged": 2.8
}
```

---

## Listing Management

### GET `/api/admin/listings`

**Role**: ADMIN

Get all listings with admin-level visibility.

**Query Parameters**:

- `status` (optional): Filter by status
- `isPublished` (optional): Filter by published state (true/false)
- `userId` (optional): Filter by lister ID
- `search` (optional): Search in title, description, location
- `page`, `limit`: Pagination

**Response**:

```json
{
  "listings": [
    {
      "id": 10,
      "title": "Luxury Villa",
      "status": "PUBLISHED",
      "isPublished": true,
      "price": 1500000,
      "location": "Beverly Hills, CA",
      "user": { "id": 1, "email": "lister@example.com" },
      "heroImage": { "url": "...", "width": 1920 },
      "_count": {
        "media": 12,
        "favorites": 25,
        "bookings": 5
      }
    }
  ],
  "total": 250,
  "page": 1,
  "totalPages": 13
}
```

---

### PATCH `/api/admin/listings/:listingId/status`

**Role**: ADMIN

Update listing status and published state.

**Request Body**:

```json
{
  "status": "PUBLISHED",
  "isPublished": true
}
```

**Response**: Updated listing

---

### POST `/api/admin/listings/:listingId/unpublish`

**Role**: ADMIN

Force unpublish and archive a listing.

**Request Body**:

```json
{
  "reason": "Violates community guidelines"
}
```

**Response**:

```json
{
  "message": "Listing unpublished successfully"
}
```

---

## Booking Management

### GET `/api/admin/bookings`

**Role**: ADMIN

Get all bookings with filters.

**Query Parameters**:

- `status` (optional): Filter by booking status
- `listingId` (optional): Filter by listing
- `buyerId` (optional): Filter by buyer
- `page`, `limit`: Pagination

**Response**:

```json
{
  "bookings": [
    {
      "id": 50,
      "status": "CONFIRMED",
      "startDate": "2024-12-20T10:00:00Z",
      "endDate": "2024-12-20T11:00:00Z",
      "notes": "Would like to see the backyard",
      "listing": {
        "id": 10,
        "title": "Luxury Villa",
        "user": { "displayName": "Property Lister" },
        "heroImage": { ... }
      },
      "buyer": {
        "id": 2,
        "displayName": "John Buyer",
        "email": "buyer@example.com"
      }
    }
  ],
  "total": 80,
  "page": 1,
  "totalPages": 4
}
```

---

### POST `/api/admin/bookings/:bookingId/cancel`

**Role**: ADMIN

Cancel any booking (dispute resolution).

**Request Body**:

```json
{
  "reason": "Duplicate booking / dispute resolution"
}
```

**Response**:

```json
{
  "message": "Booking cancelled by admin",
  "booking": { ... }
}
```

---

## Content Moderation

### GET `/api/admin/moderation/messages/reported`

**Role**: MODERATOR or ADMIN

Get messages from the last 7 days for review.

**Query Parameters**:

- `page`, `limit`: Pagination

**Response**:

```json
{
  "messages": [
    {
      "id": 100,
      "content": "Message content here",
      "createdAt": "2024-12-10T15:30:00Z",
      "sender": { "id": 1, "displayName": "User A" },
      "receiver": { "id": 2, "displayName": "User B" },
      "listing": { "id": 10, "title": "Property Title" }
    }
  ],
  "total": 50,
  "page": 1,
  "totalPages": 3
}
```

---

### GET `/api/admin/moderation/messages/:listingId/:userId1/:userId2`

**Role**: MODERATOR or ADMIN

Get full conversation between two users for a specific listing.

**Response**:

```json
{
  "messages": [...],
  "participants": {
    "user1": { "id": 1, "displayName": "User A", "email": "..." },
    "user2": { "id": 2, "displayName": "User B", "email": "..." }
  },
  "listing": { "id": 10, "title": "Property Title" }
}
```

---

### DELETE `/api/admin/moderation/messages/:messageId`

**Role**: MODERATOR or ADMIN

Delete inappropriate message.

**Request Body**:

```json
{
  "reason": "Contains spam / inappropriate content"
}
```

**Response**:

```json
{
  "message": "Message deleted successfully"
}
```

---

### GET `/api/admin/moderation/spam`

**Role**: MODERATOR or ADMIN

Detect potential spam activity (high volume users and duplicate messages).

**Response**:

```json
{
  "highVolumeUsers": [
    {
      "user": { "id": 5, "email": "spammer@example.com", "displayName": "..." },
      "messageCount": 75
    }
  ],
  "duplicateMessages": [
    {
      "content": "Check out this deal!",
      "count": 10,
      "senderIds": [5, 8]
    }
  ]
}
```

---

### GET `/api/admin/moderation/listings/flagged`

**Role**: MODERATOR or ADMIN

Get recent listings for moderation review.

**Response**:

```json
{
  "listings": [
    {
      "id": 10,
      "title": "Property Title",
      "status": "PUBLISHED",
      "isPublished": true,
      "user": { ... },
      "heroImage": { ... },
      "_count": { "media": 12, "bookings": 3 }
    }
  ]
}
```

---

### POST `/api/admin/moderation/users/:userId/restrict-messaging`

**Role**: ADMIN

Restrict user from sending messages (temporary ban).

**Request Body**:

```json
{
  "reason": "Spam / harassment",
  "durationHours": 24
}
```

**Response**:

```json
{
  "message": "User messaging restricted",
  "userId": 5,
  "expiresAt": "2024-12-11T15:30:00Z"
}
```

**Note**: Requires database schema update to store restriction data.

---

### GET `/api/admin/moderation/stats`

**Role**: MODERATOR or ADMIN

Get moderation statistics.

**Response**:

```json
{
  "messages": {
    "total": 5000,
    "last24h": 120
  },
  "listings": {
    "total": 250,
    "last24h": 5
  },
  "bookings": {
    "total": 80,
    "last24h": 3
  }
}
```

---

### GET `/api/admin/moderation/users/:userId/history`

**Role**: MODERATOR or ADMIN

Get complete moderation history for a user.

**Response**:

```json
{
  "messages": [
    /* Last 50 messages */
  ],
  "listings": [
    /* All listings */
  ],
  "bookings": [
    /* Last 20 bookings */
  ],
  "summary": {
    "totalMessages": 150,
    "totalListings": 5,
    "publishedListings": 4,
    "totalBookings": 12
  }
}
```

---

### POST `/api/admin/moderation/bulk`

**Role**: MODERATOR or ADMIN

Perform bulk moderation actions.

**Request Body**:

```json
{
  "type": "message", // or "listing"
  "ids": [1, 2, 3, 4, 5],
  "action": "delete" // message: "delete" | listing: "delete", "hide", "approve"
}
```

**Response**:

```json
{
  "message": "Bulk action completed",
  "type": "message",
  "action": "delete",
  "count": 5
}
```

**Listing Actions**:

- `delete`: Permanently delete listings
- `hide`: Unpublish and archive (isPublished=false, status=ARCHIVED)
- `approve`: Publish listings (isPublished=true, status=PUBLISHED)

---

## Error Responses

All endpoints return standard error responses:

**401 Unauthorized**:

```json
{
  "error": "Missing or invalid Authorization header"
}
```

**403 Forbidden**:

```json
{
  "error": "Admin access required"
}
```

**404 Not Found**:

```json
{
  "error": "Resource not found"
}
```

**400 Bad Request**:

```json
{
  "error": "Invalid input / Missing required fields"
}
```

**500 Internal Server Error**:

```json
{
  "error": "Internal server error"
}
```

---

## Security Notes

1. **Rate Limiting**: Implement rate limiting in production
2. **Audit Logging**: All admin actions should be logged
3. **Two-Factor Auth**: Consider requiring 2FA for admin accounts
4. **IP Whitelisting**: Restrict admin access to specific IPs in production
5. **Session Timeout**: Implement shorter session timeouts for admin users

---

## Next Steps

### Recommended Database Additions

```prisma
model ModerationAction {
  id        Int      @id @default(autoincrement())
  moderatorId Int
  moderator User     @relation(fields: [moderatorId], references: [id])
  action    String   // "DELETE_MESSAGE", "UNPUBLISH_LISTING", "RESTRICT_USER", etc.
  targetType String  // "MESSAGE", "LISTING", "USER"
  targetId  Int
  reason    String?
  createdAt DateTime @default(now())
}

model UserRestriction {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  type      String   // "MESSAGING_BAN", "LISTING_BAN"
  reason    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  createdBy Int
  moderator User     @relation("ModeratorActions", fields: [createdBy], references: [id])
}

model UserReport {
  id        Int      @id @default(autoincrement())
  reporterId Int
  reporter  User     @relation("Reporter", fields: [reporterId], references: [id])
  targetType String  // "USER", "LISTING", "MESSAGE"
  targetId  Int
  reason    String
  status    String   // "PENDING", "REVIEWED", "RESOLVED"
  createdAt DateTime @default(now())
  reviewedBy Int?
  reviewer  User?    @relation("Reviewer", fields: [reviewedBy], references: [id])
}
```

### Future Enhancements

- Real-time dashboard with WebSocket updates
- Export analytics to CSV/PDF
- Scheduled email reports
- Advanced spam detection (ML-based)
- User-submitted reporting system
- Announcement/notification system
- Admin activity audit trail
