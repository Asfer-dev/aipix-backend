# 🏡 Mock Listings Quick Start

## Run the Seed

```bash
npm run seed:listings
# or
npx prisma db seed
```

## What You Get

- ✅ 1 test user: `test-lister@aipix.com`
- ✅ 7 projects (categories)
- ✅ 22 realistic property listings
- ✅ Image search keywords for each listing

## Property Types Included

| Type          | Count | Examples                                                                             |
| ------------- | ----- | ------------------------------------------------------------------------------------ |
| Luxury        | 3     | Malibu villa, Manhattan penthouse, Lake Tahoe house                                  |
| Urban         | 3     | LA loft, SF studio, Boston townhouse                                                 |
| International | 7     | Barcelona, Bali, Paris, Dubai, Islamabad farmhouse, Karachi apartment, Lahore haveli |
| Affordable    | 2     | Austin apartment, Portland bungalow                                                  |
| Investment    | 2     | Denver duplex, Smoky Mountains cabin                                                 |
| Unique        | 3     | Brooklyn warehouse, tiny house, Victorian fixer                                      |
| Suburban      | 2     | Virginia colonial, Phoenix ranch                                                     |

## Finding Images

### Each listing has 6 keyword phrases for image searches

**Example:** "Stunning Modern Villa with Ocean View"

Search these on [Unsplash](https://unsplash.com) or [Pexels](https://pexels.com):

1. `modern luxury villa ocean view`
2. `infinity pool sunset malibu`
3. `contemporary beach house exterior`
4. `luxury living room floor to ceiling windows`
5. `modern kitchen marble countertops`
6. `master bedroom ocean view balcony`

## Full Keywords List

### 📍 Location 1: Malibu Villa

```
modern luxury villa ocean view
infinity pool sunset malibu
contemporary beach house exterior
luxury living room floor to ceiling windows
modern kitchen marble countertops
master bedroom ocean view balcony
```

### 📍 Location 2: Manhattan Penthouse

```
manhattan penthouse skyline view
luxury apartment new york city
modern penthouse interior design
rooftop terrace new york skyline
italian marble floors luxury apartment
floor to ceiling windows city view
```

### 📍 Location 3: Lake Tahoe House

```
lake house modern architecture
waterfront property private dock
luxury cabin interior design
stone fireplace living room windows
lake view bedroom retreat
wooden deck lake sunset
```

### 📍 Location 4: LA Arts District Loft

```
industrial loft exposed brick
urban apartment open concept kitchen
hardwood floors high ceilings loft
modern loft bedroom design
arts district apartment balcony
stainless steel kitchen industrial
```

### 📍 Location 5: San Francisco Studio

```
modern studio apartment minimalist
murphy bed small space design
compact kitchen european style
studio apartment city view
smart home apartment technology
rooftop lounge urban living
```

### 📍 Location 6: Boston Townhouse

```
family townhouse brick exterior
suburban garden backyard
cozy living room fireplace
updated kitchen granite counters
kids bedroom bright windows
finished basement rec room
```

### 📍 Location 7: Barcelona Beach Apartment

```
barcelona beachfront apartment terrace
mediterranean balcony sea view
catalan interior design modern
barceloneta beach apartment
spanish coastal living room
european kitchen tile backsplash
```

### 📍 Location 8: Bali Villa

```
bali villa tropical garden pool
balinese traditional architecture
outdoor shower tropical bathroom
rice field view villa terrace
open air living room indonesia
yoga pavilion bali retreat
```

### 📍 Location 9: Paris Le Marais

```
paris apartment herringbone floors
french haussmann architecture interior
juliet balcony paris street view
historic apartment crown molding
parisian living room fireplace
le marais apartment classic design
```

### 📍 Location 10: Dubai Marina Condo

```
dubai marina condo view skyscrapers
luxury apartment marble bathroom
modern balcony city lights night
contemporary living room dubai
floor to ceiling windows marina view
high rise apartment interior design
```

### 📍 Location 11: Islamabad Farmhouse (PKR)

```
islamabad farmhouse mountain view
pakistani architecture veranda garden
margalla hills property landscape
luxury pakistani home interior
traditional courtyard modern design
islamabad house mountain backdrop
```

### 📍 Location 12: Karachi Apartment (PKR)

```
bahria town karachi apartment modern
luxury pakistan apartment interior
modular kitchen marble floors
gated community karachi residential
contemporary bedroom pakistan design
high rise balcony karachi view
```

### 📍 Location 13: Lahore Haveli (PKR)

```
lahore haveli traditional architecture
mughal era courtyard aangan
hand carved wooden doors pakistan
jharoka balcony old city lahore
heritage building pakistan interior
walled city lahore historic home
```

### 📍 Location 14: Austin Starter Apartment

```
affordable apartment living room
compact bedroom efficient layout
small kitchen modern appliances
community pool apartment complex
starter home first apartment
tidy bathroom updated fixtures
```

### 📍 Location 15: Portland Bungalow

```
craftsman bungalow exterior porch
hardwood floors original character
cozy bungalow living room fireplace
renovated small kitchen white cabinets
backyard grass trees fence
vintage bathroom subway tile
```

### 📍 Location 16: Denver Duplex

```
duplex exterior two units
rental property investment house
simple living room neutral decor
basic kitchen rental unit
backyard duplex separate entrances
clean bathroom rental apartment
```

### 📍 Location 17: Smoky Mountains Cabin

```
mountain cabin smoky mountains exterior
hot tub deck mountain view
rustic living room stone fireplace
cabin bedroom cozy quilts
game room pool table cabin
wrap around porch rocking chairs
```

### 📍 Location 18: Brooklyn Warehouse Loft

```
industrial warehouse loft exposed brick
artist studio high ceilings
converted warehouse interior open space
steel beams industrial architecture
loft bedroom mezzanine
creative workspace large windows
```

### 📍 Location 19: Boulder Tiny House

```
tiny house on wheels exterior
tiny house interior clever storage
loft bedroom tiny home
compact kitchen tiny house
solar panels eco friendly home
minimalist living small space
```

### 📍 Location 20: Detroit Victorian

```
victorian house exterior turret
historic home ornate woodwork
stained glass window victorian
pocket doors antique hardware
fixer upper historic home
grand staircase victorian architecture
```

### 📍 Location 21: Fairfax Colonial

```
colonial house brick exterior
suburban family home landscaping
formal dining room chandelier
family room fireplace built-ins
master bedroom suite walk-in closet
finished basement entertainment room
```

### 📍 Location 22: Phoenix Ranch

```
ranch house pool backyard arizona
open floor plan vaulted ceilings
single story home patio
updated kitchen white cabinets
swimming pool desert landscaping
bright living room glass doors
```

## Upload Images After Download

```bash
# Upload to project
curl -X POST http://localhost:4000/api/projects/{PROJECT_ID}/images/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "label=Living Room"
```

## View Seeded Data

```bash
# All marketplace listings
curl http://localhost:4000/api/marketplace

# Filter by location
curl "http://localhost:4000/api/marketplace?city=Malibu"

# Filter by price
curl "http://localhost:4000/api/marketplace?minPrice=1000000&maxPrice=3000000"
```

---

**Full Documentation:** See [MOCK_DATA_README.md](./MOCK_DATA_README.md)
