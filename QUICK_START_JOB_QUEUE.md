# Job Queue System - Quick Start Guide

## 🚀 What's New

Your AIPIX backend now has a complete **job queue system** with **credits-based billing** for AI processing!

### Key Features

✅ **Sequential Job Processing** - One job at a time, no concurrency issues  
✅ **Credits-Based Billing** - Pay only for actual processing time  
✅ **Priority Queue** - Important jobs get processed first  
✅ **Automatic Retry** - Failed jobs automatically retry (3 attempts)  
✅ **Real-time Tracking** - Monitor job status and queue position  
✅ **Graceful Shutdown** - Waits for current job before stopping

---

## 📦 New Files Created

### Core Services

- `src/lib/ai-service-client.ts` - HTTP client for Python AI backend
- `src/services/job-queue.service.ts` - Job queue manager

### API Module

- `src/modules/jobs/jobs.controller.ts` - Job API handlers
- `src/modules/jobs/jobs.routes.ts` - Job API routes

### Documentation

- `JOB_QUEUE_SYSTEM.md` - Complete technical documentation
- `.env.example` - Environment variables template

### Database Changes

- Enhanced `Job` model with queue management
- Added `JobType` enum (6 types)
- Updated `JobStatus` enum (6 statuses)
- Added credits pricing to `Plan` model
- Enhanced `CreditUsage` tracking

---

## 🔧 Setup Instructions

### 1. Install Dependencies

Already done! ✅

```bash
npm install axios
```

### 2. Update Environment Variables

Add to your `.env` file:

```bash
# AI Service (Python FastAPI Backend)
AI_SERVICE_URL="http://localhost:8000"
AI_SERVICE_API_KEY="your-ai-service-secret-key"
```

### 3. Run Database Migration

```bash
npx prisma migrate dev --name add_job_queue_system
npx prisma generate
```

### 4. Update Existing Plans (Optional)

If you have existing plans, update them with credit pricing:

```sql
UPDATE "Plan" SET
  "enhancementCreditsPerSecond" = 0.1,
  "virtualStagingCreditsPerSecond" = 0.2,
  "adGenerationCreditsPerSecond" = 0.05
WHERE id IN (SELECT id FROM "Plan");
```

### 5. Start Server

```bash
npm run dev
```

You should see:

```
AIPIX backend running on http://localhost:4000
✅ Job queue processor started
```

---

## 📊 How It Works

### Simple Flow

```
1. User creates job → POST /jobs
2. Job enters queue (PENDING)
3. Queue picks next job by priority
4. Job sent to Python AI service (RUNNING)
5. AI processes image and returns result
6. Credits calculated based on time
7. Credits deducted from subscription
8. Job marked COMPLETED
9. Enhanced image saved to S3
10. ImageVersion created
```

### Credits Calculation

```
Processing Time: 15.5 seconds
Job Type: VIRTUAL_STAGING
Rate: 0.2 credits/second
Credits Charged: ceil(15.5 × 0.2) = 4 credits
```

---

## 🎯 API Usage Examples

### Create a Job

```bash
curl -X POST http://localhost:4000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageId": 5,
    "type": "ENHANCEMENT",
    "priority": 0,
    "parameters": {
      "brightness": 1.2,
      "contrast": 1.1
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "job": {
    "id": 123,
    "type": "ENHANCEMENT",
    "status": "PENDING",
    "queuePosition": 3,
    "estimatedCredits": 10,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### Check Job Status

```bash
curl http://localhost:4000/api/jobs/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (Completed):**

```json
{
  "success": true,
  "job": {
    "id": 123,
    "type": "ENHANCEMENT",
    "status": "COMPLETED",
    "creditsCharged": 4,
    "processingTimeMs": 15500,
    "resultUrl": "https://s3.amazonaws.com/.../enhanced.jpg",
    "completedAt": "2024-01-15T10:05:15Z"
  }
}
```

### Get All Your Jobs

```bash
curl "http://localhost:4000/api/jobs?status=PENDING&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Batch Create Jobs

```bash
curl -X POST http://localhost:4000/api/jobs/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageIds": [5, 6, 7, 8, 9],
    "type": "ENHANCEMENT"
  }'
```

### Cancel a Job

```bash
curl -X POST http://localhost:4000/api/jobs/123/cancel \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Queue Status (Admin Only)

```bash
curl http://localhost:4000/api/jobs/queue/status \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**

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

## 🎨 Job Types Available

| Job Type             | Description               | Rate (credits/sec) |
| -------------------- | ------------------------- | ------------------ |
| `ENHANCEMENT`        | Photo enhancement         | 0.1                |
| `VIRTUAL_STAGING`    | Virtual furniture staging | 0.2                |
| `AD_GENERATION`      | Generate ad copy          | 0.05               |
| `BACKGROUND_REMOVAL` | Remove background         | 0.08               |
| `SKY_REPLACEMENT`    | Replace sky               | 0.08               |
| `HDR_PROCESSING`     | HDR enhancement           | 0.1                |

---

## 🔄 Job Statuses

- `PENDING` - Waiting in queue
- `QUEUED` - Picked up by processor
- `RUNNING` - Being processed by AI
- `COMPLETED` - Successfully finished ✅
- `FAILED` - Processing failed ❌
- `CANCELLED` - Cancelled by user 🚫

---

## 💳 Credits System

### Check Your Credits

```bash
curl http://localhost:4000/api/billing/me/usage \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
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

### What Happens When Credits Run Out?

```json
{
  "error": "INSUFFICIENT_CREDITS",
  "message": "Not enough credits to process this job"
}
```

User needs to:

1. Wait for monthly renewal
2. Upgrade to higher plan
3. Purchase additional credits (if implemented)

---

## 🐍 Python AI Service Requirements

Your Python FastAPI backend should expose:

### 1. Enhancement Endpoint

```
POST /api/v1/enhance
{
  "job_id": 123,
  "image_url": "https://s3.../image.jpg",
  "parameters": { ... }
}
```

### 2. Virtual Staging Endpoint

```
POST /api/v1/virtual-staging
{
  "job_id": 124,
  "image_url": "https://s3.../room.jpg",
  "parameters": {
    "style": "modern",
    "room_type": "living_room"
  }
}
```

### 3. Health Check

```
GET /health
```

See `JOB_QUEUE_SYSTEM.md` for complete API contract.

---

## 🧪 Testing

### Test Without Python Backend

The job will fail gracefully:

```json
{
  "status": "FAILED",
  "errorCode": "AI_SERVICE_UNAVAILABLE",
  "errorMessage": "AI service is not available"
}
```

### Mock Python Service (for testing)

Create a simple mock server:

```python
# mock_ai_service.py
from fastapi import FastAPI
import time

app = FastAPI()

@app.post("/api/v1/enhance")
async def enhance(data: dict):
    # Simulate processing
    time.sleep(5)

    return {
        "success": True,
        "job_id": data["job_id"],
        "result_url": data["image_url"],  # Just return same image
        "processing_time_ms": 5000,
        "metadata": {}
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "queue_length": 0, "average_processing_time_ms": 5000}
```

Run it:

```bash
pip install fastapi uvicorn
uvicorn mock_ai_service:app --port 8000
```

---

## 📈 Monitoring

### View Queue Status

```bash
# Check database
psql -d aipix -c "SELECT status, COUNT(*) FROM \"Job\" GROUP BY status;"
```

### View Active Job

```sql
SELECT * FROM "Job" WHERE status = 'RUNNING';
```

### View Failed Jobs

```sql
SELECT id, "errorMessage", "errorCode", "retryCount"
FROM "Job"
WHERE status = 'FAILED'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Total Credits Used Today

```sql
SELECT SUM("creditsUsed")
FROM "CreditUsage"
WHERE "createdAt" > NOW() - INTERVAL '1 day';
```

---

## 🚨 Troubleshooting

### Job Stuck in PENDING

**Check:** Is queue processor running?

```bash
# Look for this in logs:
✅ Job queue processor started
```

**Fix:** Restart server

```bash
npm run dev
```

### Jobs Failing with AI_SERVICE_UNAVAILABLE

**Check:** Is Python service running?

```bash
curl http://localhost:8000/health
```

**Fix:** Start Python service or check `AI_SERVICE_URL` in `.env`

### Jobs Failing After 3 Retries

**Check:** Error code in database

```sql
SELECT "errorCode", "errorMessage" FROM "Job" WHERE id = 123;
```

**Common Issues:**

- Invalid image URL (S3 permissions)
- Timeout (image too large)
- Python service error

---

## 🔐 Security Notes

1. **API Key**: Always use `AI_SERVICE_API_KEY` in production
2. **Rate Limiting**: Consider adding rate limits to job creation
3. **User Verification**: Jobs verify project ownership before creation
4. **Credits Check**: Double-checked before and during processing

---

## 📝 Next Steps

1. ✅ Run migration: `npx prisma migrate dev`
2. ⬜ Set up Python AI service
3. ⬜ Configure environment variables
4. ⬜ Test job creation
5. ⬜ Implement frontend job monitoring
6. ⬜ Add WebSocket for real-time updates (optional)
7. ⬜ Set up job completion notifications

---

## 📚 Documentation

- **Technical Docs**: See `JOB_QUEUE_SYSTEM.md`
- **API Reference**: See `API_REFERENCE.md`
- **Role System**: See `ROLE_BASED_IMPLEMENTATION.md`

---

## 💡 Tips

- **Use batch endpoint** for multiple images to reduce API calls
- **Set priority wisely** - reserve high priority for urgent jobs
- **Monitor queue length** - if it grows too large, consider scaling
- **Test with mock service** first before integrating real AI

---

## ✨ Summary

You now have:

- ✅ Complete job queue system
- ✅ Credits-based billing
- ✅ Sequential processing (one job at a time)
- ✅ Automatic retry for failed jobs
- ✅ Priority queue
- ✅ Real-time job tracking
- ✅ RESTful API for job management
- ✅ Integration-ready for Python AI backend

**Ready to process AI jobs!** 🎉
