# AIPIX API Quick Reference - Role-Based Endpoints

## Base URL

```
http://localhost:4000/api
```

## Authentication Header

All protected endpoints require:

```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Endpoints

### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe",
  "primaryRole": "BUYER"  // optional: "BUYER" (default) or "LISTER"
}

Response: 201
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "mfaCode": "123456"  // optional, if MFA enabled
}

Response: 200
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>

Response: 200
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "isEmailVerified": true,
    "mfaEnabled": false,
    "primaryRole": "BUYER",
    "roles": ["BUYER"],
    "onboardingComplete": false,
    "organizationId": null
  }
}
```

---

## 🎭 Role Management Endpoints

### Switch Role

```http
POST /auth/switch-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "LISTER"  // or "BUYER"
}

Response: 200
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "primaryRole": "LISTER",
    "roles": ["BUYER", "LISTER"],
    "emailVerifiedAt": "2024-01-15T10:00:00Z",
    "onboardingComplete": true
  }
}

Errors:
- 400: Invalid role
- 403: Role not available (user doesn't have this role)
```

### Add Role to Account

```http
POST /auth/add-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "LISTER"  // adds LISTER role to BUYER account
}

Response: 200
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "primaryRole": "LISTER",  // automatically switches to new role
    "roles": ["BUYER", "LISTER"],
    "emailVerifiedAt": "2024-01-15T10:00:00Z",
    "onboardingComplete": false
  },
  "message": "LISTER role added successfully"
}

Errors:
- 400: Invalid role or role already exists
```

### Get Available Roles

```http
GET /auth/available-roles
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "current": "BUYER",
    "available": ["BUYER"],
    "canAdd": ["LISTER"]
  }
}
```

### Complete Onboarding

```http
POST /auth/complete-onboarding
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "primaryRole": "BUYER",
    "roles": ["BUYER"],
    "onboardingComplete": true
  }
}
```

---

## 📁 Project Endpoints (LISTER Only)

### Create Project

```http
POST /projects
Authorization: Bearer <token>
Content-Type: application/json
Requires: LISTER or ADMIN role

{
  "name": "Sunset Villa Project",
  "clientName": "ABC Realty",
  "notes": "Luxury property in downtown"
}

Response: 201
{
  "project": {
    "id": 1,
    "userId": 1,
    "name": "Sunset Villa Project",
    "clientName": "ABC Realty",
    "notes": "Luxury property in downtown",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}

Errors:
- 401: Not authenticated
- 403: Access denied (not a LISTER)
```

### Upload Images to Project

```http
POST /projects/:id/images/upload-multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data
Requires: LISTER or ADMIN role

Form Data:
- files: [file1.jpg, file2.jpg, ...]
- label: "Living Room" (optional)

Response: 201
{
  "images": [
    {
      "id": 1,
      "projectId": 1,
      "originalUrl": "https://s3.../image1.jpg",
      "label": "Living Room",
      "createdAt": "2024-01-15T10:00:00Z"
    },
    ...
  ]
}
```

---

## ✨ Enhancement Endpoints (LISTER Only)

### Create Enhancement Jobs

```http
POST /enhancement/jobs
Authorization: Bearer <token>
Content-Type: application/json
Requires: LISTER or ADMIN role

{
  "projectId": 1,
  "imageIds": [1, 2, 3]
}

Response: 201
{
  "jobs": [
    {
      "id": 1,
      "userId": 1,
      "projectId": 1,
      "imageId": 1,
      "status": "PENDING",
      "createdAt": "2024-01-15T10:00:00Z"
    },
    ...
  ]
}

Errors:
- 402: Insufficient credits
- 404: Project not found
```

---

## 🏠 Listing Endpoints

### Create Listing (LISTER Only)

```http
POST /listings
Authorization: Bearer <token>
Content-Type: application/json
Requires: LISTER or ADMIN role

{
  "projectId": 1,
  "title": "Modern Downtown Apartment",
  "description": "Beautiful 3BR apartment...",
  "price": 450000,
  "currency": "USD",
  "locationCity": "Chicago",
  "locationState": "IL",
  "locationCountry": "USA",
  "propertyType": "Apartment",
  "bedrooms": 3,
  "bathrooms": 2,
  "areaSqm": 111.5
}

Response: 201
{
  "listing": {
    "id": 1,
    "userId": 1,
    "projectId": 1,
    "title": "Modern Downtown Apartment",
    "price": 450000,
    "status": "DRAFT",
    "isPublished": false,
    ...
  }
}
```

### Browse Marketplace (Public)

```http
GET /listings/marketplace/listings?city=Chicago&minPrice=200000&maxPrice=600000
No authentication required

Response: 200
{
  "listings": [
    {
      "id": 1,
      "title": "Modern Downtown Apartment",
      "price": 450000,
      "bedrooms": 3,
      "bathrooms": 2,
      "locationCity": "Chicago",
      "media": [
        {
          "id": 1,
          "isHero": true,
          "imageVersion": {
            "url": "https://s3.../enhanced-image.jpg"
          }
        }
      ]
    },
    ...
  ]
}
```

### Get Listing Detail (Public)

```http
GET /listings/marketplace/listings/:id
No authentication required

Response: 200
{
  "listing": {
    "id": 1,
    "title": "Modern Downtown Apartment",
    "description": "Beautiful 3BR apartment...",
    "price": 450000,
    "bedrooms": 3,
    "bathrooms": 2,
    "media": [...],
    "project": {...}
  }
}
```

---

## 💳 Billing Endpoints

### Get Available Plans

```http
GET /billing/plans
Authorization: Bearer <token>

Response: 200
{
  "plans": [
    {
      "id": 1,
      "name": "Starter",
      "description": "Perfect for getting started",
      "monthlyPriceUsd": "29.00",
      "maxAiCredits": 50,
      "maxStorageMb": 5120,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    ...
  ]
}
```

### Subscribe to Plan

```http
POST /billing/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": 1
}

Response: 201
{
  "subscription": {
    "id": 1,
    "userId": 1,
    "planId": 1,
    "startDate": "2024-01-15T10:00:00Z",
    "isActive": true,
    "plan": {
      "name": "Starter",
      "maxAiCredits": 50
    }
  }
}
```

### Get My Usage

```http
GET /billing/me/usage
Authorization: Bearer <token>

Response: 200
{
  "usage": {
    "subscriptionId": 1,
    "plan": {
      "id": 1,
      "name": "Starter",
      "maxAiCredits": 50
    },
    "usage": {
      "usedCredits": 12,
      "remainingCredits": 38
    }
  }
}
```

---

## 🔑 Role Access Matrix

| Endpoint                     | BUYER | LISTER | ADMIN |
| ---------------------------- | ----- | ------ | ----- |
| POST /auth/register          | ✅    | ✅     | ✅    |
| GET /auth/me                 | ✅    | ✅     | ✅    |
| POST /auth/switch-role       | ✅    | ✅     | ✅    |
| POST /auth/add-role          | ✅    | ✅     | ✅    |
| GET /projects                | ❌    | ✅     | ✅    |
| POST /projects               | ❌    | ✅     | ✅    |
| POST /enhancement/jobs       | ❌    | ✅     | ✅    |
| POST /listings               | ❌    | ✅     | ✅    |
| GET /listings/marketplace/\* | ✅    | ✅     | ✅    |
| GET /billing/\*              | ✅    | ✅     | ✅    |

---

## 🚨 Common Error Codes

| Code | Message       | Description                     |
| ---- | ------------- | ------------------------------- |
| 400  | Invalid role  | Role must be BUYER or LISTER    |
| 401  | Unauthorized  | Missing or invalid token        |
| 403  | Access denied | User doesn't have required role |
| 404  | Not found     | Resource doesn't exist          |
| 409  | Conflict      | Email already registered        |

---

## 📝 User Flow Examples

### Scenario 1: New User Registers as Buyer

```
1. POST /auth/register { primaryRole: "BUYER" }
2. POST /auth/verify-email { token }
3. GET /auth/me → roles: ["BUYER"]
4. GET /listings/marketplace/listings → ✅ Browse
5. POST /projects → ❌ 403 Access denied
```

### Scenario 2: Buyer Becomes Lister

```
1. POST /auth/add-role { role: "LISTER" }
2. GET /auth/me → roles: ["BUYER", "LISTER"], primaryRole: "LISTER"
3. POST /billing/subscribe { planId: 1 }
4. POST /projects { name: "My Project" } → ✅ Works!
5. POST /auth/switch-role { role: "BUYER" } → Switch back to browsing
```

### Scenario 3: Lister Creates Full Workflow

```
1. POST /projects → Create project
2. POST /projects/:id/images/upload-multiple → Upload photos
3. POST /enhancement/jobs → Enhance images
4. POST /listings → Create listing
5. POST /listings/:id/media → Attach enhanced images
6. PATCH /listings/:id { status: "PUBLISHED" } → Publish
```

---

## 🧪 Testing with cURL

### Register as Lister

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lister@example.com",
    "password": "password123",
    "displayName": "Jane Lister",
    "primaryRole": "LISTER"
  }'
```

### Switch Role

```bash
curl -X POST http://localhost:4000/api/auth/switch-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"role": "BUYER"}'
```

### Create Project (Must be LISTER)

```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Project",
    "clientName": "Test Client"
  }'
```
