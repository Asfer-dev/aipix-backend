# AI Content Moderation System - Setup Guide

This document provides comprehensive setup instructions for the AI content moderation system in the AiPix backend.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Backend Setup (Node.js)](#backend-setup-nodejs)
- [AI Service Setup (FastAPI)](#ai-service-setup-fastapi)
- [Database Migration](#database-migration)
- [Testing](#testing)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The AI content moderation system automatically analyzes user-generated content (listings and messages) before publication to prevent inappropriate content from appearing on the platform.

### Key Features

- **Automatic Content Analysis**: AI checks all listings and messages before creation
- **Risk-Based Decisions**:
  - Low risk (score < 0.3): Auto-approve and publish
  - Medium risk (score 0.3-0.8): Flag for manual review
  - High risk (score >= 0.8): Auto-reject with explanation
- **Fail-Safe Design**: If AI service is down, content is flagged for manual review
- **Audit Trail**: All moderation decisions are logged
- **Admin Review Workflow**: Moderators can approve/reject flagged content

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Node.js API   │ ◄─────► │  FastAPI AI      │
│   (Port 3000)   │  REST   │  Service         │
│                 │         │  (Port 8001)     │
└────────┬────────┘         └──────────────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   Database      │
└─────────────────┘
```

### Request Flow

1. User creates listing/message
2. Node.js backend calls AI moderation service
3. AI service analyzes content and returns score + flags
4. Backend makes decision (approve/flag/reject)
5. Content created with moderation status
6. ModerationLog entry created for audit trail

## Backend Setup (Node.js)

### 1. Environment Variables

Add to your `.env` file:

```env
# AI Moderation Service
AI_MODERATION_URL=http://localhost:8001
AI_MODERATION_API_KEY=your-secret-api-key-here
```

### 2. Database Migration

Run the migration to add moderation fields:

```bash
npx prisma migrate dev --name add_ai_content_moderation
npx prisma generate
```

This will:

- Add moderation fields to `Listing` model (moderationStatus, moderationScore, aiModerationFlags, etc.)
- Add moderation fields to `Message` model
- Create `ModerationLog` table for audit trail
- Add indexes for efficient querying

### 3. Verify Installation

Check that the following files exist:

- `src/lib/ai-moderation-client.ts` - AI service client
- `src/modules/admin/moderation.service.ts` - Admin review functions
- Updated `src/modules/listings/listings.service.ts` - Listing moderation
- Updated `src/modules/listings/messages.service.ts` - Message moderation

### 4. Restart Server

```bash
npm run dev
```

The backend is now ready to use AI moderation!

## AI Service Setup (FastAPI)

### Prerequisites

- Python 3.9+
- pip or conda

### 1. Create FastAPI Project

Create a new directory for your AI service:

```bash
mkdir aipix-ai-moderation
cd aipix-ai-moderation
```

### 2. Install Dependencies

```bash
pip install fastapi uvicorn pydantic transformers torch pillow requests python-dotenv
```

### 3. Create `main.py`

```python
"""
AI Content Moderation Service
FastAPI backend for analyzing text and images
"""

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Literal
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Content Moderation", version="1.0.0")

# API Key for authentication
API_KEY = os.getenv("API_KEY", "your-secret-api-key-here")

# Models
class ModerationRequest(BaseModel):
    content: str
    contentType: Literal["text", "image", "combined"]
    imageUrls: Optional[List[str]] = None
    metadata: Optional[dict] = None

class ModerationResponse(BaseModel):
    status: Literal["APPROVED", "FLAGGED", "REJECTED"]
    score: float  # 0.0 to 1.0
    flags: List[str]
    reasons: List[str]
    confidence: float

class BatchModerationRequest(BaseModel):
    items: List[ModerationRequest]

# Authentication
def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

# Moderation Logic
def moderate_text(content: str) -> ModerationResponse:
    """
    Analyze text content for inappropriate content.

    TODO: Integrate with your AI model (e.g., OpenAI Moderation API, Hugging Face models)
    """
    # Example implementation (replace with actual AI model)

    score = 0.0
    flags = []
    reasons = []

    # Basic keyword checking (replace with ML model)
    inappropriate_keywords = ["spam", "scam", "fake", "illegal"]
    lower_content = content.lower()

    for keyword in inappropriate_keywords:
        if keyword in lower_content:
            score += 0.3
            flags.append(f"inappropriate_{keyword}")
            reasons.append(f"Contains inappropriate keyword: {keyword}")

    # Determine status based on score
    if score >= 0.8:
        status = "REJECTED"
    elif score >= 0.3:
        status = "FLAGGED"
    else:
        status = "APPROVED"

    return ModerationResponse(
        status=status,
        score=min(score, 1.0),
        flags=flags,
        reasons=reasons,
        confidence=0.85
    )

def moderate_image(image_url: str) -> ModerationResponse:
    """
    Analyze image for inappropriate content.

    TODO: Integrate with vision AI model (e.g., Google Vision API, AWS Rekognition)
    """
    # Example implementation (replace with actual AI model)

    return ModerationResponse(
        status="APPROVED",
        score=0.1,
        flags=[],
        reasons=[],
        confidence=0.75
    )

# Endpoints
@app.get("/")
def read_root():
    return {"service": "AI Content Moderation", "status": "running"}

@app.post("/api/moderate", response_model=ModerationResponse, dependencies=[Depends(verify_api_key)])
def moderate_content(request: ModerationRequest):
    """
    Moderate a single piece of content (text, image, or combined).
    """
    try:
        if request.contentType == "text":
            return moderate_text(request.content)

        elif request.contentType == "image" and request.imageUrls:
            # Moderate first image
            return moderate_image(request.imageUrls[0])

        elif request.contentType == "combined":
            # Moderate both text and images, return highest risk
            text_result = moderate_text(request.content)

            if request.imageUrls:
                image_results = [moderate_image(url) for url in request.imageUrls[:5]]
                highest_image_score = max(r.score for r in image_results)

                # Combine scores (weighted average)
                combined_score = (text_result.score * 0.7) + (highest_image_score * 0.3)

                all_flags = text_result.flags + [f for r in image_results for f in r.flags]
                all_reasons = text_result.reasons + [r for res in image_results for r in res.reasons]

                # Determine final status
                if combined_score >= 0.8:
                    status = "REJECTED"
                elif combined_score >= 0.3:
                    status = "FLAGGED"
                else:
                    status = "APPROVED"

                return ModerationResponse(
                    status=status,
                    score=combined_score,
                    flags=all_flags,
                    reasons=all_reasons,
                    confidence=0.80
                )

            return text_result

        else:
            raise HTTPException(status_code=400, detail="Invalid content type or missing data")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Moderation failed: {str(e)}")

@app.post("/api/moderate/batch", response_model=List[ModerationResponse], dependencies=[Depends(verify_api_key)])
def moderate_batch(request: BatchModerationRequest):
    """
    Moderate multiple items in batch.
    """
    results = []
    for item in request.items:
        try:
            result = moderate_content(item)
            results.append(result)
        except Exception as e:
            # Return FLAGGED for failed items
            results.append(ModerationResponse(
                status="FLAGGED",
                score=0.5,
                flags=["moderation_error"],
                reasons=[f"Moderation failed: {str(e)}"],
                confidence=0.0
            ))

    return results

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Import Depends
from fastapi import Depends

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

### 4. Create `.env` File

```env
API_KEY=your-secret-api-key-here
```

### 5. Run the Service

```bash
python main.py
```

Or use uvicorn directly:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

The AI service is now running at `http://localhost:8001`!

### 6. Test the Service

```bash
curl -X POST http://localhost:8001/api/moderate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-here" \
  -d '{
    "content": "Beautiful 3BR apartment in downtown",
    "contentType": "text"
  }'
```

## Database Migration

### Schema Changes

The migration adds:

**Listing Model**:

- `moderationStatus` (String) - "PENDING", "APPROVED", "FLAGGED", "REJECTED"
- `moderationScore` (Float) - AI confidence score 0-1
- `moderationFlags` (String[]) - Array of detected issues
- `moderatedAt` (DateTime) - When moderation occurred
- `moderatedBy` (Int?) - Admin user ID if manually reviewed
- `autoModerated` (Boolean) - Whether AI auto-approved

**Message Model**:

- `moderationStatus` (String) - Default "APPROVED"
- `moderationScore` (Float)
- `aiModerationFlags` (String[])

**ModerationLog Model** (NEW):

- Complete audit trail of all moderation decisions
- Links to User, Listing, Message
- Stores AI scores, flags, and manual review notes

### Running Migration

```bash
# Create and apply migration
npx prisma migrate dev --name add_ai_content_moderation

# Generate Prisma Client
npx prisma generate

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
```

### Handling Existing Data

If you have existing listings/messages, you'll need to decide:

1. **Auto-approve all**: Set `moderationStatus = "APPROVED"` for all existing records
2. **Require review**: Set `moderationStatus = "FLAGGED"` and let admins review

Run this in Prisma Studio or SQL:

```sql
-- Auto-approve all existing content
UPDATE "Listing" SET "moderationStatus" = 'APPROVED' WHERE "moderationStatus" IS NULL;
UPDATE "Message" SET "moderationStatus" = 'APPROVED' WHERE "moderationStatus" IS NULL;
```

## Testing

### 1. Test Listing Creation (Auto-Approve)

```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "title": "Beautiful 3BR Apartment",
    "description": "Spacious apartment with great views",
    "location": "Downtown"
  }'
```

Expected: Listing created with `moderationStatus = "APPROVED"`, `isPublished = true`

### 2. Test Listing Creation (Flagged)

```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "title": "SPAM - Click here for fake deals!",
    "description": "This is a scam listing",
    "location": "Nowhere"
  }'
```

Expected: Listing created with `moderationStatus = "FLAGGED"`, `isPublished = false`

### 3. Test Listing Creation (Rejected)

Update your AI service to return high scores for certain keywords, then test.

Expected: Request fails with error "CONTENT_REJECTED: [reasons]"

### 4. Test Message Creation

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": 1,
    "receiverId": 2,
    "content": "Hello, is this still available?"
  }'
```

Expected: Message created with appropriate `moderationStatus`

### 5. Test Admin Review Endpoints

Get flagged listings:

```bash
curl http://localhost:3000/api/admin/moderation/listings/flagged \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

Approve listing:

```bash
curl -X POST http://localhost:3000/api/admin/moderation/listings/1/approve \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Content is appropriate"}'
```

Reject listing:

```bash
curl -X POST http://localhost:3000/api/admin/moderation/listings/1/reject \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Inappropriate content"}'
```

### 6. Test AI Service Down Scenario

1. Stop the FastAPI service
2. Create a listing
3. Expected: Listing created with `moderationStatus = "FLAGGED"` (fail-safe)

## Configuration

### Adjusting Risk Thresholds

Edit thresholds in the service files:

**Listings** (`src/modules/listings/listings.service.ts`):

```typescript
if (moderationResult.status === "APPROVED" && moderationResult.score < 0.3) {
  // Auto-approve (adjust 0.3 to your preference)
}
```

**Messages** (`src/modules/listings/messages.service.ts`):

```typescript
if (moderationResult.status === "APPROVED" && moderationResult.score < 0.5) {
  // Messages have higher threshold (0.5 vs 0.3)
}
```

### Timeout Settings

AI service timeout is 10 seconds by default. Adjust in `src/lib/ai-moderation-client.ts`:

```typescript
const response = await axios.post(
  `${AI_MODERATION_URL}/api/moderate`,
  request,
  {
    timeout: 10000, // Adjust timeout (milliseconds)
  },
);
```

## Troubleshooting

### Issue: AI Service Connection Failed

**Symptoms**: All content flagged, error logs show "ECONNREFUSED"

**Solution**:

1. Check AI service is running: `curl http://localhost:8001/health`
2. Verify `AI_MODERATION_URL` in `.env`
3. Check firewall/network settings

### Issue: All Content Being Rejected

**Symptoms**: Every listing/message gets rejected

**Solution**:

1. Check AI service logs for errors
2. Verify moderation logic in FastAPI `main.py`
3. Adjust score thresholds in Node.js services

### Issue: Migration Fails

**Symptoms**: `npx prisma migrate dev` throws error

**Solution**:

1. Check for syntax errors in `schema.prisma`
2. Ensure PostgreSQL is running
3. Verify database connection in `.env`
4. Try: `npx prisma migrate reset` (WARNING: deletes data)

### Issue: Moderation Logs Not Created

**Symptoms**: Listings moderated but no entries in `ModerationLog`

**Solution**:

1. Check for errors in service logs
2. Verify `ModerationLog` model exists in schema
3. Run `npx prisma generate` to update client

### Issue: Frontend Gets 500 Errors

**Symptoms**: Listing creation fails with generic error

**Solution**:

1. Check Node.js logs for detailed error
2. Verify Prisma Client is up to date: `npx prisma generate`
3. Check all required fields are present
4. Verify AI service is returning correct response format

## Production Deployment

### Security Checklist

- [ ] Use strong API key for AI service (32+ characters)
- [ ] Enable HTTPS for AI service
- [ ] Rate limit moderation endpoints
- [ ] Monitor for adversarial attacks
- [ ] Set up logging and alerting
- [ ] Backup moderation logs regularly

### Performance Optimization

- [ ] Cache moderation results (same content = same result)
- [ ] Use batch moderation for bulk operations
- [ ] Consider async moderation for messages
- [ ] Set up load balancer for AI service
- [ ] Monitor AI service response times

### Monitoring

Track these metrics:

- Moderation success rate
- False positive rate (user appeals)
- AI service response time
- Content approval/flag/reject distribution
- Admin review queue size

## Next Steps

1. **Implement Real AI Models**: Replace example logic with actual ML models
2. **Add Image Analysis**: Integrate vision AI for listing photos
3. **User Appeals**: Allow users to appeal rejected content
4. **Bulk Moderation**: Add admin tool to moderate existing content
5. **A/B Testing**: Experiment with different thresholds
6. **Reporting**: Add analytics dashboard for moderation metrics

## Support

For questions or issues:

- Check logs in `src/modules/listings/` and `src/modules/admin/`
- Review Prisma schema in `prisma/schema.prisma`
- Test AI service directly at `http://localhost:8001/docs` (FastAPI docs)

## License

This moderation system is part of the AiPix platform.
