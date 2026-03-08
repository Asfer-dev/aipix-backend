# Marketplace Quick Start Guide

Get started with the AIPix marketplace API in 5 minutes.

## Prerequisites

- Node.js 16+ installed
- PostgreSQL database running
- AIPix backend set up (see main README)
- Authentication configured

## Quick Setup

### 1. Database is Ready

All necessary models already exist in your `prisma/schema.prisma`:

- ✅ Listing
- ✅ ListingMedia
- ✅ ListingFavorite
- ✅ Booking
- ✅ Message

No migration needed!

### 2. Start the Server

```bash
cd d:\aipix-backend
npm run dev
```

The marketplace routes are automatically available at `/api/listings/marketplace/*`

## Test the API

### Public Search (No Auth Required)

#### 1. Basic Search

```bash
curl http://localhost:3000/api/listings/marketplace/search
```

#### 2. Search with Filters

```bash
curl "http://localhost:3000/api/listings/marketplace/search?city=Chicago&minPrice=200000&maxPrice=500000&propertyType=Apartment&minBedrooms=2&sortBy=price&sortOrder=desc"
```

#### 3. Get Featured Listings

```bash
curl http://localhost:3000/api/listings/marketplace/featured?limit=6
```

#### 4. Autocomplete Suggestions

```bash
curl "http://localhost:3000/api/listings/marketplace/suggestions?q=luxury"
```

#### 5. Get Listing Detail

```bash
curl http://localhost:3000/api/listings/marketplace/listings/1
```

#### 6. Get Similar Listings

```bash
curl http://localhost:3000/api/listings/marketplace/listings/1/similar?limit=4
```

---

### Authenticated Endpoints

First, get your authentication token:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Save the token from the response. Use it in the `Authorization` header:

#### 1. Add Favorite

```bash
curl -X POST http://localhost:3000/api/listings/favorites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"listingId": 1}'
```

#### 2. Get My Favorites

```bash
curl http://localhost:3000/api/listings/favorites \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Remove Favorite

```bash
curl -X DELETE http://localhost:3000/api/listings/favorites/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Create Booking

```bash
curl -X POST http://localhost:3000/api/listings/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": 1,
    "requestedStart": "2024-12-10T14:00:00Z",
    "requestedEnd": "2024-12-10T15:00:00Z"
  }'
```

#### 5. Get My Bookings

```bash
curl http://localhost:3000/api/listings/bookings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 6. Send Message

```bash
curl -X POST http://localhost:3000/api/listings/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": 1,
    "receiverId": 5,
    "content": "Is this property still available?"
  }'
```

#### 7. Get Conversations

```bash
curl http://localhost:3000/api/listings/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Lister Endpoints (Requires LISTER Role)

#### 1. Create Listing

```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Authorization: Bearer LISTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
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
    "areaSqm": 120
  }'
```

#### 2. Create Listing with Media

```bash
curl -X POST http://localhost:3000/api/listings/listings-with-media \
  -H "Authorization: Bearer LISTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "title": "Luxury Downtown Apartment",
    "description": "Beautiful 2BR",
    "price": 550000,
    "currency": "USD",
    "locationCity": "Chicago",
    "propertyType": "Apartment",
    "bedrooms": 2,
    "bathrooms": 2,
    "areaSqm": 120,
    "imageVersionIds": [1, 2, 3],
    "heroImageVersionId": 1
  }'
```

#### 3. Update Listing

```bash
curl -X PATCH http://localhost:3000/api/listings/1 \
  -H "Authorization: Bearer LISTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "price": 575000,
    "isPublished": true,
    "status": "PUBLISHED"
  }'
```

#### 4. Get Received Bookings

```bash
curl http://localhost:3000/api/listings/bookings/received \
  -H "Authorization: Bearer LISTER_TOKEN"
```

#### 5. Confirm Booking

```bash
curl -X PATCH http://localhost:3000/api/listings/bookings/1/status \
  -H "Authorization: Bearer LISTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED"}'
```

---

## Common Use Cases

### Use Case 1: Homepage Featured Listings

Display featured listings on your homepage:

```javascript
// Frontend code
async function loadFeaturedListings() {
  const response = await fetch(
    "http://localhost:3000/api/listings/marketplace/featured?limit=6",
  );
  const data = await response.json();
  displayListings(data.listings);
}
```

### Use Case 2: Search with Multiple Filters

Implement advanced search:

```javascript
async function searchListings(filters) {
  const params = new URLSearchParams({
    search: filters.query,
    city: filters.city,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    propertyType: filters.propertyType.join(","),
    minBedrooms: filters.minBedrooms,
    sortBy: "price",
    sortOrder: "desc",
    page: filters.page,
    limit: 20,
  });

  const response = await fetch(
    `http://localhost:3000/api/listings/marketplace/search?${params}`,
  );
  const data = await response.json();
  return data;
}
```

### Use Case 3: Listing Detail with Similar Listings

Show listing detail and recommendations:

```javascript
async function loadListingDetail(listingId) {
  // Get listing detail
  const listingResponse = await fetch(
    `http://localhost:3000/api/listings/marketplace/listings/${listingId}`,
  );
  const listing = await listingResponse.json();

  // Get similar listings
  const similarResponse = await fetch(
    `http://localhost:3000/api/listings/marketplace/listings/${listingId}/similar?limit=4`,
  );
  const similar = await similarResponse.json();

  return { listing, similar };
}
```

### Use Case 4: Autocomplete Search

Implement search autocomplete:

```javascript
async function getSearchSuggestions(query) {
  if (query.length < 2) return [];

  const response = await fetch(
    `http://localhost:3000/api/listings/marketplace/suggestions?q=${encodeURIComponent(query)}&limit=10`,
  );
  const data = await response.json();

  return [
    ...data.listings.map((l) => ({ type: "listing", ...l })),
    ...data.cities.map((c) => ({ type: "city", name: c })),
    ...data.propertyTypes.map((t) => ({ type: "type", name: t })),
  ];
}
```

### Use Case 5: Favorite Listings

Manage favorites:

```javascript
async function toggleFavorite(listingId, isFavorited) {
  const token = localStorage.getItem("authToken");

  if (isFavorited) {
    // Remove favorite
    await fetch(`http://localhost:3000/api/listings/favorites/${listingId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } else {
    // Add favorite
    await fetch("http://localhost:3000/api/listings/favorites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });
  }
}
```

### Use Case 6: Book a Viewing

Schedule property viewing:

```javascript
async function bookViewing(listingId, startTime, endTime) {
  const token = localStorage.getItem("authToken");

  const response = await fetch("http://localhost:3000/api/listings/bookings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      listingId,
      requestedStart: startTime.toISOString(),
      requestedEnd: endTime.toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}
```

### Use Case 7: Send Message

Contact lister:

```javascript
async function sendMessage(listingId, receiverId, content) {
  const token = localStorage.getItem("authToken");

  const response = await fetch("http://localhost:3000/api/listings/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      listingId,
      receiverId,
      content,
    }),
  });

  return await response.json();
}
```

---

## Testing with Postman

### Import Collection

1. Open Postman
2. Import the endpoints from `MARKETPLACE_API.md`
3. Set up environment variables:
   - `baseUrl`: `http://localhost:3000`
   - `authToken`: Your JWT token
   - `listerToken`: Lister JWT token

### Sample Requests

Create a new Postman collection with these requests:

**1. Search Listings**

- Method: GET
- URL: `{{baseUrl}}/api/listings/marketplace/search?city=Chicago&minPrice=200000&maxPrice=500000`

**2. Get Featured**

- Method: GET
- URL: `{{baseUrl}}/api/listings/marketplace/featured?limit=6`

**3. Add Favorite**

- Method: POST
- URL: `{{baseUrl}}/api/listings/favorites`
- Headers: `Authorization: Bearer {{authToken}}`
- Body: `{"listingId": 1}`

---

## Troubleshooting

### Error: "Unauthorized"

- Make sure you're sending the `Authorization: Bearer <token>` header
- Check that your token is valid and not expired
- For lister endpoints, ensure your user has the LISTER role

### Error: "Listing not found"

- The listing may not exist
- The listing may not be published (for public endpoints)
- Check the listing ID is correct

### Error: "Booking conflict"

- The requested time slot is already booked
- Choose a different time or date

### Error: "CANNOT_BOOK_OWN_LISTING"

- You're trying to book your own listing
- Use a different account (buyer account)

### Empty Search Results

- Try broadening your filters
- Check that listings exist in the database
- Ensure listings are published (`isPublished: true`, `status: 'PUBLISHED'`)

---

## Next Steps

1. **Read Full API Documentation**: See `MARKETPLACE_API.md`
2. **Review Implementation**: See `MARKETPLACE_IMPLEMENTATION.md`
3. **Create Test Data**: Add some listings to test with
4. **Build Frontend**: Integrate with React/Vue/Angular
5. **Add Analytics**: Track search queries and popular listings

---

## Support

For issues or questions:

- Check error messages carefully
- Review `MARKETPLACE_API.md` for detailed endpoint documentation
- Check database for data integrity
- Verify authentication tokens are valid

## Example Response Formats

### Search Response

```json
{
  "listings": [...],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "hasMore": true
}
```

### Favorites Response

```json
{
  "favorites": [...],
  "total": 12,
  "page": 1,
  "totalPages": 1,
  "hasMore": false
}
```

### Bookings Response

```json
{
  "bookings": [...],
  "total": 5,
  "page": 1,
  "totalPages": 1,
  "hasMore": false
}
```

### Conversations Response

```json
{
  "conversations": [
    {
      "listingId": 1,
      "listing": {...},
      "otherUser": {...},
      "lastMessage": {...},
      "messageCount": 5
    }
  ]
}
```

---

Happy coding! 🚀
