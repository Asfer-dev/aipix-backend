# 🏗️ AIPIX Backend - Lister Routes Documentation

## Overview

This document covers all API endpoints for **LISTER** users who create and manage property listings, upload images, use AI enhancement tools, and receive booking requests.

**Base URL:** `http://localhost:4000`

**Authentication:** All lister routes require:

- JWT token in Authorization header: `Authorization: Bearer <token>`
- User must have `LISTER` role (check via `/auth/me`)

---

## 📁 Projects Module

Base path: `/projects`

Projects are containers for property images and listings. Each lister can create multiple projects.

### 1. **List All Projects**

**GET** `/projects`

Returns all projects owned by the authenticated lister.

**Success Response (200):**

```json
{
  "projects": [
    {
      "id": 1,
      "userId": 5,
      "name": "Sunset Villa Project",
      "clientName": "John Smith",
      "notes": "Luxury villa with ocean views",
      "createdAt": "2026-03-01T10:00:00Z",
      "updatedAt": "2026-03-01T10:00:00Z"
    }
  ]
}
```

**Error Responses:**

- `401` - Unauthorized (missing token or not a LISTER)

---

### 2. **Create New Project**

**POST** `/projects`

Creates a new project container for organizing images and listings.

**Request Body:**

```json
{
  "name": "Sunset Villa Project",
  "clientName": "John Smith", // Optional
  "notes": "Luxury villa with ocean views" // Optional
}
```

**Success Response (201):**

```json
{
  "project": {
    "id": 1,
    "userId": 5,
    "name": "Sunset Villa Project",
    "clientName": "John Smith",
    "notes": "Luxury villa with ocean views",
    "createdAt": "2026-03-01T10:00:00Z",
    "updatedAt": "2026-03-01T10:00:00Z"
  }
}
```

**Error Responses:**

- `400` - name is required
- `401` - Unauthorized

---

### 3. **Get Project Details**

**GET** `/projects/:id`

Returns detailed information about a specific project, including ad copies.

**Success Response (200):**

```json
{
  "project": {
    "id": 1,
    "userId": 5,
    "name": "Sunset Villa Project",
    "clientName": "John Smith",
    "notes": "Luxury villa with ocean views",
    "createdAt": "2026-03-01T10:00:00Z",
    "updatedAt": "2026-03-01T10:00:00Z",
    "adCopies": [
      {
        "id": 1,
        "channel": "ZILLOW",
        "title": "Stunning Ocean View Villa",
        "description": "Luxury 4-bed villa...",
        "keywords": ["luxury", "ocean view", "villa"]
      }
    ]
  }
}
```

**Error Responses:**

- `400` - Invalid project id
- `404` - Project not found
- `401` - Unauthorized

---

## 🖼️ Image Management

### 4. **List Project Images**

**GET** `/projects/:id/images`

Returns all images in a project with their versions (ORIGINAL and ENHANCED).

**Success Response (200):**

```json
{
  "images": [
    {
      "id": 1,
      "projectId": 1,
      "originalUrl": "https://s3.amazonaws.com/bucket/image1.jpg",
      "label": "Living Room",
      "createdAt": "2026-03-01T10:00:00Z",
      "versions": [
        {
          "id": 1,
          "imageId": 1,
          "type": "ORIGINAL",
          "url": "https://s3.amazonaws.com/bucket/image1.jpg",
          "metadata": null,
          "createdAt": "2026-03-01T10:00:00Z"
        },
        {
          "id": 2,
          "imageId": 1,
          "type": "ENHANCED",
          "url": "https://s3.amazonaws.com/bucket/image1-enhanced.jpg",
          "metadata": { "aiModel": "v2.0", "confidence": 0.95 },
          "createdAt": "2026-03-01T11:30:00Z"
        }
      ]
    }
  ]
}
```

**Error Responses:**

- `400` - Invalid project id
- `404` - Project not found
- `401` - Unauthorized

---

### 5. **Add Image via URL**

**POST** `/projects/:id/images`

Adds an image to a project using an external URL.

**Request Body:**

```json
{
  "originalUrl": "https://example.com/image.jpg",
  "label": "Master Bedroom" // Optional
}
```

**Success Response (201):**

```json
{
  "image": {
    "id": 1,
    "projectId": 1,
    "originalUrl": "https://example.com/image.jpg",
    "label": "Master Bedroom",
    "createdAt": "2026-03-01T10:00:00Z"
  }
}
```

**Error Responses:**

- `400` - originalUrl is required
- `404` - Project not found
- `401` - Unauthorized

---

### 6. **Upload Single Image to S3**

**POST** `/projects/:id/images/upload`

Uploads an image file directly to S3 storage.

**Content-Type:** `multipart/form-data`

**Form Fields:**

- `file` (file, required) - Image file to upload
- `label` (string, optional) - Label for the image

**Example using JavaScript:**

```javascript
const formData = new FormData();
formData.append("file", imageFile);
formData.append("label", "Kitchen View");

const response = await fetch("http://localhost:4000/projects/1/images/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

**Success Response (201):**

```json
{
  "image": {
    "id": 1,
    "projectId": 1,
    "originalUrl": "https://s3.amazonaws.com/bucket/aipix/uploads/users/5/projects/1/1234567890-abc123.jpg",
    "label": "Kitchen View",
    "createdAt": "2026-03-01T10:00:00Z"
  }
}
```

**Error Responses:**

- `400` - file is required
- `400` - Invalid project id
- `404` - Project not found
- `500` - Storage not configured
- `401` - Unauthorized

---

### 7. **Upload Multiple Images to S3**

**POST** `/projects/:id/images/upload-multiple`

Uploads multiple image files at once to S3 storage.

**Content-Type:** `multipart/form-data`

**Form Fields:**

- `files` (multiple files, required) - Image files to upload
- `label` (string, optional) - Label applied to all images

**Example using JavaScript:**

```javascript
const formData = new FormData();
imageFiles.forEach((file) => {
  formData.append("files", file);
});
formData.append("label", "Property Photos");

const response = await fetch(
  "http://localhost:4000/projects/1/images/upload-multiple",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  },
);
```

**Success Response (201):**

```json
{
  "images": [
    {
      "id": 1,
      "projectId": 1,
      "originalUrl": "https://s3.amazonaws.com/bucket/.../image1.jpg",
      "label": "Property Photos",
      "createdAt": "2026-03-01T10:00:00Z"
    },
    {
      "id": 2,
      "projectId": 1,
      "originalUrl": "https://s3.amazonaws.com/bucket/.../image2.jpg",
      "label": "Property Photos",
      "createdAt": "2026-03-01T10:00:01Z"
    }
  ]
}
```

**Error Responses:**

- `400` - files are required
- `400` - Invalid project id
- `404` - Project not found
- `500` - Storage not configured
- `401` - Unauthorized

---

## 🎨 AI Image Enhancement

Base path: `/enhancement`

Use AI to enhance property images (improve lighting, remove clutter, virtual staging, etc.)

### 8. **Create Enhancement Jobs**

**POST** `/enhancement/jobs`

Creates AI enhancement jobs for selected images. Consumes AI credits from your subscription.

**Request Body:**

```json
{
  "projectId": 1,
  "imageIds": [1, 2, 3, 4, 5]
}
```

**Success Response (201):**

```json
{
  "jobs": [
    {
      "id": 1,
      "userId": 5,
      "imageId": 1,
      "status": "PENDING",
      "aiModel": "enhancement-v2",
      "creditsCharged": null,
      "resultUrl": null,
      "createdAt": "2026-03-01T10:00:00Z"
    },
    {
      "id": 2,
      "userId": 5,
      "imageId": 2,
      "status": "PENDING",
      "aiModel": "enhancement-v2",
      "creditsCharged": null,
      "resultUrl": null,
      "createdAt": "2026-03-01T10:00:00Z"
    }
  ]
}
```

**Error Responses:**

- `400` - projectId and non-empty imageIds array are required
- `404` - Project not found
- `400` - Some images do not belong to project
- `402` - No active subscription
- `402` - Insufficient AI credits
- `401` - Unauthorized

**Job Status Values:**

- `PENDING` - Waiting in queue
- `RUNNING` - Currently processing
- `COMPLETED` - Enhancement finished
- `FAILED` - Enhancement failed

---

### 9. **List Enhancement Jobs**

**GET** `/enhancement/projects/:projectId/jobs`

Returns all enhancement jobs for a project.

**Success Response (200):**

```json
{
  "jobs": [
    {
      "id": 1,
      "userId": 5,
      "imageId": 1,
      "status": "COMPLETED",
      "aiModel": "enhancement-v2",
      "creditsCharged": 10,
      "resultUrl": "https://s3.amazonaws.com/bucket/enhanced/image1.jpg",
      "processingTimeMs": 3500,
      "createdAt": "2026-03-01T10:00:00Z",
      "completedAt": "2026-03-01T10:00:03Z",
      "image": {
        "id": 1,
        "originalUrl": "https://s3.amazonaws.com/bucket/image1.jpg",
        "label": "Living Room"
      }
    }
  ]
}
```

**Error Responses:**

- `400` - Invalid project id
- `404` - Project not found
- `401` - Unauthorized

---

### 10. **Complete Enhancement Job (Dev Only)**

**POST** `/enhancement/jobs/:jobId/complete`

Manually marks a job as completed with an enhanced image URL. For development/testing only.

**Request Body:**

```json
{
  "enhancedUrl": "https://s3.amazonaws.com/bucket/enhanced/image1.jpg"
}
```

**Success Response (200):**

```json
{
  "job": {
    "id": 1,
    "status": "COMPLETED",
    "resultUrl": "https://s3.amazonaws.com/bucket/enhanced/image1.jpg",
    "creditsCharged": 10,
    "completedAt": "2026-03-01T10:00:03Z"
  }
}
```

**Error Responses:**

- `400` - enhancedUrl is required
- `404` - Job not found
- `401` - Unauthorized

---

## 📝 Project Ad Copy

Generate and manage marketing copy for different channels.

### 11. **List Ad Copies**

**GET** `/projects/:id/ad-copies`

Returns all ad copy variants for a project.

**Success Response (200):**

```json
{
  "adCopies": [
    {
      "id": 1,
      "projectId": 1,
      "userId": 5,
      "channel": "ZILLOW",
      "title": "Stunning Ocean View Villa",
      "description": "Luxury 4-bedroom villa with breathtaking ocean views...",
      "keywords": ["luxury", "ocean view", "villa", "4-bedroom"],
      "createdAt": "2026-03-01T10:00:00Z"
    },
    {
      "id": 2,
      "projectId": 1,
      "userId": 5,
      "channel": "AIRBNB",
      "title": "Oceanfront Paradise - Perfect for Families",
      "description": "Escape to this beautiful beachfront property...",
      "keywords": ["beachfront", "family-friendly", "vacation"],
      "createdAt": "2026-03-01T11:00:00Z"
    }
  ]
}
```

**Channel Values:**

- `ZILLOW`
- `AIRBNB`
- `REALTOR_COM`
- `FACEBOOK`
- `INSTAGRAM`
- `GENERAL`

---

### 12. **Create Ad Copy**

**POST** `/projects/:id/ad-copies`

Creates a new ad copy variant for a specific channel.

**Request Body:**

```json
{
  "channel": "ZILLOW",
  "title": "Stunning Ocean View Villa",
  "description": "Luxury 4-bedroom villa with breathtaking ocean views, modern amenities, and private beach access.",
  "keywords": ["luxury", "ocean view", "villa", "4-bedroom"] // Optional array
}
```

**Success Response (201):**

```json
{
  "adCopy": {
    "id": 1,
    "projectId": 1,
    "userId": 5,
    "channel": "ZILLOW",
    "title": "Stunning Ocean View Villa",
    "description": "Luxury 4-bedroom villa with breathtaking ocean views...",
    "keywords": ["luxury", "ocean view", "villa", "4-bedroom"],
    "createdAt": "2026-03-01T10:00:00Z"
  }
}
```

**Error Responses:**

- `400` - channel, title and description are required
- `404` - Project not found
- `401` - Unauthorized

---

### 13. **Update Ad Copy**

**PATCH** `/projects/:id/ad-copies/:adCopyId`

Updates an existing ad copy.

**Request Body (all fields optional):**

```json
{
  "channel": "REALTOR_COM",
  "title": "Updated Title",
  "description": "Updated description...",
  "keywords": ["new", "keywords"]
}
```

**Success Response (200):**

```json
{
  "adCopy": {
    "id": 1,
    "projectId": 1,
    "userId": 5,
    "channel": "REALTOR_COM",
    "title": "Updated Title",
    "description": "Updated description...",
    "keywords": ["new", "keywords"],
    "createdAt": "2026-03-01T10:00:00Z",
    "updatedAt": "2026-03-01T15:00:00Z"
  }
}
```

**Error Responses:**

- `400` - Invalid id
- `404` - Ad copy not found
- `401` - Unauthorized

---

### 14. **Delete Ad Copy**

**DELETE** `/projects/:id/ad-copies/:adCopyId`

Deletes an ad copy variant.

**Success Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

- `400` - Invalid id
- `404` - Ad copy not found
- `401` - Unauthorized

---

## 🏠 Listings Management

Base path: `/listings`

Create and manage property listings for the marketplace.

### 15. **List My Listings**

**GET** `/listings`

Returns all listings owned by the authenticated lister.

**Success Response (200):**

```json
{
  "listings": [
    {
      "id": 1,
      "userId": 5,
      "projectId": 1,
      "title": "Luxury Ocean View Villa",
      "description": "Beautiful 4-bedroom villa...",
      "price": 500000,
      "currency": "USD",
      "locationCity": "Miami",
      "locationState": "FL",
      "locationCountry": "USA",
      "propertyType": "VILLA",
      "bedrooms": 4,
      "bathrooms": 3,
      "areaSqm": 250,
      "status": "DRAFT",
      "isPublished": false,
      "moderationStatus": "PENDING",
      "createdAt": "2026-03-01T10:00:00Z",
      "media": []
    }
  ]
}
```

**Listing Status Values:**

- `DRAFT` - Not yet published
- `ACTIVE` - Published and visible
- `SOLD` - Property sold
- `ARCHIVED` - Removed from marketplace

---

### 16. **Get Single Listing**

**GET** `/listings/:id`

Returns detailed information about one of your listings.

**Success Response (200):**

```json
{
  "listing": {
    "id": 1,
    "userId": 5,
    "projectId": 1,
    "title": "Luxury Ocean View Villa",
    "description": "Beautiful 4-bedroom villa...",
    "price": 500000,
    "currency": "USD",
    "locationCity": "Miami",
    "locationState": "FL",
    "locationCountry": "USA",
    "propertyType": "VILLA",
    "bedrooms": 4,
    "bathrooms": 3,
    "areaSqm": 250,
    "status": "ACTIVE",
    "isPublished": true,
    "moderationStatus": "APPROVED",
    "createdAt": "2026-03-01T10:00:00Z",
    "project": {
      "id": 1,
      "name": "Sunset Villa Project"
    },
    "media": [
      {
        "id": 1,
        "listingId": 1,
        "imageVersionId": 2,
        "isHero": true,
        "displayOrder": 0,
        "imageVersion": {
          "id": 2,
          "type": "ENHANCED",
          "url": "https://s3.amazonaws.com/bucket/enhanced/image1.jpg"
        }
      }
    ]
  }
}
```

**Error Responses:**

- `400` - Invalid listing id
- `404` - Listing not found
- `401` - Unauthorized

---

### 17. **Create Basic Listing**

**POST** `/listings`

Creates a new listing without images (images added separately).

**Request Body:**

```json
{
  "projectId": 1,
  "title": "Luxury Ocean View Villa",
  "description": "Beautiful 4-bedroom villa with stunning ocean views...",
  "price": 500000, // Optional
  "currency": "USD", // Optional, defaults to USD
  "locationCity": "Miami", // Optional
  "locationState": "FL", // Optional
  "locationCountry": "USA", // Optional
  "propertyType": "VILLA", // Optional: HOUSE, APARTMENT, CONDO, VILLA, TOWNHOUSE, LAND
  "bedrooms": 4, // Optional
  "bathrooms": 3, // Optional
  "areaSqm": 250 // Optional
}
```

**Success Response (201):**

```json
{
  "listing": {
    "id": 1,
    "userId": 5,
    "projectId": 1,
    "title": "Luxury Ocean View Villa",
    "description": "Beautiful 4-bedroom villa...",
    "price": 500000,
    "currency": "USD",
    "status": "DRAFT",
    "isPublished": false,
    "moderationStatus": "PENDING",
    "createdAt": "2026-03-01T10:00:00Z"
  }
}
```

**Error Responses:**

- `400` - projectId and title are required
- `404` - Project not found
- `401` - Unauthorized

**Note:** Newly created listings are automatically moderated by AI. Check `moderationStatus`:

- `APPROVED` - Safe to publish
- `FLAGGED` - Needs manual review
- `REJECTED` - Cannot be published

---

### 18. **Create Listing with Images**

**POST** `/listings/listings-with-media`

Creates a listing and attaches images in a single request.

**Request Body:**

```json
{
  "projectId": 1,
  "title": "Luxury Ocean View Villa",
  "description": "Beautiful 4-bedroom villa...",
  "price": 500000,
  "currency": "USD",
  "locationCity": "Miami",
  "locationState": "FL",
  "locationCountry": "USA",
  "propertyType": "VILLA",
  "bedrooms": 4,
  "bathrooms": 3,
  "areaSqm": 250,
  "imageVersionIds": [2, 4, 6, 8], // IDs of enhanced image versions
  "heroImageVersionId": 2 // Optional: Main listing photo
}
```

**Success Response (201):**

```json
{
  "listing": {
    "id": 1,
    "title": "Luxury Ocean View Villa",
    "status": "DRAFT",
    "isPublished": false,
    "moderationStatus": "APPROVED"
  },
  "media": [
    {
      "id": 1,
      "listingId": 1,
      "imageVersionId": 2,
      "isHero": true,
      "displayOrder": 0
    },
    {
      "id": 2,
      "listingId": 1,
      "imageVersionId": 4,
      "isHero": false,
      "displayOrder": 1
    }
  ]
}
```

**Error Responses:**

- `400` - projectId and title are required
- `400` - imageVersionIds is required
- `404` - Project not found
- `400` - Some image versions do not belong to this project
- `401` - Unauthorized

---

### 19. **Update Listing**

**PATCH** `/listings/:id`

Updates listing details. All fields optional.

**Request Body (all optional):**

```json
{
  "title": "Updated Title",
  "description": "Updated description...",
  "price": 550000,
  "currency": "USD",
  "locationCity": "Miami Beach",
  "locationState": "FL",
  "locationCountry": "USA",
  "propertyType": "VILLA",
  "bedrooms": 5,
  "bathrooms": 4,
  "areaSqm": 300,
  "status": "ACTIVE",
  "isPublished": true
}
```

**Success Response (200):**

```json
{
  "listing": {
    "id": 1,
    "title": "Updated Title",
    "description": "Updated description...",
    "price": 550000,
    "status": "ACTIVE",
    "isPublished": true,
    "updatedAt": "2026-03-01T15:00:00Z"
  }
}
```

**Error Responses:**

- `400` - Invalid listing id
- `404` - Listing not found
- `401` - Unauthorized

---

### 20. **Attach Images to Listing**

**POST** `/listings/:id/media`

Adds images to an existing listing.

**Request Body:**

```json
{
  "imageVersionIds": [2, 4, 6, 8],
  "heroImageVersionId": 2 // Optional
}
```

**Success Response (201):**

```json
{
  "media": [
    {
      "id": 1,
      "listingId": 1,
      "imageVersionId": 2,
      "isHero": true,
      "displayOrder": 0
    },
    {
      "id": 2,
      "listingId": 1,
      "imageVersionId": 4,
      "isHero": false,
      "displayOrder": 1
    }
  ]
}
```

**Error Responses:**

- `400` - imageVersionIds is required
- `404` - Listing not found
- `400` - Some image versions do not belong to this project
- `401` - Unauthorized

---

## 📨 Booking Management (Lister Side)

### 21. **Get Received Bookings**

**GET** `/listings/bookings/received`

Returns booking requests for your listings.

**Query Parameters:**

- `status` (optional) - Filter by status: `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `COMPLETED`
- `listingId` (optional) - Filter by specific listing
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20, max: 100)

**Example:** `GET /listings/bookings/received?status=PENDING&page=1&limit=10`

**Success Response (200):**

```json
{
  "bookings": [
    {
      "id": 1,
      "listingId": 1,
      "buyerId": 10,
      "status": "PENDING",
      "requestedStart": "2026-04-01T00:00:00Z",
      "requestedEnd": "2026-04-07T00:00:00Z",
      "createdAt": "2026-03-15T10:00:00Z",
      "listing": {
        "id": 1,
        "title": "Luxury Ocean View Villa",
        "price": 500000
      },
      "buyer": {
        "id": 10,
        "email": "buyer@example.com",
        "displayName": "Jane Doe"
      }
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

**Error Responses:**

- `401` - Unauthorized

---

### 22. **Update Booking Status**

**PATCH** `/listings/bookings/:id/status`

Approve or reject a booking request.

**Request Body:**

```json
{
  "status": "CONFIRMED" // "CONFIRMED" or "REJECTED"
}
```

**Success Response (200):**

```json
{
  "booking": {
    "id": 1,
    "listingId": 1,
    "buyerId": 10,
    "status": "CONFIRMED",
    "requestedStart": "2026-04-01T00:00:00Z",
    "requestedEnd": "2026-04-07T00:00:00Z",
    "updatedAt": "2026-03-15T12:00:00Z"
  }
}
```

**Error Responses:**

- `400` - Invalid status
- `404` - Booking not found
- `403` - Not your booking
- `400` - Booking already closed
- `401` - Unauthorized

---

## 💬 Messaging

### 23. **Get Conversations**

**GET** `/listings/messages/conversations`

Returns all message conversations for your listings.

**Success Response (200):**

```json
{
  "conversations": [
    {
      "listingId": 1,
      "otherUserId": 10,
      "listing": {
        "id": 1,
        "title": "Luxury Ocean View Villa"
      },
      "otherUser": {
        "id": 10,
        "displayName": "Jane Doe"
      },
      "lastMessage": {
        "id": 5,
        "content": "Is the villa still available?",
        "createdAt": "2026-03-15T14:30:00Z"
      },
      "unreadCount": 2
    }
  ]
}
```

**Error Responses:**

- `401` - Unauthorized

---

### 24. **Get Conversation Messages**

**GET** `/listings/messages/:listingId/:userId`

Returns all messages in a conversation about a specific listing.

**Success Response (200):**

```json
{
  "messages": [
    {
      "id": 1,
      "listingId": 1,
      "senderId": 10,
      "receiverId": 5,
      "content": "Is the villa still available?",
      "moderationStatus": "APPROVED",
      "createdAt": "2026-03-15T14:30:00Z",
      "sender": {
        "id": 10,
        "displayName": "Jane Doe"
      }
    },
    {
      "id": 2,
      "listingId": 1,
      "senderId": 5,
      "receiverId": 10,
      "content": "Yes, it's available! Would you like to schedule a viewing?",
      "moderationStatus": "APPROVED",
      "createdAt": "2026-03-15T14:35:00Z",
      "sender": {
        "id": 5,
        "displayName": "You"
      }
    }
  ]
}
```

**Error Responses:**

- `400` - Invalid parameters
- `404` - Listing not found
- `403` - Access denied
- `401` - Unauthorized

---

### 25. **Send Message**

**POST** `/listings/messages`

Sends a message to a user about a listing.

**Request Body:**

```json
{
  "listingId": 1,
  "receiverId": 10,
  "content": "Yes, it's available! Would you like to schedule a viewing?"
}
```

**Success Response (201):**

```json
{
  "message": {
    "id": 2,
    "listingId": 1,
    "senderId": 5,
    "receiverId": 10,
    "content": "Yes, it's available! Would you like to schedule a viewing?",
    "moderationStatus": "APPROVED",
    "createdAt": "2026-03-15T14:35:00Z"
  }
}
```

**Error Responses:**

- `400` - Missing required fields
- `404` - Listing not found
- `404` - Receiver not found
- `400` - Cannot message yourself
- `400` - Message content required
- `400` - Message too long (max length enforced)
- `401` - Unauthorized

**Note:** Messages are automatically moderated by AI. Check `moderationStatus`:

- `APPROVED` - Message sent successfully
- `FLAGGED` - Message sent but flagged for review
- `REJECTED` - Message blocked (spam/inappropriate)

---

## 🔄 Complete Workflow Example

### Typical Lister Workflow:

```javascript
// 1. Create a project
const project = await createProject({
  name: "Downtown Condo Listing",
  clientName: "Sarah Johnson",
});

// 2. Upload images
const images = await uploadMultipleImages(project.id, imageFiles);

// 3. Create enhancement jobs
const jobs = await createEnhancementJobs({
  projectId: project.id,
  imageIds: images.map((img) => img.id),
});

// 4. Wait for jobs to complete (poll or webhook)
const completedJobs = await listEnhancementJobs(project.id);

// 5. Get enhanced image version IDs
const enhancedVersionIds = completedJobs
  .filter((job) => job.status === "COMPLETED")
  .map((job) => job.image.versions.find((v) => v.type === "ENHANCED").id);

// 6. Create listing with enhanced images
const listing = await createListingWithMedia({
  projectId: project.id,
  title: "Modern Downtown Condo",
  description: "Beautiful 2-bedroom condo...",
  price: 450000,
  currency: "USD",
  locationCity: "Seattle",
  locationState: "WA",
  propertyType: "CONDO",
  bedrooms: 2,
  bathrooms: 2,
  areaSqm: 120,
  imageVersionIds: enhancedVersionIds,
  heroImageVersionId: enhancedVersionIds[0],
});

// 7. Publish listing
await updateListing(listing.id, {
  status: "ACTIVE",
  isPublished: true,
});

// 8. Monitor bookings
const bookings = await getReceivedBookings({ status: "PENDING" });

// 9. Respond to booking requests
await updateBookingStatus(bookings[0].id, { status: "CONFIRMED" });

// 10. Communicate with interested buyers
const messages = await getConversations();
await sendMessage({
  listingId: listing.id,
  receiverId: messages[0].otherUserId,
  content: "Thank you for your interest!",
});
```

---

## 📊 Status Reference

### Listing Status

- `DRAFT` - Not published
- `ACTIVE` - Published and visible
- `SOLD` - Property sold
- `ARCHIVED` - Removed from marketplace

### Moderation Status

- `PENDING` - Awaiting moderation
- `APPROVED` - Safe to publish
- `FLAGGED` - Needs manual review
- `REJECTED` - Cannot be published

### Enhancement Job Status

- `PENDING` - Waiting in queue
- `RUNNING` - Currently processing
- `COMPLETED` - Enhancement finished
- `FAILED` - Enhancement failed

### Booking Status

- `PENDING` - Awaiting lister response
- `CONFIRMED` - Lister approved
- `REJECTED` - Lister declined
- `CANCELLED` - Buyer cancelled
- `COMPLETED` - Booking finished

### Property Types

- `HOUSE`
- `APARTMENT`
- `CONDO`
- `VILLA`
- `TOWNHOUSE`
- `LAND`

### Ad Copy Channels

- `ZILLOW`
- `AIRBNB`
- `REALTOR_COM`
- `FACEBOOK`
- `INSTAGRAM`
- `GENERAL`

---

## 🔐 Authentication & Permissions

All lister endpoints require:

1. Valid JWT token in Authorization header
2. User must have `LISTER` role

**Check your role:**

```javascript
const user = await fetch("http://localhost:4000/auth/me", {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

if (user.user.roles.includes("LISTER")) {
  // User can access lister features
}
```

**Add LISTER role:**

```javascript
await fetch("http://localhost:4000/auth/add-role", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ role: "LISTER" }),
});
```

---

## 💳 Credits & Subscriptions

- **Image Enhancement**: Consumes AI credits per image
- **Check Credits**: Via `/billing/subscription` endpoint
- **No Credits**: Returns `402` error with message "Insufficient AI credits"
- **No Subscription**: Returns `402` error with message "No active subscription"

---

## 📝 Quick Reference Table

| Endpoint                                | Method | Description                |
| --------------------------------------- | ------ | -------------------------- |
| `/projects`                             | GET    | List all projects          |
| `/projects`                             | POST   | Create project             |
| `/projects/:id`                         | GET    | Get project details        |
| `/projects/:id/images`                  | GET    | List project images        |
| `/projects/:id/images`                  | POST   | Add image via URL          |
| `/projects/:id/images/upload`           | POST   | Upload single image        |
| `/projects/:id/images/upload-multiple`  | POST   | Upload multiple images     |
| `/projects/:id/ad-copies`               | GET    | List ad copies             |
| `/projects/:id/ad-copies`               | POST   | Create ad copy             |
| `/projects/:id/ad-copies/:adCopyId`     | PATCH  | Update ad copy             |
| `/projects/:id/ad-copies/:adCopyId`     | DELETE | Delete ad copy             |
| `/enhancement/jobs`                     | POST   | Create enhancement jobs    |
| `/enhancement/projects/:projectId/jobs` | GET    | List enhancement jobs      |
| `/listings`                             | GET    | List my listings           |
| `/listings`                             | POST   | Create basic listing       |
| `/listings/listings-with-media`         | POST   | Create listing with images |
| `/listings/:id`                         | GET    | Get single listing         |
| `/listings/:id`                         | PATCH  | Update listing             |
| `/listings/:id/media`                   | POST   | Attach images to listing   |
| `/listings/bookings/received`           | GET    | Get received bookings      |
| `/listings/bookings/:id/status`         | PATCH  | Update booking status      |
| `/listings/messages/conversations`      | GET    | Get all conversations      |
| `/listings/messages/:listingId/:userId` | GET    | Get conversation messages  |
| `/listings/messages`                    | POST   | Send message               |

---

For questions or issues, contact the backend team or check the source code in `/src/modules/`.
