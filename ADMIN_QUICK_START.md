# Admin Panel Quick Start Guide

## Prerequisites

1. **Admin User Account**: You need a user account with ADMIN role
2. **JWT Token**: Obtain authentication token
3. **API Client**: Use Postman, Thunder Client, or curl

## Getting Started

### Step 1: Create Admin User

If you don't have an admin user yet, you'll need to manually update the database:

```sql
-- Update existing user to admin
UPDATE "User"
SET role = 'ADMIN',
    roles = ARRAY['ADMIN']::text[]
WHERE email = 'your-email@example.com';
```

Or create a new admin user via registration and then update:

```bash
# 1. Register normally via POST /auth/register
# 2. Then update in database as shown above
```

### Step 2: Login and Get JWT Token

```bash
POST http://localhost:4000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "displayName": "Admin User",
    "role": "ADMIN"
  }
}
```

**Save the token** - you'll need it for all admin requests.

### Step 3: Test Admin Access

Use the token in the Authorization header for all admin requests:

```
Authorization: Bearer <your-token-here>
```

## Common Admin Tasks

### 1. View Dashboard

Get overview of platform metrics:

```bash
GET http://localhost:4000/api/admin/dashboard
Authorization: Bearer <token>
```

**What you'll see**:

- Total users by role
- Listing statistics (published, draft)
- Booking statistics by status
- Job queue metrics and success rate
- Revenue for last 30 days

### 2. Manage Users

#### List All Users

```bash
GET http://localhost:4000/api/admin/users?page=1&limit=20
Authorization: Bearer <token>
```

#### Search Users

```bash
GET http://localhost:4000/api/admin/users?search=john&role=LISTER
Authorization: Bearer <token>
```

#### View User Details

```bash
GET http://localhost:4000/api/admin/users/5
Authorization: Bearer <token>
```

#### Change User Role

```bash
PATCH http://localhost:4000/api/admin/users/5
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "MODERATOR"
}
```

#### Adjust User Credits

```bash
POST http://localhost:4000/api/admin/users/5/credits
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50,
  "reason": "Refund for failed jobs"
}
```

Use negative amount to deduct:

```json
{
  "amount": -20,
  "reason": "Manual adjustment"
}
```

### 3. Monitor Job Queue

#### View All Jobs

```bash
GET http://localhost:4000/api/admin/jobs?status=FAILED&page=1
Authorization: Bearer <token>
```

#### Get Job Metrics

```bash
GET http://localhost:4000/api/admin/jobs/metrics
Authorization: Bearer <token>
```

**Shows**:

- Jobs by status (completed, failed, pending, processing)
- Jobs by type (virtual staging, enhancement, etc.)
- Success rate percentage
- Average processing time
- Average credits per job

#### Retry Failed Job

```bash
POST http://localhost:4000/api/admin/jobs/123/retry
Authorization: Bearer <token>
```

#### Delete Job

```bash
DELETE http://localhost:4000/api/admin/jobs/123
Authorization: Bearer <token>
```

### 4. Moderate Content

#### Check for Spam Activity

```bash
GET http://localhost:4000/api/admin/moderation/spam
Authorization: Bearer <token>
```

**Detects**:

- Users sending 50+ messages in 24 hours
- Duplicate message content sent 3+ times

#### Review Recent Messages

```bash
GET http://localhost:4000/api/admin/moderation/messages/reported?page=1&limit=20
Authorization: Bearer <token>
```

#### View Conversation

```bash
GET http://localhost:4000/api/admin/moderation/messages/10/5/8
# Format: /moderation/messages/:listingId/:userId1/:userId2
Authorization: Bearer <token>
```

#### Delete Inappropriate Message

```bash
DELETE http://localhost:4000/api/admin/moderation/messages/100
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Contains spam/inappropriate content"
}
```

#### Bulk Delete Messages

```bash
POST http://localhost:4000/api/admin/moderation/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "message",
  "ids": [100, 101, 102, 103],
  "action": "delete"
}
```

### 5. Moderate Listings

#### View All Listings

```bash
GET http://localhost:4000/api/admin/listings?search=villa&isPublished=true
Authorization: Bearer <token>
```

#### Review Flagged Listings

```bash
GET http://localhost:4000/api/admin/moderation/listings/flagged
Authorization: Bearer <token>
```

#### Unpublish Listing

```bash
POST http://localhost:4000/api/admin/listings/10/unpublish
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Violates community guidelines"
}
```

#### Bulk Moderate Listings

```bash
POST http://localhost:4000/api/admin/moderation/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "listing",
  "ids": [10, 11, 12],
  "action": "hide"
}
```

**Actions**:

- `"delete"` - Permanently delete
- `"hide"` - Unpublish and archive
- `"approve"` - Publish

### 6. Manage Bookings

#### View All Bookings

```bash
GET http://localhost:4000/api/admin/bookings?status=PENDING
Authorization: Bearer <token>
```

#### Cancel Booking (Dispute Resolution)

```bash
POST http://localhost:4000/api/admin/bookings/50/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Duplicate booking / dispute resolved"
}
```

### 7. View Analytics

#### User Growth

```bash
GET http://localhost:4000/api/admin/analytics/users?days=30
Authorization: Bearer <token>
```

**Shows**: New users in last 30 days, broken down by role

#### Revenue Analytics

```bash
GET http://localhost:4000/api/admin/analytics/revenue?days=30
Authorization: Bearer <token>
```

**Shows**: Total revenue, transaction count, average transaction

#### Job Analytics

```bash
GET http://localhost:4000/api/admin/analytics/jobs?days=7
Authorization: Bearer <token>
```

**Shows**: Jobs by type and status for last 7 days

#### Marketplace Analytics

```bash
GET http://localhost:4000/api/admin/analytics/marketplace?days=30
Authorization: Bearer <token>
```

**Shows**: New listings, bookings, favorites, messages

### 8. User Activity Investigation

#### Get User Moderation History

```bash
GET http://localhost:4000/api/admin/moderation/users/5/history
Authorization: Bearer <token>
```

**Shows**:

- Last 50 messages
- All listings
- Last 20 bookings
- Summary statistics

#### Get User Activity Log

```bash
GET http://localhost:4000/api/admin/users/5/activity?limit=100
Authorization: Bearer <token>
```

**Shows**:

- Recent jobs
- Credit usage history
- Subscription history
- Recent listings

### 9. Moderation Statistics

```bash
GET http://localhost:4000/api/admin/moderation/stats
Authorization: Bearer <token>
```

**Shows**:

- Total and 24h message count
- Total and 24h listing count
- Total and 24h booking count

## Testing Workflow

### Complete Admin Workflow Test

1. **Dashboard Check**

   ```bash
   GET /api/admin/dashboard
   ```

   ✅ Verify metrics are returned

2. **User Management**

   ```bash
   GET /api/admin/users
   GET /api/admin/users/1
   PATCH /api/admin/users/1 {"role": "MODERATOR"}
   POST /api/admin/users/1/credits {"amount": 50, "reason": "Test"}
   ```

   ✅ Verify user updated successfully

3. **Job Monitoring**

   ```bash
   GET /api/admin/jobs
   GET /api/admin/jobs/metrics
   ```

   ✅ Verify job data is accurate

4. **Content Moderation**

   ```bash
   GET /api/admin/moderation/spam
   GET /api/admin/moderation/messages/reported
   ```

   ✅ Verify moderation features work

5. **Analytics**
   ```bash
   GET /api/admin/analytics/users?days=30
   GET /api/admin/analytics/revenue?days=30
   ```
   ✅ Verify analytics calculations

## Troubleshooting

### Issue: "Admin access required" Error

**Cause**: User account doesn't have ADMIN role

**Solution**: Update user in database:

```sql
UPDATE "User"
SET role = 'ADMIN',
    roles = ARRAY['ADMIN']::text[]
WHERE id = <user-id>;
```

### Issue: "Unauthorized" Error

**Cause**: Missing or invalid JWT token

**Solution**:

1. Ensure token is fresh (login again if expired)
2. Check Authorization header format: `Bearer <token>`
3. Verify token is not corrupted (no extra spaces)

### Issue: "User not found" Error

**Cause**: User ID doesn't exist

**Solution**: Verify user exists:

```sql
SELECT id, email, role FROM "User" WHERE id = <user-id>;
```

### Issue: Can't Adjust Credits

**Error**: "NO_ACTIVE_SUBSCRIPTION"

**Cause**: User doesn't have an active subscription

**Solution**: Create subscription for user first via billing endpoints

## Postman Collection

Create a Postman collection with these requests:

1. **Environment Variables**:
   - `base_url`: `http://localhost:4000`
   - `admin_token`: `<your-jwt-token>`

2. **Collection Setup**:
   - Add pre-request script to all requests:
     ```javascript
     pm.request.headers.add({
       key: "Authorization",
       value: "Bearer {{admin_token}}",
     });
     ```

3. **Organize by Folder**:
   - Dashboard
   - User Management
   - Job Management
   - Listing Moderation
   - Booking Management
   - Analytics
   - Content Moderation

## Security Best Practices

1. **Never share admin tokens**
2. **Use strong passwords** for admin accounts
3. **Log all admin actions** (consider implementing audit trail)
4. **Restrict admin access** to trusted IPs in production
5. **Enable 2FA** for admin accounts (future enhancement)
6. **Rotate tokens regularly**
7. **Monitor admin activity** for suspicious patterns

## Common Use Cases

### Scenario 1: Handle Spam User

1. Detect spam: `GET /api/admin/moderation/spam`
2. Review user history: `GET /api/admin/moderation/users/:userId/history`
3. Bulk delete messages: `POST /api/admin/moderation/bulk`
4. Restrict messaging: `POST /api/admin/moderation/users/:userId/restrict-messaging`

### Scenario 2: Refund Failed Jobs

1. Check failed jobs: `GET /api/admin/jobs?status=FAILED&userId=5`
2. Calculate credit refund
3. Adjust user credits: `POST /api/admin/users/5/credits`
4. Retry jobs: `POST /api/admin/jobs/:jobId/retry`

### Scenario 3: Resolve Booking Dispute

1. View booking: `GET /api/admin/bookings?buyerId=5`
2. Review listing: `GET /api/admin/listings`
3. Cancel booking: `POST /api/admin/bookings/:id/cancel`
4. Adjust credits if needed: `POST /api/admin/users/5/credits`

### Scenario 4: Monthly Platform Review

1. Dashboard: `GET /api/admin/dashboard`
2. User growth: `GET /api/admin/analytics/users?days=30`
3. Revenue: `GET /api/admin/analytics/revenue?days=30`
4. Job performance: `GET /api/admin/jobs/metrics`
5. Marketplace activity: `GET /api/admin/analytics/marketplace?days=30`

## Next Steps

1. ✅ Test all endpoints with real data
2. ✅ Verify role-based access control
3. ✅ Check analytics accuracy
4. 📋 Implement audit logging (future)
5. 📋 Add rate limiting (production)
6. 📋 Set up monitoring alerts
7. 📋 Create admin dashboard UI

## Support

For issues or questions:

- Check ADMIN_API_REFERENCE.md for detailed API docs
- Review ADMIN_IMPLEMENTATION_SUMMARY.md for architecture
- Verify JWT token is valid and user has ADMIN role
- Check server logs for error details
