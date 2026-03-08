# AIPIX Backend

AI-powered real estate platform with dual-sided marketplace (BUYER + LISTER) and job queue system for AI processing.

## 🚀 Features

### Core Features

- **Role-Based System**: BUYER, LISTER, EDITOR, MODERATOR, ADMIN roles
- **Job Queue System**: Sequential AI processing with credits-based billing
- **Authentication**: JWT with MFA support
- **Subscriptions**: Plan-based billing with credit allocation
- **Projects**: Organize images by project
- **Listings**: Marketplace for properties
- **AI Enhancements**: Photo enhancement, virtual staging, and more

### Job Queue Features

- ✅ Sequential processing (one job at a time)
- ✅ Priority-based queue
- ✅ Automatic retry (up to 3 attempts)
- ✅ Time-based credit billing
- ✅ Real-time job tracking
- ✅ Graceful shutdown

## 📦 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js v5
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + MFA (speakeasy)
- **Storage**: AWS S3
- **Email**: Nodemailer
- **AI Service**: Python FastAPI (separate backend)

## 🏗️ Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Frontend  │─────▶│  Node.js    │─────▶│  PostgreSQL │
│   (React)   │      │  Backend    │      │  Database   │
└─────────────┘      └──────┬──────┘      └─────────────┘
                            │
                            │ HTTP
                            ▼
                     ┌─────────────┐      ┌─────────────┐
                     │   Python    │─────▶│  AI Models  │
                     │   FastAPI   │      │  (PyTorch)  │
                     └─────────────┘      └─────────────┘
```

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aipix"

# Server
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET="your-secret-key-here"

# SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="aipix-uploads"

# AI Service
AI_SERVICE_URL="http://localhost:8000"
AI_SERVICE_API_KEY="your-ai-service-key"
```

### 3. Run Database Migrations

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:4000`

## 📚 Documentation

Comprehensive documentation available:

- **[CHECKLIST.md](CHECKLIST.md)** - Implementation checklist and status
- **[JOB_QUEUE_SYSTEM.md](JOB_QUEUE_SYSTEM.md)** - Job queue technical docs
- **[QUICK_START_JOB_QUEUE.md](QUICK_START_JOB_QUEUE.md)** - Quick start guide
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Implementation overview
- **[ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** - Visual architecture
- **[API_TESTING_EXAMPLES.md](API_TESTING_EXAMPLES.md)** - API testing guide
- **[ROLE_BASED_IMPLEMENTATION.md](ROLE_BASED_IMPLEMENTATION.md)** - Role system docs
- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete API reference

## 🎯 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `POST /auth/switch-role` - Switch between roles
- `POST /auth/add-role` - Add new role to account

### Jobs (LISTER only)

- `POST /jobs` - Create AI job
- `POST /jobs/batch` - Create multiple jobs
- `GET /jobs` - List user's jobs
- `GET /jobs/:id` - Get job details
- `POST /jobs/:id/cancel` - Cancel pending job
- `GET /jobs/queue/status` - Queue status (ADMIN)

### Projects (LISTER only)

- `POST /projects` - Create project
- `GET /projects` - List projects
- `POST /projects/:id/images/upload-multiple` - Upload images

### Listings

- `POST /listings` - Create listing (LISTER)
- `GET /listings/marketplace/listings` - Browse marketplace (PUBLIC)
- `GET /listings/marketplace/listings/:id` - View listing (PUBLIC)

### Billing

- `GET /billing/plans` - List subscription plans
- `POST /billing/subscribe` - Subscribe to plan
- `GET /billing/me/usage` - Check credits usage

## 🔐 User Roles

| Role      | Description        | Permissions                   |
| --------- | ------------------ | ----------------------------- |
| BUYER     | Browse marketplace | View listings, favorite, book |
| LISTER    | Create listings    | Projects, AI tools, listings  |
| EDITOR    | Review AI outputs  | Manual review (internal)      |
| MODERATOR | Content moderation | Review flagged content        |
| ADMIN     | Full access        | All permissions               |

Users can have multiple roles and switch between them seamlessly.

## 💳 Credits System

### How It Works

1. Each plan has monthly credit allocation
2. Jobs consume credits based on processing time
3. Credits charged after job completes
4. Formula: `credits = ceil(seconds × rate)`

### Credit Rates

| Job Type           | Credits/Second |
| ------------------ | -------------- |
| Photo Enhancement  | 0.1            |
| Virtual Staging    | 0.2            |
| Ad Generation      | 0.05           |
| Background Removal | 0.08           |
| Sky Replacement    | 0.08           |

### Example

```
Job: Virtual Staging
Processing Time: 15.5 seconds
Rate: 0.2 credits/second
Charged: ceil(15.5 × 0.2) = 4 credits
```

## 🔄 Job Queue

Jobs are processed sequentially (one at a time) with:

- **Priority Queue**: Higher priority jobs processed first
- **Automatic Retry**: Failed jobs retry up to 3 times
- **Status Tracking**: PENDING → QUEUED → RUNNING → COMPLETED/FAILED
- **Graceful Shutdown**: Waits for current job before stopping

### Job Types

- `ENHANCEMENT` - Photo enhancement
- `VIRTUAL_STAGING` - Virtual furniture staging
- `BACKGROUND_REMOVAL` - Remove background
- `SKY_REPLACEMENT` - Replace sky
- `HDR_PROCESSING` - HDR enhancement
- `AD_GENERATION` - Generate ad copy

## 🐍 Python AI Service

The Node.js backend communicates with a separate Python FastAPI service for AI processing.

### Required Endpoints

- `POST /api/v1/enhance` - Photo enhancement
- `POST /api/v1/virtual-staging` - Virtual staging
- `POST /api/v1/remove-background` - Background removal
- `POST /api/v1/replace-sky` - Sky replacement
- `GET /health` - Health check

See [JOB_QUEUE_SYSTEM.md](JOB_QUEUE_SYSTEM.md) for complete API contract.

## 🧪 Testing

### Create a Job

```bash
curl -X POST http://localhost:4000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "imageId": 5,
    "type": "ENHANCEMENT"
  }'
```

### Check Job Status

```bash
curl http://localhost:4000/api/jobs/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

See [API_TESTING_EXAMPLES.md](API_TESTING_EXAMPLES.md) for more examples.

## 📊 Database Schema

### Key Models

- **User** - Users with roles
- **Project** - User projects
- **Image** - Project images
- **Job** - AI processing jobs
- **ImageVersion** - Original/enhanced versions
- **Listing** - Marketplace listings
- **Subscription** - User subscriptions
- **Plan** - Subscription plans
- **CreditUsage** - Credit consumption tracking

## 🚀 Deployment

### Environment Variables

Set these in production:

```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="strong-secret-key"
AI_SERVICE_URL="https://ai.aipix.com"
AI_SERVICE_API_KEY="production-api-key"
NODE_ENV="production"
```

### Database Migration

```bash
npx prisma migrate deploy
npx prisma generate
```

### Start Server

```bash
npm run build
npm start
```

## 📈 Monitoring

### Queue Status

```bash
curl http://localhost:4000/api/jobs/queue/status \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Database Queries

```sql
-- Jobs in queue
SELECT COUNT(*) FROM "Job" WHERE status = 'PENDING';

-- Average processing time
SELECT AVG("processingTimeMs") FROM "Job" WHERE status = 'COMPLETED';

-- Credits used today
SELECT SUM("creditsUsed") FROM "CreditUsage"
WHERE "createdAt" > NOW() - INTERVAL '1 day';
```

## 🐛 Troubleshooting

### Jobs Not Processing

Check if queue is running:

```bash
# Look for this in logs:
✅ Job queue processor started
```

### AI Service Errors

Verify Python backend is running:

```bash
curl http://localhost:8000/health
```

### Insufficient Credits

User needs to upgrade plan or wait for monthly renewal.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary software.

## 🎉 Features Implemented

- ✅ Role-based authentication system
- ✅ Job queue with sequential processing
- ✅ Credits-based billing
- ✅ Priority queue
- ✅ Automatic retry
- ✅ Project management
- ✅ Image uploads to S3
- ✅ Marketplace listings
- ✅ Subscription management
- ✅ MFA support
- ✅ Email verification

## 🔜 Upcoming Features

- ⏳ WebSocket for real-time job updates
- ⏳ Email notifications on job completion
- ⏳ Advanced analytics dashboard
- ⏳ Booking system
- ⏳ Messaging between buyers and listers
- ⏳ Content moderation system

## 💡 Quick Commands

```bash
# Development
npm run dev                      # Start dev server
npm run build                    # Build for production
npm start                        # Start production server

# Database
npm run prisma:migrate           # Run migrations
npm run prisma:studio            # Open Prisma Studio

# Testing
npm test                         # Run tests (to be implemented)
```

## 📞 Contact

For questions or support, contact the development team.

---

**Made with ❤️ for real estate professionals**
