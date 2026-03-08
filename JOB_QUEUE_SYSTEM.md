# Job Queue & Credits-Based Billing System

## Overview

AIPIX implements a sophisticated job queue system for processing AI enhancement requests with a credits-based billing model. All AI processing jobs are queued and processed sequentially, one at a time, with credits charged based on actual processing time.

---

## Architecture

### Components

1. **Job Queue Service** (`src/services/job-queue.service.ts`)
   - Manages sequential job processing
   - Single job processed at a time (no concurrency)
   - Automatic retry for failed jobs
   - Priority-based queue ordering

2. **AI Service Client** (`src/lib/ai-service-client.ts`)
   - Communicates with Python FastAPI backend
   - Handles different job types (enhancement, staging, etc.)
   - Error handling and retries

3. **Jobs API** (`src/modules/jobs/`)
   - REST API for job management
   - Create, monitor, and cancel jobs
   - Queue status monitoring

4. **Credits System**
   - Time-based billing (credits per second)
   - Different rates for different job types
   - Real-time credit tracking

---

## Database Schema

### Job Model

```prisma
model Job {
  id           Int       @id @default(autoincrement())
  userId       Int
  projectId    Int
  imageId      Int

  // Job Configuration
  type         JobType   @default(ENHANCEMENT)
  status       JobStatus @default(PENDING)
  priority     Int       @default(0)

  // Queue Management
  queuedAt     DateTime?
  startedAt    DateTime?
  completedAt  DateTime?

  // Processing Tracking
  processingTimeMs Int?
  retryCount       Int    @default(0)
  maxRetries       Int    @default(3)

  // Cost Tracking
  creditsCharged   Int?
  estimatedCredits Int?

  // Results & Errors
  resultUrl    String?
  errorMessage String?
  errorCode    String?

  // Metadata
  inputParameters  Json?
  outputMetadata   Json?

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

### Job Types

```prisma
enum JobType {
  ENHANCEMENT        // Photo enhancement
  VIRTUAL_STAGING    // Virtual staging
  AD_GENERATION      // Ad copy generation
  BACKGROUND_REMOVAL // Remove background
  SKY_REPLACEMENT    // Replace sky
  HDR_PROCESSING     // HDR enhancement
}
```

### Job Statuses

```prisma
enum JobStatus {
  PENDING    // Waiting in queue
  QUEUED     // Picked up by processor
  RUNNING    // Being processed
  COMPLETED  // Successfully finished
  FAILED     // Processing failed
  CANCELLED  // Cancelled by user
}
```

### Plan Pricing

```prisma
model Plan {
  // Credits per second of processing
  enhancementCreditsPerSecond    Decimal @default(0.1)
  virtualStagingCreditsPerSecond Decimal @default(0.2)
  adGenerationCreditsPerSecond   Decimal @default(0.05)
}
```

---

## How It Works

### 1. Job Creation Flow

```
User creates job
    ↓
Check subscription & credits
    ↓
Verify image ownership
    ↓
Create job (PENDING status)
    ↓
Add to queue
    ↓
Return job ID to user
```

### 2. Job Processing Flow

```
Queue picks next job (by priority, then FIFO)
    ↓
Update status: QUEUED
    ↓
Verify credits still available
    ↓
Update status: RUNNING
    ↓
Send to Python AI service
    ↓
Wait for processing
    ↓
Calculate credits (time × rate)
    ↓
Charge credits & update job
    ↓
Create ImageVersion with result
    ↓
Update status: COMPLETED
    ↓
Process next job
```

### 3. Credits Calculation

```typescript
processingTimeSeconds = processingTimeMs / 1000
creditsCharged = ceil(processingTimeSeconds × creditsPerSecond)
creditsCharged = max(1, creditsCharged) // Minimum 1 credit
```

**Example:**

- Job type: VIRTUAL_STAGING
- Rate: 0.2 credits/second
- Processing time: 15.5 seconds
- Credits charged: ceil(15.5 × 0.2) = **4 credits**

---

## API Endpoints

### Create Job

```http
POST /jobs
Authorization: Bearer <token>
Requires: LISTER or ADMIN role

{
  "projectId": 1,
  "imageId": 5,
  "type": "ENHANCEMENT",
  "priority": 0,
  "estimatedCredits": 10,
  "parameters": {
    "brightness": 1.2,
    "contrast": 1.1
  }
}

Response: 201
{
  "success": true,
  "job": {
    "id": 123,
    "type": "ENHANCEMENT",
    "status": "PENDING",
    "priority": 0,
    "estimatedCredits": 10,
    "queuePosition": 5,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### Batch Create Jobs

```http
POST /jobs/batch
Authorization: Bearer <token>
Requires: LISTER or ADMIN role

{
  "projectId": 1,
  "imageIds": [5, 6, 7, 8],
  "type": "ENHANCEMENT",
  "priority": 1,
  "parameters": {
    "brightness": 1.2
  }
}

Response: 201
{
  "success": true,
  "jobs": [...],
  "count": 4
}
```

### Get User's Jobs

```http
GET /jobs?status=PENDING&limit=20&offset=0
Authorization: Bearer <token>
Requires: LISTER or ADMIN role

Response: 200
{
  "success": true,
  "jobs": [
    {
      "id": 123,
      "type": "ENHANCEMENT",
      "status": "RUNNING",
      "priority": 0,
      "estimatedCredits": 10,
      "creditsCharged": null,
      "processingTimeMs": null,
      "queuePosition": 1,
      "createdAt": "2024-01-15T10:00:00Z",
      "startedAt": "2024-01-15T10:05:00Z",
      "completedAt": null,
      "resultUrl": null
    }
  ],
  "count": 1
}
```

### Get Job by ID

```http
GET /jobs/:id
Authorization: Bearer <token>
Requires: LISTER or ADMIN role

Response: 200
{
  "success": true,
  "job": {
    "id": 123,
    "type": "ENHANCEMENT",
    "status": "COMPLETED",
    "creditsCharged": 4,
    "processingTimeMs": 15500,
    "resultUrl": "https://s3.../enhanced-image.jpg"
  }
}
```

### Cancel Job

```http
POST /jobs/:id/cancel
Authorization: Bearer <token>
Requires: LISTER or ADMIN role

Response: 200
{
  "success": true,
  "message": "Job cancelled successfully"
}

Errors:
- 400: Job cannot be cancelled (already running/completed)
- 404: Job not found
```

### Get Queue Status (Admin)

```http
GET /jobs/queue/status
Authorization: Bearer <token>
Requires: ADMIN role

Response: 200
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

## Job Queue Features

### 1. Sequential Processing

- **One job at a time** - No concurrency to avoid overwhelming AI service
- Predictable resource usage
- Easier error handling and debugging

### 2. Priority Queue

```typescript
// Jobs ordered by:
1. Priority (DESC) - Higher priority jobs first
2. Created date (ASC) - FIFO for same priority
```

**Priority Levels:**

- `0` - Normal (default)
- `1-10` - High priority (paid users, urgent jobs)
- `11+` - Critical (admin, system jobs)

### 3. Automatic Retry

```typescript
maxRetries: 3 (default)
retryableErrors: [
  'AI_SERVICE_TIMEOUT',
  'AI_SERVICE_UNAVAILABLE',
  'NETWORK_ERROR'
]
```

Failed jobs are automatically retried up to 3 times for transient errors.

### 4. Graceful Shutdown

```typescript
// Server handles SIGTERM/SIGINT
process.on("SIGTERM", async () => {
  await jobQueueService.stopProcessing();
  // Waits for current job to complete
  process.exit(0);
});
```

### 5. Real-time Events

```typescript
jobQueueService.on("job:started", (data) => {
  // Job started processing
  console.log(`Job ${data.jobId} started`);
});

jobQueueService.on("job:completed", (data) => {
  // Job completed successfully
  console.log(`Job ${data.jobId} charged ${data.creditsCharged} credits`);
});

jobQueueService.on("job:failed", (data) => {
  // Job failed
  console.error(`Job ${data.jobId} failed: ${data.errorMessage}`);
});
```

---

## Credits-Based Billing

### How Credits Work

1. **Monthly Allocation**: Each plan has `maxAiCredits` per month
2. **Real-time Deduction**: Credits deducted after job completion
3. **Time-based Pricing**: Different rates for different job types
4. **Usage Tracking**: All credit usage logged in `CreditUsage` table

### Credit Rates (Example)

| Job Type           | Credits/Second | Est. Cost (30s job) |
| ------------------ | -------------- | ------------------- |
| Enhancement        | 0.1            | 3 credits           |
| Virtual Staging    | 0.2            | 6 credits           |
| Ad Generation      | 0.05           | 2 credits           |
| Background Removal | 0.08           | 3 credits           |
| Sky Replacement    | 0.08           | 3 credits           |

### Check Available Credits

```http
GET /billing/me/usage
Authorization: Bearer <token>

Response: 200
{
  "usage": {
    "plan": {
      "name": "Professional",
      "maxAiCredits": 500
    },
    "usage": {
      "usedCredits": 87,
      "remainingCredits": 413
    }
  }
}
```

### Credit Insufficient Error

```http
POST /jobs
{
  "projectId": 1,
  "imageId": 5,
  "type": "ENHANCEMENT"
}

Response: 402
{
  "error": "INSUFFICIENT_CREDITS",
  "message": "Not enough credits to process this job"
}
```

---

## Python AI Service Integration

### Expected API Contract

The Node.js backend expects the Python FastAPI service to expose these endpoints:

#### 1. Photo Enhancement

```http
POST /api/v1/enhance
Content-Type: application/json

{
  "job_id": 123,
  "image_url": "https://s3.../image.jpg",
  "parameters": {
    "brightness": 1.2,
    "contrast": 1.1,
    "sharpen": true
  }
}

Response: 200
{
  "success": true,
  "job_id": 123,
  "result_url": "https://s3.../enhanced-image.jpg",
  "processing_time_ms": 15500,
  "metadata": {
    "model": "enhancement-v2",
    "confidence": 0.95
  }
}
```

#### 2. Virtual Staging

```http
POST /api/v1/virtual-staging
{
  "job_id": 124,
  "image_url": "https://s3.../room.jpg",
  "parameters": {
    "style": "modern",
    "room_type": "living_room"
  }
}

Response: 200
{
  "success": true,
  "job_id": 124,
  "result_url": "https://s3.../staged-room.jpg",
  "processing_time_ms": 28000,
  "metadata": {
    "furniture_added": ["sofa", "coffee_table", "lamp"],
    "style_applied": "modern"
  }
}
```

#### 3. Health Check

```http
GET /health

Response: 200
{
  "status": "healthy",
  "queue_length": 0,
  "average_processing_time_ms": 12500
}
```

### Environment Variables

```bash
# .env file
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your-secret-key-here
```

---

## Usage Examples

### Frontend Integration

```typescript
// Create enhancement job
const response = await fetch("/api/jobs", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    projectId: 1,
    imageId: 5,
    type: "ENHANCEMENT",
    parameters: {
      brightness: 1.2,
      contrast: 1.1,
    },
  }),
});

const { job } = await response.json();
console.log(`Job ${job.id} created, position in queue: ${job.queuePosition}`);

// Poll for job completion
const pollJob = async (jobId) => {
  const response = await fetch(`/api/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const { job } = await response.json();

  if (job.status === "COMPLETED") {
    console.log("Job completed!", job.resultUrl);
    return job;
  } else if (job.status === "FAILED") {
    console.error("Job failed:", job.errorMessage);
    return job;
  } else {
    // Still processing, check again in 5 seconds
    setTimeout(() => pollJob(jobId), 5000);
  }
};

pollJob(job.id);
```

### Batch Processing

```typescript
// Enhance all images in a project
const imageIds = [1, 2, 3, 4, 5];

const response = await fetch("/api/jobs/batch", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    projectId: 1,
    imageIds,
    type: "ENHANCEMENT",
    priority: 1,
  }),
});

const { jobs } = await response.json();
console.log(`Created ${jobs.length} jobs`);
```

---

## Error Handling

### Common Errors

| Error Code              | HTTP Status | Meaning               | Solution                         |
| ----------------------- | ----------- | --------------------- | -------------------------------- |
| NO_ACTIVE_SUBSCRIPTION  | 402         | No subscription found | Subscribe to a plan              |
| INSUFFICIENT_CREDITS    | 402         | Not enough credits    | Upgrade plan or wait for renewal |
| IMAGE_NOT_FOUND         | 404         | Image doesn't exist   | Check image ID                   |
| JOB_NOT_FOUND           | 404         | Job doesn't exist     | Check job ID                     |
| JOB_CANNOT_BE_CANCELLED | 400         | Job already running   | Can't cancel running jobs        |
| AI_SERVICE_UNAVAILABLE  | 500         | Python service down   | Check AI service status          |
| AI_SERVICE_TIMEOUT      | 500         | Request timed out     | Job will be retried              |

---

## Monitoring & Administration

### Queue Statistics

```bash
# Get queue status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:4000/api/jobs/queue/status
```

### Database Queries

```sql
-- Jobs in queue
SELECT COUNT(*) FROM "Job" WHERE status = 'PENDING';

-- Average processing time
SELECT AVG("processingTimeMs") FROM "Job" WHERE status = 'COMPLETED';

-- Failed jobs today
SELECT * FROM "Job"
WHERE status = 'FAILED'
  AND "createdAt" > NOW() - INTERVAL '1 day';

-- Total credits used today
SELECT SUM("creditsUsed") FROM "CreditUsage"
WHERE "createdAt" > NOW() - INTERVAL '1 day';
```

### Logs

```typescript
// Job queue logs
✅ Job 123 completed in 15500ms, charged 4 credits
❌ Job 124 failed: AI_SERVICE_TIMEOUT
🔄 Job 124 scheduled for retry
```

---

## Performance Considerations

### Throughput

- **Sequential processing**: 1 job at a time
- **Average job time**: 10-30 seconds
- **Throughput**: ~2-6 jobs/minute

### Scaling

For higher throughput, consider:

1. Multiple worker processes
2. Distributed queue (Redis, RabbitMQ)
3. Horizontal scaling of Python AI service

### Cost Optimization

- Batch similar jobs together
- Use priority wisely (reserve high priority for urgent jobs)
- Set realistic `estimatedCredits` to prevent overspending

---

## Migration

Run the migration to apply schema changes:

```bash
npx prisma migrate dev --name add_job_queue_system
npx prisma generate
```

---

## Testing

### Test Job Creation

```bash
# Create test job
curl -X POST http://localhost:4000/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageId": 5,
    "type": "ENHANCEMENT",
    "priority": 0
  }'
```

### Test Queue Status

```bash
curl http://localhost:4000/api/jobs/queue/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Next Steps

1. ✅ Run database migration
2. ✅ Set up Python AI service (separate project)
3. ✅ Configure `AI_SERVICE_URL` in .env
4. ✅ Test job creation and processing
5. ✅ Implement frontend job monitoring
6. ✅ Set up WebSocket for real-time job updates (optional)
7. ✅ Add job result notifications (email/push)
