# 🏗️ AIPix Backend - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           AIPix Backend                              │
│                    Node.js + Express + TypeScript                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼───────┐         ┌─────────▼────────┐       ┌─────────▼────────┐
│  PostgreSQL   │         │   AWS S3         │       │   Python AI      │
│   Database    │         │  Image Storage   │       │    Backend       │
│   (Prisma)    │         └──────────────────┘       └──────────────────┘
└───────────────┘
```

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API Layer (Routes)                           │
│  /auth  /billing  /projects  /listings  /jobs  /enhancement         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────────┐
│                    Controller Layer                                  │
│  Request validation, Authentication, Response formatting             │
└────────────────────────┬────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────────┐
│                     Service Layer                                    │
│                                                                      │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐            │
│  │ Marketplace  │  │   Favorites   │  │   Bookings   │            │
│  │   Service    │  │    Service    │  │   Service    │            │
│  │  (580 lines) │  │  (190 lines)  │  │  (370 lines) │            │
│  └──────────────┘  └───────────────┘  └──────────────┘            │
│                                                                      │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐            │
│  │  Messages    │  │  Job Queue    │  │  AI Client   │            │
│  │   Service    │  │   Service     │  │   Service    │            │
│  │  (200 lines) │  │  (620 lines)  │  │  (250 lines) │            │
│  └──────────────┘  └───────────────┘  └──────────────┘            │
└────────────────────────┬────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────────┐
│                    Data Layer (Prisma)                               │
│  User, Listing, Job, Booking, Message, Favorite, etc.               │
└─────────────────────────────────────────────────────────────────────┘
```

## Marketplace System Flow

### 1. Public Search Flow

```
┌─────────┐     GET /marketplace/search     ┌──────────────┐
│         │────────────────────────────────▶│   Search     │
│ Browser │                                  │  Controller  │
│         │◀────────────────────────────────│              │
└─────────┘     listings + pagination       └──────┬───────┘
                                                    │
                                            ┌───────▼────────┐
                                            │  Marketplace   │
                                            │    Service     │
                                            │                │
                                            │  • Build query │
                                            │  • Apply filters
                                            │  • Sort results│
                                            │  • Paginate    │
                                            └───────┬────────┘
                                                    │
                                            ┌───────▼────────┐
                                            │    Prisma      │
                                            │   (Database)   │
                                            └────────────────┘
```

### 2. Favorites Flow

```
┌─────────┐     POST /favorites       ┌──────────────┐
│ Buyer   │─────────────────────────▶│  Favorites   │
│         │  {listingId: 1}          │  Controller  │
│         │                           │              │
│         │◀─────────────────────────│  • Validate  │
└─────────┘  favorite created         │  • Check auth│
                                      └──────┬───────┘
                                             │
                                     ┌───────▼────────┐
                                     │  Favorites     │
                                     │   Service      │
                                     │                │
                                     │ • Check exists │
                                     │ • Check dupe   │
                                     │ • Create       │
                                     └───────┬────────┘
                                             │
                                     ┌───────▼────────┐
                                     │  Database      │
                                     │  INSERT INTO   │
                                     │ ListingFavorite│
                                     └────────────────┘
```

### 3. Booking Flow

```
┌─────────┐  POST /bookings           ┌──────────────┐
│ Buyer   │──────────────────────────▶│   Booking    │
│         │  {listingId, start, end}  │  Controller  │
│         │                            │              │
│         │◀──────────────────────────│  • Validate  │
└─────────┘  booking created           │  • Check auth│
                                       └──────┬───────┘
                                              │
                                      ┌───────▼────────┐
                                      │  Booking       │
                                      │   Service      │
                                      │                │
                                      │ • Validate date│
                                      │ • Check conflict
                                      │ • Create (PENDING)
                                      └───────┬────────┘
                ┌─────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────┐
│              Database Transaction                      │
│                                                        │
│  1. Check for conflicting bookings                    │
│  2. Create new booking (status: PENDING)              │
│  3. Return booking with listing details               │
└────────────────────────────────────────────────────────┘
```

### 4. Messaging Flow

```
┌─────────┐  POST /messages           ┌──────────────┐
│ Buyer/  │──────────────────────────▶│   Message    │
│ Lister  │  {listingId, receiverId,  │  Controller  │
│         │   content}                 │              │
│         │                            │              │
│         │◀──────────────────────────│              │
└─────────┘  message sent              └──────┬───────┘
                                              │
                                      ┌───────▼────────┐
                                      │  Messages      │
                                      │   Service      │
                                      │                │
                                      │ • Validate     │
                                      │ • Check access │
                                      │ • Create msg   │
                                      └───────┬────────┘
                                              │
                                      ┌───────▼────────┐
                                      │  Database      │
                                      │  INSERT INTO   │
                                      │    Message     │
                                      └────────────────┘
```

## Job Queue System Flow

```
┌─────────┐  POST /jobs               ┌──────────────┐
│ Lister  │──────────────────────────▶│     Job      │
│         │  {projectId, imageId,     │  Controller  │
│         │   type, parameters}        │              │
│         │                            │              │
│         │◀──────────────────────────│              │
└─────────┘  job created (QUEUED)      └──────┬───────┘
                                              │
                                      ┌───────▼────────┐
                                      │  Job Queue     │
                                      │   Service      │
                                      │                │
                                      │ • Validate     │
                                      │ • Check credits│
                                      │ • Create job   │
                                      │ • Queue        │
                                      └───────┬────────┘
                                              │
                ┌─────────────────────────────┴─────────────────┐
                │                                               │
                ▼                                               ▼
        ┌───────────────┐                              ┌────────────────┐
        │   Database    │                              │  Queue Loop    │
        │               │                              │                │
        │ INSERT job    │                              │ 1. Get next job│
        │ (QUEUED)      │                              │ 2. Update to   │
        └───────────────┘                              │    RUNNING     │
                                                       │ 3. Process     │
                                                       │ 4. Bill credits│
                                                       │ 5. Update to   │
                                                       │    COMPLETED   │
                                                       └────────┬───────┘
                                                                │
                                                        ┌───────▼────────┐
                                                        │  AI Service    │
                                                        │    Client      │
                                                        │                │
                                                        │ HTTP POST to   │
                                                        │ Python backend │
                                                        └────────────────┘
```

## Data Model Relationships

```
User
 ├─1:N─▶ Project
 │       └─1:N─▶ Image
 │               └─1:N─▶ ImageVersion
 │                       └─1:N─▶ ListingMedia
 │
 ├─1:N─▶ Listing
 │       ├─1:N─▶ ListingMedia
 │       ├─1:N─▶ ListingFavorite
 │       ├─1:N─▶ Booking
 │       └─1:N─▶ Message
 │
 ├─1:N─▶ Job
 │
 ├─1:N─▶ Subscription
 │       └─N:1─▶ Plan
 │
 ├─1:N─▶ ListingFavorite
 ├─1:N─▶ Booking (as buyer)
 ├─1:N─▶ Message (as sender)
 └─1:N─▶ Message (as receiver)
```

## Authentication Flow

```
┌─────────┐  POST /auth/login         ┌──────────────┐
│ Client  │──────────────────────────▶│     Auth     │
│         │  {email, password}        │  Controller  │
│         │                            │              │
│         │◀──────────────────────────│              │
└─────────┘  {token, user}             └──────┬───────┘
                                              │
                                      ┌───────▼────────┐
                                      │  Auth Service  │
                                      │                │
                                      │ • Find user    │
                                      │ • Verify pwd   │
                                      │ • Generate JWT │
                                      └────────────────┘

┌─────────┐  GET /listings            ┌──────────────┐
│ Client  │──────────────────────────▶│     Auth     │
│         │  Header: Bearer <token>   │  Middleware  │
│         │                            │              │
│         │                            │ • Verify JWT │
│         │                            │ • Check role │
│         │                            │ • Attach user│
│         │                            └──────┬───────┘
│         │                                   │
│         │                            ┌──────▼───────┐
│         │◀───────────────────────────│  Controller  │
└─────────┘                            └──────────────┘
```

## API Route Organization

```
/api
├── /auth
│   ├── POST   /register
│   ├── POST   /login
│   ├── POST   /mfa/setup
│   ├── POST   /mfa/verify
│   └── POST   /password-reset
│
├── /billing
│   ├── GET    /plans
│   ├── POST   /subscribe
│   ├── GET    /credits
│   └── POST   /add-credits
│
├── /projects
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PATCH  /:id
│   └── DELETE /:id
│
├── /listings
│   ├── Public Marketplace
│   │   ├── GET    /marketplace/search
│   │   ├── GET    /marketplace/featured
│   │   ├── GET    /marketplace/suggestions
│   │   ├── GET    /marketplace/listings/:id
│   │   └── GET    /marketplace/listings/:id/similar
│   │
│   ├── Lister (LISTER role required)
│   │   ├── GET    /
│   │   ├── POST   /
│   │   ├── POST   /listings-with-media
│   │   ├── GET    /:id
│   │   ├── PATCH  /:id
│   │   ├── POST   /:id/media
│   │   ├── GET    /bookings/received
│   │   └── PATCH  /bookings/:id/status
│   │
│   └── Buyer/User (Auth required)
│       ├── POST   /favorites
│       ├── DELETE /favorites/:listingId
│       ├── GET    /favorites
│       ├── POST   /bookings
│       ├── GET    /bookings
│       ├── GET    /bookings/:id
│       ├── POST   /bookings/:id/cancel
│       ├── POST   /messages
│       ├── GET    /messages/conversations
│       └── GET    /messages/:listingId/:userId
│
└── /jobs
    ├── POST   /
    ├── POST   /batch
    ├── GET    /
    ├── GET    /:id
    ├── POST   /:id/cancel
    └── GET    /queue/status (ADMIN only)
```

## Performance Optimizations

### Database Level

```
┌────────────────────────────────────┐
│         Optimization               │
├────────────────────────────────────┤
│ ✓ Indexes on frequently queried   │
│   fields (status, isPublished,     │
│   location, etc.)                  │
│                                    │
│ ✓ Composite indexes for common    │
│   filter combinations              │
│                                    │
│ ✓ Selective includes (only hero   │
│   images in list views)            │
│                                    │
│ ✓ Aggregate queries for stats     │
│                                    │
│ ✓ Case-insensitive search mode    │
└────────────────────────────────────┘
```

### Application Level

```
┌────────────────────────────────────┐
│         Optimization               │
├────────────────────────────────────┤
│ ✓ Promise.all for parallel queries│
│                                    │
│ ✓ Pagination (max 100 items/page) │
│                                    │
│ ✓ Efficient query building         │
│   (dynamic WHERE clauses)          │
│                                    │
│ ✓ Response size optimization       │
│   (only necessary fields)          │
└────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layer 1                      │
│                   Network/Transport                      │
│  • HTTPS/TLS encryption                                 │
│  • CORS configuration                                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Security Layer 2                      │
│                   Authentication                         │
│  • JWT tokens with expiration                           │
│  • Password hashing (bcrypt)                            │
│  • MFA support                                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Security Layer 3                      │
│                   Authorization                          │
│  • Role-based access control                            │
│  • Resource ownership checks                            │
│  • Route-level middleware                               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Security Layer 4                      │
│                   Input Validation                       │
│  • Type checking                                        │
│  • Parameter validation                                 │
│  • SQL injection prevention (Prisma)                    │
│  • XSS prevention                                       │
└─────────────────────────────────────────────────────────┘
```

## Deployment Architecture (Recommended)

```
┌──────────────────────────────────────────────────────────┐
│                     Load Balancer                         │
│                      (nginx/AWS ALB)                      │
└────────────────┬─────────────────────────┬────────────────┘
                 │                         │
     ┌───────────▼──────────┐  ┌──────────▼───────────┐
     │   Node.js Instance 1 │  │ Node.js Instance 2   │
     │   (AIPix Backend)    │  │  (AIPix Backend)     │
     └───────────┬──────────┘  └──────────┬───────────┘
                 │                         │
     ┌───────────┴─────────────────────────┴───────────┐
     │                                                  │
     │              PostgreSQL Database                 │
     │           (RDS/Managed PostgreSQL)               │
     │                                                  │
     └──────────────────────────────────────────────────┘

     ┌──────────────────────────────────────────────────┐
     │                  AWS S3                          │
     │            (Image Storage)                       │
     └──────────────────────────────────────────────────┘

     ┌──────────────────────────────────────────────────┐
     │              Python AI Backend                    │
     │         (Separate service/container)              │
     └──────────────────────────────────────────────────┘

     ┌──────────────────────────────────────────────────┐
     │                Redis (Optional)                   │
     │      (Caching, Session Management)               │
     └──────────────────────────────────────────────────┘
```

## Technology Stack Summary

```
┌─────────────────────────────────────────────────────────┐
│ Language:      TypeScript                               │
│ Runtime:       Node.js 16+                              │
│ Framework:     Express.js v5                            │
│ Database:      PostgreSQL                               │
│ ORM:           Prisma                                   │
│ Auth:          JWT (jsonwebtoken)                       │
│ Storage:       AWS S3                                   │
│ AI Backend:    Python FastAPI                           │
│ Email:         Nodemailer                               │
│ Testing:       (To be added)                            │
│ Docs:          Markdown                                 │
└─────────────────────────────────────────────────────────┘
```

## Monitoring & Logging (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│ Application Logs                                        │
│  • Request/Response logging                             │
│  • Error logging                                        │
│  • Performance metrics                                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Database Monitoring                                     │
│  • Query performance                                    │
│  • Connection pool stats                                │
│  • Slow query log                                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Business Metrics                                        │
│  • Search queries                                       │
│  • Popular listings                                     │
│  • Booking conversion rates                             │
│  • Message response times                               │
└─────────────────────────────────────────────────────────┘
```

---

**Legend:**

- `─▶` : One-way flow
- `◀─` : Response/callback
- `1:N` : One-to-many relationship
- `N:1` : Many-to-one relationship
- `✓` : Implemented
- `○` : Recommended/Optional

This architecture supports:

- ✅ High availability
- ✅ Horizontal scaling
- ✅ Performance optimization
- ✅ Security best practices
- ✅ Modern real estate marketplace features
