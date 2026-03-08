# Direct Messaging & Booking System API Documentation

**For Frontend Developers**

This document explains the **Direct Messaging System** and **Booking/Tour System** for the AiPix real estate marketplace. Both features allow buyers and listers to communicate and schedule property viewings.

---

## Table of Contents

1. [Overview](#overview)
2. [Direct Messaging System](#direct-messaging-system)
   - [Data Models](#message-data-models)
   - [User Flow](#messaging-user-flow)
   - [API Endpoints](#messaging-api-endpoints)
3. [Booking System](#booking-system)
   - [Data Models](#booking-data-models)
   - [User Flow](#booking-user-flow)
   - [API Endpoints](#booking-api-endpoints)
4. [Admin Moderation](#admin-moderation)
5. [Frontend Integration Examples](#frontend-integration-examples)
6. [AI Content Moderation](#ai-content-moderation)
7. [Error Handling](#error-handling)

---

## Overview

### Direct Messaging System

The messaging system enables communication between:
- **Buyers** interested in a property
- **Listers** who own the listing

All messages are:
- Tied to a specific listing
- AI-moderated for inappropriate content
- Organized into conversations per listing + user pair

### Booking System

The booking system allows:
- **Buyers** to request property viewings/tours
- **Listers** to confirm or reject booking requests
- **Conflict detection** to prevent double-bookings
- **Status tracking** (PENDING, CONFIRMED, REJECTED, CANCELLED)

---

## Direct Messaging System

### Message Data Models

```typescript
interface Message {
  id: number;
  listingId: number;
  senderId: number;
  receiverId: number;
  content: string;
  isFromAi: boolean;
  
  // AI Moderation
  moderationStatus: "APPROVED" | "FLAGGED" | "REJECTED";
  moderationScore: number | null;
  aiModerationFlags: string[];
  
  createdAt: string; // ISO timestamp
  
  // Relations (when included)
  sender?: {
    id: number;
    displayName: string;
  };
  receiver?: {
    id: number;
    displayName: string;
  };
  listing?: {
    id: number;
    title: string;
    media?: Array<{
      id: number;
      isHero: boolean;
      imageVersion: {
        id: number;
        s3Url: string;
        // ... other image details
      };
    }>;
  };
}
```

```typescript
interface Conversation {
  listingId: number;
  listing: {
    id: number;
    title: string;
    media: Array<{
      imageVersion: {
        s3Url: string;
      };
    }>;
  };
  otherUser: {
    id: number;
    displayName: string;
  };
  lastMessage: Message;
  messageCount: number;
}
```

---

### Messaging User Flow

#### For Buyers

1. **Browse marketplace** → Find interesting listing
2. **View listing detail** → Click "Contact Seller"
3. **Send message** → Enter inquiry about property
4. **Receive response** → Get notifications when lister replies
5. **Continue conversation** → Back-and-forth messaging

#### For Listers

1. **Receive notification** → New message from buyer
2. **View conversations** → See all active inquiries
3. **Reply to buyer** → Answer questions, provide details
4. **Manage multiple conversations** → Organized by listing + buyer

---

### Messaging API Endpoints

#### 1. Send Message

**Endpoint:** `POST /api/listings/messages`

**Auth:** Required (Buyer or Lister)

**Request Body:**
```json
{
  "listingId": 123,
  "receiverId": 456,
  "content": "Hi, I'm interested in this property. Is it still available?"
}
```

**Response (201 Created):**
```json
{
  "message": {
    "id": 789,
    "listingId": 123,
    "senderId": 1,
    "receiverId": 456,
    "content": "Hi, I'm interested in this property. Is it still available?",
    "moderationStatus": "APPROVED",
    "moderationScore": 0.02,
    "aiModerationFlags": [],
    "createdAt": "2026-03-09T10:30:00.000Z",
    "sender": {
      "id": 1,
      "displayName": "John Doe"
    },
    "receiver": {
      "id": 456,
      "displayName": "Jane Smith"
    },
    "listing": {
      "id": 123,
      "title": "Beautiful 3BR House in Downtown",
      "media": [{
        "id": 1,
        "isHero": true,
        "imageVersion": {
          "id": 10,
          "s3Url": "https://s3.amazonaws.com/..."
        }
      }]
    }
  }
}
```

**Validations:**
- Content: 1-5000 characters
- Listing must exist and be published
- Receiver must exist
- Cannot message yourself
- AI moderation check (auto-blocks if score ≥ 0.8)

**Moderation Statuses:**
- `APPROVED` (score < 0.5): Message sent successfully
- `FLAGGED` (0.5 ≤ score < 0.8): Message sent but flagged for admin review
- `REJECTED` (score ≥ 0.8): Message blocked, returns 500 error

**Error Responses:**
```json
// 404 - Listing not found
{ "error": "Listing not found" }

// 404 - Receiver not found
{ "error": "Receiver not found" }

// 400 - Cannot message yourself
{ "error": "Cannot message yourself" }

// 400 - Empty message
{ "error": "Message content required" }

// 400 - Message too long
{ "error": "Message too long" }

// 500 - High-risk content blocked
{ "error": "Internal server error" }
```

---

#### 2. Get All Conversations

**Endpoint:** `GET /api/listings/messages/conversations`

**Auth:** Required

**Description:** Returns all active conversations for the logged-in user, grouped by listing and other participant.

**Response (200 OK):**
```json
{
  "conversations": [
    {
      "listingId": 123,
      "listing": {
        "id": 123,
        "title": "Beautiful 3BR House in Downtown",
        "media": [{
          "imageVersion": {
            "s3Url": "https://s3.amazonaws.com/..."
          }
        }]
      },
      "otherUser": {
        "id": 456,
        "displayName": "Jane Smith"
      },
      "lastMessage": {
        "id": 789,
        "senderId": 1,
        "receiverId": 456,
        "content": "Thank you, I'll check it out!",
        "createdAt": "2026-03-09T12:00:00.000Z"
      },
      "messageCount": 5
    },
    {
      "listingId": 124,
      "listing": {
        "id": 124,
        "title": "Modern Loft with City Views",
        "media": [{
          "imageVersion": {
            "s3Url": "https://s3.amazonaws.com/..."
          }
        }]
      },
      "otherUser": {
        "id": 789,
        "displayName": "Bob Johnson"
      },
      "lastMessage": {
        "id": 790,
        "senderId": 789,
        "receiverId": 1,
        "content": "When can we schedule a viewing?",
        "createdAt": "2026-03-08T15:30:00.000Z"
      },
      "messageCount": 3
    }
  ]
}
```

**Notes:**
- Conversations sorted by most recent message first
- Includes both sent and received conversations
- Shows listing hero image for context
- Message count helps prioritize active conversations

---

#### 3. Get Specific Conversation

**Endpoint:** `GET /api/listings/messages/:listingId/:userId`

**Auth:** Required (must be buyer or lister for that listing)

**Description:** Get full message history between you and another user for a specific listing.

**Example:** `GET /api/listings/messages/123/456`

**Response (200 OK):**
```json
{
  "messages": [
    {
      "id": 785,
      "listingId": 123,
      "senderId": 1,
      "receiverId": 456,
      "content": "Hi, I'm interested in this property. Is it still available?",
      "moderationStatus": "APPROVED",
      "createdAt": "2026-03-09T10:30:00.000Z",
      "sender": {
        "id": 1,
        "displayName": "John Doe"
      }
    },
    {
      "id": 786,
      "listingId": 123,
      "senderId": 456,
      "receiverId": 1,
      "content": "Yes, it's still available! Would you like to schedule a viewing?",
      "moderationStatus": "APPROVED",
      "createdAt": "2026-03-09T11:00:00.000Z",
      "sender": {
        "id": 456,
        "displayName": "Jane Smith"
      }
    },
    {
      "id": 787,
      "listingId": 123,
      "senderId": 1,
      "receiverId": 456,
      "content": "That would be great! How about tomorrow at 2 PM?",
      "moderationStatus": "APPROVED",
      "createdAt": "2026-03-09T11:15:00.000Z",
      "sender": {
        "id": 1,
        "displayName": "John Doe"
      }
    }
  ]
}
```

**Error Responses:**
```json
// 404 - Listing not found
{ "error": "Listing not found" }

// 403 - Not authorized to view this conversation
{ "error": "Access denied" }
```

**Notes:**
- Messages sorted chronologically (oldest first)
- Only includes messages between these two specific users
- Lister can view all conversations for their listing
- Buyer can only view conversations they're part of

---

## Booking System

### Booking Data Models

```typescript
interface Booking {
  id: number;
  listingId: number;
  buyerId: number;
  requestedStart: string; // ISO timestamp
  requestedEnd: string; // ISO timestamp
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  
  // Relations (when included)
  listing?: {
    id: number;
    title: string;
    price: number;
    currency: string;
    locationCity: string;
    locationState: string;
    heroImage?: {
      s3Url: string;
      // ... other image details
    };
    user?: {
      id: number;
      displayName: string;
      email: string;
    };
  };
  buyer?: {
    id: number;
    displayName: string;
    email: string;
  };
}
```

### Booking Status Flow

```
BUYER CREATES REQUEST
        ↓
    [PENDING]
        ↓
   ┌────────┐
   ↓        ↓
[CONFIRMED] [REJECTED]  ← Lister's decision
   ↓        ↓
   ↓    [CANCELLED]  ← Buyer or Admin can cancel
   ↓
[CANCELLED]  ← Buyer or Admin can cancel confirmed bookings too
```

---

### Booking User Flow

#### For Buyers

1. **View listing detail** → Find available viewing times
2. **Request booking** → Select start/end datetime
3. **Wait for confirmation** → Status: PENDING
4. **Receive notification** → Lister confirms or rejects
5. **Attend viewing** → If CONFIRMED
6. **Optional: Cancel** → If plans change (before viewing)

#### For Listers

1. **Receive booking request** → Notification of new request
2. **Review request** → Check buyer info and time slot
3. **Confirm or reject** → Update booking status
4. **Manage schedule** → View all bookings for listings
5. **Host viewing** → If confirmed

---

### Booking API Endpoints

#### 1. Create Booking Request

**Endpoint:** `POST /api/listings/bookings`

**Auth:** Required (Authenticated user - becomes "buyer")

**Request Body:**
```json
{
  "listingId": 123,
  "requestedStart": "2026-03-15T14:00:00.000Z",
  "requestedEnd": "2026-03-15T15:00:00.000Z"
}
```

**Response (201 Created):**
```json
{
  "id": 456,
  "listingId": 123,
  "buyerId": 1,
  "requestedStart": "2026-03-15T14:00:00.000Z",
  "requestedEnd": "2026-03-15T15:00:00.000Z",
  "status": "PENDING",
  "createdAt": "2026-03-09T10:30:00.000Z",
  "updatedAt": "2026-03-09T10:30:00.000Z",
  "listing": {
    "id": 123,
    "title": "Beautiful 3BR House in Downtown",
    "price": 450000,
    "currency": "USD",
    "locationCity": "San Francisco",
    "locationState": "CA",
    "heroImage": {
      "s3Url": "https://s3.amazonaws.com/..."
    },
    "user": {
      "id": 789,
      "displayName": "Jane Smith",
      "email": "jane@example.com"
    }
  },
  "buyer": {
    "id": 1,
    "displayName": "John Doe",
    "email": "john@example.com"
  }
}
```

**Validations:**
- Listing must exist and be published (`status: "PUBLISHED"`)
- Cannot book your own listing
- `requestedStart` must be in the future
- `requestedEnd` must be after `requestedStart`
- No conflicting bookings (PENDING or CONFIRMED) in same time slot

**Error Responses:**
```json
// 404 - Listing not found or not published
{ "error": "LISTING_NOT_FOUND" }

// 400 - Attempting to book own listing
{ "error": "CANNOT_BOOK_OWN_LISTING" }

// 400 - Start date is in the past
{ "error": "INVALID_START_DATE" }

// 400 - End date is before start date
{ "error": "INVALID_END_DATE" }

// 409 - Time slot conflict
{ "error": "BOOKING_CONFLICT" }
```

**Conflict Detection:**
The system checks for overlapping bookings with status `PENDING` or `CONFIRMED`. A conflict exists if:
- New booking starts during an existing booking
- New booking ends during an existing booking
- New booking completely encompasses an existing booking

---

#### 2. Get Buyer's Bookings

**Endpoint:** `GET /api/listings/bookings?status={status}&page={page}&limit={limit}`

**Auth:** Required (returns bookings where user is the buyer)

**Query Parameters:**
- `status` (optional): Filter by status (`PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)

**Example:** `GET /api/listings/bookings?status=PENDING&page=1&limit=10`

**Response (200 OK):**
```json
{
  "bookings": [
    {
      "id": 456,
      "listingId": 123,
      "buyerId": 1,
      "requestedStart": "2026-03-15T14:00:00.000Z",
      "requestedEnd": "2026-03-15T15:00:00.000Z",
      "status": "PENDING",
      "createdAt": "2026-03-09T10:30:00.000Z",
      "updatedAt": "2026-03-09T10:30:00.000Z",
      "listing": {
        "id": 123,
        "title": "Beautiful 3BR House in Downtown",
        "price": 450000,
        "currency": "USD",
        "heroImage": {
          "s3Url": "https://s3.amazonaws.com/..."
        },
        "user": {
          "id": 789,
          "displayName": "Jane Smith",
          "email": "jane@example.com"
        }
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "hasMore": false
}
```

---

#### 3. Get Lister's Bookings (Received)

**Endpoint:** `GET /api/listings/bookings/received?status={status}&listingId={listingId}&page={page}&limit={limit}`

**Auth:** Required (must be a LISTER)

**Query Parameters:**
- `status` (optional): Filter by status
- `listingId` (optional): Filter by specific listing
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)

**Example:** `GET /api/listings/bookings/received?status=PENDING&page=1`

**Response (200 OK):**
```json
{
  "bookings": [
    {
      "id": 456,
      "listingId": 123,
      "buyerId": 1,
      "requestedStart": "2026-03-15T14:00:00.000Z",
      "requestedEnd": "2026-03-15T15:00:00.000Z",
      "status": "PENDING",
      "createdAt": "2026-03-09T10:30:00.000Z",
      "updatedAt": "2026-03-09T10:30:00.000Z",
      "listing": {
        "id": 123,
        "title": "Beautiful 3BR House in Downtown",
        "heroImage": {
          "s3Url": "https://s3.amazonaws.com/..."
        }
      },
      "buyer": {
        "id": 1,
        "displayName": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "hasMore": false
}
```

---

#### 4. Get Single Booking Details

**Endpoint:** `GET /api/listings/bookings/:id`

**Auth:** Required (must be buyer or lister)

**Example:** `GET /api/listings/bookings/456`

**Response (200 OK):**
```json
{
  "id": 456,
  "listingId": 123,
  "buyerId": 1,
  "requestedStart": "2026-03-15T14:00:00.000Z",
  "requestedEnd": "2026-03-15T15:00:00.000Z",
  "status": "CONFIRMED",
  "createdAt": "2026-03-09T10:30:00.000Z",
  "updatedAt": "2026-03-09T11:00:00.000Z",
  "listing": {
    "id": 123,
    "title": "Beautiful 3BR House in Downtown",
    "price": 450000,
    "currency": "USD",
    "locationCity": "San Francisco",
    "locationState": "CA",
    "heroImage": {
      "s3Url": "https://s3.amazonaws.com/..."
    },
    "user": {
      "id": 789,
      "displayName": "Jane Smith",
      "email": "jane@example.com"
    }
  },
  "buyer": {
    "id": 1,
    "displayName": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Response:**
```json
// 404 - Booking not found or no access
{ "error": "Not found" }
```

---

#### 5. Update Booking Status (Lister)

**Endpoint:** `PATCH /api/listings/bookings/:id/status`

**Auth:** Required (must be LISTER who owns the listing)

**Request Body:**
```json
{
  "status": "CONFIRMED"
  // or "REJECTED"
}
```

**Response (200 OK):**
```json
{
  "id": 456,
  "listingId": 123,
  "buyerId": 1,
  "requestedStart": "2026-03-15T14:00:00.000Z",
  "requestedEnd": "2026-03-15T15:00:00.000Z",
  "status": "CONFIRMED",
  "createdAt": "2026-03-09T10:30:00.000Z",
  "updatedAt": "2026-03-09T11:00:00.000Z",
  "listing": {
    "id": 123,
    "title": "Beautiful 3BR House in Downtown",
    "heroImage": {
      "s3Url": "https://s3.amazonaws.com/..."
    }
  },
  "buyer": {
    "id": 1,
    "displayName": "John Doe",
    "email": "john@example.com"
  }
}
```

**Validations:**
- Only lister can update status
- Cannot update already CANCELLED or REJECTED bookings
- Valid statuses: `CONFIRMED`, `REJECTED`, `CANCELLED`

**Error Responses:**
```json
// 404 - Booking not found
{ "error": "BOOKING_NOT_FOUND" }

// 403 - Not your booking
{ "error": "NOT_YOUR_BOOKING" }

// 400 - Booking already closed
{ "error": "BOOKING_ALREADY_CLOSED" }
```

---

#### 6. Cancel Booking (Buyer)

**Endpoint:** `POST /api/listings/bookings/:id/cancel`

**Auth:** Required (must be buyer who created the booking)

**Example:** `POST /api/listings/bookings/456/cancel`

**Response (200 OK):**
```json
{
  "id": 456,
  "listingId": 123,
  "buyerId": 1,
  "requestedStart": "2026-03-15T14:00:00.000Z",
  "requestedEnd": "2026-03-15T15:00:00.000Z",
  "status": "CANCELLED",
  "createdAt": "2026-03-09T10:30:00.000Z",
  "updatedAt": "2026-03-09T12:00:00.000Z"
}
```

**Validations:**
- Only buyer can cancel
- Cannot cancel already CANCELLED or REJECTED bookings

**Error Responses:**
```json
// 404 - Booking not found
{ "error": "BOOKING_NOT_FOUND" }

// 403 - Not your booking
{ "error": "NOT_YOUR_BOOKING" }

// 400 - Booking already closed
{ "error": "BOOKING_ALREADY_CLOSED" }
```

---

## Admin Moderation

### Admin Message Moderation

#### 1. Get Flagged Messages

**Endpoint:** `GET /admin/moderation/messages/flagged?page={page}&limit={limit}`

**Auth:** Required (MODERATOR or ADMIN)

**Response:**
```json
{
  "messages": [
    {
      "id": 789,
      "listingId": 123,
      "senderId": 1,
      "receiverId": 456,
      "content": "Potentially problematic content...",
      "moderationStatus": "FLAGGED",
      "moderationScore": 0.65,
      "aiModerationFlags": ["spam", "inappropriate_language"],
      "createdAt": "2026-03-09T10:30:00.000Z",
      "sender": {
        "id": 1,
        "displayName": "John Doe"
      },
      "receiver": {
        "id": 456,
        "displayName": "Jane Smith"
      },
      "listing": {
        "id": 123,
        "title": "Beautiful 3BR House in Downtown"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "hasMore": false
}
```

---

#### 2. Approve Message

**Endpoint:** `POST /admin/moderation/messages/:messageId/approve`

**Auth:** Required (MODERATOR or ADMIN)

**Request Body:**
```json
{
  "notes": "Reviewed - content is acceptable" // optional
}
```

**Response (200 OK):**
```json
{
  "id": 789,
  "moderationStatus": "APPROVED",
  "sender": {
    "id": 1,
    "displayName": "John Doe",
    "email": "john@example.com"
  },
  "receiver": {
    "id": 456,
    "displayName": "Jane Smith",
    "email": "jane@example.com"
  },
  "listing": {
    "id": 123,
    "title": "Beautiful 3BR House in Downtown"
  }
}
```

---

#### 3. Delete Message

**Endpoint:** `DELETE /admin/moderation/messages/:messageId`

**Auth:** Required (MODERATOR or ADMIN)

**Query Parameters:**
- `reason` (required): Reason for deletion

**Example:** `DELETE /admin/moderation/messages/789?reason=Inappropriate content`

**Response (200 OK):**
```json
{
  "success": true
}
```

---

#### 4. View Conversation (Admin)

**Endpoint:** `GET /admin/moderation/messages/:listingId/:userId1/:userId2`

**Auth:** Required (MODERATOR or ADMIN)

**Description:** View full conversation between two users for moderation purposes.

**Response:**
```json
{
  "messages": [
    // Array of messages in conversation
  ]
}
```

---

#### 5. Get Reported Messages

**Endpoint:** `GET /admin/moderation/messages/reported?page={page}&limit={limit}`

**Auth:** Required (MODERATOR or ADMIN)

**Description:** Get messages that have been reported by users.

---

### Admin Booking Management

#### 1. Get All Bookings

**Endpoint:** `GET /admin/bookings?status={status}&page={page}&limit={limit}`

**Auth:** Required (ADMIN)

**Query Parameters:**
- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Results per page

**Response:** Similar to buyer bookings but includes all bookings across all users.

---

#### 2. Cancel Any Booking (Admin)

**Endpoint:** `POST /admin/bookings/:bookingId/cancel`

**Auth:** Required (ADMIN)

**Request Body:**
```json
{
  "reason": "Listing removed" // optional
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## Frontend Integration Examples

### Example 1: Messaging Interface

```typescript
// Vue/React component for sending messages

interface SendMessageForm {
  content: string;
}

async function sendMessage(listingId: number, receiverId: number, content: string) {
  try {
    const response = await fetch('/api/listings/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        listingId,
        receiverId,
        content
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const data = await response.json();
    
    // Check moderation status
    if (data.message.moderationStatus === 'FLAGGED') {
      showWarning('Your message has been sent but flagged for review');
    }
    
    return data.message;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

// Usage in chat component
async function handleSendMessage() {
  const message = await sendMessage(
    listingId,
    sellerId,
    messageInput.value
  );
  
  // Add to conversation UI
  messages.value.push(message);
  messageInput.value = '';
}
```

---

### Example 2: Conversation List

```typescript
// Fetch all conversations for inbox
async function loadConversations() {
  try {
    const response = await fetch('/api/listings/messages/conversations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    // Display conversations with:
    // - Listing thumbnail
    // - Other user's name
    // - Last message preview
    // - Message count (badge)
    
    conversations.value = data.conversations.map(conv => ({
      id: `${conv.listingId}-${conv.otherUser.id}`,
      listingTitle: conv.listing.title,
      listingImage: conv.listing.media[0]?.imageVersion.s3Url,
      contactName: conv.otherUser.displayName,
      lastMessage: conv.lastMessage.content,
      lastMessageTime: new Date(conv.lastMessage.createdAt),
      unreadCount: 0, // Implement unread tracking separately
      messageCount: conv.messageCount
    }));
  } catch (error) {
    console.error('Failed to load conversations:', error);
  }
}
```

---

### Example 3: View Conversation Thread

```typescript
// Load full conversation between user and seller
async function loadConversation(listingId: number, otherUserId: number) {
  try {
    const response = await fetch(
      `/api/listings/messages/${listingId}/${otherUserId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = await response.json();
    
    messages.value = data.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      isOwn: msg.senderId === currentUserId,
      senderName: msg.sender.displayName,
      timestamp: new Date(msg.createdAt),
      moderationStatus: msg.moderationStatus
    }));
    
    // Auto-scroll to bottom
    scrollToBottom();
  } catch (error) {
    console.error('Failed to load conversation:', error);
  }
}
```

---

### Example 4: Create Booking Request

```typescript
// Booking form component
interface BookingForm {
  date: string;
  startTime: string;
  endTime: string;
}

async function requestBooking(listingId: number, form: BookingForm) {
  try {
    // Combine date and time into ISO timestamps
    const requestedStart = new Date(`${form.date}T${form.startTime}`).toISOString();
    const requestedEnd = new Date(`${form.date}T${form.endTime}`).toISOString();
    
    const response = await fetch('/api/listings/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        listingId,
        requestedStart,
        requestedEnd
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      if (error.error === 'BOOKING_CONFLICT') {
        throw new Error('This time slot is not available');
      }
      throw new Error(error.error);
    }
    
    const data = await response.json();
    
    // Show success message
    showSuccess('Booking request sent! The seller will review your request.');
    
    // Navigate to bookings page
    router.push('/bookings');
    
    return data;
  } catch (error) {
    console.error('Failed to create booking:', error);
    showError(error.message);
  }
}
```

---

### Example 5: Lister Booking Management

```typescript
// Lister dashboard - manage incoming bookings
async function loadIncomingBookings(status: string = 'PENDING') {
  try {
    const response = await fetch(
      `/api/listings/bookings/received?status=${status}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = await response.json();
    
    bookings.value = data.bookings.map(booking => ({
      id: booking.id,
      listingTitle: booking.listing.title,
      listingImage: booking.listing.heroImage?.s3Url,
      buyerName: booking.buyer.displayName,
      buyerEmail: booking.buyer.email,
      requestedStart: new Date(booking.requestedStart),
      requestedEnd: new Date(booking.requestedEnd),
      status: booking.status,
      createdAt: new Date(booking.createdAt)
    }));
  } catch (error) {
    console.error('Failed to load bookings:', error);
  }
}

async function confirmBooking(bookingId: number) {
  try {
    const response = await fetch(
      `/api/listings/bookings/${bookingId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'CONFIRMED' })
      }
    );
    
    if (!response.ok) throw new Error('Failed to confirm booking');
    
    const data = await response.json();
    
    // Update UI
    showSuccess('Booking confirmed! The buyer will be notified.');
    
    // Refresh bookings list
    loadIncomingBookings();
  } catch (error) {
    console.error('Failed to confirm booking:', error);
    showError(error.message);
  }
}

async function rejectBooking(bookingId: number) {
  try {
    const response = await fetch(
      `/api/listings/bookings/${bookingId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'REJECTED' })
      }
    );
    
    if (!response.ok) throw new Error('Failed to reject booking');
    
    showSuccess('Booking rejected.');
    loadIncomingBookings();
  } catch (error) {
    console.error('Failed to reject booking:', error);
  }
}
```

---

### Example 6: Buyer Booking Management

```typescript
// Buyer dashboard - view and cancel bookings
async function loadMyBookings(status?: string) {
  try {
    const url = status 
      ? `/api/listings/bookings?status=${status}`
      : '/api/listings/bookings';
      
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    bookings.value = data.bookings.map(booking => ({
      id: booking.id,
      listingTitle: booking.listing.title,
      listingImage: booking.listing.heroImage?.s3Url,
      listingPrice: booking.listing.price,
      listingCurrency: booking.listing.currency,
      sellerName: booking.listing.user.displayName,
      sellerEmail: booking.listing.user.email,
      requestedStart: new Date(booking.requestedStart),
      requestedEnd: new Date(booking.requestedEnd),
      status: booking.status,
      createdAt: new Date(booking.createdAt)
    }));
  } catch (error) {
    console.error('Failed to load bookings:', error);
  }
}

async function cancelMyBooking(bookingId: number) {
  try {
    const confirmed = await confirm(
      'Are you sure you want to cancel this booking?'
    );
    
    if (!confirmed) return;
    
    const response = await fetch(
      `/api/listings/bookings/${bookingId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) throw new Error('Failed to cancel booking');
    
    showSuccess('Booking cancelled.');
    loadMyBookings();
  } catch (error) {
    console.error('Failed to cancel booking:', error);
    showError(error.message);
  }
}
```

---

### Example 7: Real-time Updates (Optional)

```typescript
// Using WebSockets or polling for real-time updates

// Polling approach (simpler)
function startMessagePolling(conversationId: string) {
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(
        `/api/listings/messages/${listingId}/${otherUserId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      const data = await response.json();
      
      // Check if there are new messages
      if (data.messages.length > messages.value.length) {
        messages.value = data.messages;
        scrollToBottom();
        playNotificationSound();
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 5000); // Poll every 5 seconds
  
  // Clean up on component unmount
  onUnmounted(() => clearInterval(pollInterval));
}
```

---

## AI Content Moderation

### How It Works

All messages sent through the platform are automatically checked by an AI content moderation system.

**Moderation Process:**

1. **User sends message** → Content is submitted
2. **AI analyzes content** → Checks for:
   - Spam
   - Inappropriate language
   - Scams/fraud
   - Personal information sharing
   - Off-platform transaction attempts
3. **Score assigned** → 0.0 (clean) to 1.0 (highly problematic)
4. **Action taken** → Based on score:
   - **< 0.5**: Approved (sent immediately)
   - **0.5 - 0.8**: Flagged (sent but reviewed by moderators)
   - **≥ 0.8**: Rejected (blocked, not sent)

**For Frontend Developers:**

```typescript
// Handle moderation status in UI
function displayMessage(message: Message) {
  let statusBadge = '';
  
  switch (message.moderationStatus) {
    case 'APPROVED':
      // No badge needed
      break;
    case 'FLAGGED':
      statusBadge = `
        <span class="badge badge-warning">
          Under Review
        </span>
      `;
      break;
    case 'REJECTED':
      // This should rarely appear as rejected messages aren't saved
      statusBadge = `
        <span class="badge badge-danger">
          Blocked
        </span>
      `;
      break;
  }
  
  return `
    <div class="message ${message.isOwn ? 'own' : 'other'}">
      <p>${escapeHtml(message.content)}</p>
      ${statusBadge}
      <small>${formatTime(message.createdAt)}</small>
    </div>
  `;
}
```

---

## Error Handling

### Common Error Patterns

```typescript
async function handleApiCall<T>(
  apiFunction: () => Promise<T>
): Promise<T | null> {
  try {
    return await apiFunction();
  } catch (error: any) {
    // Network errors
    if (error.name === 'NetworkError') {
      showError('Network error. Please check your connection.');
      return null;
    }
    
    // Authentication errors
    if (error.status === 401) {
      showError('Please log in to continue.');
      router.push('/login');
      return null;
    }
    
    // Permission errors
    if (error.status === 403) {
      showError('You do not have permission to perform this action.');
      return null;
    }
    
    // Not found errors
    if (error.status === 404) {
      showError('Resource not found.');
      return null;
    }
    
    // Validation errors
    if (error.status === 400) {
      showError(error.message || 'Invalid request.');
      return null;
    }
    
    // Server errors
    if (error.status >= 500) {
      showError('Server error. Please try again later.');
      return null;
    }
    
    // Default error
    showError('An unexpected error occurred.');
    return null;
  }
}

// Usage
const result = await handleApiCall(() => 
  sendMessage(listingId, receiverId, content)
);

if (result) {
  // Success
  messages.value.push(result);
}
```

---

### Message-Specific Error Handling

```typescript
async function sendMessageWithValidation(
  listingId: number,
  receiverId: number,
  content: string
) {
  // Client-side validation
  if (!content || content.trim().length === 0) {
    showError('Message cannot be empty');
    return null;
  }
  
  if (content.length > 5000) {
    showError('Message is too long (max 5000 characters)');
    return null;
  }
  
  try {
    const response = await fetch('/api/listings/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ listingId, receiverId, content })
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      switch (error.error) {
        case 'Listing not found':
          showError('This listing is no longer available');
          router.push('/marketplace');
          break;
        case 'Receiver not found':
          showError('This user no longer exists');
          break;
        case 'Cannot message yourself':
          showError('You cannot send messages to yourself');
          break;
        case 'Message content required':
          showError('Message cannot be empty');
          break;
        case 'Message too long':
          showError('Message exceeds maximum length');
          break;
        default:
          if (error.error.includes('MESSAGE_REJECTED')) {
            showError('Your message was blocked due to policy violations');
          } else {
            showError('Failed to send message');
          }
      }
      
      return null;
    }
    
    const data = await response.json();
    
    // Handle flagged messages
    if (data.message.moderationStatus === 'FLAGGED') {
      showWarning(
        'Your message has been sent but will be reviewed by moderators'
      );
    }
    
    return data.message;
  } catch (error) {
    console.error('Failed to send message:', error);
    showError('Network error. Please try again.');
    return null;
  }
}
```

---

### Booking-Specific Error Handling

```typescript
async function createBookingWithValidation(
  listingId: number,
  requestedStart: Date,
  requestedEnd: Date
) {
  // Client-side validation
  const now = new Date();
  
  if (requestedStart < now) {
    showError('Start time must be in the future');
    return null;
  }
  
  if (requestedEnd <= requestedStart) {
    showError('End time must be after start time');
    return null;
  }
  
  try {
    const response = await fetch('/api/listings/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        listingId,
        requestedStart: requestedStart.toISOString(),
        requestedEnd: requestedEnd.toISOString()
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      switch (error.error) {
        case 'LISTING_NOT_FOUND':
          showError('This listing is not available for booking');
          break;
        case 'CANNOT_BOOK_OWN_LISTING':
          showError('You cannot book your own listing');
          break;
        case 'INVALID_START_DATE':
          showError('Start date must be in the future');
          break;
        case 'INVALID_END_DATE':
          showError('End date must be after start date');
          break;
        case 'BOOKING_CONFLICT':
          showError('This time slot is already booked. Please choose another time.');
          break;
        default:
          showError('Failed to create booking');
      }
      
      return null;
    }
    
    const data = await response.json();
    
    showSuccess(
      'Booking request sent! The seller will review and confirm.'
    );
    
    return data;
  } catch (error) {
    console.error('Failed to create booking:', error);
    showError('Network error. Please try again.');
    return null;
  }
}
```

---

## Summary for Frontend Developers

### Key Takeaways

**Messaging System:**
- ✅ All messages are AI-moderated
- ✅ Messages are organized by listing + user pair (conversations)
- ✅ Both buyers and listers can initiate conversations
- ✅ Flagged messages are sent but reviewed by admins
- ✅ High-risk messages are blocked immediately

**Booking System:**
- ✅ Bookings start as PENDING and require lister confirmation
- ✅ Conflict detection prevents double-bookings
- ✅ Both buyer and lister receive booking details
- ✅ Status flow: PENDING → CONFIRMED/REJECTED → CANCELLED
- ✅ Admin can view and cancel any booking

**UI Recommendations:**
- Show conversation list with listing context (thumbnail, title)
- Display moderation status badges for flagged messages
- Implement real-time or polling for new messages
- Show booking status with color-coded badges
- Provide calendar view for booking management
- Send email/push notifications for new messages and booking updates

**Performance Tips:**
- Cache conversation lists
- Implement infinite scroll for message history
- Use optimistic UI updates (show message immediately, then confirm)
- Debounce message sending to prevent spam
- Lazy load listing images in conversation list

---

## API Endpoints Quick Reference

### Messaging

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/listings/messages` | Required | Send message |
| GET | `/api/listings/messages/conversations` | Required | Get all conversations |
| GET | `/api/listings/messages/:listingId/:userId` | Required | Get specific conversation |

### Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/listings/bookings` | Required | Create booking request |
| GET | `/api/listings/bookings` | Required | Get buyer's bookings |
| GET | `/api/listings/bookings/received` | Lister | Get lister's bookings |
| GET | `/api/listings/bookings/:id` | Required | Get booking details |
| PATCH | `/api/listings/bookings/:id/status` | Lister | Confirm/reject booking |
| POST | `/api/listings/bookings/:id/cancel` | Buyer | Cancel booking |

### Admin - Messages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/moderation/messages/flagged` | Moderator/Admin | Get flagged messages |
| POST | `/admin/moderation/messages/:id/approve` | Moderator/Admin | Approve message |
| DELETE | `/admin/moderation/messages/:id` | Moderator/Admin | Delete message |
| GET | `/admin/moderation/messages/:listingId/:userId1/:userId2` | Moderator/Admin | View conversation |

### Admin - Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/bookings` | Admin | Get all bookings |
| POST | `/admin/bookings/:id/cancel` | Admin | Cancel any booking |

---

**End of Documentation**

For additional questions or feature requests, please contact the backend team.
