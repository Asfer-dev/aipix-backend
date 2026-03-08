# Ad Copy Generation API Documentation

**Version:** 1.0  
**Last Updated:** March 9, 2026  
**Audience:** Frontend Developers

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Authentication](#authentication)
3. [Ad Copy Management Routes](#ad-copy-management-routes)
4. [AI-Powered Ad Copy Generation](#ai-powered-ad-copy-generation)
5. [Data Models](#data-models)
6. [Frontend Integration Guide](#frontend-integration-guide)
7. [Best Practices](#best-practices)
8. [Error Handling](#error-handling)

---

## System Overview

The Ad Copy Generation system allows **Listers** to create, manage, and AI-generate marketing copy for their property listings. Ad copies can be tailored to different channels (marketplace, Facebook, Instagram, property portals) and are stored at the **project level** for reuse across multiple listings.

### Key Features

- ✅ **Manual Ad Copy Creation** - Create and edit marketing copy manually
- ✅ **Multi-Channel Support** - Different copy variants for different platforms
- ✅ **Project-Scoped** - Ad copies belong to projects, can be reused for multiple listings
- ✅ **AI Generation** - Use NLP models to auto-generate compelling copy
- ✅ **Credit-Based Billing** - AI generation consumes subscription credits
- ✅ **Version History** - Track all ad copy variants over time

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vue)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ REST API (JWT Bearer Token)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  AIPIX BACKEND (Node.js)                      │
│                                                                │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Projects API    │◄───────►│  Job Queue       │          │
│  │  /projects/:id/  │         │  Service         │          │
│  │   ad-copies      │         │                  │          │
│  └──────────────────┘         └────────┬─────────┘          │
│                                         │                     │
└─────────────────────────────────────────┼─────────────────────┘
                                          │
                                          │ HTTP API Call
                                          │
                                ┌─────────▼─────────┐
                                │  AI Service       │
                                │  (Python FastAPI) │
                                │                   │
                                │  - NLP Models     │
                                │  - GPT-based Gen  │
                                └───────────────────┘
```

---

## Authentication

All ad copy routes require **JWT Bearer Token** authentication with **LISTER** role.

### Required Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Role Requirements

- **LISTER** - Can create/read/update/delete ad copies for their own projects
- **ADMIN** - Full access to all ad copies (covered in admin documentation)

---

## Ad Copy Management Routes

Base URL: `/api/projects/:projectId/ad-copies`

All routes require authentication and LISTER role.

---

### `GET /projects/:projectId/ad-copies`

List all ad copy variants for a specific project.

**Path Parameters:**

| Parameter   | Type   | Description           |
| ----------- | ------ | --------------------- |
| `projectId` | number | Project ID (required) |

**Response `200`**

```json
{
  "adCopies": [
    {
      "id": 1,
      "projectId": 3,
      "channel": "AIPIX",
      "title": "Stunning Downtown 3BR with Panoramic Views",
      "description": "Wake up to breathtaking city views every morning from this spacious 3-bedroom apartment. Features floor-to-ceiling windows, modern finishes, and premium appliances. Walking distance to restaurants, shops, and transit.",
      "keywords": "downtown, luxury, modern, city views, spacious",
      "createdById": 5,
      "createdAt": "2026-03-08T12:30:00.000Z",
      "updatedAt": "2026-03-08T12:30:00.000Z"
    },
    {
      "id": 2,
      "projectId": 3,
      "channel": "FACEBOOK",
      "title": "🏢 3BR Apartment for Rent — Downtown NYC",
      "description": "🔥 Available Now! Spacious modern apartment with stunning views. In-unit laundry, rooftop access, pet-friendly. $3,500/mo. DM for viewing!",
      "keywords": "NYC, apartment, downtown, modern, pet-friendly",
      "createdById": 5,
      "createdAt": "2026-03-08T13:00:00.000Z",
      "updatedAt": "2026-03-08T13:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - User lacks LISTER role
- `404 Not Found` - Project doesn't exist or doesn't belong to user

---

### `POST /projects/:projectId/ad-copies`

Create a new ad copy variant for a project.

**Path Parameters:**

| Parameter   | Type   | Description           |
| ----------- | ------ | --------------------- |
| `projectId` | number | Project ID (required) |

**Request Body:**

```json
{
  "channel": "INSTAGRAM",
  "title": "✨ Your Dream Apartment Awaits",
  "description": "3BR | Downtown | Modern | $3,500/mo\n\nSpacious layout • Floor-to-ceiling windows • Rooftop terrace • Pet-friendly\n\nLink in bio to schedule viewing! 🏡",
  "keywords": "instagram, social, apartment, modern"
}
```

| Field         | Type   | Required | Description                                          |
| ------------- | ------ | -------- | ---------------------------------------------------- |
| `channel`     | string | ✅       | Target channel (e.g., "AIPIX", "FACEBOOK", "INSTAGRAM") |
| `title`       | string | ✅       | Ad headline/title (max ~200 chars)                   |
| `description` | string | ✅       | Full ad copy body                                    |
| `keywords`    | string | ❌       | Comma-separated keywords/tags for organization       |

**Common Channel Values:**

- `AIPIX` - Your own marketplace
- `FACEBOOK` - Facebook Marketplace / Ads
- `INSTAGRAM` - Instagram posts / Stories
- `ZILLOW` - Zillow property portal
- `TRULIA` - Trulia property portal
- `REALTOR` - Realtor.com
- `GENERIC` - General-purpose copy

**Response `201`**

```json
{
  "adCopy": {
    "id": 3,
    "projectId": 3,
    "channel": "INSTAGRAM",
    "title": "✨ Your Dream Apartment Awaits",
    "description": "3BR | Downtown | Modern | $3,500/mo...",
    "keywords": "instagram, social, apartment, modern",
    "createdById": 5,
    "createdAt": "2026-03-09T10:15:00.000Z",
    "updatedAt": "2026-03-09T10:15:00.000Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Missing required fields (channel, title, or description)
- `404 Not Found` - Project doesn't exist or user doesn't own it

---

### `PATCH /projects/:projectId/ad-copies/:adCopyId`

Update an existing ad copy variant. All fields are optional — only send what you want to change.

**Path Parameters:**

| Parameter   | Type   | Description                 |
| ----------- | ------ | --------------------------- |
| `projectId` | number | Project ID (required)       |
| `adCopyId`  | number | Ad copy ID to update        |

**Request Body (all optional):**

```json
{
  "title": "Updated Headline — 3BR Downtown",
  "description": "Updated description with more details...",
  "keywords": "luxury, downtown, NYC, modern"
}
```

**Response `200`**

```json
{
  "adCopy": {
    "id": 3,
    "projectId": 3,
    "channel": "INSTAGRAM",
    "title": "Updated Headline — 3BR Downtown",
    "description": "Updated description with more details...",
    "keywords": "luxury, downtown, NYC, modern",
    "createdById": 5,
    "createdAt": "2026-03-09T10:15:00.000Z",
    "updatedAt": "2026-03-09T10:20:00.000Z"
  }
}
```

**Error Responses:**

- `404 Not Found` - Ad copy doesn't exist, or doesn't belong to user's project

---

### `DELETE /projects/:projectId/ad-copies/:adCopyId`

Delete an ad copy variant permanently.

**Path Parameters:**

| Parameter   | Type   | Description           |
| ----------- | ------ | --------------------- |
| `projectId` | number | Project ID (required) |
| `adCopyId`  | number | Ad copy ID to delete  |

**Response `200`**

```json
{
  "success": true
}
```

**Error Responses:**

- `404 Not Found` - Ad copy doesn't exist or doesn't belong to user's project

---

## AI-Powered Ad Copy Generation

Ad copy can be AI-generated using the **Job Queue System**. AI generation consumes credits from your subscription plan.

### How It Works

```
┌────────────────┐
│ User Initiates │
│ AI Generation  │
└────────┬───────┘
         │
         │ POST /api/jobs
         │
┌────────▼───────┐
│  Job Created   │
│ Status: PENDING│
│ Type: AD_GEN   │
└────────┬───────┘
         │
         │ Queue picks up job
         │
┌────────▼───────┐
│ Status: RUNNING│
│ AI Service     │
│ Processing...  │
└────────┬───────┘
         │
         │ AI generates copy
         │
┌────────▼────────┐
│Status: COMPLETED│
│ Credits charged │
│ Result returned │
└─────────────────┘
```

### Step 1: Create an AI Generation Job

**Endpoint:** `POST /api/jobs`

```json
{
  "userId": 5,
  "projectId": 3,
  "imageId": 14,
  "type": "AD_GENERATION",
  "priority": 5,
  "estimatedCredits": 5,
  "inputParameters": {
    "propertyData": {
      "title": "Modern 3BR Apartment",
      "description": "Spacious downtown apartment with city views",
      "bedrooms": 3,
      "bathrooms": 2,
      "price": 3500,
      "location": "Downtown NYC"
    },
    "parameters": {
      "tone": "professional",
      "length": "medium",
      "platform": "facebook"
    }
  }
}
```

**Input Parameters:**

| Field                       | Type   | Required | Description                                       |
| --------------------------- | ------ | -------- | ------------------------------------------------- |
| `type`                      | string | ✅       | Must be `"AD_GENERATION"`                         |
| `projectId`                 | number | ✅       | Project ID                                        |
| `imageId`                   | number | ✅       | Any image from the project (for context)          |
| `priority`                  | number | ❌       | 0-10, higher = faster processing (default: 0)    |
| `estimatedCredits`          | number | ❌       | Estimate for upfront check (default: 5)           |
| `inputParameters.propertyData` | object | ✅    | Property information for AI context               |
| `inputParameters.parameters`   | object | ❌    | Generation style preferences                      |

**Property Data Fields:**

| Field         | Type   | Description                  |
| ------------- | ------ | ---------------------------- |
| `title`       | string | Property title               |
| `description` | string | Property description         |
| `bedrooms`    | number | Number of bedrooms           |
| `bathrooms`   | number | Number of bathrooms          |
| `price`       | number | Monthly rent or sale price   |
| `location`    | string | Location (city/neighborhood) |

**Generation Parameters:**

| Field      | Type   | Options                                | Default        |
| ---------- | ------ | -------------------------------------- | -------------- |
| `tone`     | string | "professional", "casual", "luxury"     | "professional" |
| `length`   | string | "short" (~50 words), "medium" (~150), "long" (~300) | "medium" |
| `platform` | string | "facebook", "instagram", "website"     | "website"      |

**Response `201`**

```json
{
  "id": 156,
  "type": "AD_GENERATION",
  "status": "PENDING",
  "priority": 5,
  "estimatedCredits": 5,
  "creditsCharged": null,
  "processingTimeMs": null,
  "queuePosition": 3,
  "createdAt": "2026-03-09T10:30:00.000Z",
  "startedAt": null,
  "completedAt": null,
  "resultUrl": null,
  "errorMessage": null
}
```

### Step 2: Poll Job Status

**Endpoint:** `GET /api/jobs/:jobId`

Poll this endpoint to check the job status. Job progresses through these states:

- `PENDING` → Job created, waiting in queue
- `QUEUED` → Queue manager picked up the job
- `RUNNING` → AI service is processing
- `COMPLETED` → ✅ Ad copy generated successfully
- `FAILED` → ❌ Error occurred during processing
- `CANCELLED` → User cancelled the job

**Response `200` (Completed)**

```json
{
  "id": 156,
  "type": "AD_GENERATION",
  "status": "COMPLETED",
  "priority": 5,
  "estimatedCredits": 5,
  "creditsCharged": 3,
  "processingTimeMs": 2450,
  "createdAt": "2026-03-09T10:30:00.000Z",
  "startedAt": "2026-03-09T10:30:05.000Z",
  "completedAt": "2026-03-09T10:30:08.000Z",
  "resultUrl": null,
  "errorMessage": null,
  "outputMetadata": {
    "adCopy": {
      "title": "Stunning 3BR Downtown Apartment with City Views",
      "description": "Discover modern luxury living in the heart of downtown NYC. This spacious 3-bedroom, 2-bathroom apartment features floor-to-ceiling windows with breathtaking city views. Enjoy contemporary finishes, in-unit laundry, and access to premium building amenities. Located steps from dining, entertainment, and public transit. Available now at $3,500/month. Schedule your private tour today!",
      "keywords": "downtown, modern, luxury, city views, NYC, apartment"
    },
    "confidence": 0.92,
    "model": "gpt-4-turbo",
    "generatedAt": "2026-03-09T10:30:08.000Z"
  }
}
```

**Key Result Fields:**

- `status` - Check this to see if job is complete
- `outputMetadata.adCopy` - The AI-generated copy (title, description, keywords)
- `outputMetadata.confidence` - AI confidence score (0-1)
- `creditsCharged` - Actual credits deducted from subscription

### Step 3: Save AI-Generated Copy

Once the job is complete, save the AI-generated copy to the project:

**Endpoint:** `POST /api/projects/:projectId/ad-copies`

```json
{
  "channel": "FACEBOOK",
  "title": "Stunning 3BR Downtown Apartment with City Views",
  "description": "Discover modern luxury living in the heart of downtown NYC...",
  "keywords": "downtown, modern, luxury, city views, NYC, apartment"
}
```

### Credit Costs

Ad copy generation costs are based on processing time:

| Plan           | Credits/Second | Typical Cost (medium copy) |
| -------------- | -------------- | -------------------------- |
| **Basic**      | 0.05           | ~1-3 credits               |
| **Pro**        | 0.05           | ~1-3 credits               |
| **Enterprise** | 0.05           | ~1-3 credits               |

**Note:** Short copy (~50 words) completes faster and costs less than long copy (~300 words).

### Real-Time Job Updates (Optional)

For real-time updates without polling, subscribe to Server-Sent Events (SSE):

**Endpoint:** `GET /api/jobs/:jobId/events`

```javascript
const eventSource = new EventSource(`/api/jobs/${jobId}/events`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

eventSource.addEventListener("job:started", (event) => {
  console.log("Job started:", JSON.parse(event.data));
});

eventSource.addEventListener("job:completed", (event) => {
  const { adCopy } = JSON.parse(event.data);
  console.log("Ad copy generated:", adCopy);
  eventSource.close();
});

eventSource.addEventListener("job:failed", (event) => {
  console.error("Job failed:", JSON.parse(event.data));
  eventSource.close();
});
```

---

## Data Models

### ProjectAdCopy

| Field         | Type     | Nullable | Description                              |
| ------------- | -------- | -------- | ---------------------------------------- |
| `id`          | number   | No       | Unique ad copy ID                        |
| `projectId`   | number   | No       | Parent project ID                        |
| `channel`     | string   | No       | Target channel (e.g., "FACEBOOK")        |
| `title`       | string   | No       | Ad headline/title                        |
| `description` | string   | No       | Full ad copy body text                   |
| `keywords`    | string   | Yes      | Comma-separated keywords/tags            |
| `createdById` | number   | No       | User ID who created this copy            |
| `createdAt`   | DateTime | No       | Creation timestamp                       |
| `updatedAt`   | DateTime | No       | Last update timestamp                    |

### Job (for AI generation)

| Field             | Type     | Nullable | Description                        |
| ----------------- | -------- | -------- | ---------------------------------- |
| `id`              | number   | No       | Unique job ID                      |
| `userId`          | number   | No       | User who created the job           |
| `projectId`       | number   | No       | Project ID                         |
| `imageId`         | number   | No       | Image ID (for context)             |
| `type`            | JobType  | No       | "AD_GENERATION"                    |
| `status`          | JobStatus| No       | PENDING, RUNNING, COMPLETED, etc.  |
| `priority`        | number   | No       | 0-10 (default: 0)                  |
| `estimatedCredits`| number   | Yes      | Estimated cost                     |
| `creditsCharged`  | number   | Yes      | Actual cost (set on completion)    |
| `processingTimeMs`| number   | Yes      | Time taken to process (ms)         |
| `inputParameters` | JSON     | Yes      | Job-specific input data            |
| `outputMetadata`  | JSON     | Yes      | AI response data (includes adCopy) |
| `resultUrl`       | string   | Yes      | Not used for AD_GENERATION         |
| `errorMessage`    | string   | Yes      | Error description if failed        |
| `errorCode`       | string   | Yes      | Machine-readable error code        |
| `createdAt`       | DateTime | No       | Job creation time                  |
| `startedAt`       | DateTime | Yes      | Processing start time              |
| `completedAt`     | DateTime | Yes      | Processing completion time         |

---

## Frontend Integration Guide

### React Example: Manual Ad Copy Management

```tsx
import { useState, useEffect } from "react";
import axios from "axios";

interface AdCopy {
  id: number;
  projectId: number;
  channel: string;
  title: string;
  description: string;
  keywords: string | null;
  createdAt: string;
  updatedAt: string;
}

function AdCopyManager({ projectId, token }: { projectId: number; token: string }) {
  const [adCopies, setAdCopies] = useState<AdCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCopy, setNewCopy] = useState({
    channel: "AIPIX",
    title: "",
    description: "",
    keywords: "",
  });

  // Fetch existing ad copies
  useEffect(() => {
    fetchAdCopies();
  }, [projectId]);

  const fetchAdCopies = async () => {
    try {
      const response = await axios.get(
        `/api/projects/${projectId}/ad-copies`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAdCopies(response.data.adCopies);
    } catch (error) {
      console.error("Failed to fetch ad copies:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create new ad copy
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `/api/projects/${projectId}/ad-copies`,
        newCopy,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAdCopies([response.data.adCopy, ...adCopies]);
      setNewCopy({ channel: "AIPIX", title: "", description: "", keywords: "" });
    } catch (error) {
      console.error("Failed to create ad copy:", error);
    }
  };

  // Delete ad copy
  const handleDelete = async (adCopyId: number) => {
    if (!confirm("Delete this ad copy?")) return;
    
    try {
      await axios.delete(
        `/api/projects/${projectId}/ad-copies/${adCopyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAdCopies(adCopies.filter((copy) => copy.id !== adCopyId));
    } catch (error) {
      console.error("Failed to delete ad copy:", error);
    }
  };

  if (loading) return <div>Loading ad copies...</div>;

  return (
    <div>
      <h2>Ad Copy Variations</h2>

      {/* Create Form */}
      <form onSubmit={handleCreate}>
        <select
          value={newCopy.channel}
          onChange={(e) => setNewCopy({ ...newCopy, channel: e.target.value })}
        >
          <option value="AIPIX">AIPIX Marketplace</option>
          <option value="FACEBOOK">Facebook</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="ZILLOW">Zillow</option>
        </select>

        <input
          type="text"
          placeholder="Title"
          value={newCopy.title}
          onChange={(e) => setNewCopy({ ...newCopy, title: e.target.value })}
          required
        />

        <textarea
          placeholder="Description"
          value={newCopy.description}
          onChange={(e) => setNewCopy({ ...newCopy, description: e.target.value })}
          required
        />

        <input
          type="text"
          placeholder="Keywords (comma-separated)"
          value={newCopy.keywords}
          onChange={(e) => setNewCopy({ ...newCopy, keywords: e.target.value })}
        />

        <button type="submit">Create Ad Copy</button>
      </form>

      {/* Ad Copy List */}
      <div>
        {adCopies.map((copy) => (
          <div key={copy.id} style={{ border: "1px solid #ccc", padding: "1rem", margin: "1rem 0" }}>
            <h3>{copy.channel}: {copy.title}</h3>
            <p>{copy.description}</p>
            {copy.keywords && <p><em>Keywords: {copy.keywords}</em></p>}
            <button onClick={() => handleDelete(copy.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdCopyManager;
```

### React Example: AI-Powered Ad Copy Generation

```tsx
import { useState } from "react";
import axios from "axios";

interface GenerateAdCopyProps {
  projectId: number;
  imageId: number;
  token: string;
  propertyData: {
    title: string;
    description?: string;
    bedrooms?: number;
    bathrooms?: number;
    price?: number;
    location?: string;
  };
  onComplete: (adCopy: { title: string; description: string; keywords: string }) => void;
}

function AIAdCopyGenerator({
  projectId,
  imageId,
  token,
  propertyData,
  onComplete,
}: GenerateAdCopyProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [tone, setTone] = useState<"professional" | "casual" | "luxury">("professional");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [platform, setPlatform] = useState<"facebook" | "instagram" | "website">("facebook");

  const generateAdCopy = async () => {
    setLoading(true);
    setError(null);
    setJobStatus("Creating job...");

    try {
      // Step 1: Create AI generation job
      const jobResponse = await axios.post(
        "/api/jobs",
        {
          projectId,
          imageId,
          type: "AD_GENERATION",
          priority: 5,
          estimatedCredits: 5,
          inputParameters: {
            propertyData,
            parameters: {
              tone,
              length,
              platform,
            },
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const jobId = jobResponse.data.id;
      setJobStatus("Processing...");

      // Step 2: Poll for job completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`/api/jobs/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const job = statusResponse.data;

          if (job.status === "COMPLETED") {
            clearInterval(pollInterval);
            setJobStatus("Complete!");
            setLoading(false);

            // Extract AI-generated ad copy
            const adCopy = job.outputMetadata.adCopy;
            onComplete(adCopy);
          } else if (job.status === "FAILED") {
            clearInterval(pollInterval);
            setError(job.errorMessage || "AI generation failed");
            setLoading(false);
          } else {
            setJobStatus(`Status: ${job.status}`);
          }
        } catch (pollError) {
          clearInterval(pollInterval);
          setError("Failed to check job status");
          setLoading(false);
        }
      }, 2000); // Poll every 2 seconds

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (loading) {
          setError("Job timed out");
          setLoading(false);
        }
      }, 120000);
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || "Failed to generate ad copy");
    }
  };

  return (
    <div>
      <h3>AI Ad Copy Generator</h3>

      <div>
        <label>
          Tone:
          <select value={tone} onChange={(e) => setTone(e.target.value as any)}>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="luxury">Luxury</option>
          </select>
        </label>

        <label>
          Length:
          <select value={length} onChange={(e) => setLength(e.target.value as any)}>
            <option value="short">Short (~50 words)</option>
            <option value="medium">Medium (~150 words)</option>
            <option value="long">Long (~300 words)</option>
          </select>
        </label>

        <label>
          Platform:
          <select value={platform} onChange={(e) => setPlatform(e.target.value as any)}>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="website">Website</option>
          </select>
        </label>
      </div>

      <button onClick={generateAdCopy} disabled={loading}>
        {loading ? jobStatus : "Generate with AI"}
      </button>

      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}

export default AIAdCopyGenerator;
```

### Vue 3 Example: Ad Copy List

```vue
<template>
  <div class="ad-copy-manager">
    <h2>Ad Copy Variations</h2>

    <!-- Loading State -->
    <div v-if="loading">Loading ad copies...</div>

    <!-- Error State -->
    <div v-if="error" class="error">{{ error }}</div>

    <!-- Ad Copy List -->
    <div v-for="copy in adCopies" :key="copy.id" class="ad-copy-card">
      <div class="channel-badge">{{ copy.channel }}</div>
      <h3>{{ copy.title }}</h3>
      <p>{{ copy.description }}</p>
      <p v-if="copy.keywords" class="keywords">
        <em>Keywords: {{ copy.keywords }}</em>
      </p>
      <div class="actions">
        <button @click="editAdCopy(copy)">Edit</button>
        <button @click="deleteAdCopy(copy.id)" class="danger">Delete</button>
      </div>
    </div>

    <!-- Create New Button -->
    <button @click="showCreateForm = true" class="create-btn">
      + Create New Ad Copy
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import axios from "axios";

interface AdCopy {
  id: number;
  projectId: number;
  channel: string;
  title: string;
  description: string;
  keywords: string | null;
  createdAt: string;
  updatedAt: string;
}

const props = defineProps<{
  projectId: number;
  token: string;
}>();

const adCopies = ref<AdCopy[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showCreateForm = ref(false);

onMounted(() => {
  fetchAdCopies();
});

const fetchAdCopies = async () => {
  try {
    const response = await axios.get(
      `/api/projects/${props.projectId}/ad-copies`,
      {
        headers: { Authorization: `Bearer ${props.token}` },
      }
    );
    adCopies.value = response.data.adCopies;
  } catch (err: any) {
    error.value = err.response?.data?.error || "Failed to load ad copies";
  } finally {
    loading.value = false;
  }
};

const deleteAdCopy = async (adCopyId: number) => {
  if (!confirm("Delete this ad copy?")) return;

  try {
    await axios.delete(
      `/api/projects/${props.projectId}/ad-copies/${adCopyId}`,
      {
        headers: { Authorization: `Bearer ${props.token}` },
      }
    );
    adCopies.value = adCopies.value.filter((copy) => copy.id !== adCopyId);
  } catch (err: any) {
    alert(err.response?.data?.error || "Failed to delete ad copy");
  }
};

const editAdCopy = (copy: AdCopy) => {
  // Navigate to edit page or open modal
  console.log("Edit ad copy:", copy);
};
</script>

<style scoped>
.ad-copy-card {
  border: 1px solid #e0e0e0;
  padding: 1.5rem;
  margin: 1rem 0;
  border-radius: 8px;
}

.channel-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #007bff;
  color: white;
  border-radius: 4px;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.keywords {
  color: #666;
  font-size: 0.875rem;
}

.actions button {
  margin-right: 0.5rem;
}

.danger {
  background: #dc3545;
  color: white;
}

.create-btn {
  background: #28a745;
  color: white;
  padding: 0.75rem 1.5rem;
  font-weight: bold;
}

.error {
  color: #dc3545;
  padding: 1rem;
  background: #f8d7da;
  border-radius: 4px;
}
</style>
```

---

## Best Practices

### 1. Channel-Specific Copy

Create different ad copy variants for each platform:

```typescript
const channels = {
  AIPIX: {
    tone: "professional",
    length: "medium",
    focus: "detailed property info",
  },
  FACEBOOK: {
    tone: "casual",
    length: "short",
    focus: "engagement and emojis",
  },
  INSTAGRAM: {
    tone: "casual",
    length: "short",
    focus: "visual appeal, hashtags",
  },
  ZILLOW: {
    tone: "professional",
    length: "long",
    focus: "comprehensive details",
  },
};
```

### 2. Reuse Ad Copies Across Listings

Ad copies are stored at the project level, so you can:

1. Create multiple ad copy variants for a project
2. Reuse them across multiple listings in that project
3. Update the master copy and have it reflected everywhere

### 3. A/B Testing

Track which ad copy performs best:

```typescript
// When creating a listing, log which ad copy was used
const listing = await createListing({
  // ... listing data
  adCopyId: selectedAdCopyId, // Track which copy is being used
});

// Later, analyze conversion rates by ad copy variant
```

### 4. Credit Management

Before generating AI ad copy, check available credits:

```typescript
const subscription = await getActiveSubscription();
const remainingCredits = subscription.maxCredits - subscription.usedCredits;

if (remainingCredits < 5) {
  alert("Insufficient credits for AI generation. Please upgrade your plan.");
  return;
}
```

### 5. Fallback Content

Always have fallback ad copy in case AI generation fails:

```typescript
const generateOrFallback = async () => {
  try {
    const aiCopy = await generateAIAdCopy(params);
    return aiCopy;
  } catch (error) {
    // Fallback to basic property description
    return {
      title: `${bedrooms}BR ${propertyType} in ${location}`,
      description: `${bedrooms} bedroom, ${bathrooms} bathroom ${propertyType} available...`,
      keywords: `${location}, ${propertyType}, ${bedrooms}BR`,
    };
  }
};
```

### 6. Character Limits

Different platforms have different character limits:

| Platform     | Title Limit | Description Limit |
| ------------ | ----------- | ----------------- |
| Facebook     | 125 chars   | 2,200 chars       |
| Instagram    | None        | 2,200 chars       |
| Zillow       | 100 chars   | 1,000 chars       |
| AIPIX        | 200 chars   | Unlimited         |

Validate before saving:

```typescript
const validateAdCopy = (copy: AdCopy, channel: string) => {
  const limits = {
    FACEBOOK: { title: 125, description: 2200 },
    INSTAGRAM: { title: Infinity, description: 2200 },
    ZILLOW: { title: 100, description: 1000 },
  };

  const limit = limits[channel];
  if (copy.title.length > limit.title) {
    throw new Error(`Title exceeds ${limit.title} characters for ${channel}`);
  }
  if (copy.description.length > limit.description) {
    throw new Error(`Description exceeds ${limit.description} characters for ${channel}`);
  }
};
```

---

## Error Handling

### Common Errors

| Status Code | Error                                      | Cause                                              | Solution                                    |
| ----------- | ------------------------------------------ | -------------------------------------------------- | ------------------------------------------- |
| `400`       | `channel, title and description required`  | Missing required fields                            | Include all required fields in request      |
| `401`       | `Unauthorized`                             | Missing or invalid JWT token                       | Ensure valid token in Authorization header  |
| `402`       | `Insufficient credits`                     | Not enough credits for AI generation               | Upgrade plan or wait for monthly reset      |
| `403`       | `Forbidden`                                | User lacks LISTER role                             | User needs LISTER role to create ad copies  |
| `404`       | `Project not found`                        | Project doesn't exist or user doesn't own it       | Verify project ID and ownership             |
| `404`       | `Ad copy not found`                        | Ad copy doesn't exist or doesn't belong to project | Verify ad copy ID and project relationship  |
| `500`       | `AI service unavailable`                   | AI service is down or unreachable                  | Retry later or use manual ad copy creation  |

### Error Handling Example

```typescript
const handleAdCopyOperation = async () => {
  try {
    const response = await axios.post(
      `/api/projects/${projectId}/ad-copies`,
      adCopyData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const message = error.response?.data?.error;

    switch (status) {
      case 400:
        alert(`Validation error: ${message}`);
        break;
      case 401:
        // Redirect to login
        window.location.href = "/login";
        break;
      case 402:
        alert("Insufficient credits. Please upgrade your plan.");
        // Show upgrade modal
        break;
      case 403:
        alert("You need a LISTER account to create ad copies.");
        break;
      case 404:
        alert("Project not found. It may have been deleted.");
        break;
      case 500:
        alert("Server error. Please try again later.");
        break;
      default:
        alert(`Unexpected error: ${message}`);
    }

    throw error; // Re-throw for caller to handle
  }
};
```

---

## Summary

The Ad Copy Generation system provides:

- ✅ **CRUD operations** for manual ad copy management
- ✅ **AI-powered generation** using NLP models
- ✅ **Multi-channel support** for different marketing platforms
- ✅ **Project-scoped storage** for reusability
- ✅ **Credit-based billing** for AI usage
- ✅ **Flexible parameters** for tone, length, and platform optimization

**Key Endpoints:**

- `GET /projects/:id/ad-copies` - List all ad copies
- `POST /projects/:id/ad-copies` - Create new ad copy
- `PATCH /projects/:id/ad-copies/:adCopyId` - Update ad copy
- `DELETE /projects/:id/ad-copies/:adCopyId` - Delete ad copy
- `POST /api/jobs` - Generate ad copy with AI

**Next Steps:**

1. Review the [Projects and Listings API](PROJECTS_AND_LISTINGS_API.md) for context
2. See [Job Queue documentation](JOB_QUEUE_API.md) for AI processing details
3. Check [Billing API](BILLING_API.md) for credit management

---

**Questions or issues?** Contact the backend team or check the [GitHub Wiki](https://github.com/your-org/aipix-backend/wiki).
