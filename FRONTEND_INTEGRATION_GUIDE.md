# AIPix Backend - Frontend Integration Guide

**Complete API Reference for Frontend Development**

**Base URL**: `http://localhost:4000`  
**Production URL**: `https://api.aipix.com` (when deployed)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Role-Based Access System](#role-based-access-system)
4. [Credit & Billing System](#credit--billing-system)
5. [Job Queue System](#job-queue-system)
6. [Complete API Routes](#complete-api-routes)
7. [Data Models](#data-models)
8. [Error Handling](#error-handling)
9. [Implementation Examples](#implementation-examples)

---

## System Overview

### Architecture

AIPix is a real estate AI platform with three main user types:

- **BUYER**: Browse and book property viewings
- **LISTER**: Create property listings and use AI enhancement tools
- **ADMIN/MODERATOR**: Manage platform and content

### Core Systems

1. **Authentication**: JWT-based with multi-role support, MFA, email verification
2. **Billing**: Subscription-based credit system for AI jobs
3. **Job Queue**: Sequential AI processing with credit billing
4. **Marketplace**: Property listings with search, favorites, bookings, messaging
5. **Projects**: Listers organize property images for AI enhancement
6. **Admin Panel**: User management, moderation, analytics

---

## Authentication & Authorization

### JWT Token Structure

All authenticated requests require:

```
Authorization: Bearer <jwt_token>
```

### Token Payload

```typescript
{
  id: number;           // User ID
  email: string;
  role: string;         // Current active role
  roles: string[];      // All available roles
  iat: number;          // Issued at
  exp: number;          // Expiration (7 days)
}
```

### User Object (from /auth/me)

```typescript
{
  id: number;
  email: string;
  displayName: string;
  role: string;                    // Current active role
  roles: string[];                 // All roles user has
  emailVerified: boolean;
  onboardingComplete: boolean;
  organizationId: number | null;
  createdAt: string;
}
```

---

## Role-Based Access System

### Roles Hierarchy

```
ADMIN (highest)
  └─ Full platform access
  └─ User management
  └─ Analytics dashboard

MODERATOR
  └─ Content moderation
  └─ Review listings/messages

LISTER
  └─ Create projects
  └─ Upload images
  └─ Use AI tools
  └─ Create marketplace listings
  └─ Manage bookings

BUYER (lowest)
  └─ Browse marketplace
  └─ Favorite listings
  └─ Book viewings
  └─ Send messages
```

### Multi-Role System

Users can have multiple roles and switch between them:

1. **Register**: User gets one primary role
2. **Add Role**: User can request additional roles
3. **Switch Role**: Change active role without re-login

**Example Flow**:

```javascript
// User registers as BUYER
POST /auth/register { email, password, role: "BUYER" }

// Later, user wants to become LISTER
POST /auth/add-role { role: "LISTER" }

// Switch to LISTER role
POST /auth/switch-role { role: "LISTER" }
// New token returned with role: "LISTER"
```

### Route Protection

Routes are protected by role:

| Endpoint Pattern          | Required Role      |
| ------------------------- | ------------------ |
| `/listings/marketplace/*` | Public (no auth)   |
| `/listings/favorites`     | Any authenticated  |
| `/listings/bookings`      | Any authenticated  |
| `/listings/messages`      | Any authenticated  |
| `/listings/*` (CRUD)      | LISTER             |
| `/projects/*`             | LISTER             |
| `/enhancement/*`          | LISTER             |
| `/jobs/*`                 | LISTER (own jobs)  |
| `/billing/*`              | Any authenticated  |
| `/api/admin/*`            | ADMIN              |
| `/api/admin/moderation/*` | MODERATOR or ADMIN |

---

## Credit & Billing System

### How It Works

1. **Subscription Plans**: Users subscribe to plans (Basic, Pro, Enterprise)
2. **Credits**: Each plan provides monthly credits
3. **AI Jobs**: Each AI operation costs credits
4. **Billing**: Credits deducted when job completes successfully

### Subscription Model

```typescript
interface Subscription {
  id: number;
  userId: number;
  planId: number;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  creditsRemaining: number;
  totalCredits: number;
  nextBillingDate: string;
  createdAt: string;
}
```

### Credit Pricing

| Job Type               | Credits |
| ---------------------- | ------- |
| VIRTUAL_STAGING        | 3       |
| ENHANCEMENT            | 2       |
| SKY_REPLACEMENT        | 2       |
| OBJECT_REMOVAL         | 2       |
| PERSPECTIVE_CORRECTION | 1       |
| HDR_BLENDING           | 3       |

### Billing Flow

```
1. User subscribes to plan
   POST /billing/subscribe { planId: 1 }
   → Creates subscription with credits

2. User creates AI job
   POST /jobs { type: "VIRTUAL_STAGING", ... }
   → Job queued, no charge yet

3. Job processes successfully
   → Job status: COMPLETED
   → Credits deducted from subscription
   → creditUsage record created

4. Check remaining credits
   GET /billing/me/usage
   → { creditsRemaining: 47, totalCredits: 50 }
```

### Insufficient Credits

If user lacks credits:

```json
{
  "error": "NO_ACTIVE_SUBSCRIPTION",
  "message": "No active subscription found"
}
```

**Frontend Action**: Redirect to `/billing/plans` to subscribe

---

## Job Queue System

### Job Lifecycle

```
PENDING → PROCESSING → COMPLETED
                    ↓
                  FAILED
                    ↓
                 (retry) → PENDING
```

### Job Types

1. **VIRTUAL_STAGING**: AI furniture placement (3 credits)
2. **ENHANCEMENT**: Image quality improvement (2 credits)
3. **SKY_REPLACEMENT**: Replace sky with better weather (2 credits)
4. **OBJECT_REMOVAL**: Remove unwanted objects (2 credits)
5. **PERSPECTIVE_CORRECTION**: Fix image angles (1 credit)
6. **HDR_BLENDING**: Combine exposures (3 credits)

### Sequential Processing

- Jobs process **one at a time per user**
- Ensures fair resource allocation
- Prevents credit abuse
- Queue position visible via `GET /jobs`

### Job Status Tracking

```typescript
interface Job {
  id: number;
  userId: number;
  projectId: number;
  imageId: number;
  type: JobType;
  status: JobStatus;
  priority: number;
  queuePosition: number | null; // Position in queue (PENDING only)
  estimatedCredits: number;
  creditsCharged: number | null; // Actual credits charged
  inputParameters: Record<string, any>;
  outputUrl: string | null; // Result image URL
  error: string | null;
  processingTime: number | null; // Milliseconds
  retryCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
```

### Frontend Integration

**1. Create Job**

```javascript
const createJob = async (imageId, type, params) => {
  const response = await fetch("http://localhost:4000/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId: 1,
      imageId,
      type,
      priority: 5,
      inputParameters: params,
    }),
  });

  return await response.json();
  // { job: { id: 123, status: "PENDING", queuePosition: 3 } }
};
```

**2. Poll Job Status**

```javascript
const pollJobStatus = async (jobId) => {
  const response = await fetch(`http://localhost:4000/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const job = await response.json();

  if (job.status === "COMPLETED") {
    // Show result image: job.outputUrl
    return job;
  } else if (job.status === "FAILED") {
    // Show error: job.error
    return job;
  } else if (job.status === "PROCESSING") {
    // Show progress indicator
    setTimeout(() => pollJobStatus(jobId), 2000);
  } else if (job.status === "PENDING") {
    // Show queue position: job.queuePosition
    setTimeout(() => pollJobStatus(jobId), 3000);
  }
};
```

**3. Batch Jobs**

```javascript
const createBatchJobs = async (projectId, imageIds, type) => {
  const response = await fetch("http://localhost:4000/jobs/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId,
      imageIds,
      type,
      priority: 5,
    }),
  });

  return await response.json();
  // { jobs: [{ id: 123 }, { id: 124 }, ...], totalCreditsRequired: 10 }
};
```

---

## Complete API Routes

### 1. Authentication (`/auth`)

#### POST `/auth/register`

**Public** - Register new user

**Request**:

```typescript
{
  email: string;
  password: string;          // Min 8 chars
  displayName?: string;
  role: "BUYER" | "LISTER";  // Initial role
}
```

**Response**:

```typescript
{
  token: string;
  user: {
    id: number;
    email: string;
    displayName: string;
    role: string;
    emailVerified: false;
  }
}
```

---

#### POST `/auth/login`

**Public** - Login existing user

**Request**:

```typescript
{
  email: string;
  password: string;
}
```

**Response**:

```typescript
{
  token: string;
  user: UserObject;
}
```

---

#### GET `/auth/me`

**Protected** - Get current user info

**Headers**: `Authorization: Bearer <token>`

**Response**:

```typescript
{
  id: number;
  email: string;
  displayName: string;
  role: string;
  roles: string[];
  emailVerified: boolean;
  onboardingComplete: boolean;
  organizationId: number | null;
  createdAt: string;
}
```

---

#### POST `/auth/verify-email`

**Public** - Verify email address

**Request**:

```typescript
{
  token: string; // From email link
}
```

**Response**:

```typescript
{
  message: "Email verified successfully";
}
```

---

#### POST `/auth/resend-verification`

**Public** - Resend verification email

**Request**:

```typescript
{
  email: string;
}
```

---

#### POST `/auth/forgot-password`

**Public** - Request password reset

**Request**:

```typescript
{
  email: string;
}
```

---

#### POST `/auth/reset-password`

**Public** - Reset password with token

**Request**:

```typescript
{
  token: string; // From email link
  newPassword: string;
}
```

---

#### POST `/auth/switch-role`

**Protected** - Switch active role

**Request**:

```typescript
{
  role: "BUYER" | "LISTER" | "ADMIN"; // Must be in user's roles array
}
```

**Response**:

```typescript
{
  token: string; // New token with updated role
  user: UserObject;
}
```

---

#### POST `/auth/add-role`

**Protected** - Add new role to user

**Request**:

```typescript
{
  role: "BUYER" | "LISTER";
}
```

**Response**:

```typescript
{
  message: "Role added successfully",
  user: UserObject;
}
```

---

#### GET `/auth/available-roles`

**Protected** - Get roles user can add

**Response**:

```typescript
{
  availableRoles: string[];  // Roles not yet added
}
```

---

#### POST `/auth/complete-onboarding`

**Protected** - Mark onboarding complete

**Request**:

```typescript
{
  // Any onboarding data
}
```

---

### 2. Billing (`/billing`)

All routes require authentication

#### GET `/billing/plans`

**Protected** - List available subscription plans

**Response**:

```typescript
{
  plans: [
    {
      id: number;
      name: string;
      description: string;
      price: number;        // Monthly price
      credits: number;      // Monthly credits
      features: string[];
      isActive: boolean;
    }
  ]
}
```

---

#### POST `/billing/subscribe`

**Protected** - Subscribe to plan

**Request**:

```typescript
{
  planId: number;
  paymentMethodId?: string;  // Stripe payment method
}
```

**Response**:

```typescript
{
  subscription: {
    id: number;
    userId: number;
    planId: number;
    status: "ACTIVE";
    creditsRemaining: number;
    totalCredits: number;
    nextBillingDate: string;
    createdAt: string;
  }
}
```

---

#### GET `/billing/me/subscription`

**Protected** - Get current subscription

**Response**:

```typescript
{
  subscription: {
    id: number;
    plan: {
      id: number;
      name: string;
      price: number;
      credits: number;
    };
    status: string;
    creditsRemaining: number;
    totalCredits: number;
    nextBillingDate: string;
    createdAt: string;
  } | null
}
```

---

#### GET `/billing/me/usage`

**Protected** - Get credit usage

**Response**:

```typescript
{
  subscription: {
    creditsRemaining: number;
    totalCredits: number;
    status: string;
  };
  recentUsage: [
    {
      id: number;
      amount: number;      // Credits used (negative)
      description: string;
      createdAt: string;
    }
  ]
}
```

---

### 3. Projects (`/projects`)

All routes require **LISTER** role

#### GET `/projects`

**LISTER** - List user's projects

**Query Params**:

- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:

```typescript
{
  projects: [
    {
      id: number;
      userId: number;
      organizationId: number | null;
      name: string;
      description: string | null;
      status: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
      createdAt: string;
      updatedAt: string;
      _count: {
        images: number;
        jobs: number;
      }
    }
  ]
}
```

---

#### POST `/projects`

**LISTER** - Create new project

**Request**:

```typescript
{
  name: string;
  description?: string;
  status?: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
}
```

**Response**:

```typescript
{
  project: ProjectObject;
}
```

---

#### GET `/projects/:id`

**LISTER** - Get project details

**Response**:

```typescript
{
  id: number;
  name: string;
  description: string | null;
  status: string;
  images: [
    {
      id: number;
      projectId: number;
      originalUrl: string;
      width: number;
      height: number;
      fileSize: number;
      mimeType: string;
      versions: [
        {
          id: number;
          type: "ORIGINAL" | "ENHANCED" | "THUMBNAIL";
          url: string;
          jobId: number | null;
        }
      ];
      jobs: [
        {
          id: number;
          type: string;
          status: string;
        }
      ]
    }
  ];
  _count: {
    images: number;
    jobs: number;
  }
}
```

---

#### GET `/projects/:id/images`

**LISTER** - Get project images

**Response**:

```typescript
{
  images: ImageObject[];
}
```

---

#### POST `/projects/:id/images`

**LISTER** - Add image URL to project

**Request**:

```typescript
{
  url: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}
```

---

#### POST `/projects/:id/images/upload`

**LISTER** - Upload single image to S3

**Content-Type**: `multipart/form-data`

**Form Data**:

- `file`: Image file

**Response**:

```typescript
{
  image: {
    id: number;
    originalUrl: string; // S3 URL
    width: number;
    height: number;
    fileSize: number;
    mimeType: string;
  }
}
```

---

#### POST `/projects/:id/images/upload-multiple`

**LISTER** - Upload multiple images to S3

**Content-Type**: `multipart/form-data`

**Form Data**:

- `files`: Multiple image files

**Response**:

```typescript
{
  images: ImageObject[];
  count: number;
}
```

---

#### GET `/projects/:id/ad-copies`

**LISTER** - List project ad copies

**Response**:

```typescript
{
  adCopies: [
    {
      id: number;
      projectId: number;
      title: string;
      description: string;
      tone: string;
      targetAudience: string;
      createdAt: string;
    }
  ]
}
```

---

#### POST `/projects/:id/ad-copies`

**LISTER** - Create ad copy

**Request**:

```typescript
{
  title: string;
  description: string;
  tone?: string;
  targetAudience?: string;
}
```

---

### 4. Jobs (`/jobs`)

All routes require **LISTER** role

#### POST `/jobs`

**LISTER** - Create single job

**Request**:

```typescript
{
  projectId: number;
  imageId: number;
  type: "VIRTUAL_STAGING" | "ENHANCEMENT" | "SKY_REPLACEMENT" |
        "OBJECT_REMOVAL" | "PERSPECTIVE_CORRECTION" | "HDR_BLENDING";
  priority?: number;        // 1-10, default 5
  inputParameters?: {
    // Type-specific parameters
    style?: string;         // For VIRTUAL_STAGING
    roomType?: string;      // For VIRTUAL_STAGING
    skyType?: string;       // For SKY_REPLACEMENT
  };
}
```

**Response**:

```typescript
{
  job: {
    id: number;
    userId: number;
    projectId: number;
    imageId: number;
    type: string;
    status: "PENDING";
    priority: number;
    queuePosition: number; // Position in queue
    estimatedCredits: number;
    inputParameters: object;
    createdAt: string;
  }
}
```

---

#### POST `/jobs/batch`

**LISTER** - Create multiple jobs

**Request**:

```typescript
{
  projectId: number;
  imageIds: number[];
  type: JobType;
  priority?: number;
  inputParameters?: object;
}
```

**Response**:

```typescript
{
  jobs: JobObject[];
  count: number;
  totalCreditsRequired: number;
}
```

---

#### GET `/jobs`

**LISTER** - Get user's jobs

**Query Params**:

- `status` (optional): Filter by status
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response**:

```typescript
{
  jobs: [
    {
      id: number;
      type: string;
      status: string;
      queuePosition: number | null;
      estimatedCredits: number;
      creditsCharged: number | null;
      outputUrl: string | null;
      error: string | null;
      processingTime: number | null;
      createdAt: string;
      completedAt: string | null;
      project: { id: number; name: string };
      image: { id: number; originalUrl: string };
    }
  ];
  total: number;
}
```

---

#### GET `/jobs/:id`

**LISTER** - Get job details

**Response**:

```typescript
{
  id: number;
  userId: number;
  projectId: number;
  imageId: number;
  type: string;
  status: string;
  priority: number;
  queuePosition: number | null;
  estimatedCredits: number;
  creditsCharged: number | null;
  inputParameters: object;
  outputUrl: string | null;
  error: string | null;
  processingTime: number | null;
  retryCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  project: ProjectObject;
  image: ImageObject;
}
```

---

#### POST `/jobs/:id/cancel`

**LISTER** - Cancel pending job

**Response**:

```typescript
{
  message: "Job cancelled successfully",
  job: JobObject;
}
```

---

### 5. Marketplace - Public Routes (`/listings/marketplace`)

#### GET `/listings/marketplace/search`

**Public** - Advanced property search

**Query Params**:

- `search` (optional): Text search (title, description, location)
- `city` (optional): Filter by city
- `state` (optional): Filter by state
- `country` (optional): Filter by country
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `propertyType` (optional): Property type (house, apartment, condo, etc.)
- `bedrooms` (optional): Minimum bedrooms
- `bathrooms` (optional): Minimum bathrooms
- `minArea` (optional): Minimum area (sqft)
- `maxArea` (optional): Maximum area (sqft)
- `hasVirtualStaging` (optional): Filter AI-enhanced properties
- `hasEnhancement` (optional): Filter enhanced images
- `page` (optional): Page number (default 1)
- `limit` (optional): Results per page (default 20)
- `sortBy` (optional): price_asc, price_desc, newest, oldest

**Response**:

```typescript
{
  listings: [
    {
      id: number;
      title: string;
      description: string;
      price: number;
      propertyType: string;
      bedrooms: number;
      bathrooms: number;
      area: number;
      city: string;
      state: string;
      country: string;
      location: string;    // Full address
      isPublished: boolean;
      createdAt: string;
      user: {
        id: number;
        displayName: string;
      };
      heroImage: {
        url: string;
        width: number;
        height: number;
      } | null;
      _count: {
        media: number;
        favorites: number;
        bookings: number;
      }
    }
  ];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  filters: {
    priceRange: { min: number; max: number };
    areaRange: { min: number; max: number };
    propertyTypes: string[];
    cities: string[];
    states: string[];
    countries: string[];
  }
}
```

---

#### GET `/listings/marketplace/featured`

**Public** - Get featured listings

**Query Params**:

- `limit` (optional): Number of results (default 10)

**Response**:

```typescript
{
  listings: ListingObject[];
}
```

---

#### GET `/listings/marketplace/suggestions`

**Public** - Autocomplete suggestions

**Query Params**:

- `q`: Search query

**Response**:

```typescript
{
  listings: [
    { id: number; title: string; location: string }
  ];
  cities: string[];
  propertyTypes: string[];
}
```

---

#### GET `/listings/marketplace/listings/:id`

**Public** - Get single listing details

**Response**:

```typescript
{
  id: number;
  title: string;
  description: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  yearBuilt: number | null;
  location: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  features: string[];
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    displayName: string;
    email: string;
  };
  media: [
    {
      id: number;
      imageVersion: {
        id: number;
        url: string;
        width: number;
        height: number;
        type: string;
      };
      displayOrder: number;
    }
  ];
  _count: {
    favorites: number;
    bookings: number;
  }
}
```

---

#### GET `/listings/marketplace/listings/:id/similar`

**Public** - Get similar listings

**Query Params**:

- `limit` (optional): Number of results (default 5)

**Response**:

```typescript
{
  listings: ListingObject[];
}
```

---

### 6. Marketplace - User Routes (`/listings`)

#### POST `/listings/favorites`

**Protected** - Add listing to favorites

**Request**:

```typescript
{
  listingId: number;
}
```

**Response**:

```typescript
{
  message: "Listing added to favorites",
  favorite: {
    id: number;
    userId: number;
    listingId: number;
    createdAt: string;
  }
}
```

---

#### DELETE `/listings/favorites/:listingId`

**Protected** - Remove from favorites

**Response**:

```typescript
{
  message: "Listing removed from favorites";
}
```

---

#### GET `/listings/favorites`

**Protected** - Get user's favorites

**Query Params**:

- `page`, `limit`: Pagination

**Response**:

```typescript
{
  favorites: [
    {
      id: number;
      createdAt: string;
      listing: ListingObject;
    }
  ];
  total: number;
  page: number;
  totalPages: number;
}
```

---

#### POST `/listings/bookings`

**Protected** - Create booking (viewing request)

**Request**:

```typescript
{
  listingId: number;
  startDate: string;  // ISO date
  endDate: string;    // ISO date
  notes?: string;
}
```

**Response**:

```typescript
{
  booking: {
    id: number;
    userId: number; // Buyer
    listingId: number;
    status: "PENDING";
    startDate: string;
    endDate: string;
    notes: string | null;
    createdAt: string;
  }
}
```

---

#### GET `/listings/bookings`

**Protected** - Get user's bookings (as buyer)

**Query Params**:

- `status` (optional): Filter by status
- `page`, `limit`: Pagination

**Response**:

```typescript
{
  bookings: [
    {
      id: number;
      status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
      startDate: string;
      endDate: string;
      notes: string | null;
      createdAt: string;
      listing: {
        id: number;
        title: string;
        location: string;
        price: number;
        user: { displayName: string };  // Lister
        heroImage: { url: string } | null;
      }
    }
  ];
  total: number;
}
```

---

#### GET `/listings/bookings/:id`

**Protected** - Get booking details

**Response**:

```typescript
{
  id: number;
  userId: number;
  listingId: number;
  status: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  createdAt: string;
  listing: ListingObject;
  buyer: UserObject;
}
```

---

#### POST `/listings/bookings/:id/cancel`

**Protected** - Cancel booking (buyer)

**Response**:

```typescript
{
  message: "Booking cancelled successfully",
  booking: BookingObject;
}
```

---

#### POST `/listings/messages`

**Protected** - Send message to lister

**Request**:

```typescript
{
  listingId: number;
  receiverId: number; // Lister user ID
  content: string; // Max 5000 chars
}
```

**Response**:

```typescript
{
  message: {
    id: number;
    listingId: number;
    senderId: number;
    receiverId: number;
    content: string;
    createdAt: string;
  }
}
```

---

#### GET `/listings/messages/conversations`

**Protected** - Get user's conversations

**Response**:

```typescript
{
  conversations: [
    {
      listingId: number;
      otherUserId: number;
      otherUser: {
        id: number;
        displayName: string;
      };
      listing: {
        id: number;
        title: string;
        heroImage: { url: string } | null;
      };
      lastMessage: {
        content: string;
        createdAt: string;
        senderId: number;
      };
      messageCount: number;
    }
  ]
}
```

---

#### GET `/listings/messages/:listingId/:userId`

**Protected** - Get conversation messages

**Response**:

```typescript
{
  messages: [
    {
      id: number;
      senderId: number;
      receiverId: number;
      content: string;
      createdAt: string;
      sender: { displayName: string };
    }
  ];
  listing: {
    id: number;
    title: string;
  };
  otherUser: {
    id: number;
    displayName: string;
  }
}
```

---

### 7. Listings - Lister Routes (`/listings`)

All require **LISTER** role

#### GET `/listings`

**LISTER** - Get my listings

**Query Params**:

- `status` (optional): Filter by status
- `page`, `limit`: Pagination

**Response**:

```typescript
{
  listings: ListingObject[];
  total: number;
}
```

---

#### POST `/listings`

**LISTER** - Create listing

**Request**:

```typescript
{
  title: string;
  description: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  yearBuilt?: number;
  location: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  features?: string[];
  isPublished?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
```

**Response**:

```typescript
{
  listing: ListingObject;
}
```

---

#### POST `/listings/listings-with-media`

**LISTER** - Create listing with media IDs

**Request**:

```typescript
{
  // Same as POST /listings
  // Plus:
  mediaIds: number[];  // ImageVersion IDs from projects
}
```

---

#### GET `/listings/:id`

**LISTER** - Get my listing details

**Response**:

```typescript
{
  listing: ListingObject; // Full details with media
}
```

---

#### PATCH `/listings/:id`

**LISTER** - Update listing

**Request**:

```typescript
{
  // Any fields from listing creation
  title?: string;
  price?: number;
  isPublished?: boolean;
  // etc.
}
```

---

#### POST `/listings/:id/media`

**LISTER** - Attach media to listing

**Request**:

```typescript
{
  imageVersionIds: number[];
}
```

---

#### GET `/listings/bookings/received`

**LISTER** - Get bookings for my listings

**Query Params**:

- `status`, `page`, `limit`

**Response**:

```typescript
{
  bookings: [
    {
      id: number;
      status: string;
      startDate: string;
      endDate: string;
      notes: string | null;
      buyer: {
        id: number;
        displayName: string;
        email: string;
      };
      listing: {
        id: number;
        title: string;
      }
    }
  ];
  total: number;
}
```

---

#### PATCH `/listings/bookings/:id/status`

**LISTER** - Update booking status

**Request**:

```typescript
{
  status: "CONFIRMED" | "REJECTED";
}
```

**Response**:

```typescript
{
  message: "Booking status updated",
  booking: BookingObject;
}
```

---

### 8. Admin Routes (`/api/admin`)

All require **ADMIN** role (except moderation which allows MODERATOR)

#### GET `/api/admin/dashboard`

**ADMIN** - Dashboard overview

**Response**:

```typescript
{
  users: {
    total: number;
    byRole: { [role: string]: number };
  };
  listings: {
    total: number;
    published: number;
    draft: number;
  };
  bookings: {
    total: number;
    byStatus: { [status: string]: number };
  };
  jobs: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    successRate: number;
  };
  revenue: {
    last30Days: number;
    transactionCount: number;
  }
}
```

---

#### GET `/api/admin/users`

**ADMIN** - List all users

**Query Params**:

- `role`, `status`, `search`, `page`, `limit`

**Response**:

```typescript
{
  users: UserObject[];
  total: number;
  page: number;
  totalPages: number;
}
```

---

#### PATCH `/api/admin/users/:userId`

**ADMIN** - Update user

**Request**:

```typescript
{
  role?: string;
  emailVerified?: boolean;
  displayName?: string;
}
```

---

#### POST `/api/admin/users/:userId/credits`

**ADMIN** - Adjust user credits

**Request**:

```typescript
{
  amount: number; // Positive to add, negative to remove
  reason: string;
}
```

---

#### GET `/api/admin/jobs/metrics`

**ADMIN** - Job queue metrics

**Response**:

```typescript
{
  statusCounts: { [status: string]: number };
  typeCounts: { [type: string]: number };
  totalJobs: number;
  successRate: number;
  avgProcessingTime: number;
  avgCreditsCharged: number;
}
```

---

#### POST `/api/admin/jobs/:jobId/retry`

**ADMIN** - Retry failed job

---

#### GET `/api/admin/moderation/spam`

**MODERATOR/ADMIN** - Detect spam activity

**Response**:

```typescript
{
  highVolumeUsers: [
    {
      user: UserObject;
      messageCount: number;
    }
  ];
  duplicateMessages: [
    {
      content: string;
      count: number;
      senderIds: number[];
    }
  ]
}
```

---

#### POST `/api/admin/moderation/bulk`

**MODERATOR/ADMIN** - Bulk moderate content

**Request**:

```typescript
{
  type: "message" | "listing";
  ids: number[];
  action: "delete" | "hide" | "approve";  // hide/approve for listings only
}
```

---

## Data Models

### User

```typescript
interface User {
  id: number;
  email: string;
  displayName: string;
  role: string; // Current active role
  roles: string[]; // All roles
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  onboardingComplete: boolean;
  organizationId: number | null;
  createdAt: string;
  updatedAt: string;
}
```

### Project

```typescript
interface Project {
  id: number;
  userId: number;
  organizationId: number | null;
  name: string;
  description: string | null;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
}
```

### Image

```typescript
interface Image {
  id: number;
  projectId: number;
  originalUrl: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  versions: ImageVersion[];
}
```

### ImageVersion

```typescript
interface ImageVersion {
  id: number;
  imageId: number;
  type: "ORIGINAL" | "ENHANCED" | "THUMBNAIL";
  url: string;
  width: number;
  height: number;
  fileSize: number;
  jobId: number | null;
  createdAt: string;
}
```

### Job

```typescript
interface Job {
  id: number;
  userId: number;
  projectId: number;
  imageId: number;
  type: JobType;
  status: JobStatus;
  priority: number;
  queuePosition: number | null;
  estimatedCredits: number;
  creditsCharged: number | null;
  inputParameters: Record<string, any>;
  outputUrl: string | null;
  error: string | null;
  processingTime: number | null;
  retryCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

type JobType =
  | "VIRTUAL_STAGING"
  | "ENHANCEMENT"
  | "SKY_REPLACEMENT"
  | "OBJECT_REMOVAL"
  | "PERSPECTIVE_CORRECTION"
  | "HDR_BLENDING";

type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
```

### Listing

```typescript
interface Listing {
  id: number;
  userId: number;
  organizationId: number | null;
  title: string;
  description: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  yearBuilt: number | null;
  location: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  features: string[];
  isPublished: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### Booking

```typescript
interface Booking {
  id: number;
  userId: number; // Buyer
  listingId: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  startDate: string;
  endDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Subscription

```typescript
interface Subscription {
  id: number;
  userId: number;
  planId: number;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  creditsRemaining: number;
  totalCredits: number;
  nextBillingDate: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Error Handling

### Standard Error Response

```typescript
{
  error: string;         // Error code
  message?: string;      // Human-readable message
  details?: any;         // Additional error details
}
```

### HTTP Status Codes

| Code | Meaning      | When                     |
| ---- | ------------ | ------------------------ |
| 200  | OK           | Success                  |
| 201  | Created      | Resource created         |
| 400  | Bad Request  | Invalid input            |
| 401  | Unauthorized | Missing/invalid token    |
| 403  | Forbidden    | Insufficient permissions |
| 404  | Not Found    | Resource doesn't exist   |
| 409  | Conflict     | Duplicate/conflict       |
| 500  | Server Error | Internal error           |

### Common Error Codes

| Error Code               | Status | Meaning                     |
| ------------------------ | ------ | --------------------------- |
| `INVALID_CREDENTIALS`    | 401    | Wrong email/password        |
| `EMAIL_ALREADY_EXISTS`   | 409    | Email taken                 |
| `USER_NOT_FOUND`         | 404    | User doesn't exist          |
| `INVALID_TOKEN`          | 401    | JWT invalid/expired         |
| `EMAIL_NOT_VERIFIED`     | 403    | Email not verified          |
| `NO_ACTIVE_SUBSCRIPTION` | 400    | No subscription for credits |
| `INSUFFICIENT_CREDITS`   | 400    | Not enough credits          |
| `JOB_NOT_FOUND`          | 404    | Job doesn't exist           |
| `PROJECT_NOT_FOUND`      | 404    | Project doesn't exist       |
| `LISTING_NOT_FOUND`      | 404    | Listing doesn't exist       |
| `BOOKING_CONFLICT`       | 409    | Time slot taken             |
| `UNAUTHORIZED_ACCESS`    | 403    | Not owner/no permission     |
| `ROLE_REQUIRED`          | 403    | Missing required role       |

---

## Implementation Examples

### 1. Complete Authentication Flow

```typescript
// Register
const register = async (email, password, role) => {
  const response = await fetch("http://localhost:4000/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });

  const data = await response.json();

  // Save token
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data;
};

// Login
const login = async (email, password) => {
  const response = await fetch("http://localhost:4000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (response.ok) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data;
  } else {
    throw new Error(data.error);
  }
};

// Get current user
const getCurrentUser = async () => {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:4000/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  return await response.json();
};

// Switch role
const switchRole = async (newRole) => {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:4000/auth/switch-role", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: newRole }),
  });

  const data = await response.json();

  // Update token
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data;
};
```

### 2. Project & Image Upload Flow

```typescript
// Create project
const createProject = async (name, description) => {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:4000/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description }),
  });

  return await response.json();
};

// Upload images
const uploadImages = async (projectId, files) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();

  files.forEach((file) => formData.append("files", file));

  const response = await fetch(
    `http://localhost:4000/projects/${projectId}/images/upload-multiple`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );

  return await response.json();
};
```

### 3. Job Queue Integration

```typescript
// Create job with polling
const createJobWithPolling = async (projectId, imageId, type, params) => {
  const token = localStorage.getItem("token");

  // Create job
  const createResponse = await fetch("http://localhost:4000/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId,
      imageId,
      type,
      inputParameters: params,
    }),
  });

  const { job } = await createResponse.json();

  // Poll for completion
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      const statusResponse = await fetch(
        `http://localhost:4000/jobs/${job.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const updatedJob = await statusResponse.json();

      if (updatedJob.status === "COMPLETED") {
        clearInterval(pollInterval);
        resolve(updatedJob);
      } else if (updatedJob.status === "FAILED") {
        clearInterval(pollInterval);
        reject(new Error(updatedJob.error));
      }
      // Continue polling if PENDING or PROCESSING
    }, 2000);
  });
};

// Usage with progress callback
const processImage = async (imageId, type, onProgress) => {
  const job = await createJobWithPolling(1, imageId, type, {});

  // Setup polling with progress
  const checkStatus = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`http://localhost:4000/jobs/${job.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const updatedJob = await response.json();

    if (updatedJob.status === "PENDING") {
      onProgress({
        status: "queued",
        position: updatedJob.queuePosition,
      });
      setTimeout(checkStatus, 3000);
    } else if (updatedJob.status === "PROCESSING") {
      onProgress({ status: "processing" });
      setTimeout(checkStatus, 2000);
    } else if (updatedJob.status === "COMPLETED") {
      onProgress({
        status: "completed",
        result: updatedJob.outputUrl,
      });
    } else if (updatedJob.status === "FAILED") {
      onProgress({
        status: "failed",
        error: updatedJob.error,
      });
    }
  };

  checkStatus();
};
```

### 4. Marketplace Search

```typescript
// Advanced search
const searchListings = async (filters) => {
  const params = new URLSearchParams();

  Object.keys(filters).forEach((key) => {
    if (filters[key] !== undefined && filters[key] !== null) {
      params.append(key, filters[key]);
    }
  });

  const response = await fetch(
    `http://localhost:4000/listings/marketplace/search?${params}`,
  );

  return await response.json();
};

// Usage
const results = await searchListings({
  search: "luxury villa",
  city: "Los Angeles",
  minPrice: 500000,
  maxPrice: 2000000,
  bedrooms: 3,
  propertyType: "house",
  hasVirtualStaging: true,
  page: 1,
  limit: 20,
  sortBy: "price_desc",
});
```

### 5. Booking Flow

```typescript
// Create booking
const createBooking = async (listingId, startDate, endDate, notes) => {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:4000/listings/bookings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      listingId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      notes,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.error === "BOOKING_CONFLICT") {
      throw new Error("This time slot is already booked");
    }
    throw new Error(error.message);
  }

  return await response.json();
};

// Get user's bookings
const getMyBookings = async () => {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:4000/listings/bookings", {
    headers: { Authorization: `Bearer ${token}` },
  });

  return await response.json();
};

// Cancel booking
const cancelBooking = async (bookingId) => {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `http://localhost:4000/listings/bookings/${bookingId}/cancel`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return await response.json();
};
```

### 6. Messaging System

```typescript
// Send message
const sendMessage = async (listingId, receiverId, content) => {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:4000/listings/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ listingId, receiverId, content }),
  });

  return await response.json();
};

// Get conversations
const getConversations = async () => {
  const token = localStorage.getItem("token");

  const response = await fetch(
    "http://localhost:4000/listings/messages/conversations",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return await response.json();
};

// Get conversation messages
const getConversationMessages = async (listingId, otherUserId) => {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `http://localhost:4000/listings/messages/${listingId}/${otherUserId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return await response.json();
};
```

### 7. Subscription & Credits

```typescript
// Get available plans
const getPlans = async () => {
  const token = localStorage.getItem('token');

  const response = await fetch('http://localhost:4000/billing/plans', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return await response.json();
};

// Subscribe to plan
const subscribe = async (planId) => {
  const token = localStorage.getItem('token');

  const response = await fetch('http://localhost:4000/billing/subscribe', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ planId })
  });

  return await response.json();
};

// Check credit usage
const getCreditUsage = async () => {
  const token = localStorage.getItem('token');

  const response = await fetch('http://localhost:4000/billing/me/usage', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return await response.json();
};

// Display credits in UI
const CreditDisplay = () => {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    getCreditUsage().then(setUsage);
  }, []);

  if (!usage?.subscription) return <div>No subscription</div>;

  return (
    <div>
      <p>Credits: {usage.subscription.creditsRemaining} / {usage.subscription.totalCredits}</p>
      <ProgressBar
        value={usage.subscription.creditsRemaining}
        max={usage.subscription.totalCredits}
      />
    </div>
  );
};
```

---

## Frontend Implementation Checklist

### Phase 1: Authentication

- [ ] Registration page (email, password, role selection)
- [ ] Login page
- [ ] Email verification flow
- [ ] Password reset flow
- [ ] User profile page (display name, roles)
- [ ] Role switcher component
- [ ] Protected route wrapper

### Phase 2: Lister Dashboard

- [ ] Projects list page
- [ ] Create project page
- [ ] Project detail page
- [ ] Image upload component (drag & drop, multi-file)
- [ ] Image grid/gallery component
- [ ] AI job creation modal (select type, parameters)
- [ ] Job queue status component (with polling)
- [ ] Job results display (before/after)

### Phase 3: Billing & Credits

- [ ] Subscription plans page
- [ ] Payment integration (Stripe)
- [ ] Credit usage dashboard
- [ ] Low credit warning
- [ ] Subscription management page

### Phase 4: Marketplace (Buyer)

- [ ] Homepage (featured listings)
- [ ] Search page with filters
- [ ] Listing detail page
- [ ] Favorites page
- [ ] Booking calendar component
- [ ] My bookings page
- [ ] Messaging inbox
- [ ] Conversation view

### Phase 5: Marketplace (Lister)

- [ ] Create listing page
- [ ] My listings page
- [ ] Attach project images to listing
- [ ] Received bookings page
- [ ] Booking management (confirm/reject)
- [ ] Listing analytics

### Phase 6: Admin Panel

- [ ] Admin dashboard
- [ ] User management table
- [ ] Job queue monitoring
- [ ] Content moderation tools
- [ ] Analytics charts
- [ ] Spam detection alerts

---

## Security Best Practices

1. **Token Storage**: Use `localStorage` for web, secure storage for mobile
2. **Token Refresh**: Implement token refresh before expiration
3. **Role Validation**: Always check user role before showing UI
4. **Input Validation**: Validate all inputs client-side before API call
5. **Error Messages**: Don't expose sensitive info in error messages
6. **File Upload**: Validate file types and sizes before upload
7. **XSS Protection**: Sanitize user-generated content before display
8. **HTTPS**: Always use HTTPS in production

---

## Performance Optimization

1. **Image Optimization**: Use lazy loading, responsive images
2. **Pagination**: Implement infinite scroll or pagination for lists
3. **Caching**: Cache API responses where appropriate
4. **Debouncing**: Debounce search inputs (300ms)
5. **Optimistic Updates**: Update UI before API response
6. **WebSocket**: Consider WebSocket for real-time job status
7. **Service Workers**: Cache static assets

---

## Testing Recommendations

1. **Unit Tests**: Test utility functions, components
2. **Integration Tests**: Test complete flows (auth, job creation)
3. **E2E Tests**: Test critical paths (registration → create project → job)
4. **API Mocking**: Mock API responses for offline development
5. **Error Scenarios**: Test all error cases (401, 403, 404, 500)

---

## Questions & Support

For any questions about API endpoints, data structures, or implementation:

1. Check this guide first
2. Review API documentation files:
   - `ADMIN_API_REFERENCE.md`
   - `MARKETPLACE_API.md`
3. Check Prisma schema for data models
4. Test endpoints with Postman/Thunder Client

---

**Last Updated**: March 4, 2026  
**Backend Version**: 1.0.0  
**Contact**: Backend Team
