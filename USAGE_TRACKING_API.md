# Usage Tracking API Documentation

**Version:** 1.0  
**Last Updated:** March 9, 2026  
**Audience:** Frontend Developers

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tracking Architecture](#tracking-architecture)
3. [API Endpoints](#api-endpoints)
4. [Dashboard Integration](#dashboard-integration)
5. [Quota Enforcement](#quota-enforcement)
6. [Frontend Examples](#frontend-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## System Overview

AIPIX tracks two critical usage metrics for each lister's subscription:

### 1. **AI Credits Usage**

- **What**: Credits consumed by AI processing jobs (enhancement, staging, ad copy generation)
- **Limit**: Defined by subscription plan (e.g., Basic: 1,000 credits/month)
- **Reset**: Monthly at billing cycle renewal
- **Tracking**: Direct field `currentCreditsUsed` in Subscription table

### 2. **Storage Usage**

- **What**: Total size of uploaded images (original + enhanced versions)
- **Limit**: Defined by subscription plan (e.g., Basic: 5,000 MB)
- **Reset**: **Not reset** - cumulative storage
- **Tracking**: Direct field `currentStorageMb` in Subscription table

### Key Features

✅ **Real-Time Tracking** - No aggregations, instant dashboard updates  
✅ **Quota Enforcement** - Prevents operations exceeding limits  
✅ **Detailed History** - Separate tables (`CreditUsage`, `StorageUsage`) log all transactions  
✅ **Fast Queries** - Direct fields optimized for dashboard performance

---

## Tracking Architecture

### Database Schema

```prisma
model Subscription {
  id                 Int      @id
  userId             Int
  planId             Int

  // Direct tracking fields (optimized for quick access)
  currentCreditsUsed Int      @default(0) // Current billing cycle usage
  currentStorageMb   Float    @default(0) // Cumulative storage used

  isActive           Boolean  @default(true)
  startDate          DateTime
  endDate            DateTime?

  plan               Plan     @relation(...)
  creditUsages       CreditUsage[]
  storageUsages      StorageUsage[]
}

model Plan {
  id              Int
  name            String
  monthlyPriceUsd Decimal

  // Limits
  maxAiCredits    Int    // Monthly credit allocation
  maxStorageMb    Int    // Total storage limit

  // Per-second credit costs
  enhancementCreditsPerSecond    Decimal
  virtualStagingCreditsPerSecond Decimal
  adGenerationCreditsPerSecond   Decimal
}

model CreditUsage {
  id               Int
  subscriptionId   Int
  jobId            Int?
  creditsUsed      Int      // Amount deducted (or negative for admin adjustments)
  processingTimeMs Int?
  jobType          String?  // "ENHANCEMENT", "VIRTUAL_STAGING", etc.
  reason           String?
  createdAt        DateTime
}

model StorageUsage {
  id             Int
  subscriptionId Int
  imageId        Int?
  projectId      Int?
  fileSizeMb     Float
  fileUrl        String
  fileName       String?
  operation      String  // "UPLOAD" or "DELETE"
  createdAt      DateTime
}
```

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                   USER ACTION                            │
└────────────────────┬────────────────────────────────────┘
                     │
           ┌─────────┴──────────┐
           │                    │
    ┌──────▼──────┐      ┌──────▼──────┐
    │ Upload Image│      │ Process Job │
    └──────┬──────┘      └──────┬──────┘
           │                    │
    ┌──────▼──────────┐  ┌──────▼──────────────┐
    │ 1. Check Quota  │  │ 1. Check Credits    │
    │    Allowed?     │  │    Remaining?       │
    └──────┬──────────┘  └──────┬──────────────┘
           │                    │
    ┌──────▼──────────┐  ┌──────▼──────────────┐
    │ 2. Upload to S3 │  │ 2. Process with AI  │
    └──────┬──────────┘  └──────┬──────────────┘
           │                    │
    ┌──────▼──────────────────┐ │
    │ 3. Track Storage:       │ │
    │   - Create StorageUsage │ │
    │   - UPDATE Subscription │ │
    │     currentStorageMb    │ │
    │     += fileSizeMb       │ │
    └─────────────────────────┘ │
                                │
                     ┌──────────▼──────────────┐
                     │ 3. Track Credits:       │
                     │   - Create CreditUsage  │
                     │   - UPDATE Subscription │
                     │     currentCreditsUsed  │
                     │     += creditsCharged   │
                     └─────────────────────────┘
```

---

## API Endpoints

### Get User Usage Summary

**Endpoint:** `GET /api/billing/usage`

**Description:** Retrieve current usage statistics for the authenticated user's active subscription.

**Headers:**

```http
Authorization: Bearer {jwt_token}
```

**Response `200`:**

```json
{
  "subscriptionId": 15,
  "plan": {
    "id": 2,
    "name": "Pro Plan",
    "monthlyPriceUsd": 49.99,
    "maxAiCredits": 5000,
    "maxStorageMb": 20000
  },
  "usage": {
    "usedCredits": 1250,
    "remainingCredits": 3750,
    "usedStorageMb": 4582.34,
    "remainingStorageMb": 15417.66,
    "creditsPercentage": 25,
    "storagePercentage": 22.91
  }
}
```

**Response Fields:**

| Field                      | Type   | Description                         |
| -------------------------- | ------ | ----------------------------------- |
| `subscriptionId`           | number | Active subscription ID              |
| `plan.name`                | string | Plan name (e.g., "Basic", "Pro")    |
| `plan.maxAiCredits`        | number | Monthly credit limit                |
| `plan.maxStorageMb`        | number | Total storage limit (MB)            |
| `usage.usedCredits`        | number | Credits consumed this billing cycle |
| `usage.remainingCredits`   | number | Credits still available             |
| `usage.usedStorageMb`      | number | Total storage used (MB)             |
| `usage.remainingStorageMb` | number | Storage still available (MB)        |
| `usage.creditsPercentage`  | number | Percentage of credits used (0-100)  |
| `usage.storagePercentage`  | number | Percentage of storage used (0-100)  |

**Error Responses:**

- `401 Unauthorized` - Missing or invalid JWT token
- `402 Payment Required` - No active subscription found

---

### Get Detailed Credit History

**Endpoint:** `GET /api/billing/credit-history?limit=50&offset=0`

**Description:** Retrieve detailed credit usage history (individual jobs/transactions).

**Query Parameters:**

| Parameter | Type   | Default | Description                 |
| --------- | ------ | ------- | --------------------------- |
| `limit`   | number | 50      | Number of records to return |
| `offset`  | number | 0       | Pagination offset           |

**Response `200`:**

```json
{
  "creditHistory": [
    {
      "id": 1523,
      "creditsUsed": 15,
      "jobType": "ENHANCEMENT",
      "processingTimeMs": 2450,
      "reason": "ENHANCEMENT job completed",
      "createdAt": "2026-03-09T10:30:15.000Z"
    },
    {
      "id": 1522,
      "creditsUsed": 8,
      "jobType": "VIRTUAL_STAGING",
      "processingTimeMs": 1800,
      "reason": "VIRTUAL_STAGING job completed",
      "createdAt": "2026-03-09T09:15:00.000Z"
    },
    {
      "id": 1521,
      "creditsUsed": -100,
      "jobType": null,
      "processingTimeMs": null,
      "reason": "Admin adjustment: Loyalty bonus",
      "createdAt": "2026-03-08T14:00:00.000Z"
    }
  ],
  "total": 234,
  "limit": 50,
  "offset": 0
}
```

**Note:** Negative `creditsUsed` indicates credits were **added** (refunds, bonuses).

---

### Get Detailed Storage History

**Endpoint:** `GET /api/billing/storage-history?limit=50&offset=0`

**Description:** Retrieve detailed storage usage history (individual file uploads/deletes).

**Query Parameters:**

| Parameter | Type   | Default | Description                 |
| --------- | ------ | ------- | --------------------------- |
| `limit`   | number | 50      | Number of records to return |
| `offset`  | number | 0       | Pagination offset           |

**Response `200`:**

```json
{
  "storageHistory": [
    {
      "id": 8523,
      "fileSizeMb": 3.45,
      "fileName": "living-room.jpg",
      "fileUrl": "https://s3.amazonaws.com/.../living-room.jpg",
      "operation": "UPLOAD",
      "imageId": 145,
      "projectId": 23,
      "createdAt": "2026-03-09T10:30:15.000Z"
    },
    {
      "id": 8522,
      "fileSizeMb": 2.87,
      "fileName": "kitchen.jpg",
      "fileUrl": "https://s3.amazonaws.com/.../kitchen.jpg",
      "operation": "UPLOAD",
      "imageId": 144,
      "projectId": 23,
      "createdAt": "2026-03-09T10:30:10.000Z"
    },
    {
      "id": 8521,
      "fileSizeMb": 1.92,
      "fileName": "old-photo.jpg",
      "fileUrl": "https://s3.amazonaws.com/.../old-photo.jpg",
      "operation": "DELETE",
      "imageId": 120,
      "projectId": 22,
      "createdAt": "2026-03-09T09:00:00.000Z"
    }
  ],
  "total": 456,
  "limit": 50,
  "offset": 0
}
```

---

## Dashboard Integration

### Usage Overview Widget

Display current usage with progress bars:

```typescript
interface UsageSummary {
  plan: {
    name: string;
    maxAiCredits: number;
    maxStorageMb: number;
  };
  usage: {
    usedCredits: number;
    remainingCredits: number;
    usedStorageMb: number;
    remainingStorageMb: number;
    creditsPercentage: number;
    storagePercentage: number;
  };
}

function UsageWidget({ usage }: { usage: UsageSummary }) {
  return (
    <div className="usage-widget">
      <h2>{usage.plan.name}</h2>

      {/* Credits Usage */}
      <div className="metric">
        <div className="header">
          <span>AI Credits</span>
          <span>{usage.usage.usedCredits.toLocaleString()} / {usage.plan.maxAiCredits.toLocaleString()}</span>
        </div>
        <ProgressBar
          value={usage.usage.creditsPercentage}
          color={usage.usage.creditsPercentage > 80 ? "red" : "blue"}
        />
        <small>{usage.usage.remainingCredits.toLocaleString()} credits remaining</small>
      </div>

      {/* Storage Usage */}
      <div className="metric">
        <div className="header">
          <span>Storage</span>
          <span>{usage.usage.usedStorageMb.toFixed(2)} MB / {usage.plan.maxStorageMb.toLocaleString()} MB</span>
        </div>
        <ProgressBar
          value={usage.usage.storagePercentage}
          color={usage.usage.storagePercentage > 80 ? "red" : "green"}
        />
        <small>{usage.usage.remainingStorageMb.toFixed(2)} MB available</small>
      </div>
    </div>
  );
}
```

### React Example: Full Dashboard

```tsx
import { useEffect, useState } from "react";
import axios from "axios";

interface UsageData {
  subscriptionId: number;
  plan: {
    id: number;
    name: string;
    monthlyPriceUsd: number;
    maxAiCredits: number;
    maxStorageMb: number;
  };
  usage: {
    usedCredits: number;
    remainingCredits: number;
    usedStorageMb: number;
    remainingStorageMb: number;
    creditsPercentage: number;
    storagePercentage: number;
  };
}

function UsageDashboard() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.get("/api/billing/usage", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsage(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load usage data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading usage data...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!usage) return <div>No subscription found</div>;

  const { plan, usage: metrics } = usage;

  return (
    <div className="usage-dashboard">
      <h1>Usage & Billing</h1>
      <div className="plan-info">
        <h2>{plan.name}</h2>
        <p>${plan.monthlyPriceUsd}/month</p>
      </div>

      {/* Credits Section */}
      <div className="usage-card">
        <div className="card-header">
          <h3>🎨 AI Credits</h3>
          <span className="badge">
            {metrics.usedCredits} / {plan.maxAiCredits}
          </span>
        </div>

        <div className="progress-container">
          <div
            className="progress-bar"
            style={{
              width: `${metrics.creditsPercentage}%`,
              backgroundColor:
                metrics.creditsPercentage > 80 ? "#ef4444" : "#3b82f6",
            }}
          />
        </div>

        <div className="card-footer">
          <span>{metrics.remainingCredits} credits remaining</span>
          <span>{metrics.creditsPercentage.toFixed(1)}% used</span>
        </div>

        {metrics.creditsPercentage > 80 && (
          <div className="warning">
            ⚠️ You're running low on credits. Consider upgrading your plan.
          </div>
        )}
      </div>

      {/* Storage Section */}
      <div className="usage-card">
        <div className="card-header">
          <h3>💾 Storage</h3>
          <span className="badge">
            {metrics.usedStorageMb.toFixed(2)} MB / {plan.maxStorageMb} MB
          </span>
        </div>

        <div className="progress-container">
          <div
            className="progress-bar"
            style={{
              width: `${metrics.storagePercentage}%`,
              backgroundColor:
                metrics.storagePercentage > 80 ? "#ef4444" : "#10b981",
            }}
          />
        </div>

        <div className="card-footer">
          <span>{metrics.remainingStorageMb.toFixed(2)} MB available</span>
          <span>{metrics.storagePercentage.toFixed(1)}% used</span>
        </div>

        {metrics.storagePercentage > 80 && (
          <div className="warning">
            ⚠️ Storage almost full. Delete unused images or upgrade your plan.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="actions">
        <button onClick={() => (window.location.href = "/billing/upgrade")}>
          Upgrade Plan
        </button>
        <button onClick={fetchUsage}>Refresh</button>
      </div>
    </div>
  );
}

export default UsageDashboard;
```

### Vue 3 Example

```vue
<template>
  <div class="usage-dashboard">
    <h1>Usage & Billing</h1>

    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else-if="usage" class="usage-content">
      <div class="plan-badge">{{ usage.plan.name }}</div>

      <!-- Credits Card -->
      <div class="metric-card">
        <h3>🎨 AI Credits</h3>
        <div class="metric-value">
          {{ usage.usage.usedCredits }} / {{ usage.plan.maxAiCredits }}
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{
              width: usage.usage.creditsPercentage + '%',
              backgroundColor:
                usage.usage.creditsPercentage > 80 ? '#ef4444' : '#3b82f6',
            }"
          />
        </div>
        <p>{{ usage.usage.remainingCredits }} credits remaining</p>
      </div>

      <!-- Storage Card -->
      <div class="metric-card">
        <h3>💾 Storage</h3>
        <div class="metric-value">
          {{ usage.usage.usedStorageMb.toFixed(2) }} MB /
          {{ usage.plan.maxStorageMb }} MB
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{
              width: usage.usage.storagePercentage + '%',
              backgroundColor:
                usage.usage.storagePercentage > 80 ? '#ef4444' : '#10b981',
            }"
          />
        </div>
        <p>{{ usage.usage.remainingStorageMb.toFixed(2) }} MB available</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import axios from "axios";

interface UsageData {
  subscriptionId: number;
  plan: {
    name: string;
    maxAiCredits: number;
    maxStorageMb: number;
  };
  usage: {
    usedCredits: number;
    remainingCredits: number;
    usedStorageMb: number;
    remainingStorageMb: number;
    creditsPercentage: number;
    storagePercentage: number;
  };
}

const usage = ref<UsageData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(() => {
  fetchUsage();
});

const fetchUsage = async () => {
  try {
    loading.value = true;
    const token = localStorage.getItem("authToken");
    const response = await axios.get("/api/billing/usage", {
      headers: { Authorization: `Bearer ${token}` },
    });
    usage.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.error || "Failed to load usage";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.usage-dashboard {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-bar {
  width: 100%;
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-fill {
  height: 100%;
  transition:
    width 0.3s ease,
    background-color 0.3s ease;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0.5rem 0;
}
</style>
```

---

## Quota Enforcement

### Upload Quota Check

The backend automatically checks storage quota **before** allowing uploads:

#### Single Image Upload

```typescript
// Frontend code
async function uploadImage(projectId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("label", file.name);

  try {
    const response = await axios.post(
      `/api/projects/${projectId}/images/upload`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data.image;
  } catch (error: any) {
    if (error.response?.status === 402) {
      // Storage quota exceeded
      const quota = error.response.data;
      throw new Error(
        `Storage quota exceeded. Using ${quota.current.toFixed(2)} MB of ${quota.max} MB. ` +
          `This file (${quota.required.toFixed(2)} MB) exceeds your remaining ${quota.remaining.toFixed(2)} MB.`,
      );
    }
    throw error;
  }
}
```

#### Error Response (402 Payment Required)

```json
{
  "error": "Storage quota exceeded",
  "current": 4985.34,
  "max": 5000,
  "required": 25.67,
  "remaining": 14.66
}
```

### Credits Quota Check

The backend checks credit availability **before** creating AI jobs:

```typescript
// Frontend code
async function createEnhancementJob(projectId: number, imageIds: number[]) {
  try {
    const response = await axios.post(
      "/api/jobs/batch",
      {
        projectId,
        imageIds,
        type: "ENHANCEMENT",
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return response.data.jobs;
  } catch (error: any) {
    if (error.response?.status === 402) {
      const errorMsg = error.response.data.error;

      if (errorMsg === "INSUFFICIENT_CREDITS") {
        throw new Error(
          "Not enough AI credits to process these images. Please upgrade your plan or wait for your monthly reset.",
        );
      }

      if (errorMsg === "NO_ACTIVE_SUBSCRIPTION") {
        throw new Error("You need an active subscription to use AI features.");
      }
    }
    throw error;
  }
}
```

---

## Frontend Examples

### Pre-Upload Validation

Show quota status **before** letting users select files:

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

function ImageUploader({ projectId }: { projectId: number }) {
  const [usage, setUsage] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Fetch usage on mount
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get('/api/billing/usage', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsage(response.data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (!usage) {
      alert('Loading usage data...');
      return;
    }

    // Calculate total size
    const totalSizeMb = files.reduce((sum, file) => sum + (file.size / (1024 * 1024)), 0);

    // Check if it exceeds remaining quota
    if (totalSizeMb > usage.usage.remainingStorageMb) {
      alert(
        `Cannot upload: Files total ${totalSizeMb.toFixed(2)} MB, ` +
        `but you only have ${usage.usage.remainingStorageMb.toFixed(2)} MB remaining. ` +
        `Please select fewer files or upgrade your plan.`
      );
      return;
    }

    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        `/api/projects/${projectId}/images/upload-multiple`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      alert('Upload successful!');
      setSelectedFiles([]);

      // Refresh usage data
      await fetchUsage();
    } catch (error: any) {
      if (error.response?.status === 402) {
        alert(`Upload failed: ${error.response.data.error}`);
      } else {
        alert('Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  if (!usage) return <div>Loading...</div>;

  return (
    <div className="uploader">
      <div className="quota-status">
        <p>Storage: {usage.usage.usedStorageMb.toFixed(2)} / {usage.plan.maxStorageMb} MB</p>
        <p>Available: {usage.usage.remainingStorageMb.toFixed(2)} MB</p>
      </div>

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading || usage.usage.remainingStorageMb < 1}
      />

      {selectedFiles.length > 0 && (
        <div>
          <p>{selectedFiles.length} files selected</p>
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      {usage.usage.storagePercentage > 90 && (
        <div className="warning">
          ⚠️ Storage almost full! Consider upgrading or deleting old files.
        </div>
      )}
    </div>
  );
}
```

### Real-Time Usage Updates

Update usage display after operations:

```typescript
function useUsageTracking() {
  const [usage, setUsage] = useState<any>(null);

  const fetchUsage = async () => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get('/api/billing/usage', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsage(response.data);
  };

  useEffect(() => {
    fetchUsage();

    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000);

    return () => clearInterval(interval);
  }, []);

  return { usage, refreshUsage: fetchUsage };
}

// Usage in component
function MyComponent() {
  const { usage, refreshUsage } = useUsageTracking();

  const handleJobComplete = async () => {
    // After job completes, refresh usage
    await refreshUsage();

    // Show notification
    toast.success('Job completed! Credits updated.');
  };

  return (
    <div>
      {usage && (
        <div className="usage-badge">
          {usage.usage.remainingCredits} credits left
        </div>
      )}
    </div>
  );
}
```

---

## Error Handling

### Common Error Codes

| Status | Error Code               | Meaning                           | Action                                |
| ------ | ------------------------ | --------------------------------- | ------------------------------------- |
| `402`  | `Storage quota exceeded` | Upload would exceed storage limit | Show upgrade prompt or delete files   |
| `402`  | `INSUFFICIENT_CREDITS`   | Not enough credits for AI job     | Show upgrade prompt or wait for reset |
| `402`  | `NO_ACTIVE_SUBSCRIPTION` | User has no active subscription   | Redirect to billing/subscription page |
| `401`  | `Unauthorized`           | Invalid or missing JWT token      | Redirect to login                     |

### Error Handling Template

```typescript
async function handleApiCall<T>(
  apiCall: () => Promise<T>,
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await apiCall();
    return { data };
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;

    switch (status) {
      case 401:
        // Unauthorized - redirect to login
        window.location.href = "/login";
        return { error: "Please log in to continue" };

      case 402:
        // Payment required - quota exceeded
        if (errorData.error === "Storage quota exceeded") {
          return {
            error:
              `Storage full: ${errorData.current.toFixed(2)} / ${errorData.max} MB used. ` +
              `Need ${errorData.required.toFixed(2)} MB more.`,
          };
        }
        if (errorData.error === "INSUFFICIENT_CREDITS") {
          return { error: "Not enough AI credits. Please upgrade your plan." };
        }
        if (errorData.error === "NO_ACTIVE_SUBSCRIPTION") {
          return { error: "Please subscribe to a plan to continue." };
        }
        return { error: errorData.error || "Payment required" };

      case 404:
        return { error: "Resource not found" };

      case 500:
        return { error: "Server error. Please try again later." };

      default:
        return { error: "An unexpected error occurred" };
    }
  }
}

// Usage
const { data, error } = await handleApiCall(() =>
  axios.post("/api/jobs", jobData, { headers }),
);

if (error) {
  showErrorToast(error);
} else {
  showSuccessToast("Job created!");
}
```

---

## Best Practices

### 1. **Show Usage Before Actions**

Always display current usage **before** allowing resource-intensive operations:

```typescript
// ✅ Good
function EnhanceImagesButton({ imageIds }: { imageIds: number[] }) {
  const { usage } = useUsageTracking();
  const estimatedCredits = imageIds.length * 10; // Rough estimate

  if (!usage) return <button disabled>Loading...</button>;

  const hasEnoughCredits = usage.usage.remainingCredits >= estimatedCredits;

  return (
    <div>
      <p>This will use ~{estimatedCredits} credits</p>
      <p>You have {usage.usage.remainingCredits} credits available</p>
      <button
        onClick={handleEnhance}
        disabled={!hasEnoughCredits}
      >
        {hasEnoughCredits ? 'Enhance Images' : 'Insufficient Credits'}
      </button>
    </div>
  );
}

// ❌ Bad
function EnhanceImagesButton({ imageIds }: { imageIds: number[] }) {
  // No usage check - user discovers quota issue after clicking
  return <button onClick={handleEnhance}>Enhance Images</button>;
}
```

### 2. **Pre-Validate File Sizes**

Check file sizes client-side **before** attempting upload:

```typescript
function validateFiles(
  files: File[],
  maxTotalMb: number,
): { valid: boolean; error?: string } {
  const totalSizeMb = files.reduce((sum, f) => sum + f.size / (1024 * 1024), 0);

  if (totalSizeMb > maxTotalMb) {
    return {
      valid: false,
      error: `Files total ${totalSizeMb.toFixed(2)} MB, but only ${maxTotalMb.toFixed(2)} MB available`,
    };
  }

  return { valid: true };
}
```

### 3. **Refresh Usage After Operations**

Update usage display immediately after operations that consume resources:

```typescript
const { usage, refreshUsage } = useUsageTracking();

const handleUpload = async () => {
  await uploadImages();
  await refreshUsage(); // ← Refresh immediately
};

const handleJobComplete = async () => {
  // Poll job status
  const job = await pollJobStatus(jobId);

  if (job.status === "COMPLETED") {
    await refreshUsage(); // ← Refresh when job completes
  }
};
```

### 4. **Show Warning Thresholds**

Alert users when approaching limits:

```typescript
function UsageWarning({ usage }: { usage: any }) {
  const showCreditsWarning = usage.usage.creditsPercentage > 80;
  const showStorageWarning = usage.usage.storagePercentage > 80;

  if (!showCreditsWarning && !showStorageWarning) return null;

  return (
    <div className="warnings">
      {showCreditsWarning && (
        <div className="warning-badge">
          ⚠️ {usage.usage.remainingCredits} credits remaining ({usage.usage.creditsPercentage.toFixed(1)}% used)
        </div>
      )}

      {showStorageWarning && (
        <div className="warning-badge">
          ⚠️ {usage.usage.remainingStorageMb.toFixed(2)} MB storage remaining ({usage.usage.storagePercentage.toFixed(1)}% used)
        </div>
      )}

      <button onClick={() => window.location.href = '/billing/upgrade'}>
        Upgrade Plan
      </button>
    </div>
  );
}
```

### 5. **Provide Upgrade Prompts**

Make it easy for users to upgrade when hitting limits:

```typescript
function QuotaExceededModal({ type, usage }: { type: 'credits' | 'storage', usage: any }) {
  return (
    <Modal>
      <h2>
        {type === 'credits' ? '🎨 Out of AI Credits' : '💾 Storage Full'}
      </h2>

      <p>
        {type === 'credits'
          ? `You've used all ${usage.plan.maxAiCredits} credits for this month.`
          : `You've used all ${usage.plan.maxStorageMb} MB of storage.`
        }
      </p>

      <div className="options">
        <button onClick={() => window.location.href = '/billing/upgrade'}>
          Upgrade to Pro Plan
        </button>

        {type === 'credits' && (
          <p>Or wait for your monthly reset on {getNextResetDate()}</p>
        )}

        {type === 'storage' && (
          <p>Or delete unused images to free up space</p>
        )}
      </div>
    </Modal>
  );
}
```

### 6. **Cache Usage Data**

Avoid excessive API calls by caching usage data:

```typescript
// Use React Query or similar
import { useQuery } from "@tanstack/react-query";

function useUsage() {
  return useQuery({
    queryKey: ["usage"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const response = await axios.get("/api/billing/usage", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}
```

---

## Summary

### Quick Reference

| Need                         | Endpoint                       | Response Time          |
| ---------------------------- | ------------------------------ | ---------------------- |
| **Current usage summary**    | `GET /billing/usage`           | < 50ms (direct fields) |
| **Detailed credit history**  | `GET /billing/credit-history`  | < 200ms                |
| **Detailed storage history** | `GET /billing/storage-history` | < 200ms                |

### Key Points

✅ **Real-time tracking** - Usage updates immediately after operations  
✅ **Fast dashboard queries** - No aggregations needed  
✅ **Quota enforcement** - Prevents operations exceeding limits  
✅ **Client-side validation** - Check file sizes before upload  
✅ **Clear error messages** - Tell users exactly what's wrong and how to fix it  
✅ **Upgrade prompts** - Make it easy to increase limits

### Performance

- **Usage summary**: < 50ms (single query with direct fields)
- **Credit/storage history**: < 200ms (paginated queries)
- **No aggregations**: All totals stored directly on Subscription

---

**Questions or issues?** Contact the backend team or check the [GitHub Wiki](https://github.com/your-org/aipix-backend/wiki).
