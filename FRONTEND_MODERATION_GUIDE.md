# AI Content Moderation - Frontend Implementation Guide

This guide is for frontend developers implementing the AI content moderation interface in the admin panel.

## Table of Contents

- [Overview](#overview)
- [User Flow](#user-flow)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [UI Components](#ui-components)
- [Implementation Examples](#implementation-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

The AI moderation system automatically checks user-generated content (listings and messages) before publication. When content is flagged as potentially inappropriate, moderators/admins must manually review and approve or reject it.

### Key Concepts

**Moderation Statuses**:

- `PENDING` - Awaiting AI analysis (rare, only during processing)
- `APPROVED` - Safe content, published
- `FLAGGED` - Questionable content, needs manual review
- `REJECTED` - Inappropriate content, not published

**Risk Scores**:

- `0.0 - 0.3` - Low risk (auto-approved)
- `0.3 - 0.8` - Medium risk (flagged for review)
- `0.8 - 1.0` - High risk (auto-rejected or requires review)

**Content Types**:

- `LISTING` - Property listings (title, description, images)
- `MESSAGE` - Direct messages between users

## User Flow

### For Listers/Users

1. **User creates listing** → AI analyzes content
2. **If approved**: Listing published immediately ✅
3. **If flagged**: Listing saved as draft, user notified "Under review" 🟡
4. **If rejected**: Error shown with reasons ❌

### For Moderators/Admins

1. **View flagged content** in moderation queue
2. **Review AI score and flags** (e.g., "spam", "inappropriate_language")
3. **Make decision**:
   - **Approve** → Publish content
   - **Reject** → Keep unpublished, notify user (optional)
4. **Decision logged** in audit trail

## API Endpoints

All moderation endpoints require `MODERATOR` or `ADMIN` role.

### 1. Get Flagged Listings

```http
GET /api/admin/moderation/listings/flagged?page=1&limit=20
Authorization: Bearer {JWT_TOKEN}
```

**Query Parameters**:

- `page` (optional) - Page number, default: 1
- `limit` (optional) - Items per page, default: 20, max: 100

**Response**:

```json
{
  "listings": [
    {
      "id": 123,
      "title": "Beautiful 3BR Apartment",
      "description": "Spacious apartment...",
      "location": "Downtown",
      "moderationStatus": "FLAGGED",
      "moderationScore": 0.45,
      "aiModerationFlags": ["suspicious_pricing", "incomplete_info"],
      "moderatedAt": "2026-03-06T10:30:00Z",
      "autoModerated": true,
      "isPublished": false,
      "createdAt": "2026-03-06T10:30:00Z",
      "lister": {
        "id": 456,
        "displayName": "John Doe",
        "email": "john@example.com"
      },
      "project": {
        "id": 789,
        "projectName": "Sunset Towers"
      },
      "media": [
        {
          "id": 1,
          "listingId": 123,
          "imageVersion": {
            "id": 1,
            "originalUrl": "https://...",
            "enhancedUrl": "https://..."
          }
        }
      ],
      "moderationLogs": [
        {
          "id": 1,
          "listingId": 123,
          "moderationType": "LISTING",
          "status": "FLAGGED",
          "aiScore": 0.45,
          "aiFlags": ["suspicious_pricing"],
          "aiModel": "content-moderator-v1",
          "createdAt": "2026-03-06T10:30:00Z"
        }
      ]
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "hasMore": false
}
```

### 2. Approve Listing

```http
POST /api/admin/moderation/listings/{listingId}/approve
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "notes": "Content is appropriate. False positive from AI."
}
```

**Request Body**:

- `notes` (optional) - Admin review notes

**Response**:

```json
{
  "listing": {
    "id": 123,
    "title": "Beautiful 3BR Apartment",
    "moderationStatus": "APPROVED",
    "moderatedBy": 789,
    "moderatedAt": "2026-03-06T11:00:00Z",
    "isPublished": true,
    "lister": {
      "id": 456,
      "displayName": "John Doe",
      "email": "john@example.com"
    },
    "project": {
      "id": 789,
      "projectName": "Sunset Towers"
    }
  }
}
```

**Success**: Returns 200 with updated listing
**Errors**:

- `404` - Listing not found
- `401` - Not authenticated
- `403` - Not authorized (not moderator/admin)

### 3. Reject Listing

```http
POST /api/admin/moderation/listings/{listingId}/reject
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "reason": "Contains misleading information about property amenities"
}
```

**Request Body**:

- `reason` (required) - Reason for rejection

**Response**:

```json
{
  "listing": {
    "id": 123,
    "title": "Beautiful 3BR Apartment",
    "moderationStatus": "REJECTED",
    "moderatedBy": 789,
    "moderatedAt": "2026-03-06T11:05:00Z",
    "isPublished": false,
    "lister": {
      "id": 456,
      "displayName": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### 4. Get Flagged Messages

```http
GET /api/admin/moderation/messages/flagged?page=1&limit=20
Authorization: Bearer {JWT_TOKEN}
```

**Response**:

```json
{
  "messages": [
    {
      "id": 456,
      "content": "Message content here...",
      "moderationStatus": "FLAGGED",
      "moderationScore": 0.65,
      "aiModerationFlags": ["suspicious_link", "spam"],
      "createdAt": "2026-03-06T12:00:00Z",
      "sender": {
        "id": 123,
        "displayName": "Jane Smith",
        "email": "jane@example.com"
      },
      "receiver": {
        "id": 456,
        "displayName": "Bob Johnson",
        "email": "bob@example.com"
      },
      "listing": {
        "id": 789,
        "title": "Property Title"
      },
      "moderationLogs": [
        {
          "id": 2,
          "messageId": 456,
          "moderationType": "MESSAGE",
          "status": "FLAGGED",
          "aiScore": 0.65,
          "aiFlags": ["suspicious_link"],
          "createdAt": "2026-03-06T12:00:00Z"
        }
      ]
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "hasMore": false
}
```

### 5. Approve Message

```http
POST /api/admin/moderation/messages/{messageId}/approve
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "notes": "Message is legitimate inquiry"
}
```

**Response**:

```json
{
  "message": {
    "id": 456,
    "content": "Message content...",
    "moderationStatus": "APPROVED",
    "createdAt": "2026-03-06T12:00:00Z",
    "sender": { ... },
    "receiver": { ... },
    "listing": { ... }
  }
}
```

### 6. Delete Message

```http
DELETE /api/admin/moderation/messages/{messageId}
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "reason": "Contains spam links"
}
```

**Request Body**:

- `reason` (required) - Reason for deletion

**Response**:

```json
{
  "success": true,
  "message": {
    "id": 456,
    "content": "Message content...",
    "sender": { ... },
    "receiver": { ... }
  }
}
```

## Data Models

### Listing (Moderation Fields)

```typescript
interface Listing {
  id: number;
  title: string;
  description: string | null;
  location: string | null;

  // Moderation fields
  moderationStatus: "PENDING" | "APPROVED" | "FLAGGED" | "REJECTED";
  moderationScore: number | null; // 0.0 - 1.0
  aiModerationFlags: string[]; // e.g., ["spam", "inappropriate_language"]
  moderatedAt: string | null; // ISO datetime
  moderatedBy: number | null; // Admin user ID
  autoModerated: boolean; // True if AI auto-approved

  // Publication status
  isPublished: boolean;

  // Relations
  lister: User;
  project: Project;
  media: ListingMedia[];
  moderationLogs: ModerationLog[];
}
```

### Message (Moderation Fields)

```typescript
interface Message {
  id: number;
  content: string;

  // Moderation fields
  moderationStatus: "APPROVED" | "FLAGGED" | "REJECTED";
  moderationScore: number | null;
  aiModerationFlags: string[];

  // Relations
  sender: User;
  receiver: User;
  listing: Listing;
  moderationLogs: ModerationLog[];
}
```

### ModerationLog

```typescript
interface ModerationLog {
  id: number;
  listingId: number | null;
  messageId: number | null;
  userId: number; // Content creator
  moderationType: "LISTING" | "MESSAGE" | "IMAGE";
  status: "APPROVED" | "FLAGGED" | "REJECTED";

  // AI Analysis
  aiScore: number | null;
  aiFlags: string[];
  aiModel: string | null;

  // Manual Review
  reviewedBy: number | null; // Admin user ID
  reviewNotes: string | null;

  createdAt: string; // ISO datetime
}
```

### Common Moderation Flags

- `spam` - Detected spam content
- `inappropriate_language` - Offensive language
- `suspicious_pricing` - Unusual pricing patterns
- `incomplete_info` - Missing required information
- `suspicious_link` - Potentially malicious URLs
- `duplicate_content` - Copy-pasted content
- `AI_SERVICE_ERROR` - Fail-safe flag when AI service is down

## UI Components

### 1. Moderation Queue Dashboard

**Location**: `/admin/moderation` or `/admin/content-review`

**Layout**:

```
┌─────────────────────────────────────────────────┐
│  Content Moderation                             │
│  ┌──────────┐  ┌──────────┐                    │
│  │ Listings │  │ Messages │                    │
│  │   (15)   │  │   (8)    │                    │
│  └──────────┘  └──────────┘                    │
└─────────────────────────────────────────────────┘
```

**Tabs**:

- **Flagged Listings** - Show count badge (e.g., "15")
- **Flagged Messages** - Show count badge (e.g., "8")

### 2. Flagged Listings View

**Table Columns**:

1. **Preview** - Thumbnail + Title
2. **Lister** - Name + Email
3. **AI Score** - Visual indicator (color-coded)
4. **Flags** - Badges for each flag
5. **Created** - Relative time (e.g., "2 hours ago")
6. **Actions** - Approve/Reject buttons

**Example Row**:

```
┌────────────────────────────────────────────────────────────────┐
│ [Img] Beautiful 3BR        Jane Doe                            │
│       Downtown             jane@example.com                    │
│                            Score: 0.45 🟡                       │
│                            [spam] [incomplete]                 │
│                            2 hours ago                         │
│                            [Approve ✓] [Reject ✗]             │
└────────────────────────────────────────────────────────────────┘
```

**Score Color Coding**:

- `0.0 - 0.3` - 🟢 Green (low risk)
- `0.3 - 0.6` - 🟡 Yellow (medium risk)
- `0.6 - 0.8` - 🟠 Orange (high risk)
- `0.8 - 1.0` - 🔴 Red (very high risk)

### 3. Listing Detail Modal

**Triggered by**: Click on listing row

**Sections**:

1. **Content Preview**
   - Title (large)
   - Description (full text)
   - Location
   - Project name
   - Image gallery (if available)

2. **AI Analysis**
   - Risk Score (with color indicator)
   - Flags (as badges)
   - Model used (e.g., "content-moderator-v1")
   - Timestamp

3. **User Information**
   - Lister name
   - Email (with "View Profile" link)
   - Account creation date
   - Previous violations (if any)

4. **Moderation History**
   - List of all moderation logs for this listing
   - Show previous reviews if any

5. **Actions**
   - **Approve** button (with optional notes field)
   - **Reject** button (with required reason field)
   - **View Full Listing** link (to see in context)

**Mockup**:

```
┌─────────────────────────────────────────────────┐
│  Review Listing #123                      [X]   │
├─────────────────────────────────────────────────┤
│  📷 [Image Gallery]                             │
│                                                 │
│  Title: Beautiful 3BR Apartment                 │
│  Description: Spacious apartment with...        │
│  Location: Downtown                             │
│  Project: Sunset Towers                         │
│                                                 │
│  ⚠️ AI Analysis                                 │
│  Risk Score: 0.45 🟡 (Medium Risk)             │
│  Flags: [spam] [incomplete_info]               │
│  Analyzed: Mar 6, 2026 10:30 AM                │
│                                                 │
│  👤 Lister Information                          │
│  Jane Doe (jane@example.com)                   │
│  [View Profile →]                               │
│                                                 │
│  📝 Review Notes (optional)                     │
│  [________________________________]             │
│                                                 │
│  [✓ Approve]  [✗ Reject]                       │
└─────────────────────────────────────────────────┘
```

### 4. Reject Modal

**Triggered by**: Click "Reject" button

**Fields**:

- **Reason** (required) - Textarea
- **Notify User** (checkbox) - Send email notification
- **Block Future Submissions** (checkbox) - Flag user for review

**Buttons**:

- **Cancel** - Close modal
- **Confirm Rejection** - Submit rejection

### 5. Flagged Messages View

**Table Columns**:

1. **Message** - Truncated content (first 100 chars)
2. **Sender → Receiver** - Names with arrows
3. **Listing** - Related listing title
4. **AI Score** - Color-coded
5. **Flags** - Badges
6. **Sent** - Relative time
7. **Actions** - Approve/Delete buttons

**Example Row**:

```
┌────────────────────────────────────────────────────────────────┐
│ "Hey check this link..."     Jane → Bob                        │
│ Re: Beautiful 3BR            Score: 0.65 🟠                    │
│                              [suspicious_link]                 │
│                              1 hour ago                        │
│                              [Approve ✓] [Delete 🗑️]          │
└────────────────────────────────────────────────────────────────┘
```

### 6. Message Detail Modal

Similar to listing modal but simpler:

1. **Message Content** (full text)
2. **Conversation Context** (last 5 messages for context)
3. **AI Analysis** (score, flags)
4. **Participants** (sender/receiver info)
5. **Related Listing** (link to listing)
6. **Actions** (Approve/Delete)

### 7. Success/Error Notifications

**After Approve**:

```
✓ Listing approved and published successfully
```

**After Reject**:

```
✗ Listing rejected. User will be notified.
```

**On Error**:

```
❌ Failed to approve listing. Please try again.
```

## Implementation Examples

### React + TypeScript Example

#### 1. API Service Layer

```typescript
// services/moderationApi.ts
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3000";

interface FlaggedListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

interface FlaggedMessagesResponse {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export const moderationApi = {
  // Get flagged listings
  getFlaggedListings: async (page = 1, limit = 20) => {
    const response = await axios.get<FlaggedListingsResponse>(
      `${API_BASE}/api/admin/moderation/listings/flagged`,
      {
        params: { page, limit },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  },

  // Approve listing
  approveListing: async (listingId: number, notes?: string) => {
    const response = await axios.post(
      `${API_BASE}/api/admin/moderation/listings/${listingId}/approve`,
      { notes },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  },

  // Reject listing
  rejectListing: async (listingId: number, reason: string) => {
    const response = await axios.post(
      `${API_BASE}/api/admin/moderation/listings/${listingId}/reject`,
      { reason },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  },

  // Get flagged messages
  getFlaggedMessages: async (page = 1, limit = 20) => {
    const response = await axios.get<FlaggedMessagesResponse>(
      `${API_BASE}/api/admin/moderation/messages/flagged`,
      {
        params: { page, limit },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  },

  // Approve message
  approveMessage: async (messageId: number, notes?: string) => {
    const response = await axios.post(
      `${API_BASE}/api/admin/moderation/messages/${messageId}/approve`,
      { notes },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  },

  // Delete message
  deleteMessage: async (messageId: number, reason: string) => {
    const response = await axios.delete(
      `${API_BASE}/api/admin/moderation/messages/${messageId}`,
      {
        data: { reason },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  },
};
```

#### 2. Flagged Listings Component

```tsx
// components/admin/FlaggedListings.tsx
import React, { useState, useEffect } from "react";
import { moderationApi } from "../../services/moderationApi";
import { ListingReviewModal } from "./ListingReviewModal";
import { RiskScoreBadge } from "./RiskScoreBadge";

export const FlaggedListings: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Fetch flagged listings
  useEffect(() => {
    fetchListings();
  }, [page]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const data = await moderationApi.getFlaggedListings(page, 20);
      setListings(data.listings);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch listings");
    } finally {
      setLoading(false);
    }
  };

  // Handle approve
  const handleApprove = async (listingId: number, notes?: string) => {
    try {
      await moderationApi.approveListing(listingId, notes);

      // Show success notification
      alert("Listing approved successfully!");

      // Refresh list
      fetchListings();

      // Close modal
      setSelectedListing(null);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to approve listing");
    }
  };

  // Handle reject
  const handleReject = async (listingId: number, reason: string) => {
    try {
      await moderationApi.rejectListing(listingId, reason);

      alert("Listing rejected successfully!");
      fetchListings();
      setSelectedListing(null);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to reject listing");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flagged-listings">
      <h2>Flagged Listings ({listings.length})</h2>

      {listings.length === 0 ? (
        <div className="empty-state">
          <p>No flagged listings to review! 🎉</p>
        </div>
      ) : (
        <table className="listings-table">
          <thead>
            <tr>
              <th>Listing</th>
              <th>Lister</th>
              <th>Risk Score</th>
              <th>Flags</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td>
                  <div className="listing-preview">
                    {listing.media[0] && (
                      <img
                        src={listing.media[0].imageVersion.originalUrl}
                        alt={listing.title}
                        className="thumbnail"
                      />
                    )}
                    <div>
                      <strong>{listing.title}</strong>
                      <br />
                      <small>{listing.location}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{listing.lister.displayName}</div>
                  <small>{listing.lister.email}</small>
                </td>
                <td>
                  <RiskScoreBadge score={listing.moderationScore || 0} />
                </td>
                <td>
                  {listing.aiModerationFlags.map((flag) => (
                    <span key={flag} className="flag-badge">
                      {flag}
                    </span>
                  ))}
                </td>
                <td>{formatRelativeTime(listing.createdAt)}</td>
                <td>
                  <button
                    onClick={() => setSelectedListing(listing)}
                    className="btn-review"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Review Modal */}
      {selectedListing && (
        <ListingReviewModal
          listing={selectedListing}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </div>
  );
};

// Helper function
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}
```

#### 3. Risk Score Badge Component

```tsx
// components/admin/RiskScoreBadge.tsx
import React from "react";

interface RiskScoreBadgeProps {
  score: number;
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({ score }) => {
  const getColor = (score: number) => {
    if (score < 0.3) return "green";
    if (score < 0.6) return "yellow";
    if (score < 0.8) return "orange";
    return "red";
  };

  const getLabel = (score: number) => {
    if (score < 0.3) return "Low Risk";
    if (score < 0.6) return "Medium Risk";
    if (score < 0.8) return "High Risk";
    return "Very High Risk";
  };

  const color = getColor(score);
  const label = getLabel(score);

  return (
    <div className={`risk-badge risk-${color}`}>
      <span className="score">{score.toFixed(2)}</span>
      <span className="label">{label}</span>
    </div>
  );
};
```

#### 4. Listing Review Modal

```tsx
// components/admin/ListingReviewModal.tsx
import React, { useState } from "react";

interface ListingReviewModalProps {
  listing: Listing;
  onApprove: (listingId: number, notes?: string) => void;
  onReject: (listingId: number, reason: string) => void;
  onClose: () => void;
}

export const ListingReviewModal: React.FC<ListingReviewModalProps> = ({
  listing,
  onApprove,
  onReject,
  onClose,
}) => {
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = () => {
    onApprove(listing.id, notes || undefined);
  };

  const handleReject = () => {
    if (!reason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    onReject(listing.id, reason);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Review Listing #{listing.id}</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Image Gallery */}
          {listing.media.length > 0 && (
            <div className="image-gallery">
              {listing.media.map((media) => (
                <img
                  key={media.id}
                  src={
                    media.imageVersion.enhancedUrl ||
                    media.imageVersion.originalUrl
                  }
                  alt={listing.title}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="content-section">
            <h3>{listing.title}</h3>
            <p>{listing.description}</p>
            <p>
              <strong>Location:</strong> {listing.location}
            </p>
            <p>
              <strong>Project:</strong> {listing.project.projectName}
            </p>
          </div>

          {/* AI Analysis */}
          <div className="analysis-section">
            <h4>⚠️ AI Analysis</h4>
            <div className="analysis-details">
              <RiskScoreBadge score={listing.moderationScore || 0} />
              <div className="flags">
                <strong>Flags:</strong>
                {listing.aiModerationFlags.map((flag) => (
                  <span key={flag} className="flag-badge">
                    {flag}
                  </span>
                ))}
              </div>
              <p>
                <strong>Analyzed:</strong>{" "}
                {new Date(listing.moderatedAt!).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Lister Info */}
          <div className="lister-section">
            <h4>👤 Lister Information</h4>
            <p>
              <strong>Name:</strong> {listing.lister.displayName}
            </p>
            <p>
              <strong>Email:</strong> {listing.lister.email}
            </p>
          </div>

          {/* Moderation History */}
          {listing.moderationLogs.length > 0 && (
            <div className="history-section">
              <h4>📋 Moderation History</h4>
              {listing.moderationLogs.map((log) => (
                <div key={log.id} className="log-entry">
                  <span className={`status-${log.status.toLowerCase()}`}>
                    {log.status}
                  </span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                  {log.reviewNotes && <p>{log.reviewNotes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Action Forms */}
          {!showRejectForm ? (
            <div className="notes-section">
              <label>Review Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about your decision..."
                rows={3}
              />
            </div>
          ) : (
            <div className="reject-section">
              <label>Reason for Rejection (required) *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this listing is being rejected..."
                rows={3}
                required
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!showRejectForm ? (
            <>
              <button onClick={handleApprove} className="btn-approve">
                ✓ Approve & Publish
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                className="btn-reject"
              >
                ✗ Reject
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowRejectForm(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button onClick={handleReject} className="btn-confirm-reject">
                Confirm Rejection
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
```

### Vue.js Example

```vue
<!-- components/admin/FlaggedListings.vue -->
<template>
  <div class="flagged-listings">
    <h2>Flagged Listings ({{ listings.length }})</h2>

    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else-if="listings.length === 0" class="empty-state">
      <p>No flagged listings to review! 🎉</p>
    </div>
    <table v-else class="listings-table">
      <thead>
        <tr>
          <th>Listing</th>
          <th>Lister</th>
          <th>Risk Score</th>
          <th>Flags</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="listing in listings" :key="listing.id">
          <td>
            <div class="listing-preview">
              <img
                v-if="listing.media[0]"
                :src="listing.media[0].imageVersion.originalUrl"
                :alt="listing.title"
                class="thumbnail"
              />
              <div>
                <strong>{{ listing.title }}</strong
                ><br />
                <small>{{ listing.location }}</small>
              </div>
            </div>
          </td>
          <td>
            <div>{{ listing.lister.displayName }}</div>
            <small>{{ listing.lister.email }}</small>
          </td>
          <td>
            <RiskScoreBadge :score="listing.moderationScore || 0" />
          </td>
          <td>
            <span
              v-for="flag in listing.aiModerationFlags"
              :key="flag"
              class="flag-badge"
            >
              {{ flag }}
            </span>
          </td>
          <td>{{ formatRelativeTime(listing.createdAt) }}</td>
          <td>
            <button @click="selectedListing = listing" class="btn-review">
              Review
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Review Modal -->
    <ListingReviewModal
      v-if="selectedListing"
      :listing="selectedListing"
      @approve="handleApprove"
      @reject="handleReject"
      @close="selectedListing = null"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { moderationApi } from "@/services/moderationApi";
import ListingReviewModal from "./ListingReviewModal.vue";
import RiskScoreBadge from "./RiskScoreBadge.vue";

export default defineComponent({
  name: "FlaggedListings",
  components: { ListingReviewModal, RiskScoreBadge },
  setup() {
    const listings = ref<Listing[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const selectedListing = ref<Listing | null>(null);

    const fetchListings = async () => {
      try {
        loading.value = true;
        const data = await moderationApi.getFlaggedListings();
        listings.value = data.listings;
        error.value = null;
      } catch (err: any) {
        error.value = err.response?.data?.error || "Failed to fetch listings";
      } finally {
        loading.value = false;
      }
    };

    const handleApprove = async (listingId: number, notes?: string) => {
      try {
        await moderationApi.approveListing(listingId, notes);
        alert("Listing approved successfully!");
        await fetchListings();
        selectedListing.value = null;
      } catch (err: any) {
        alert(err.response?.data?.error || "Failed to approve listing");
      }
    };

    const handleReject = async (listingId: number, reason: string) => {
      try {
        await moderationApi.rejectListing(listingId, reason);
        alert("Listing rejected successfully!");
        await fetchListings();
        selectedListing.value = null;
      } catch (err: any) {
        alert(err.response?.data?.error || "Failed to reject listing");
      }
    };

    const formatRelativeTime = (dateStr: string): string => {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hours ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days ago`;
    };

    onMounted(fetchListings);

    return {
      listings,
      loading,
      error,
      selectedListing,
      handleApprove,
      handleReject,
      formatRelativeTime,
    };
  },
});
</script>
```

## Error Handling

### Common Error Responses

**401 Unauthorized**:

```json
{
  "error": "Unauthorized"
}
```

**Action**: Redirect to login page

**403 Forbidden**:

```json
{
  "error": "Admin or Moderator access required"
}
```

**Action**: Show "Access denied" message

**404 Not Found**:

```json
{
  "error": "Listing not found"
}
```

**Action**: Show "Content no longer exists" message

**500 Internal Server Error**:

```json
{
  "error": "Internal server error"
}
```

**Action**: Show generic error, log to error tracking service

### Frontend Error Handling Pattern

```typescript
try {
  await moderationApi.approveListing(listingId, notes);
  // Success notification
  showToast("Listing approved successfully!", "success");
  // Refresh data
  await fetchListings();
} catch (error: any) {
  if (error.response) {
    // Server responded with error
    switch (error.response.status) {
      case 401:
        // Redirect to login
        router.push("/login");
        break;
      case 403:
        showToast("You do not have permission to perform this action", "error");
        break;
      case 404:
        showToast("This listing no longer exists", "error");
        // Remove from UI
        setListings(listings.filter((l) => l.id !== listingId));
        break;
      default:
        showToast(error.response.data.error || "An error occurred", "error");
    }
  } else {
    // Network error
    showToast("Network error. Please check your connection.", "error");
  }
}
```

## Best Practices

### 1. Polling for Real-Time Updates

If you want real-time updates without WebSockets:

```typescript
useEffect(() => {
  // Poll every 30 seconds
  const interval = setInterval(() => {
    fetchListings();
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

### 2. Optimistic Updates

Update UI immediately, revert on error:

```typescript
const handleApprove = async (listingId: number) => {
  // Optimistically remove from list
  setListings(listings.filter((l) => l.id !== listingId));

  try {
    await moderationApi.approveListing(listingId);
    showToast("Listing approved!", "success");
  } catch (error) {
    // Revert on error
    await fetchListings();
    showToast("Failed to approve listing", "error");
  }
};
```

### 3. Keyboard Shortcuts

For power users (moderators reviewing many items):

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (!selectedListing) return;

    if (e.key === "a" && e.ctrlKey) {
      e.preventDefault();
      handleApprove(selectedListing.id);
    } else if (e.key === "r" && e.ctrlKey) {
      e.preventDefault();
      // Show reject form
    }
  };

  window.addEventListener("keydown", handleKeyPress);
  return () => window.removeEventListener("keydown", handleKeyPress);
}, [selectedListing]);
```

### 4. Batch Actions

Allow moderators to approve/reject multiple items:

```typescript
const [selectedIds, setSelectedIds] = useState<number[]>([]);

const handleBatchApprove = async () => {
  const promises = selectedIds.map((id) => moderationApi.approveListing(id));

  try {
    await Promise.all(promises);
    showToast(`${selectedIds.length} listings approved!`, "success");
    await fetchListings();
    setSelectedIds([]);
  } catch (error) {
    showToast("Some approvals failed", "error");
  }
};
```

### 5. Filtering & Sorting

```typescript
// Filter by risk score
const highRiskListings = listings.filter(
  (l) => l.moderationScore && l.moderationScore >= 0.6,
);

// Sort by score (highest risk first)
const sortedListings = [...listings].sort(
  (a, b) => (b.moderationScore || 0) - (a.moderationScore || 0),
);

// Filter by specific flag
const spamListings = listings.filter((l) =>
  l.aiModerationFlags.includes("spam"),
);
```

### 6. User Feedback Messages

**For Users (when content is flagged)**:

```
"Your listing is under review"
"Our team is reviewing your content to ensure it meets our community guidelines.
This typically takes 24-48 hours. You'll be notified once it's approved."
```

**For Users (when content is rejected)**:

```
"Your listing was not approved"
"Your listing 'Beautiful 3BR Apartment' was not approved for the following reasons:
- Contains misleading information about property amenities
- Pricing appears unrealistic

Please review our community guidelines and resubmit."
```

### 7. Analytics Tracking

Track moderation metrics:

```typescript
// Track approve action
analytics.track("Listing Approved", {
  listingId: listing.id,
  moderatorId: currentUser.id,
  aiScore: listing.moderationScore,
  flags: listing.aiModerationFlags,
  reviewTime: Date.now() - modalOpenTime,
});

// Track reject action
analytics.track("Listing Rejected", {
  listingId: listing.id,
  moderatorId: currentUser.id,
  aiScore: listing.moderationScore,
  flags: listing.aiModerationFlags,
  reason: rejectionReason,
});
```

### 8. Accessibility

- Use semantic HTML (`<button>`, `<table>`, etc.)
- Add ARIA labels: `aria-label="Approve listing"`
- Keyboard navigation support
- Screen reader announcements for status changes
- Color-blind friendly risk indicators (use icons + colors)

## Testing Checklist

### Functionality

- [ ] Flagged listings load correctly
- [ ] Pagination works
- [ ] Modal opens with full details
- [ ] Approve action works and removes from queue
- [ ] Reject action works with reason validation
- [ ] Flagged messages load correctly
- [ ] Message approve/delete works
- [ ] Error handling shows appropriate messages

### Edge Cases

- [ ] Empty queue state displays correctly
- [ ] Very long descriptions are truncated properly
- [ ] Missing images handled gracefully
- [ ] Multiple flags display correctly
- [ ] Very high/low risk scores display properly

### Permissions

- [ ] Non-admin users cannot access moderation routes
- [ ] Non-moderator users get 403 error
- [ ] Expired JWT redirects to login

### Performance

- [ ] Large lists (50+ items) render smoothly
- [ ] Image loading doesn't block UI
- [ ] Pagination loads quickly

### UX

- [ ] Loading states show during API calls
- [ ] Success messages confirm actions
- [ ] Error messages are clear and actionable
- [ ] Modal can be closed with ESC key
- [ ] Forms validate before submission

## Integration with Existing Admin Panel

### Adding to Navigation

```tsx
// AdminLayout.tsx
<nav>
  <NavLink to="/admin/dashboard">Dashboard</NavLink>
  <NavLink to="/admin/users">Users</NavLink>
  <NavLink to="/admin/listings">Listings</NavLink>
  <NavLink to="/admin/moderation">
    Content Moderation
    {flaggedCount > 0 && <span className="badge">{flaggedCount}</span>}
  </NavLink>
  <NavLink to="/admin/analytics">Analytics</NavLink>
</nav>
```

### Adding Routes

```tsx
// App.tsx or Router.tsx
import { FlaggedListings } from "./components/admin/FlaggedListings";
import { FlaggedMessages } from "./components/admin/FlaggedMessages";

<Route path="/admin/moderation">
  <Route index element={<ModerationDashboard />} />
  <Route path="listings" element={<FlaggedListings />} />
  <Route path="messages" element={<FlaggedMessages />} />
</Route>;
```

### Dashboard Widget

```tsx
// AdminDashboard.tsx
<div className="dashboard">
  <Widget>
    <h3>Content Moderation</h3>
    <div className="stats">
      <div className="stat">
        <span className="number">{flaggedListingsCount}</span>
        <span className="label">Flagged Listings</span>
      </div>
      <div className="stat">
        <span className="number">{flaggedMessagesCount}</span>
        <span className="label">Flagged Messages</span>
      </div>
    </div>
    <Link to="/admin/moderation">Review Content →</Link>
  </Widget>
</div>
```

## Summary

This moderation system provides:

✅ **Automatic AI Analysis** - Content checked before publication
✅ **Manual Review Queue** - Moderators review flagged content
✅ **Audit Trail** - All decisions logged
✅ **User-Friendly API** - Simple REST endpoints
✅ **Flexible UI** - Adapt to your design system

**Next Steps**:

1. Implement API service layer
2. Create flagged listings view
3. Create flagged messages view
4. Add to admin navigation
5. Test with real data
6. Add notifications for users

For backend setup, see [AI_MODERATION_SETUP.md](./AI_MODERATION_SETUP.md).
