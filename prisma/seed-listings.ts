/**
 * Mock Listings Seed Data
 *
 * Realistic property listings with search keywords for finding relevant images online.
 *
 * Image Search Keywords are optimized for stock photo sites like:
 * - Unsplash, Pexels, Pixabay (free)
 * - Shutterstock, Adobe Stock (paid)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const mockListings = [
  // ===== LUXURY PROPERTIES =====
  {
    title: "Stunning Modern Villa with Ocean View",
    description:
      "Experience luxury living in this breathtaking 5-bedroom villa featuring floor-to-ceiling windows, infinity pool, and panoramic ocean views. The open-concept design seamlessly blends indoor and outdoor living spaces, with a gourmet kitchen, spa-like bathrooms, and smart home technology throughout. Perfect for families seeking coastal elegance.",
    price: 2500000,
    currency: "USD",
    locationCity: "Malibu",
    locationState: "California",
    locationCountry: "United States",
    propertyType: "Villa",
    bedrooms: 5,
    bathrooms: 4,
    areaSqm: 450,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "modern luxury villa ocean view",
      "infinity pool sunset malibu",
      "contemporary beach house exterior",
      "luxury living room floor to ceiling windows",
      "modern kitchen marble countertops",
      "master bedroom ocean view balcony",
    ],
  },

  {
    title: "Elegant Penthouse in Downtown Manhattan",
    description:
      "Rare opportunity to own a stunning 3-bedroom penthouse in the heart of Manhattan. This residence offers 360-degree city views, 14-foot ceilings, Italian marble flooring, and a private rooftop terrace. The building features 24/7 concierge, fitness center, and valet parking. Walking distance to Central Park, fine dining, and cultural landmarks.",
    price: 8500000,
    currency: "USD",
    locationCity: "New York",
    locationState: "New York",
    locationCountry: "United States",
    propertyType: "Penthouse",
    bedrooms: 3,
    bathrooms: 3,
    areaSqm: 320,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: false,
    imageKeywords: [
      "manhattan penthouse skyline view",
      "luxury apartment new york city",
      "modern penthouse interior design",
      "rooftop terrace new york skyline",
      "italian marble floors luxury apartment",
      "floor to ceiling windows city view",
    ],
  },

  {
    title: "Contemporary Lake House Retreat",
    description:
      "Escape to tranquility in this architect-designed 4-bedroom lake house. Featuring a private dock, boat house, and 180-degree water views. The interior boasts soaring ceilings, a stone fireplace, chef's kitchen, and walls of glass that frame the stunning landscape. Ideal for weekend getaways or year-round living.",
    price: 1850000,
    currency: "USD",
    locationCity: "Lake Tahoe",
    locationState: "Nevada",
    locationCountry: "United States",
    propertyType: "House",
    bedrooms: 4,
    bathrooms: 3,
    areaSqm: 380,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "lake house modern architecture",
      "waterfront property private dock",
      "luxury cabin interior design",
      "stone fireplace living room windows",
      "lake view bedroom retreat",
      "wooden deck lake sunset",
    ],
  },

  // ===== URBAN APARTMENTS =====
  {
    title: "Chic 2-Bedroom Loft in Arts District",
    description:
      "Industrial-chic loft featuring exposed brick, 12-foot ceilings, and original hardwood floors. This light-filled space includes an open kitchen with stainless steel appliances, in-unit washer/dryer, and private balcony. Located in the vibrant Arts District with trendy restaurants, galleries, and nightlife at your doorstep.",
    price: 685000,
    currency: "USD",
    locationCity: "Los Angeles",
    locationState: "California",
    locationCountry: "United States",
    propertyType: "Loft",
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 140,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: false,
    imageKeywords: [
      "industrial loft exposed brick",
      "urban apartment open concept kitchen",
      "hardwood floors high ceilings loft",
      "modern loft bedroom design",
      "arts district apartment balcony",
      "stainless steel kitchen industrial",
    ],
  },

  {
    title: "Modern Studio in Tech District",
    description:
      "Sleek studio apartment perfect for young professionals. Features include smart home integration, Murphy bed, compact European kitchen, and city views. Building amenities include rooftop lounge, co-working spaces, and bike storage. Steps from tech campuses, coffee shops, and public transit.",
    price: 425000,
    currency: "USD",
    locationCity: "San Francisco",
    locationState: "California",
    locationCountry: "United States",
    propertyType: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 45,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: false,
    imageKeywords: [
      "modern studio apartment minimalist",
      "murphy bed small space design",
      "compact kitchen european style",
      "studio apartment city view",
      "smart home apartment technology",
      "rooftop lounge urban living",
    ],
  },

  {
    title: "Spacious Family Townhouse with Garden",
    description:
      "Charming 3-bedroom townhouse with private garden in family-friendly neighborhood. Updated kitchen with granite counters, cozy fireplace in living room, finished basement, and attached garage. Walking distance to top-rated schools, parks, and shopping. Perfect for growing families.",
    price: 895000,
    currency: "USD",
    locationCity: "Boston",
    locationState: "Massachusetts",
    locationCountry: "United States",
    propertyType: "Townhouse",
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 210,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "family townhouse brick exterior",
      "suburban garden backyard",
      "cozy living room fireplace",
      "updated kitchen granite counters",
      "kids bedroom bright windows",
      "finished basement rec room",
    ],
  },

  // ===== INTERNATIONAL PROPERTIES =====
  {
    title: "Beachfront Apartment in Barcelona",
    description:
      "Stunning 2-bedroom apartment on Barcelona's famous Barceloneta Beach. Enjoy Mediterranean views from your private terrace, modern Catalan design, and proximity to La Rambla, Gothic Quarter, and world-class dining. Perfect vacation home or rental investment property.",
    price: 650000,
    currency: "EUR",
    locationCity: "Barcelona",
    locationState: "Catalonia",
    locationCountry: "Spain",
    propertyType: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 95,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: false,
    imageKeywords: [
      "barcelona beachfront apartment terrace",
      "mediterranean balcony sea view",
      "catalan interior design modern",
      "barceloneta beach apartment",
      "spanish coastal living room",
      "european kitchen tile backsplash",
    ],
  },

  {
    title: "Tropical Paradise Villa in Bali",
    description:
      "Immerse yourself in Balinese luxury with this 4-bedroom villa featuring traditional thatched roofs, private pool, and lush tropical gardens. Open-air living spaces, outdoor shower, yoga pavilion, and rice field views. Fully staffed with daily housekeeping. Ultimate island retreat.",
    price: 480000,
    currency: "USD",
    locationCity: "Ubud",
    locationState: "Bali",
    locationCountry: "Indonesia",
    propertyType: "Villa",
    bedrooms: 4,
    bathrooms: 3,
    areaSqm: 350,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "bali villa tropical garden pool",
      "balinese traditional architecture",
      "outdoor shower tropical bathroom",
      "rice field view villa terrace",
      "open air living room indonesia",
      "yoga pavilion bali retreat",
    ],
  },

  {
    title: "Historic Apartment in Paris Le Marais",
    description:
      "Authentic Parisian living in this beautifully restored 2-bedroom apartment in Le Marais. Original 18th-century moldings, herringbone floors, working fireplace, and Juliet balconies. Walking distance to Notre-Dame, Sainte-Chapelle, and trendy boutiques. Rare gem in Paris's most desirable neighborhood.",
    price: 890000,
    currency: "EUR",
    locationCity: "Paris",
    locationState: "Île-de-France",
    locationCountry: "France",
    propertyType: "Apartment",
    bedrooms: 2,
    bathrooms: 1,
    areaSqm: 85,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: false,
    imageKeywords: [
      "paris apartment herringbone floors",
      "french haussmann architecture interior",
      "juliet balcony paris street view",
      "historic apartment crown molding",
      "parisian living room fireplace",
      "le marais apartment classic design",
    ],
  },

  {
    title: "Modern Condo in Dubai Marina",
    description:
      "Luxurious 3-bedroom condo with stunning marina and skyline views. Floor-to-ceiling windows, marble bathrooms, built-in wardrobes, and private balcony. Building offers pool, gym, spa, and concierge. Minutes from Dubai Mall, beaches, and restaurants. Perfect for cosmopolitan lifestyle.",
    price: 1200000,
    currency: "USD",
    locationCity: "Dubai",
    locationState: "Dubai",
    locationCountry: "United Arab Emirates",
    propertyType: "Condo",
    bedrooms: 3,
    bathrooms: 3,
    areaSqm: 180,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "dubai marina condo view skyscrapers",
      "luxury apartment marble bathroom",
      "modern balcony city lights night",
      "contemporary living room dubai",
      "floor to ceiling windows marina view",
      "high rise apartment interior design",
    ],
  },

  {
    title: "Luxury Farmhouse in Islamabad Hills",
    description:
      "Stunning 5-bedroom farmhouse nestled in the scenic Margalla Hills. This property features traditional Pakistani architecture blended with modern amenities, including spacious verandas, landscaped gardens with fruit trees, and breathtaking mountain views. Perfect for families seeking serenity while staying connected to the capital. Includes servant quarters, covered parking for 4 cars, and outdoor entertainment area.",
    price: 85000000,
    currency: "PKR",
    locationCity: "Islamabad",
    locationState: "Islamabad Capital Territory",
    locationCountry: "Pakistan",
    propertyType: "Farmhouse",
    bedrooms: 5,
    bathrooms: 4,
    areaSqm: 465,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "islamabad farmhouse mountain view",
      "pakistani architecture veranda garden",
      "margalla hills property landscape",
      "luxury pakistani home interior",
      "traditional courtyard modern design",
      "islamabad house mountain backdrop",
    ],
  },

  {
    title: "Modern Apartment in Bahria Town Karachi",
    description:
      "Contemporary 3-bedroom apartment in Karachi's premier gated community. Features include Italian-style modular kitchen, marble flooring throughout, central air conditioning, and balcony with community views. Building offers 24/7 security, backup generator, elevators, and covered parking. Close to schools, shopping centers, and healthcare facilities. Ideal for executive families.",
    price: 45000000,
    currency: "PKR",
    locationCity: "Karachi",
    locationState: "Sindh",
    locationCountry: "Pakistan",
    propertyType: "Apartment",
    bedrooms: 3,
    bathrooms: 3,
    areaSqm: 185,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "bahria town karachi apartment modern",
      "luxury pakistan apartment interior",
      "modular kitchen marble floors",
      "gated community karachi residential",
      "contemporary bedroom pakistan design",
      "high rise balcony karachi view",
    ],
  },

  {
    title: "Historic Haveli in Lahore Old City",
    description:
      "Rare opportunity to own a meticulously restored 19th-century haveli in the heart of Lahore's Walled City. This 4-bedroom heritage property showcases original Mughal-era architecture with hand-carved wooden doors, traditional jharoka balconies, central courtyard (aangan), and stunning frescoes. Perfect for heritage enthusiasts or boutique hotel conversion. Within walking distance of Badshahi Mosque, Lahore Fort, and Food Street.",
    price: 35000000,
    currency: "PKR",
    locationCity: "Lahore",
    locationState: "Punjab",
    locationCountry: "Pakistan",
    propertyType: "Haveli",
    bedrooms: 4,
    bathrooms: 3,
    areaSqm: 280,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "lahore haveli traditional architecture",
      "mughal era courtyard aangan",
      "hand carved wooden doors pakistan",
      "jharoka balcony old city lahore",
      "heritage building pakistan interior",
      "walled city lahore historic home",
    ],
  },

  // ===== AFFORDABLE / STARTER HOMES =====
  {
    title: "Cozy 1-Bedroom Starter Apartment",
    description:
      "Affordable first home or investment property! This well-maintained 1-bedroom features updated fixtures, efficient layout, and in-unit laundry. Community pool and parking included. Great location near public transit, grocery stores, and parks. Ideal for first-time buyers.",
    price: 245000,
    currency: "USD",
    locationCity: "Austin",
    locationState: "Texas",
    locationCountry: "United States",
    propertyType: "Apartment",
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 60,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "affordable apartment living room",
      "compact bedroom efficient layout",
      "small kitchen modern appliances",
      "community pool apartment complex",
      "starter home first apartment",
      "tidy bathroom updated fixtures",
    ],
  },

  {
    title: "Renovated Bungalow with Character",
    description:
      "Charming 2-bedroom bungalow with tons of character! Recent updates include new roof, plumbing, and electrical. Original hardwood floors, craftsman details, and large backyard perfect for entertaining. Great starter home in up-and-coming neighborhood.",
    price: 385000,
    currency: "USD",
    locationCity: "Portland",
    locationState: "Oregon",
    locationCountry: "United States",
    propertyType: "Bungalow",
    bedrooms: 2,
    bathrooms: 1,
    areaSqm: 95,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "craftsman bungalow exterior porch",
      "hardwood floors original character",
      "cozy bungalow living room fireplace",
      "renovated small kitchen white cabinets",
      "backyard grass trees fence",
      "vintage bathroom subway tile",
    ],
  },

  // ===== INVESTMENT / RENTAL PROPERTIES =====
  {
    title: "Turnkey Duplex - Great Investment!",
    description:
      "Excellent investment opportunity! Fully occupied duplex with reliable tenants. Each unit features 2 bedrooms, 1 bathroom, separate entrances, and utilities. Recent updates include roof, HVAC, and appliances. Strong rental history and positive cash flow. Don't miss this money-maker!",
    price: 565000,
    currency: "USD",
    locationCity: "Denver",
    locationState: "Colorado",
    locationCountry: "United States",
    propertyType: "Duplex",
    bedrooms: 4, // Total for both units
    bathrooms: 2,
    areaSqm: 180,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: false,
    imageKeywords: [
      "duplex exterior two units",
      "rental property investment house",
      "simple living room neutral decor",
      "basic kitchen rental unit",
      "backyard duplex separate entrances",
      "clean bathroom rental apartment",
    ],
  },

  {
    title: "Vacation Rental in Smoky Mountains",
    description:
      "Profitable Airbnb cabin with mountain views! This 3-bedroom retreat features hot tub, game room, and wrap-around deck. Fully furnished and turnkey - just bring your suitcase! Excellent rental history with 5-star reviews. Perfect investment or personal getaway.",
    price: 425000,
    currency: "USD",
    locationCity: "Gatlinburg",
    locationState: "Tennessee",
    locationCountry: "United States",
    propertyType: "Cabin",
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 150,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "mountain cabin smoky mountains exterior",
      "hot tub deck mountain view",
      "rustic living room stone fireplace",
      "cabin bedroom cozy quilts",
      "game room pool table cabin",
      "wrap around porch rocking chairs",
    ],
  },

  // ===== UNIQUE / SPECIALTY PROPERTIES =====
  {
    title: "Converted Warehouse Live/Work Space",
    description:
      "Creative's dream! This 2,500 sq ft converted warehouse offers soaring 20-foot ceilings, exposed brick, original steel beams, and massive windows. Perfect for artists, photographers, or entrepreneurs needing live/work space. Includes 1 bedroom loft, full kitchen, and flexible open floor plan.",
    price: 725000,
    currency: "USD",
    locationCity: "Brooklyn",
    locationState: "New York",
    locationCountry: "United States",
    propertyType: "Loft",
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 230,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: false,
    imageKeywords: [
      "industrial warehouse loft exposed brick",
      "artist studio high ceilings",
      "converted warehouse interior open space",
      "steel beams industrial architecture",
      "loft bedroom mezzanine",
      "creative workspace large windows",
    ],
  },

  {
    title: "Eco-Friendly Tiny House on Wheels",
    description:
      "Sustainable living at its finest! This custom-built tiny house features solar panels, composting toilet, rainwater collection, and energy-efficient appliances. Clever storage solutions maximize the 320 sq ft space. Includes loft bedroom, full kitchen, and fold-down deck. Freedom to travel while living debt-free!",
    price: 75000,
    currency: "USD",
    locationCity: "Boulder",
    locationState: "Colorado",
    locationCountry: "United States",
    propertyType: "Tiny House",
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 30,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "tiny house on wheels exterior",
      "tiny house interior clever storage",
      "loft bedroom tiny home",
      "compact kitchen tiny house",
      "solar panels eco friendly home",
      "minimalist living small space",
    ],
  },

  {
    title: "Historic Victorian Home - Restore to Glory",
    description:
      "Rare opportunity to restore a magnificent 1890s Victorian! Original features include turret, stained glass, pocket doors, and ornate woodwork. Needs full renovation but has incredible bones and character. 5 bedrooms, 3 bathrooms across 3 floors. Perfect project for history buff or developer.",
    price: 195000,
    currency: "USD",
    locationCity: "Detroit",
    locationState: "Michigan",
    locationCountry: "United States",
    propertyType: "House",
    bedrooms: 5,
    bathrooms: 3,
    areaSqm: 320,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "victorian house exterior turret",
      "historic home ornate woodwork",
      "stained glass window victorian",
      "pocket doors antique hardware",
      "fixer upper historic home",
      "grand staircase victorian architecture",
    ],
  },

  // ===== SUBURBAN FAMILY HOMES =====
  {
    title: "Move-In Ready Colonial in Prime School District",
    description:
      "Beautiful 4-bedroom colonial on quiet cul-de-sac. Formal dining room, eat-in kitchen with granite counters, family room with fireplace, and master suite with walk-in closet. Finished basement, 2-car garage, and professionally landscaped yard. Top-rated schools, neighborhood pool, and tennis courts.",
    price: 745000,
    currency: "USD",
    locationCity: "Fairfax",
    locationState: "Virginia",
    locationCountry: "United States",
    propertyType: "House",
    bedrooms: 4,
    bathrooms: 3,
    areaSqm: 280,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "colonial house brick exterior",
      "suburban family home landscaping",
      "formal dining room chandelier",
      "family room fireplace built-ins",
      "master bedroom suite walk-in closet",
      "finished basement entertainment room",
    ],
  },

  {
    title: "Ranch-Style Home with Pool",
    description:
      "Single-story living at its best! This 3-bedroom ranch features open floor plan, vaulted ceilings, and walls of glass overlooking the sparkling pool and patio. Updated kitchen and bathrooms, hardwood floors throughout, and oversized 2-car garage. Perfect for entertaining or aging-in-place.",
    price: 625000,
    currency: "USD",
    locationCity: "Phoenix",
    locationState: "Arizona",
    locationCountry: "United States",
    propertyType: "Ranch",
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 200,
    status: "PUBLISHED" as const,
    isPublished: true,
    showEmail: true,
    showPhoneNumber: true,
    imageKeywords: [
      "ranch house pool backyard arizona",
      "open floor plan vaulted ceilings",
      "single story home patio",
      "updated kitchen white cabinets",
      "swimming pool desert landscaping",
      "bright living room glass doors",
    ],
  },
];

/**
 * Seed function to populate database with mock listings
 *
 * IMPORTANT: Before running this seed:
 * 1. Ensure you have at least one User with primaryRole='LISTER' in your database
 * 2. Each listing needs an associated Project
 * 3. Update the userId and projectId variables below with real IDs from your database
 *
 * Run with: npx tsx prisma/seed-listings.ts
 */
async function seedListings() {
  try {
    console.log("🌱 Starting listings seed...\n");

    // STEP 1: Find or create a test user (LISTER role)
    let testUser = await prisma.user.findFirst({
      where: { primaryRole: "LISTER", email: "test-lister@aipix.com" },
    });

    if (!testUser) {
      console.log("📝 Creating test lister user...");
      testUser = await prisma.user.create({
        data: {
          email: "test-lister@aipix.com",
          passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz123456", // Fake hash - change in production
          displayName: "Test Lister",
          phoneNumber: "+1-555-0100",
          primaryRole: "LISTER",
          roles: ["LISTER"],
          onboardingComplete: true,
          emailVerifiedAt: new Date(),
        },
      });
      console.log(
        `✅ Created test user: ${testUser.email} (ID: ${testUser.id})\n`,
      );
    } else {
      console.log(
        `✅ Using existing test user: ${testUser.email} (ID: ${testUser.id})\n`,
      );
    }

    // STEP 2: Create projects for each property type category
    const projectCategories = [
      {
        name: "Luxury Properties Portfolio",
        description: "High-end luxury real estate listings",
      },
      {
        name: "Urban Living Collection",
        description: "City apartments and lofts",
      },
      {
        name: "International Properties",
        description: "Global real estate opportunities",
      },
      {
        name: "Affordable Housing",
        description: "Starter homes and first-time buyer properties",
      },
      {
        name: "Investment Properties",
        description: "Rental and investment opportunities",
      },
      {
        name: "Unique & Specialty Homes",
        description: "One-of-a-kind properties",
      },
      {
        name: "Suburban Family Homes",
        description: "Family-friendly neighborhoods",
      },
    ];

    const projects = [];
    for (const category of projectCategories) {
      const project = await prisma.project.create({
        data: {
          userId: testUser.id,
          name: category.name,
          clientName: "AIPIX Demo Portfolio",
          notes: category.description,
        },
      });
      projects.push(project);
      console.log(`📁 Created project: ${project.name} (ID: ${project.id})`);
    }
    console.log("");

    // STEP 3: Create listings with appropriate project assignments
    const projectAssignments = [
      [0, 1, 2], // Luxury (indices 0-2)
      [3, 4, 5], // Urban (indices 3-5)
      [6, 7, 8, 9, 10, 11, 12], // International (indices 6-12, includes Pakistan properties)
      [13, 14], // Affordable (indices 13-14)
      [15, 16], // Investment (indices 15-16)
      [17, 18, 19], // Unique (indices 17-19)
      [20, 21], // Suburban (indices 20-21)
    ];

    let createdCount = 0;
    for (let i = 0; i < projectAssignments.length; i++) {
      const listingIndices = projectAssignments[i];
      const project = projects[i];

      for (const idx of listingIndices) {
        const mockListing = mockListings[idx];

        // Remove imageKeywords from the data sent to Prisma (not in schema)
        const { imageKeywords, ...listingData } = mockListing;

        const listing = await prisma.listing.create({
          data: {
            ...listingData,
            userId: testUser.id,
            projectId: project.id,
            moderationStatus: "APPROVED", // Auto-approve for demo
            autoModerated: true,
            moderatedAt: new Date(),
          },
        });

        createdCount++;
        console.log(
          `✅ Created listing: "${listing.title}" (ID: ${listing.id})`,
        );
        console.log(
          `   📍 ${listing.locationCity}, ${listing.locationCountry}`,
        );
        console.log(
          `   💰 ${listing.currency} ${listing.price?.toLocaleString()}`,
        );
        console.log(`   🏷️  Project: ${project.name}`);
        console.log(`   🔍 Image keywords: ${imageKeywords.join(", ")}`);
        console.log("");
      }
    }

    console.log("═══════════════════════════════════════");
    console.log(`🎉 Successfully created ${createdCount} listings!`);
    console.log(`📧 Test user: ${testUser.email}`);
    console.log(`🔑 User ID: ${testUser.id}`);
    console.log("═══════════════════════════════════════\n");

    console.log("💡 NEXT STEPS:");
    console.log(
      "1. Use the image keywords above to find relevant stock photos",
    );
    console.log(
      "2. Upload images to projects via: POST /api/projects/:id/images/upload",
    );
    console.log("3. View listings via: GET /api/marketplace");
    console.log(
      "4. Test with authenticated user token from test-lister@aipix.com\n",
    );
  } catch (error) {
    console.error("❌ Error seeding listings:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed if this file is executed directly
if (require.main === module) {
  seedListings()
    .then(() => {
      console.log("✅ Seed completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    });
}

export default seedListings;
