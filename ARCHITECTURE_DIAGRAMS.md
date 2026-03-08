# Job Queue System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Frontend)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Create Job   │  │  Check Status │  │  Cancel Job  │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
└─────────┼──────────────────┼──────────────────┼────────────────────┘
          │                  │                  │
          │ POST /jobs       │ GET /jobs/:id    │ POST /jobs/:id/cancel
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER (Node.js)                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Jobs Controller                            │  │
│  │  • createJobHandler                                           │  │
│  │  • getUserJobsHandler                                         │  │
│  │  • cancelJobHandler                                           │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               Job Queue Service                               │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Queue Manager                                        │   │  │
│  │  │  • Priority-based ordering                           │   │  │
│  │  │  • Sequential processing (one at a time)             │   │  │
│  │  │  • Automatic retry (max 3)                           │   │  │
│  │  │  • Event emitters (started/completed/failed)         │   │  │
│  │  └──────────────┬───────────────────────────────────────┘   │  │
│  │                 │                                             │  │
│  │                 ▼                                             │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Credits Manager                                      │   │  │
│  │  │  • Check available credits                           │   │  │
│  │  │  • Calculate cost (time × rate)                      │   │  │
│  │  │  • Deduct credits (transactional)                    │   │  │
│  │  └──────────────┬───────────────────────────────────────┘   │  │
│  └─────────────────┼─────────────────────────────────────────────┘  │
│                    │                                                 │
│                    ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  AI Service Client                            │  │
│  │  • HTTP client for Python backend                            │  │
│  │  • processEnhancement()                                      │  │
│  │  • processVirtualStaging()                                   │  │
│  │  • Error handling & retry detection                          │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
                              │ HTTP Request
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│               PYTHON AI SERVICE (FastAPI)                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  POST /api/v1/enhance                                        │  │
│  │  POST /api/v1/virtual-staging                                │  │
│  │  POST /api/v1/remove-background                              │  │
│  │  POST /api/v1/replace-sky                                    │  │
│  │  GET /health                                                 │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              AI Models (PyTorch/TensorFlow)                   │  │
│  │  • Enhancement Model                                         │  │
│  │  • Virtual Staging Model                                     │  │
│  │  • Background Removal                                        │  │
│  │  • Sky Replacement                                           │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Return Results                             │  │
│  │  { success, result_url, processing_time_ms, metadata }       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Response
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE (PostgreSQL)                         │
│  ┌─────────────────────┐  ┌─────────────────────┐                  │
│  │   Job Table         │  │  CreditUsage Table  │                  │
│  │  • Status update    │  │  • Record credits   │                  │
│  │  • Save resultUrl   │  │  • Track time       │                  │
│  │  • ProcessingTimeMs │  │  • Job type         │                  │
│  └─────────────────────┘  └─────────────────────┘                  │
│  ┌─────────────────────┐  ┌─────────────────────┐                  │
│  │ ImageVersion Table  │  │  Subscription Table │                  │
│  │  • Create enhanced  │  │  • Check credits    │                  │
│  │  • Link to job      │  │  • Deduct credits   │                  │
│  └─────────────────────┘  └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Job Processing Flow

```
START: User creates job
   │
   ▼
┌─────────────────────────┐
│ 1. Verify Subscription  │ ──❌─→ Return 402: NO_ACTIVE_SUBSCRIPTION
└───────────┬─────────────┘
            │ ✅
            ▼
┌─────────────────────────┐
│ 2. Check Credits        │ ──❌─→ Return 402: INSUFFICIENT_CREDITS
└───────────┬─────────────┘
            │ ✅
            ▼
┌─────────────────────────┐
│ 3. Verify Ownership     │ ──❌─→ Return 404: IMAGE_NOT_FOUND
│    (Image → Project)    │
└───────────┬─────────────┘
            │ ✅
            ▼
┌─────────────────────────┐
│ 4. Create Job           │
│    Status: PENDING      │
│    Add to Queue         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. Return Job ID        │ ──→ Response 201: { job: {...} }
└───────────┬─────────────┘
            │
            │ (Queue picks up job)
            ▼
┌─────────────────────────┐
│ 6. Update: QUEUED       │
│    queuedAt = now()     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 7. Double-check Credits │ ──❌─→ Mark FAILED
└───────────┬─────────────┘
            │ ✅
            ▼
┌─────────────────────────┐
│ 8. Update: RUNNING      │
│    startedAt = now()    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 9. Call AI Service      │
│    POST /api/v1/enhance │
└───────────┬─────────────┘
            │
            ├──❌─→ Retryable Error? ─→ Retry Count < 3? ──Yes→ Back to PENDING
            │                                  │
            │                                  No
            │                                  ▼
            │                            Mark FAILED
            │
            │ ✅ Success
            ▼
┌─────────────────────────┐
│ 10. Calculate Credits   │
│     time × rate         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 11. Transaction:        │
│     • Update Job        │
│     • Deduct Credits    │
│     • Create ImageVer   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 12. Update: COMPLETED   │
│     completedAt = now() │
│     Emit event          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 13. Process Next Job    │ ──→ Back to step 6
└─────────────────────────┘

END
```

---

## Queue Priority Logic

```
Job Queue (Multiple jobs waiting)
──────────────────────────────────

Job A: priority=10, created=10:00:00  ←── Processed FIRST (highest priority)
Job B: priority=5,  created=10:00:05
Job C: priority=5,  created=10:00:03  ←── Processed SECOND (same priority, older)
Job D: priority=0,  created=09:59:00
Job E: priority=0,  created=10:00:10  ←── Processed LAST (lowest priority, newest)

SQL: ORDER BY priority DESC, createdAt ASC
```

---

## Credits Calculation Examples

### Example 1: Photo Enhancement

```
Input:
  • Job Type: ENHANCEMENT
  • Processing Time: 12.5 seconds
  • Rate: 0.1 credits/second

Calculation:
  processingTimeSeconds = 12.5
  creditsCharged = ceil(12.5 × 0.1) = ceil(1.25) = 2 credits

Result: 2 credits deducted
```

### Example 2: Virtual Staging

```
Input:
  • Job Type: VIRTUAL_STAGING
  • Processing Time: 28.3 seconds
  • Rate: 0.2 credits/second

Calculation:
  processingTimeSeconds = 28.3
  creditsCharged = ceil(28.3 × 0.2) = ceil(5.66) = 6 credits

Result: 6 credits deducted
```

### Example 3: Fast Job

```
Input:
  • Job Type: AD_GENERATION
  • Processing Time: 2.1 seconds
  • Rate: 0.05 credits/second

Calculation:
  processingTimeSeconds = 2.1
  creditsCharged = ceil(2.1 × 0.05) = ceil(0.105) = 1 credit
  creditsCharged = max(1, 1) = 1 credit (minimum enforced)

Result: 1 credit deducted (minimum)
```

---

## State Machine Diagram

```
                    ┌─────────────┐
                    │   PENDING   │ ←─────┐
                    └──────┬──────┘       │
                           │              │ Retry
                           ▼              │
                    ┌─────────────┐       │
              ┌────→│   QUEUED    │       │
              │     └──────┬──────┘       │
              │            │              │
              │            ▼              │
              │     ┌─────────────┐       │
              │     │   RUNNING   │───────┘
              │     └──────┬──────┘
              │            │
              │            ├──────────────┐
              │            │              │
              │            ▼              ▼
              │     ┌─────────────┐ ┌─────────────┐
              │     │  COMPLETED  │ │   FAILED    │
              │     └─────────────┘ └─────────────┘
              │
              │     ┌─────────────┐
              └─────┤  CANCELLED  │
                    └─────────────┘
                           ▲
                           │
                    (User cancels)
```

**Transitions:**

- `PENDING → QUEUED` - Queue picks up job
- `QUEUED → RUNNING` - Processing starts
- `RUNNING → COMPLETED` - Success
- `RUNNING → FAILED` - Error (non-retryable or max retries reached)
- `RUNNING → PENDING` - Retry (retryable error)
- `PENDING → CANCELLED` - User cancels

---

## Database Relationships

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1:N
       │
       ▼
┌─────────────┐        ┌──────────────┐
│   Project   │←──1:N──│    Image     │
└──────┬──────┘        └───────┬──────┘
       │                       │
       │                       │
       │ 1:N                   │ 1:N
       │                       │
       ▼                       ▼
┌─────────────┐        ┌──────────────┐
│     Job     │───────→│ ImageVersion │
└──────┬──────┘  1:N   └──────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│CreditUsage  │
└──────┬──────┘
       │
       │ N:1
       ▼
┌─────────────┐        ┌──────────────┐
│Subscription │───N:1─→│     Plan     │
└─────────────┘        └──────────────┘
```

---

## Timeline Example: Single Job

```
Time    Event                              Status      Credits
─────────────────────────────────────────────────────────────
10:00   User creates job                   PENDING     500/500
        ↓ (5s wait in queue)
10:05   Queue picks up job                 QUEUED      500/500
        ↓ (instant)
10:05   Processing starts                  RUNNING     500/500
        ↓ (AI processing: 15s)
10:20   AI returns result                  RUNNING     500/500
        ↓ (calculate: 15s × 0.1 = 2 credits)
10:20   Credits deducted                   RUNNING     498/500
        ↓ (save to DB)
10:20   ImageVersion created               RUNNING     498/500
        ↓ (update status)
10:20   Job completed                      COMPLETED   498/500
        ↓ (emit event)
10:20   Email notification sent            -           498/500
```

---

## Concurrent Jobs Timeline

```
Time    Queue       Job 1 (priority=5)    Job 2 (priority=0)    Job 3 (priority=10)
──────────────────────────────────────────────────────────────────────────────────────
10:00   [1,2,3]     PENDING               PENDING               PENDING
10:01   [2,1,3]     QUEUED                PENDING               PENDING (sorted by priority)
10:01   [2,1,3]     RUNNING               PENDING               PENDING
10:15   [1,3]       COMPLETED             PENDING               PENDING (Job 1 done)
10:15   [1]         -                     PENDING               QUEUED (Job 3 next - highest priority!)
10:15   [1]         -                     PENDING               RUNNING
10:30   [1]         -                     PENDING               COMPLETED
10:30   []          -                     QUEUED                -
10:30   []          -                     RUNNING               -
10:45   []          -                     COMPLETED             - (all done!)
```

**Note:** Job 3 was created last but processed before Job 2 due to higher priority!

---

## Error Handling Flow

```
AI Service Error
      │
      ▼
┌─────────────────────┐
│  Is Retryable?      │
│  • TIMEOUT          │
│  • UNAVAILABLE      │
│  • NETWORK_ERROR    │
└──────┬─────┬────────┘
       │     │
      YES   NO
       │     │
       ▼     ▼
┌───────────┐ ┌────────────┐
│ Retry < 3?│ │ Mark FAILED│
└─┬───┬─────┘ └────────────┘
  │   │
 YES  NO
  │   │
  ▼   ▼
┌────┐ ┌─────────┐
│Back│ │  FAILED │
│to  │ └─────────┘
│PEND│
└────┘
```

---

## Monitoring Dashboard (Concept)

```
┌──────────────────────────────────────────────────────────┐
│              AIPIX Job Queue Dashboard                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  📊 Queue Status                                         │
│  ┌─────────────┬────────┬────────┬────────┬────────┐    │
│  │   PENDING   │ QUEUED │RUNNING │COMPLETE│ FAILED │    │
│  │     15      │    0   │   1    │  234   │   3    │    │
│  └─────────────┴────────┴────────┴────────┴────────┘    │
│                                                           │
│  ⏱️  Current Job: #125 (ENHANCEMENT) - 8s elapsed       │
│                                                           │
│  📈 Statistics                                           │
│  • Avg Processing Time: 12.5s                            │
│  • Jobs/Hour: 180                                        │
│  • Success Rate: 98.7%                                   │
│                                                           │
│  💳 Credits Today                                        │
│  • Total Used: 1,247 credits                             │
│  • Most Used: VIRTUAL_STAGING (45%)                      │
│                                                           │
│  ⚠️  Recent Failures                                     │
│  • Job #120: AI_SERVICE_TIMEOUT (retrying...)            │
│  • Job #115: INVALID_IMAGE                               │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

This visual documentation should help understand how all the components work together! 🎨
