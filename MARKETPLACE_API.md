# Marketplace API Documentation

Comprehensive API reference for the AIPix real estate marketplace backend.

## Table of Contents

- [Public Marketplace Routes](#public-marketplace-routes)
- [Lister Routes](#lister-routes)
- [Buyer/User Routes](#buyeruser-routes)
- [Data Models](#data-models)
- [Error Codes](#error-codes)

---

## Public Marketplace Routes

These routes are publicly accessible without authentication.

### 1. Advanced Search

Search listings with complex filtering, sorting, and pagination.

**Endpoint:** `GET /api/listings/marketplace/search`

**Query Parameters:**

| Parameter           | Type         | Description                                                  | Example            |
| ------------------- | ------------ | ------------------------------------------------------------ | ------------------ |
| `search`            | string       | Text search (title, description, location, type)             | `luxury apartment` |
| `city`              | string       | Filter by city (case-insensitive)                            | `Chicago`          |
| `state`             | string       | Filter by state (case-insensitive)                           | `Illinois`         |
| `country`           | string       | Filter by country (case-insensitive)                         | `USA`              |
| `minPrice`          | number       | Minimum price                                                | `200000`           |
| `maxPrice`          | number       | Maximum price                                                | `500000`           |
| `currency`          | string       | Currency code                                                | `USD`              |
| `propertyType`      | string/array | Property type(s) (comma-separated)                           | `Apartment,Condo`  |
| `minBedrooms`       | number       | Minimum bedrooms                                             | `2`                |
| `maxBedrooms`       | number       | Maximum bedrooms                                             | `4`                |
| `minBathrooms`      | number       | Minimum bathrooms                                            | `1`                |
| `maxBathrooms`      | number       | Maximum bathrooms                                            | `3`                |
| `minArea`           | number       | Minimum area in sqm                                          | `50`               |
| `maxArea`           | number       | Maximum area in sqm                                          | `200`              |
| `hasVirtualStaging` | boolean      | Filter by virtual staging                                    | `true`             |
| `hasEnhancedPhotos` | boolean      | Filter by enhanced photos                                    | `true`             |
| `sortBy`            | string       | Sort field: `price`, `date`, `bedrooms`, `area`, `relevance` | `price`            |
| `sortOrder`         | string       | Sort direction: `asc`, `desc`                                | `desc`             |
| `page`              | number       | Page number (1-based)                                        | `1`                |
| `limit`             | number       | Items per page (max 100)                                     | `20`               |

**Example Request:**

```bash
GET /api/listings/marketplace/search?search=luxury&city=Chicago&minPrice=300000&maxPrice=800000&propertyType=Apartment,Condo&minBedrooms=2&hasEnhancedPhotos=true&sortBy=price&sortOrder=desc&page=1&limit=20
```

**Response:**

```json
{
  "listings": [
    {
      "id": 1,
      "title": "Luxury Downtown Apartment",
      "description": "Beautiful 2BR with stunning views",
      "price": 550000,
      "currency": "USD",
      "locationCity": "Chicago",
      "locationState": "Illinois",
      "locationCountry": "USA",
      "propertyType": "Apartment",
      "bedrooms": 2,
      "bathrooms": 2,
      "areaSqm": 120,
      "heroImage": {
        "id": 1,
        "url": "https://s3.../image.jpg",
        "width": 1920,
        "height": 1080
      },
      "favoriteCount": 15,
      "bookingCount": 3,
      "createdAt": "2024-12-01T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "hasMore": true
}
```

---

### 2. Get Listing Detail

Get detailed information about a specific listing.

**Endpoint:** `GET /api/listings/marketplace/listings/:id`

**Response:**

```json
{
  "listing": {
    "id": 1,
    "title": "Luxury Downtown Apartment",
    "description": "Beautiful 2BR with stunning views...",
    "price": 550000,
    "currency": "USD",
    "locationCity": "Chicago",
    "locationState": "Illinois",
    "locationCountry": "USA",
    "propertyType": "Apartment",
    "bedrooms": 2,
    "bathrooms": 2,
    "areaSqm": 120,
    "media": [
      {
        "id": 1,
        "isHero": true,
        "sortOrder": 0,
        "imageVersion": {
          "id": 1,
          "url": "https://s3.../image1.jpg",
          "width": 1920,
          "height": 1080
        }
      },
      {
        "id": 2,
        "isHero": false,
        "sortOrder": 1,
        "imageVersion": {
          "id": 2,
          "url": "https://s3.../image2.jpg",
          "width": 1920,
          "height": 1080
        }
      }
    ],
    "user": {
      "id": 5,
      "displayName": "John Doe"
    },
    "project": {
      "id": 10,
      "name": "Chicago Luxury Properties"
    },
    "favoriteCount": 15,
    "bookingCount": 3,
    "createdAt": "2024-12-01T10:00:00Z"
  }
}
```

---

### 3. Get Similar Listings

Find listings similar to a given listing.

**Endpoint:** `GET /api/listings/marketplace/listings/:id/similar`

**Query Parameters:**

- `limit` (number, default: 4) - Number of similar listings to return

**Similarity Algorithm:**

- City match: +3 points
- State match: +2 points
- Property type match: +2 points
- Price within ±30%: Points based on proximity

**Response:**

```json
{
  "listings": [
    {
      "id": 2,
      "title": "Modern Condo Downtown",
      "price": 525000,
      "locationCity": "Chicago",
      "propertyType": "Condo",
      "bedrooms": 2,
      "heroImage": { ... },
      "similarityScore": 8
    }
  ]
}
```

---

### 4. Get Featured Listings

Get featured listings for homepage or landing pages.

**Endpoint:** `GET /api/listings/marketplace/featured`

**Query Parameters:**

- `limit` (number, default: 6) - Number of featured listings

**Response:**

```json
{
  "listings": [
    {
      "id": 1,
      "title": "Luxury Downtown Apartment",
      "price": 550000,
      "locationCity": "Chicago",
      "propertyType": "Apartment",
      "heroImage": { ... },
      "favoriteCount": 15,
      "bookingCount": 3
    }
  ]
}
```

---

### 5. Search Suggestions (Autocomplete)

Get search suggestions for autocomplete functionality.

**Endpoint:** `GET /api/listings/marketplace/suggestions`

**Query Parameters:**

- `q` (string, required) - Search query (min 2 characters)
- `limit` (number, default: 10) - Total suggestions to return

**Response:**

```json
{
  "listings": [
    {
      "id": 1,
      "title": "Luxury Downtown Apartment",
      "type": "listing"
    }
  ],
  "cities": ["Chicago", "Charlotte", "Charleston"],
  "propertyTypes": ["Apartment", "Condo"]
}
```

---

## Lister Routes

These routes require authentication and LISTER role.

### 1. Create Listing

**Endpoint:** `POST /api/listings`

**Headers:**

- `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "projectId": 10,
  "title": "Luxury Downtown Apartment",
  "description": "Beautiful 2BR...",
  "price": 550000,
  "currency": "USD",
  "locationCity": "Chicago",
  "locationState": "Illinois",
  "locationCountry": "USA",
  "propertyType": "Apartment",
  "bedrooms": 2,
  "bathrooms": 2,
  "areaSqm": 120
}
```

**Response:**

```json
{
  "listing": {
    "id": 1,
    "projectId": 10,
    "title": "Luxury Downtown Apartment",
    ...
  }
}
```

---

### 2. Create Listing with Media

Create listing and attach media in one request.

**Endpoint:** `POST /api/listings/listings-with-media`

**Request Body:**

```json
{
  "projectId": 10,
  "title": "Luxury Downtown Apartment",
  "description": "Beautiful 2BR...",
  "price": 550000,
  "currency": "USD",
  "locationCity": "Chicago",
  "locationState": "Illinois",
  "locationCountry": "USA",
  "propertyType": "Apartment",
  "bedrooms": 2,
  "bathrooms": 2,
  "areaSqm": 120,
  "imageVersionIds": [1, 2, 3, 4],
  "heroImageVersionId": 1
}
```

---

### 3. List My Listings

**Endpoint:** `GET /api/listings`

**Response:**

```json
{
  "listings": [
    {
      "id": 1,
      "title": "Luxury Downtown Apartment",
      "status": "DRAFT",
      "isPublished": false,
      ...
    }
  ]
}
```

---

### 4. Update Listing

**Endpoint:** `PATCH /api/listings/:id`

**Request Body:**

```json
{
  "title": "Updated Title",
  "price": 575000,
  "isPublished": true,
  "status": "PUBLISHED"
}
```

---

### 5. Attach Media

**Endpoint:** `POST /api/listings/:id/media`

**Request Body:**

```json
{
  "imageVersionIds": [1, 2, 3],
  "heroImageVersionId": 1
}
```

---

### 6. Get Received Bookings

Get bookings for your listings (as lister).

**Endpoint:** `GET /api/listings/bookings/received`

**Query Parameters:**

- `status` - Filter by status: `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`
- `listingId` - Filter by specific listing
- `page` - Page number
- `limit` - Items per page

**Response:**

```json
{
  "bookings": [
    {
      "id": 1,
      "listingId": 5,
      "buyerId": 10,
      "status": "PENDING",
      "requestedStart": "2024-12-10T14:00:00Z",
      "requestedEnd": "2024-12-10T15:00:00Z",
      "listing": { ... },
      "buyer": {
        "id": 10,
        "displayName": "Jane Smith",
        "email": "jane@example.com"
      },
      "createdAt": "2024-12-01T10:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "totalPages": 2
}
```

---

### 7. Update Booking Status

Confirm or reject a booking (as lister).

**Endpoint:** `PATCH /api/listings/bookings/:id/status`

**Request Body:**

```json
{
  "status": "CONFIRMED"
}
```

**Possible statuses:** `CONFIRMED`, `REJECTED`, `CANCELLED`

---

## Buyer/User Routes

These routes require authentication (any role).

### 1. Add Favorite

**Endpoint:** `POST /api/listings/favorites`

**Request Body:**

```json
{
  "listingId": 5
}
```

**Response:**

```json
{
  "favorite": {
    "id": 1,
    "userId": 10,
    "listingId": 5,
    "createdAt": "2024-12-01T10:00:00Z",
    "listing": { ... }
  }
}
```

---

### 2. Remove Favorite

**Endpoint:** `DELETE /api/listings/favorites/:listingId`

**Response:**

```json
{
  "success": true
}
```

---

### 3. Get My Favorites

**Endpoint:** `GET /api/listings/favorites`

**Query Parameters:**

- `page` - Page number
- `limit` - Items per page

**Response:**

```json
{
  "favorites": [
    {
      "id": 1,
      "title": "Luxury Downtown Apartment",
      "price": 550000,
      "favorited": true,
      "favoritedAt": "2024-12-01T10:00:00Z",
      "heroImage": { ... }
    }
  ],
  "total": 12,
  "page": 1,
  "totalPages": 2
}
```

---

### 4. Create Booking

**Endpoint:** `POST /api/listings/bookings`

**Request Body:**

```json
{
  "listingId": 5,
  "requestedStart": "2024-12-10T14:00:00Z",
  "requestedEnd": "2024-12-10T15:00:00Z"
}
```

**Response:**

```json
{
  "booking": {
    "id": 1,
    "listingId": 5,
    "buyerId": 10,
    "status": "PENDING",
    "requestedStart": "2024-12-10T14:00:00Z",
    "requestedEnd": "2024-12-10T15:00:00Z",
    "listing": { ... },
    "buyer": { ... }
  }
}
```

---

### 5. Get My Bookings

Get bookings you created (as buyer).

**Endpoint:** `GET /api/listings/bookings`

**Query Parameters:**

- `status` - Filter by status
- `page` - Page number
- `limit` - Items per page

**Response:** Similar to "Get Received Bookings"

---

### 6. Cancel Booking

**Endpoint:** `POST /api/listings/bookings/:id/cancel`

**Response:**

```json
{
  "booking": {
    "id": 1,
    "status": "CANCELLED",
    ...
  }
}
```

---

### 7. Send Message

**Endpoint:** `POST /api/listings/messages`

**Request Body:**

```json
{
  "listingId": 5,
  "receiverId": 15,
  "content": "Is this property still available?"
}
```

**Response:**

```json
{
  "message": {
    "id": 1,
    "listingId": 5,
    "senderId": 10,
    "receiverId": 15,
    "content": "Is this property still available?",
    "sender": {
      "id": 10,
      "displayName": "Jane Smith"
    },
    "receiver": {
      "id": 15,
      "displayName": "John Doe"
    },
    "listing": {
      "id": 5,
      "title": "Luxury Downtown Apartment",
      ...
    },
    "createdAt": "2024-12-01T10:00:00Z"
  }
}
```

---

### 8. Get Conversation

Get messages between you and another user for a specific listing.

**Endpoint:** `GET /api/listings/messages/:listingId/:userId`

**Response:**

```json
{
  "messages": [
    {
      "id": 1,
      "content": "Is this property still available?",
      "senderId": 10,
      "sender": {
        "id": 10,
        "displayName": "Jane Smith"
      },
      "createdAt": "2024-12-01T10:00:00Z"
    },
    {
      "id": 2,
      "content": "Yes, it is! Would you like to schedule a viewing?",
      "senderId": 15,
      "sender": {
        "id": 15,
        "displayName": "John Doe"
      },
      "createdAt": "2024-12-01T10:05:00Z"
    }
  ]
}
```

---

### 9. Get All Conversations

Get all your conversations grouped by listing and user.

**Endpoint:** `GET /api/listings/messages/conversations`

**Response:**

```json
{
  "conversations": [
    {
      "listingId": 5,
      "listing": {
        "id": 5,
        "title": "Luxury Downtown Apartment",
        "media": [...]
      },
      "otherUser": {
        "id": 15,
        "displayName": "John Doe"
      },
      "lastMessage": {
        "id": 2,
        "content": "Yes, it is! Would you like to schedule a viewing?",
        "createdAt": "2024-12-01T10:05:00Z"
      },
      "messageCount": 5
    }
  ]
}
```

---

## Data Models

### Listing

```typescript
{
  id: number;
  userId: number;
  projectId: number;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Booking

```typescript
{
  id: number;
  listingId: number;
  buyerId: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  requestedStart: Date;
  requestedEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Message

```typescript
{
  id: number;
  listingId: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: Date;
}
```

---

## Error Codes

| Status Code | Error                          | Description                            |
| ----------- | ------------------------------ | -------------------------------------- |
| 400         | `Invalid listing id`           | Listing ID is not a valid number       |
| 400         | `Already favorited`            | Listing is already in favorites        |
| 400         | `Cannot book your own listing` | User is the listing owner              |
| 400         | `Invalid dates`                | Start/end dates are invalid            |
| 400         | `Missing required fields`      | Required fields are missing            |
| 400         | `Invalid status`               | Booking status is invalid              |
| 400         | `Message content required`     | Message content is empty               |
| 400         | `Message too long`             | Message exceeds 5000 characters        |
| 401         | `Unauthorized`                 | No authentication token provided       |
| 403         | `Not your booking`             | User doesn't have access to booking    |
| 403         | `Access denied`                | User doesn't have access to resource   |
| 404         | `Listing not found`            | Listing doesn't exist or not published |
| 404         | `Not favorited`                | Listing is not in favorites            |
| 404         | `Booking not found`            | Booking doesn't exist                  |
| 404         | `Receiver not found`           | Message receiver doesn't exist         |
| 409         | `Booking conflict`             | Time slot is already booked            |
| 500         | `Internal server error`        | Unexpected server error                |

---

## Best Practices

### 1. Pagination

- Always use pagination for list endpoints
- Default limit is 20, max is 100
- Use `hasMore` field to determine if there are more results

### 2. Search Performance

- Use specific filters to reduce result set
- Text search is case-insensitive
- Consider using autocomplete suggestions first

### 3. Real-time Updates

- Poll bookings endpoint for status updates
- Check conversations endpoint for new messages
- Implement WebSocket for real-time features (future)

### 4. Image Optimization

- Hero images are optimized for listing cards
- Full media array available in detail view
- Consider lazy loading for media galleries

### 5. Error Handling

- Always check status codes
- Handle 401/403 by redirecting to login
- Show user-friendly messages for 400/409 errors
