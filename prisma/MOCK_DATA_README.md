# Mock Listings Data Guide

This directory contains realistic mock data for populating your AIPIX database with demo listings.

## 📁 Files

- **`seed-listings.ts`** - TypeScript seed script that creates users, projects, and 22 realistic listings
- **`mock-listings-data.json`** - JSON reference file with all listing data and image search keywords

## 🌱 Running the Seed Script

### Prerequisites

1. **Database connected** - Ensure your `.env` has valid `DATABASE_URL`
2. **Prisma migrations applied** - Run `npx prisma migrate dev` or `npx prisma db push`
3. **Prisma client generated** - Run `npx prisma generate`

### Execute the Seed

```bash
# Option 1: Using tsx (recommended)
npx tsx prisma/seed-listings.ts

# Option 2: Using ts-node
npx ts-node prisma/seed-listings.ts

# Option 3: Add to package.json and use prisma seed
# Add to package.json:
#   "prisma": {
#     "seed": "tsx prisma/seed-listings.ts"
#   }
# Then run:
npx prisma db seed
```

### What Gets Created

1. **Test User** (`test-lister@aipix.com`)
   - Role: `LISTER`
   - Password: (fake hash - update in production)
   - Phone: `+1-555-0100`

2. **7 Projects** (categories):
   - Luxury Properties Portfolio
   - Urban Living Collection
   - International Properties
   - Affordable Housing
   - Investment Properties
   - Unique & Specialty Homes
   - Suburban Family Homes

3. **22 Listings** across all categories:
   - Luxury villas, penthouses, lake houses
   - Urban lofts, studios, townhouses
   - International properties (Barcelona, Bali, Paris, Dubai, Islamabad, Karachi, Lahore)
   - Affordable starter homes
   - Investment/rental properties
   - Unique properties (tiny house, warehouse loft, Victorian)
   - Suburban family homes

## 🖼️ Finding Images

Each listing includes **image search keywords** optimized for stock photo sites.

### Free Stock Photo Sites

1. **[Unsplash](https://unsplash.com/)** - High-quality, free to use
2. **[Pexels](https://pexels.com/)** - Free stock photos and videos
3. **[Pixabay](https://pixabay.com/)** - Free images and vectors

### Paid Stock Photo Sites

1. **[Shutterstock](https://shutterstock.com/)** - Premium stock photos
2. **[Adobe Stock](https://stock.adobe.com/)** - Adobe-integrated stock library
3. **[Getty Images](https://gettyimages.com/)** - Professional photography

### Example: Finding Images for "Stunning Modern Villa"

**Keywords provided:**

```json
[
  "modern luxury villa ocean view",
  "infinity pool sunset malibu",
  "contemporary beach house exterior",
  "luxury living room floor to ceiling windows",
  "modern kitchen marble countertops",
  "master bedroom ocean view balcony"
]
```

**Steps:**

1. Go to [Unsplash.com](https://unsplash.com)
2. Search for each keyword (6 searches = 6 images)
3. Download high-resolution images
4. Upload to project via API: `POST /api/projects/{projectId}/images/upload`

## 📊 Listing Categories Breakdown

| Category               | Count | Price Range     | Property Types                                       |
| ---------------------- | ----- | --------------- | ---------------------------------------------------- |
| **Luxury Properties**  | 3     | $1.85M - $8.5M  | Villa, Penthouse, Lake House                         |
| **Urban Apartments**   | 3     | $425K - $895K   | Loft, Studio, Townhouse                              |
| **International**      | 7     | €650K - PKR 85M | Beach apt, Villa, Historic, Condo, Farmhouse, Haveli |
| **Affordable/Starter** | 2     | $245K - $385K   | Apartment, Bungalow                                  |
| **Investment/Rental**  | 2     | $425K - $565K   | Duplex, Cabin                                        |
| **Unique/Specialty**   | 3     | $75K - $725K    | Warehouse, Tiny House, Victorian                     |
| **Suburban Family**    | 2     | $625K - $745K   | Colonial, Ranch                                      |

## 🔍 Using Mock Data

### View All Listings (API)

```bash
# Get marketplace listings
curl http://localhost:4000/api/marketplace

# With filters
curl "http://localhost:4000/api/marketplace?city=Malibu&propertyType=Villa&minPrice=1000000"

# Search by keyword
curl "http://localhost:4000/api/marketplace?search=ocean view luxury"
```

### Login as Test User

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-lister@aipix.com",
    "password": "YourTestPassword123!"
  }'

# Returns JWT token - use for authenticated requests
```

### Upload Images to Projects

```bash
# Upload single image
curl -X POST http://localhost:4000/api/projects/1/images/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/villa-exterior.jpg" \
  -F "label=Front Exterior View"

# Upload multiple images
curl -X POST http://localhost:4000/api/projects/1/images/upload-multiple \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@villa-exterior.jpg" \
  -F "files=@villa-living-room.jpg" \
  -F "files=@villa-pool.jpg"
```

## 📝 Customizing Mock Data

### Modify Listings

Edit `seed-listings.ts` to customize:

```typescript
// Change listing details
{
  title: "Your Custom Title",
  price: 1500000,
  locationCity: "Your City",
  // ...
}

// Add more listings
mockListings.push({
  title: "New Listing",
  // ...
});
```

### Add Your Own Images

Replace image keywords with your own:

```typescript
imageKeywords: [
  "your custom search term 1",
  "your custom search term 2",
  // ...
];
```

### Change Test User Credentials

Update the test user creation:

```typescript
testUser = await prisma.user.create({
  data: {
    email: "your-email@example.com",
    passwordHash: await bcrypt.hash("YourPassword123!", 10),
    displayName: "Your Name",
    // ...
  },
});
```

## 🧹 Cleaning Up

### Delete Seeded Data

```bash
# Delete all listings from seed
npx prisma studio
# Navigate to Listing table, filter by userId = test user ID, delete all

# Or use Prisma Client:
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
await prisma.listing.deleteMany({ where: { user: { email: 'test-lister@aipix.com' } } });
await prisma.project.deleteMany({ where: { user: { email: 'test-lister@aipix.com' } } });
await prisma.user.delete({ where: { email: 'test-lister@aipix.com' } });
await prisma.\$disconnect();
"
```

### Reset Entire Database

```bash
# Warning: This deletes ALL data!
npx prisma migrate reset
```

## 🎨 Image Keywords by Property Type

### Luxury Properties

- Ocean views, infinity pools, marble countertops
- Floor-to-ceiling windows, panoramic views
- High-end finishes, smart home technology

### Urban Living

- Exposed brick, industrial design, lofts
- Rooftop terraces, city skylines
- Modern minimalist, small space design

### International

- Mediterranean terraces, tropical gardens
- European architecture, historic interiors
- Exotic locations, cultural aesthetics

### Family Homes

- Suburban exteriors, landscaped yards
- Kid-friendly spaces, finished basements
- Cozy fireplaces, updated kitchens

### Unique Properties

- Warehouse conversions, tiny houses
- Victorian architecture, artistic spaces
- Eco-friendly features, unconventional designs

## 💡 Tips for Best Results

1. **Download High Resolution** - Choose the largest available size (4K+ recommended)
2. **Use Multiple Keywords** - Each listing has 6 keywords for variety
3. **Match the Vibe** - Luxury listings need luxury photos, rustic listings need rustic photos
4. **Interior + Exterior** - Get both outdoor and indoor shots
5. **Consider Lighting** - Natural daylight photos typically perform best
6. **Stage Properly** - Choose well-staged, furnished rooms when possible

## 🚀 Next Steps After Seeding

1. ✅ Run seed script
2. ✅ Download images using provided keywords
3. ✅ Upload images to corresponding projects
4. ✅ Test AI enhancement on uploaded images
5. ✅ Generate ad copy for listings
6. ✅ Test marketplace search and filters
7. ✅ Test booking and messaging features

## 📚 Related Documentation

- **[PROJECTS_AND_LISTINGS_API.md](../PROJECTS_AND_LISTINGS_API.md)** - Full API documentation
- **[USAGE_TRACKING_API.md](../USAGE_TRACKING_API.md)** - Credits and storage tracking
- **[AD_COPY_GENERATION_API.md](../AD_COPY_GENERATION_API.md)** - AI-powered ad copy

---

**Questions?** Check the main README or contact the development team.
