# API Testing Examples - Job Queue System

## Environment Setup

```bash
# Set your test token
export TOKEN="your-jwt-token-here"
export BASE_URL="http://localhost:4000/api"
```

---

## 1. Create a Single Job

### Photo Enhancement

```bash
curl -X POST $BASE_URL/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageId": 5,
    "type": "ENHANCEMENT",
    "priority": 0,
    "parameters": {
      "brightness": 1.2,
      "contrast": 1.1,
      "sharpen": true
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "job": {
    "id": 123,
    "type": "ENHANCEMENT",
    "status": "PENDING",
    "priority": 0,
    "queuePosition": 3,
    "estimatedCredits": 10,
    "creditsCharged": null,
    "processingTimeMs": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "startedAt": null,
    "completedAt": null,
    "resultUrl": null,
    "errorMessage": null
  }
}
```

### Virtual Staging

```bash
curl -X POST $BASE_URL/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageId": 6,
    "type": "VIRTUAL_STAGING",
    "priority": 1,
    "parameters": {
      "style": "modern",
      "roomType": "living_room"
    }
  }'
```

### Background Removal

```bash
curl -X POST $BASE_URL/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageId": 7,
    "type": "BACKGROUND_REMOVAL"
  }'
```

### Sky Replacement

```bash
curl -X POST $BASE_URL/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageId": 8,
    "type": "SKY_REPLACEMENT",
    "parameters": {
      "skyType": "clear_blue"
    }
  }'
```

---

## 2. Batch Create Jobs

```bash
curl -X POST $BASE_URL/jobs/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageIds": [5, 6, 7, 8, 9],
    "type": "ENHANCEMENT",
    "priority": 0,
    "parameters": {
      "brightness": 1.1,
      "contrast": 1.05
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "jobs": [
    { "id": 123, "type": "ENHANCEMENT", "status": "PENDING", ... },
    { "id": 124, "type": "ENHANCEMENT", "status": "PENDING", ... },
    { "id": 125, "type": "ENHANCEMENT", "status": "PENDING", ... },
    { "id": 126, "type": "ENHANCEMENT", "status": "PENDING", ... },
    { "id": 127, "type": "ENHANCEMENT", "status": "PENDING", ... }
  ],
  "count": 5
}
```

---

## 3. Get Job by ID

```bash
curl $BASE_URL/jobs/123 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Pending):**

```json
{
  "success": true,
  "job": {
    "id": 123,
    "type": "ENHANCEMENT",
    "status": "PENDING",
    "queuePosition": 2,
    "priority": 0,
    "estimatedCredits": 10,
    "creditsCharged": null,
    "processingTimeMs": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "startedAt": null,
    "completedAt": null,
    "resultUrl": null,
    "errorMessage": null
  }
}
```

**Response (Running):**

```json
{
  "success": true,
  "job": {
    "id": 123,
    "type": "ENHANCEMENT",
    "status": "RUNNING",
    "queuePosition": null,
    "priority": 0,
    "estimatedCredits": 10,
    "creditsCharged": null,
    "processingTimeMs": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "startedAt": "2024-01-15T10:05:00Z",
    "completedAt": null,
    "resultUrl": null,
    "errorMessage": null
  }
}
```

**Response (Completed):**

```json
{
  "success": true,
  "job": {
    "id": 123,
    "type": "ENHANCEMENT",
    "status": "COMPLETED",
    "queuePosition": null,
    "priority": 0,
    "estimatedCredits": 10,
    "creditsCharged": 4,
    "processingTimeMs": 15500,
    "createdAt": "2024-01-15T10:00:00Z",
    "startedAt": "2024-01-15T10:05:00Z",
    "completedAt": "2024-01-15T10:05:15Z",
    "resultUrl": "https://s3.amazonaws.com/aipix-uploads/enhanced/image-123.jpg",
    "errorMessage": null
  }
}
```

**Response (Failed):**

```json
{
  "success": true,
  "job": {
    "id": 123,
    "type": "ENHANCEMENT",
    "status": "FAILED",
    "queuePosition": null,
    "priority": 0,
    "estimatedCredits": 10,
    "creditsCharged": null,
    "processingTimeMs": 2500,
    "createdAt": "2024-01-15T10:00:00Z",
    "startedAt": "2024-01-15T10:05:00Z",
    "completedAt": "2024-01-15T10:05:02Z",
    "resultUrl": null,
    "errorMessage": "AI service is not available"
  }
}
```

---

## 4. List User's Jobs

### All Jobs

```bash
curl "$BASE_URL/jobs?limit=20&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

### Filter by Status

```bash
# Pending jobs
curl "$BASE_URL/jobs?status=PENDING&limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Completed jobs
curl "$BASE_URL/jobs?status=COMPLETED&limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Failed jobs
curl "$BASE_URL/jobs?status=FAILED&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "jobs": [
    {
      "id": 125,
      "type": "ENHANCEMENT",
      "status": "RUNNING",
      "queuePosition": null,
      "priority": 0,
      "estimatedCredits": 10,
      "creditsCharged": null,
      "processingTimeMs": null,
      "createdAt": "2024-01-15T10:10:00Z",
      "startedAt": "2024-01-15T10:15:00Z",
      "completedAt": null,
      "resultUrl": null,
      "errorMessage": null
    },
    {
      "id": 124,
      "type": "VIRTUAL_STAGING",
      "status": "COMPLETED",
      "queuePosition": null,
      "priority": 1,
      "estimatedCredits": 10,
      "creditsCharged": 6,
      "processingTimeMs": 28300,
      "createdAt": "2024-01-15T10:05:00Z",
      "startedAt": "2024-01-15T10:08:00Z",
      "completedAt": "2024-01-15T10:08:28Z",
      "resultUrl": "https://s3.amazonaws.com/.../staged-124.jpg",
      "errorMessage": null
    }
  ],
  "count": 2
}
```

---

## 5. Cancel a Job

```bash
curl -X POST $BASE_URL/jobs/123/cancel \
  -H "Authorization: Bearer $TOKEN"
```

**Success Response:**

```json
{
  "success": true,
  "message": "Job cancelled successfully"
}
```

**Error (Already Running):**

```json
{
  "error": "JOB_CANNOT_BE_CANCELLED",
  "message": "Only pending jobs can be cancelled"
}
```

**Error (Not Found):**

```json
{
  "error": "JOB_NOT_FOUND",
  "message": "Job not found or you do not have access"
}
```

---

## 6. Get Queue Status (Admin Only)

```bash
curl $BASE_URL/jobs/queue/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "queue": {
    "pending": 15,
    "running": 1,
    "completed": 234,
    "failed": 3,
    "isProcessing": true,
    "currentJobId": 125,
    "averageProcessingTimeMs": 12500
  }
}
```

---

## 7. Check Credits Before Creating Job

```bash
curl $BASE_URL/billing/me/usage \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**

```json
{
  "usage": {
    "subscriptionId": 1,
    "plan": {
      "id": 1,
      "name": "Professional",
      "monthlyPriceUsd": "49.00",
      "maxAiCredits": 500,
      "maxStorageMb": 10240
    },
    "usage": {
      "usedCredits": 87,
      "remainingCredits": 413
    }
  }
}
```

---

## 8. Error Responses

### Insufficient Credits

```bash
curl -X POST $BASE_URL/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "projectId": 1, "imageId": 5, "type": "ENHANCEMENT" }'
```

**Response: 402 Payment Required**

```json
{
  "error": "INSUFFICIENT_CREDITS",
  "message": "Not enough credits to process this job"
}
```

### No Active Subscription

**Response: 402 Payment Required**

```json
{
  "error": "NO_ACTIVE_SUBSCRIPTION",
  "message": "You need an active subscription to create jobs"
}
```

### Invalid Job Type

```bash
curl -X POST $BASE_URL/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "projectId": 1, "imageId": 5, "type": "INVALID_TYPE" }'
```

**Response: 400 Bad Request**

```json
{
  "error": "INVALID_JOB_TYPE",
  "message": "Job type must be one of: ENHANCEMENT, VIRTUAL_STAGING, AD_GENERATION, BACKGROUND_REMOVAL, SKY_REPLACEMENT, HDR_PROCESSING"
}
```

### Image Not Found

**Response: 404 Not Found**

```json
{
  "error": "IMAGE_NOT_FOUND",
  "message": "Image not found or you do not have access"
}
```

---

## 9. Polling Pattern (Frontend)

### JavaScript Example

```javascript
async function createAndWaitForJob(projectId, imageId, type) {
  // 1. Create job
  const createResponse = await fetch("/api/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectId, imageId, type }),
  });

  const { job } = await createResponse.json();
  console.log(`Job ${job.id} created, position: ${job.queuePosition}`);

  // 2. Poll for completion
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      const statusResponse = await fetch(`/api/jobs/${job.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { job: updatedJob } = await statusResponse.json();

      if (updatedJob.status === "COMPLETED") {
        clearInterval(pollInterval);
        console.log("✅ Job completed!", updatedJob.resultUrl);
        resolve(updatedJob);
      } else if (updatedJob.status === "FAILED") {
        clearInterval(pollInterval);
        console.error("❌ Job failed:", updatedJob.errorMessage);
        reject(new Error(updatedJob.errorMessage));
      } else {
        console.log(`⏳ Job ${updatedJob.status}...`);
      }
    }, 5000); // Check every 5 seconds
  });
}

// Usage
createAndWaitForJob(1, 5, "ENHANCEMENT")
  .then((job) => console.log("Done!", job))
  .catch((err) => console.error("Error:", err));
```

### Python Example

```python
import requests
import time

BASE_URL = "http://localhost:4000/api"
TOKEN = "your-token-here"

def create_and_wait_for_job(project_id, image_id, job_type):
    # 1. Create job
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        f"{BASE_URL}/jobs",
        json={
            "projectId": project_id,
            "imageId": image_id,
            "type": job_type
        },
        headers=headers
    )

    job = response.json()["job"]
    job_id = job["id"]
    print(f"Job {job_id} created, position: {job.get('queuePosition')}")

    # 2. Poll for completion
    while True:
        response = requests.get(
            f"{BASE_URL}/jobs/{job_id}",
            headers=headers
        )

        job = response.json()["job"]
        status = job["status"]

        if status == "COMPLETED":
            print(f"✅ Job completed! Result: {job['resultUrl']}")
            return job
        elif status == "FAILED":
            print(f"❌ Job failed: {job['errorMessage']}")
            raise Exception(job["errorMessage"])
        else:
            print(f"⏳ Job {status}...")
            time.sleep(5)  # Wait 5 seconds before checking again

# Usage
try:
    job = create_and_wait_for_job(1, 5, "ENHANCEMENT")
    print("Done!", job)
except Exception as e:
    print("Error:", e)
```

---

## 10. Batch Processing Pattern

```bash
# Step 1: Get all images in project
curl $BASE_URL/projects/1/images \
  -H "Authorization: Bearer $TOKEN"

# Extract image IDs: [5, 6, 7, 8, 9]

# Step 2: Create batch jobs
curl -X POST $BASE_URL/jobs/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageIds": [5, 6, 7, 8, 9],
    "type": "ENHANCEMENT"
  }'

# Step 3: Monitor all jobs
curl "$BASE_URL/jobs?status=PENDING" \
  -H "Authorization: Bearer $TOKEN"

# Step 4: Wait for all to complete
curl "$BASE_URL/jobs?status=COMPLETED&limit=100" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 11. Testing with cURL Scripts

### test-job-creation.sh

```bash
#!/bin/bash

TOKEN="your-token-here"
BASE_URL="http://localhost:4000/api"

echo "Creating enhancement job..."
RESPONSE=$(curl -s -X POST $BASE_URL/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageId": 5,
    "type": "ENHANCEMENT"
  }')

echo $RESPONSE | jq '.'

JOB_ID=$(echo $RESPONSE | jq -r '.job.id')
echo "Job ID: $JOB_ID"

echo "Checking job status every 5 seconds..."
while true; do
  STATUS=$(curl -s $BASE_URL/jobs/$JOB_ID \
    -H "Authorization: Bearer $TOKEN" | jq -r '.job.status')

  echo "Status: $STATUS"

  if [ "$STATUS" == "COMPLETED" ] || [ "$STATUS" == "FAILED" ]; then
    break
  fi

  sleep 5
done

echo "Final result:"
curl -s $BASE_URL/jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### test-batch-jobs.sh

```bash
#!/bin/bash

TOKEN="your-token-here"
BASE_URL="http://localhost:4000/api"

echo "Creating batch jobs..."
curl -X POST $BASE_URL/jobs/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageIds": [5, 6, 7, 8],
    "type": "ENHANCEMENT"
  }' | jq '.'

echo "Checking queue status..."
curl $BASE_URL/jobs/queue/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

---

## 12. WebSocket Integration (Future)

```javascript
// Frontend: Real-time job updates via WebSocket
const ws = new WebSocket("ws://localhost:4000");

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "subscribe",
      channel: "jobs",
      token: token,
    }),
  );
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "job:started") {
    console.log(`Job ${data.jobId} started processing`);
  } else if (data.type === "job:completed") {
    console.log(`Job ${data.jobId} completed! Credits: ${data.creditsCharged}`);
    // Update UI with result
  } else if (data.type === "job:failed") {
    console.error(`Job ${data.jobId} failed: ${data.errorMessage}`);
  }
};
```

---

## 13. Postman Collection

Import this into Postman:

```json
{
  "info": {
    "name": "AIPIX Job Queue API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:4000/api"
    },
    {
      "key": "token",
      "value": "your-token-here"
    }
  ],
  "item": [
    {
      "name": "Create Job",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"projectId\": 1,\n  \"imageId\": 5,\n  \"type\": \"ENHANCEMENT\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "{{baseUrl}}/jobs",
          "host": ["{{baseUrl}}"],
          "path": ["jobs"]
        }
      }
    },
    {
      "name": "Get Job Status",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/jobs/:jobId",
          "host": ["{{baseUrl}}"],
          "path": ["jobs", ":jobId"],
          "variable": [
            {
              "key": "jobId",
              "value": "123"
            }
          ]
        }
      }
    }
  ]
}
```

---

## Summary

- ✅ **Create jobs**: Single or batch
- ✅ **Monitor jobs**: Poll for status updates
- ✅ **Cancel jobs**: Cancel pending jobs
- ✅ **Check credits**: Before creating jobs
- ✅ **Admin monitoring**: Queue status and stats

All endpoints are **role-protected** (LISTER or ADMIN required).
