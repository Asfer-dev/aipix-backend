# Projects, Images & Listings API

This document covers the full creation flow — from creating a project, uploading property photos, to creating a listing and attaching media — before a listing is ready to be submitted for publish and moderation.

---

## Table of Contents

1. [Overview & Data Model](#overview--data-model)
2. [The Full Creation Flow](#the-full-creation-flow)
3. [Project Routes](#project-routes)
4. [Image Upload Routes](#image-upload-routes)
5. [Listing Routes (Lister)](#listing-routes-lister)
6. [Attaching Media to a Listing](#attaching-media-to-a-listing)
7. [Contact Privacy Controls](#contact-privacy-controls)
8. [Shortcut — Create Listing + Media in One Call](#shortcut--create-listing--media-in-one-call)
9. [Ad Copy Routes](#ad-copy-routes)
10. [Data Models](#data-models)
11. [Error Reference](#error-reference)
12. [Frontend Integration Examples](#frontend-integration-examples)

---

## Overview & Data Model

Everything in AIPIX is organised around **Projects**. A project is the top-level container representing a property shoot or client job.

```
Project
  └─ Images (the raw/original photos)
       └─ ImageVersions (ORIGINAL, ENHANCED, STAGED — created by AI jobs)
  └─ Listings (one or more marketplace listings per project)
       └─ ListingMedia → points to ImageVersions (the polished versions used on the listing)
  └─ AdCopies (marketing copy templates for any channel)
```

**Why this split?**

- You upload images to the **project** once.
- AI enhancement/staging jobs run on those images, creating **ImageVersions**.
- When creating a listing, you pick which **ImageVersions** to attach — so listings always use the best available version of each photo.

---

## The Full Creation Flow

```
1. POST /projects
   └─► Creates a Project

2a. POST /projects/:id/images/upload          (binary file upload — S3)
2b. POST /projects/:id/images/upload-multiple (multiple files — S3)
2c. POST /projects/:id/images                 (if you already have a URL)
    └─► Creates Image + ORIGINAL ImageVersion automatically

3. [Optional] Run AI enhancement/staging jobs
   └─► Creates ENHANCED / STAGED ImageVersions under the same Image

4a. POST /listings                              (create listing only)
    POST /listings/:id/media                    (then attach images separately)
    ─── OR ───
4b. POST /listings/listings-with-media          (create + attach in one step)
    └─► Listing is created as DRAFT, moderationStatus: PENDING

5. POST /listings/:id/publish
   └─► Triggers moderation pipeline → FLAGGED for review or auto-published
```

---

## Project Routes

Base URL: `/projects`  
Auth: Bearer token required. Lister role required on all project routes.

---

### `GET /projects`

List all projects owned by the authenticated user.

**Response `200`**

```json
{
  "projects": [
    {
      "id": 3,
      "userId": 5,
      "name": "Downtown Apartment Shoot",
      "clientName": "John's Real Estate",
      "notes": "March 2026 shoot",
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-03-01T00:00:00.000Z",
      "_count": {
        "images": 12,
        "adCopies": 2,
        "listings": 1
      }
    }
  ]
}
```

---

### `POST /projects`

Create a new project.

**Request Body**

```json
{
  "name": "Downtown Apartment Shoot",
  "clientName": "John's Real Estate",
  "notes": "March 2026 shoot — 3 units"
}
```

| Field        | Required | Description           |
| ------------ | :------: | --------------------- |
| `name`       |    ✅    | Project name          |
| `clientName` |    ❌    | Optional client label |
| `notes`      |    ❌    | Internal notes        |

**Response `201`**

```json
{
  "project": {
    "id": 3,
    "userId": 5,
    "name": "Downtown Apartment Shoot",
    "clientName": "John's Real Estate",
    "notes": "March 2026 shoot — 3 units",
    "createdAt": "2026-03-08T12:00:00.000Z",
    "updatedAt": "2026-03-08T12:00:00.000Z"
  }
}
```

---

### `GET /projects/:id`

Get a single project with all its ad copy variants.

**Response `200`**

```json
{
  "project": {
    "id": 3,
    "name": "Downtown Apartment Shoot",
    "clientName": "John's Real Estate",
    "notes": null,
    "createdAt": "2026-03-08T12:00:00.000Z",
    "adCopies": [
      {
        "id": 1,
        "channel": "AIPIX",
        "title": "Stunning 3BR Downtown",
        "description": "Spacious apartment with floor-to-ceiling windows...",
        "keywords": "downtown, modern, luxury",
        "createdAt": "2026-03-08T12:30:00.000Z"
      }
    ]
  }
}
```

---

## Image Upload Routes

All image upload routes live under `/projects/:id/images/...`.  
Files are uploaded directly to **AWS S3**. The server handles the upload and returns the image record.

When an image is created (by any method), the server automatically creates an `ImageVersion` of type `ORIGINAL` pointing to the same URL. This is the version used if no AI enhancement is run.

---

### `POST /projects/:id/images/upload`

Upload a **single** file to S3.

**Request**: `multipart/form-data`

| Field   | Type   | Required | Description                        |
| ------- | ------ | :------: | ---------------------------------- |
| `file`  | file   |    ✅    | The image file                     |
| `label` | string |    ❌    | Human label (e.g. `"Living room"`) |

**Example (fetch)**

```js
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("label", "Living room");

const res = await fetch(`/projects/${projectId}/images/upload`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

**Response `201`**

```json
{
  "image": {
    "id": 14,
    "projectId": 3,
    "originalUrl": "https://s3.amazonaws.com/aipix/uploads/users/5/projects/3/1741435200-abc123.jpg",
    "label": "Living room",
    "createdAt": "2026-03-08T12:05:00.000Z"
  }
}
```

> The `ORIGINAL` `ImageVersion` is created automatically — you don't need to create it manually. Use `GET /projects/:id/images` to see the version IDs.

---

### `POST /projects/:id/images/upload-multiple`

Upload **multiple** files to S3 in one request.

**Request**: `multipart/form-data`

| Field   | Type   | Required | Description                    |
| ------- | ------ | :------: | ------------------------------ |
| `files` | file[] |    ✅    | One or more image files        |
| `label` | string |    ❌    | Applied to all uploaded images |

**Example (fetch)**

```js
const formData = new FormData();
for (const file of fileInput.files) {
  formData.append("files", file);
}

const res = await fetch(`/projects/${projectId}/images/upload-multiple`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

**Response `201`**

```json
{
  "images": [
    {
      "id": 14,
      "projectId": 3,
      "originalUrl": "https://s3.amazonaws.com/.../1741435200-abc.jpg",
      "label": "living-room.jpg",
      "createdAt": "2026-03-08T12:05:00.000Z"
    },
    {
      "id": 15,
      "projectId": 3,
      "originalUrl": "https://s3.amazonaws.com/.../1741435201-def.jpg",
      "label": "kitchen.jpg",
      "createdAt": "2026-03-08T12:05:01.000Z"
    }
  ]
}
```

---

### `POST /projects/:id/images`

Register an image using an **existing URL** (e.g. from your own CDN or a pre-signed upload).

**Request Body**

```json
{
  "originalUrl": "https://your-cdn.com/photo.jpg",
  "label": "Master bedroom"
}
```

| Field         | Required | Description           |
| ------------- | :------: | --------------------- |
| `originalUrl` |    ✅    | Full URL to the image |
| `label`       |    ❌    | Optional label        |

**Response `201`** — same shape as single upload above.

---

### `GET /projects/:id/images`

List all images for a project, including all their versions (ORIGINAL, ENHANCED, STAGED).

**Response `200`**

```json
{
  "images": [
    {
      "id": 14,
      "projectId": 3,
      "originalUrl": "https://s3.amazonaws.com/.../original.jpg",
      "label": "Living room",
      "createdAt": "2026-03-08T12:05:00.000Z",
      "versions": [
        {
          "id": 21,
          "imageId": 14,
          "type": "ORIGINAL",
          "url": "https://s3.amazonaws.com/.../original.jpg",
          "metadata": null,
          "createdAt": "2026-03-08T12:05:00.000Z"
        },
        {
          "id": 22,
          "imageId": 14,
          "type": "ENHANCED",
          "url": "https://s3.amazonaws.com/.../enhanced.jpg",
          "metadata": { "brightness": 1.2 },
          "createdAt": "2026-03-08T13:00:00.000Z"
        }
      ]
    }
  ]
}
```

> **Key point**: When attaching images to a listing, you use the **`ImageVersion.id`** (e.g. `21` or `22`), not the `Image.id`. This lets you pick exactly which version (original vs AI-enhanced) to show on the listing.

---

## Listing Routes (Lister)

Base URL: `/listings`  
Auth: Bearer token required. Lister role required.

---

### `GET /listings`

Get all listings owned by the authenticated lister. Includes the hero image (or first image by sort order if no hero is marked).

**Response `200`**

```json
{
  "listings": [
    {
      "id": 44,
      "userId": 5,
      "projectId": 3,
      "title": "Modern 3BR Apartment in Downtown",
      "status": "DRAFT",
      "moderationStatus": "PENDING",
      "isPublished": false,
      "price": 3500,
      "currency": "USD",
      "locationCity": "New York",
      "locationState": "NY",
      "locationCountry": "US",
      "propertyType": "APARTMENT",
      "bedrooms": 3,
      "bathrooms": 2,
      "areaSqm": 110,
      "media": [
        {
          "id": 1,
          "listingId": 44,
          "imageVersionId": 22,
          "isHero": true,
          "sortOrder": 0,
          "imageVersion": {
            "id": 22,
            "imageId": 14,
            "type": "ENHANCED",
            "url": "https://s3.amazonaws.com/.../enhanced.jpg"
          }
        }
      ],
      "createdAt": "2026-03-08T12:00:00.000Z",
      "updatedAt": "2026-03-08T12:00:00.000Z"
    }
  ]
}
```

---

### `POST /listings`

Create a new listing. Always starts as `DRAFT` with `moderationStatus: "PENDING"`. No AI runs, no publish — just creates the record.

**Request Body**

```json
{
  "projectId": 3,
  "title": "Modern 3BR Apartment in Downtown",
  "description": "Spacious apartment with floor-to-ceiling windows and stunning city views.",
  "price": 3500,
  "currency": "USD",
  "locationCity": "New York",
  "locationState": "NY",
  "locationCountry": "US",
  "propertyType": "APARTMENT",
  "bedrooms": 3,
  "bathrooms": 2,
  "areaSqm": 110,
  "showEmail": true,
  "showPhoneNumber": false
}
```

| Field             | Required | Type    | Description                               |
| ----------------- | :------: | ------- | ----------------------------------------- |
| `projectId`       |    ✅    | number  | Must be a project owned by this user      |
| `title`           |    ✅    | string  | Listing headline                          |
| `description`     |    ❌    | string  | Full description                          |
| `price`           |    ❌    | number  | Monthly rent / sale price                 |
| `currency`        |    ❌    | string  | e.g. `"USD"`, `"NGN"`                     |
| `locationCity`    |    ❌    | string  | City name                                 |
| `locationState`   |    ❌    | string  | State / region                            |
| `locationCountry` |    ❌    | string  | Country code or name                      |
| `propertyType`    |    ❌    | string  | e.g. `"APARTMENT"`, `"HOUSE"`, `"STUDIO"` |
| `bedrooms`        |    ❌    | number  | Bedroom count                             |
| `bathrooms`       |    ❌    | number  | Bathroom count                            |
| `areaSqm`         |    ❌    | number  | Floor area in m²                          |
| `showEmail`       |    ❌    | boolean | Show lister's email to buyers (default: `true`) |
| `showPhoneNumber` |    ❌    | boolean | Show lister's phone to buyers (default: `false`) |

**Response `201`**

```json
{
  "listing": {
    "id": 44,
    "userId": 5,
    "projectId": 3,
    "title": "Modern 3BR Apartment in Downtown",
    "status": "DRAFT",
    "moderationStatus": "PENDING",
    "isPublished": false,
    "price": 3500,
    "currency": "USD",
    "locationCity": "New York",
    "locationState": "NY",
    "locationCountry": "US",
    "propertyType": "APARTMENT",
    "bedrooms": 3,
    "bathrooms": 2,
    "areaSqm": 110,
    "moderationScore": null,
    "aiModerationFlags": [],
    "autoModerated": false,
    "moderatedAt": null,
    "createdAt": "2026-03-08T12:00:00.000Z",
    "updatedAt": "2026-03-08T12:00:00.000Z"
  }
}
```

---

### `GET /listings/:id`

Get a single listing owned by the authenticated lister, including its media and image version details.

**Response `200`**

```json
{
  "listing": {
    "id": 44,
    "title": "Modern 3BR Apartment in Downtown",
    "status": "DRAFT",
    "moderationStatus": "PENDING",
    "isPublished": false,
    "media": [
      {
        "id": 1,
        "listingId": 44,
        "imageVersionId": 22,
        "isHero": true,
        "sortOrder": 0,
        "imageVersion": {
          "id": 22,
          "imageId": 14,
          "type": "ENHANCED",
          "url": "https://s3.amazonaws.com/.../enhanced.jpg"
        }
      }
    ]
  }
}
```

---

### `PATCH /listings/:id`

Update listing details. All fields optional — only send what changed.

> ⚠️ Do **not** send `status: "PUBLISHED"` — it will be blocked with a `400`. Use `POST /listings/:id/publish` instead.

**Request Body** (all optional)

```json
{
  "title": "Spacious 3BR Apartment — Downtown Manhattan",
  "price": 3800,
  "description": "Updated description with more detail...",
  "showEmail": false,
  "showPhoneNumber": true
}
```

**Supported Fields:**
- All listing data fields (title, description, price, location, property details)
- `showEmail` - Control whether your email is shown to buyers
- `showPhoneNumber` - Control whether your phone number is shown to buyers

**Response `200`**

```json
{
  "listing": {
    "id": 44,
    "title": "Spacious 3BR Apartment — Downtown Manhattan",
    "price": 3800,
    "status": "DRAFT",
    "showEmail": false,
    "showPhoneNumber": true
  }
}
```

---

## Contact Privacy Controls

### Overview

When creating or updating a listing, you can control what contact information is visible to buyers:

- **`showEmail`** (default: `true`) - When enabled, buyers can see your email address when viewing the listing detail
- **`showPhoneNumber`** (default: `false`) - When enabled, buyers can see your phone number when viewing the listing detail

### How It Works

**Lister View (Owner):**
- When you view your own listings via `GET /listings` or `GET /listings/:id`, you always see all your information

**Buyer View (Marketplace):**
- When buyers view a listing via marketplace routes (e.g., `GET /marketplace/listings/:id`), the API only returns contact information based on your privacy settings:
  - If `showEmail: false` → Email is **not included** in the response
  - If `showPhoneNumber: false` → Phone number is **not included** in the response
  - Display name is **always shown** (buyers need to know who the lister is)

### Example Use Cases

**Conservative Privacy (default):**
```json
{
  "showEmail": true,
  "showPhoneNumber": false
}
```
→ Buyers can email you, but must use the booking system for calls

**Maximum Visibility:**
```json
{
  "showEmail": true,
  "showPhoneNumber": true
}
```
→ Buyers can contact you via email or phone directly

**Booking System Only:**
```json
{
  "showEmail": false,
  "showPhoneNumber": false
}
```
→ Buyers must use the platform's messaging and booking system to contact you

---

## Attaching Media to a Listing

### `POST /listings/:id/media`

Links `ImageVersion` records to the listing. This is what actually puts photos on the listing.

- You can call this multiple times — each call **replaces** all existing media (not additive).
- `imageVersionIds` must belong to images in the **same project** as the listing.
- If `heroImageVersionId` is omitted, the **first item in the array** becomes the hero automatically.

**Request Body**

```json
{
  "imageVersionIds": [22, 21, 23],
  "heroImageVersionId": 22
}
```

| Field                | Required | Description                                                            |
| -------------------- | :------: | ---------------------------------------------------------------------- |
| `imageVersionIds`    |    ✅    | Array of `ImageVersion.id` values to attach                            |
| `heroImageVersionId` |    ❌    | Which version is the hero/cover. **Defaults to first in array** |

**Response `201`**

```json
{
  "media": [
    {
      "id": 1,
      "listingId": 44,
      "imageVersionId": 22,
      "isHero": true,
      "sortOrder": 0,
      "imageVersion": {
        "id": 22,
        "imageId": 14,
        "type": "ENHANCED",
        "url": "https://s3.amazonaws.com/.../enhanced.jpg"
      }
    },
    {
      "id": 2,
      "listingId": 44,
      "imageVersionId": 21,
      "isHero": false,
      "sortOrder": 1,
      "imageVersion": {
        "id": 21,
        "imageId": 14,
        "type": "ORIGINAL",
        "url": "https://s3.amazonaws.com/.../original.jpg"
      }
    }
  ]
}
```

**Error if versions don't match the project:**

```json
{ "error": "Some image versions do not belong to this project" }
```

---

## Shortcut — Create Listing + Media in One Call

### `POST /listings/listings-with-media`

Creates the listing record and attaches media in a single database transaction. Use this when you already have image versions ready and want to skip the two-step flow.

**Request Body** — combines all listing fields + media fields

```json
{
  "projectId": 3,
  "title": "Modern 3BR Apartment in Downtown",
  "description": "Spacious apartment...",
  "price": 3500,
  "currency": "USD",
  "locationCity": "New York",
  "locationState": "NY",
  "locationCountry": "US",
  "propertyType": "APARTMENT",
  "bedrooms": 3,
  "bathrooms": 2,
  "areaSqm": 110,
  "showEmail": true,
  "showPhoneNumber": false,
  "imageVersionIds": [22, 21, 23],
  "heroImageVersionId": 22
}
```

| Field                        | Required | Description                              |
| ---------------------------- | :------: | ---------------------------------------- |
| `projectId`                  |    ✅    | Must be owned by this user               |
| `title`                      |    ✅    | Listing headline                         |
| `imageVersionIds`            |    ✅    | At least one version ID required         |
| `heroImageVersionId`         |    ❌    | **Defaults to first in array**           |
| `showEmail`                  |    ❌    | Show lister email (default: true)        |
| `showPhoneNumber`            |    ❌    | Show lister phone (default: false)       |
| _(all other listing fields)_ |    ❌    | Same as `POST /listings`                 |

**Response `201`**

```json
{
  "listing": {
    "id": 44,
    "status": "DRAFT",
    "moderationStatus": "PENDING",
    "isPublished": false
  },
  "media": [
    {
      "id": 1,
      "listingId": 44,
      "imageVersionId": 22,
      "isHero": true,
      "sortOrder": 0
    }
  ]
}
```

---

## Ad Copy Routes

Ad copies are marketing text templates saved at the **project** level. They can be written manually or AI-generated, and can be targeted at different channels (marketplace, Facebook, property portals, etc.).

Base URL: `/projects/:id/ad-copies`

---

### `GET /projects/:id/ad-copies`

List all ad copy variants for a project.

**Response `200`**

```json
{
  "adCopies": [
    {
      "id": 1,
      "projectId": 3,
      "channel": "AIPIX",
      "title": "Stunning Downtown 3BR",
      "description": "Wake up to panoramic city views every morning...",
      "keywords": "downtown, luxury, modern, city views",
      "createdById": 5,
      "createdAt": "2026-03-08T12:30:00.000Z",
      "updatedAt": "2026-03-08T12:30:00.000Z"
    }
  ]
}
```

---

### `POST /projects/:id/ad-copies`

Create a new ad copy variant.

**Request Body**

```json
{
  "channel": "FACEBOOK",
  "title": "3BR Apartment for Rent — Downtown NYC",
  "description": "Spacious modern apartment available now. Floor-to-ceiling windows, in-unit laundry, rooftop access. $3,500/mo.",
  "keywords": "NYC, apartment, downtown, modern"
}
```

| Field         | Required | Description                                               |
| ------------- | :------: | --------------------------------------------------------- |
| `channel`     |    ✅    | e.g. `"AIPIX"`, `"FACEBOOK"`, `"INSTAGRAM"`, `"PORTAL_X"` |
| `title`       |    ✅    | Ad headline                                               |
| `description` |    ✅    | Body text                                                 |
| `keywords`    |    ❌    | Comma-separated tags                                      |

**Response `201`**

```json
{
  "adCopy": {
    "id": 2,
    "projectId": 3,
    "channel": "FACEBOOK",
    "title": "3BR Apartment for Rent — Downtown NYC",
    "description": "Spacious modern apartment...",
    "keywords": "NYC, apartment, downtown, modern",
    "createdById": 5,
    "createdAt": "2026-03-08T13:00:00.000Z",
    "updatedAt": "2026-03-08T13:00:00.000Z"
  }
}
```

---

### `PATCH /projects/:id/ad-copies/:adCopyId`

Update an ad copy variant. All fields optional.

```json
{
  "title": "Updated Headline",
  "keywords": "luxury, downtown, NYC"
}
```

**Response `200`**

```json
{
  "adCopy": {
    "id": 2,
    "title": "Updated Headline",
    "keywords": "luxury, downtown, NYC"
  }
}
```

---

### `DELETE /projects/:id/ad-copies/:adCopyId`

Delete an ad copy variant.

**Response `200`**

```json
{ "success": true }
```

---

## Data Models

### Project

| Field             | Type             | Description                     |
| ----------------- | ---------------- | ------------------------------- |
| `id`              | `number`         | Unique ID                       |
| `userId`          | `number`         | Owner user ID                   |
| `name`            | `string`         | Project name                    |
| `clientName`      | `string \| null` | Optional client label           |
| `notes`           | `string \| null` | Internal notes                  |
| `_count.images`   | `number`         | (list only) Number of images    |
| `_count.adCopies` | `number`         | (list only) Number of ad copies |
| `_count.listings` | `number`         | (list only) Number of listings  |
| `createdAt`       | `string`         | ISO 8601                        |

### Image

| Field         | Type             | Description                 |
| ------------- | ---------------- | --------------------------- |
| `id`          | `number`         | Unique ID                   |
| `projectId`   | `number`         | Parent project              |
| `originalUrl` | `string`         | S3 URL of the original file |
| `label`       | `string \| null` | Optional human label        |
| `versions`    | `ImageVersion[]` | All processed versions      |

### ImageVersion

| Field      | Type                                   | Description                                           |
| ---------- | -------------------------------------- | ----------------------------------------------------- |
| `id`       | `number`                               | Unique ID — **this is what you pass to attach media** |
| `imageId`  | `number`                               | Parent image                                          |
| `type`     | `"ORIGINAL" \| "ENHANCED" \| "STAGED"` | How this version was created                          |
| `url`      | `string`                               | S3 URL of this version                                |
| `metadata` | `object \| null`                       | AI model output data                                  |

### Listing

| Field              | Type                                                 | Description                             |
| ------------------ | ---------------------------------------------------- | --------------------------------------- |
| `id`               | `number`                                             | Unique ID                               |
| `userId`           | `number`                                             | Owner                                   |
| `projectId`        | `number`                                             | Parent project                          |
| `title`            | `string`                                             | Headline                                |
| `status`           | `"DRAFT" \| "PUBLISHED" \| "ARCHIVED"`               | Controlled by publish flow              |
| `moderationStatus` | `"PENDING" \| "FLAGGED" \| "APPROVED" \| "REJECTED"` | Moderation state                        |
| `isPublished`      | `boolean`                                            | `true` only when moderation is APPROVED |
| `price`            | `number \| null`                                     | Price value                             |
| `currency`         | `string \| null`                                     | Currency code                           |
| `propertyType`     | `string \| null`                                     | Property category                       |
| `bedrooms`         | `number \| null`                                     | Bedroom count                           |
| `bathrooms`        | `number \| null`                                     | Bathroom count                          |
| `areaSqm`          | `number \| null`                                     | Floor area                              |

### ListingMedia

| Field            | Type      | Description                     |
| ---------------- | --------- | ------------------------------- |
| `id`             | `number`  | Unique ID                       |
| `listingId`      | `number`  | Parent listing                  |
| `imageVersionId` | `number`  | Linked `ImageVersion`           |
| `isHero`         | `boolean` | Whether this is the cover photo |
| `sortOrder`      | `number`  | Display order (0 = first)       |

---

## Error Reference

| Status | Error                                                 | Cause                                                   |
| ------ | ----------------------------------------------------- | ------------------------------------------------------- |
| `400`  | `name is required`                                    | Missing name on project create                          |
| `400`  | `projectId and title are required`                    | Missing required listing fields                         |
| `400`  | `imageVersionIds is required`                         | Missing or empty array when attaching media             |
| `400`  | `Some image versions do not belong to this project`   | Version IDs don't match the listing's project           |
| `400`  | `file is required`                                    | No file in upload request                               |
| `400`  | `files are required`                                  | No files in multi-upload request                        |
| `400`  | `channel, title and description are required`         | Missing ad copy fields                                  |
| `400`  | `Use POST /listings/:id/publish to publish a listing` | Tried to PATCH `status: "PUBLISHED"`                    |
| `401`  | `Unauthorized`                                        | Missing or expired token                                |
| `404`  | `Project not found`                                   | Project doesn't exist or doesn't belong to user         |
| `404`  | `Listing not found`                                   | Listing doesn't exist or doesn't belong to user         |
| `404`  | `Ad copy not found`                                   | Ad copy doesn't exist or doesn't belong to this project |
| `500`  | `Storage not configured`                              | S3 bucket env var not set                               |
| `500`  | `Internal server error`                               | Unexpected server error                                 |

---

## Frontend Integration Examples

### Complete Wizard Flow

```tsx
// Step 1: Create project
const { project } = await api.post("/projects", {
  name: "Downtown Apartment Shoot",
  clientName: "John's Realty",
});

// Step 2: Upload photos
const formData = new FormData();
for (const file of selectedFiles) {
  formData.append("files", file);
}
const { images } = await api.upload(
  `/projects/${project.id}/images/upload-multiple`,
  formData,
);

// images[0].versions[0].id is the ORIGINAL version ID
// After AI jobs run, images[0].versions will contain ENHANCED/STAGED versions too

// Step 3: Refresh images to pick up any AI versions
const { images: freshImages } = await api.get(`/projects/${project.id}/images`);

// Collect all version IDs to attach (pick ENHANCED if available, else ORIGINAL)
const versionIds = freshImages.map((img) => {
  const enhanced = img.versions.find((v) => v.type === "ENHANCED");
  const original = img.versions.find((v) => v.type === "ORIGINAL");
  return (enhanced || original).id;
});

// Step 4: Create listing + attach media in one step
const { listing, media } = await api.post("/listings/listings-with-media", {
  projectId: project.id,
  title: "Modern 3BR Apartment in Downtown",
  description: "...",
  price: 3500,
  currency: "USD",
  locationCity: "New York",
  locationState: "NY",
  locationCountry: "US",
  propertyType: "APARTMENT",
  bedrooms: 3,
  bathrooms: 2,
  areaSqm: 110,
  imageVersionIds: versionIds,
  heroImageVersionId: versionIds[0],
});

// Step 5: Submit for publish (triggers moderation)
const result = await api.post(`/listings/${listing.id}/publish`);
// result.moderation.status → "FLAGGED" | "APPROVED"
```

---

### Image Picker — Choosing Versions for a Listing

```tsx
// components/ImageVersionPicker.tsx
// Lets the user pick which version of each photo to use on the listing

export function ImageVersionPicker({ projectId, onChange }) {
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState({}); // imageId → versionId

  useEffect(() => {
    fetch(`/projects/${projectId}/images`, { headers: authHeaders() })
      .then((r) => r.json())
      .then(({ images }) => {
        setImages(images);
        // Default to best version per image
        const defaults = {};
        for (const img of images) {
          const best =
            img.versions.find((v) => v.type === "STAGED") ||
            img.versions.find((v) => v.type === "ENHANCED") ||
            img.versions.find((v) => v.type === "ORIGINAL");
          if (best) defaults[img.id] = best.id;
        }
        setSelected(defaults);
        onChange(Object.values(defaults));
      });
  }, [projectId]);

  function selectVersion(imageId, versionId) {
    const updated = { ...selected, [imageId]: versionId };
    setSelected(updated);
    onChange(Object.values(updated));
  }

  return (
    <div className="image-picker">
      {images.map((img) => (
        <div key={img.id} className="image-picker__item">
          <img
            src={img.versions.find((v) => v.id === selected[img.id])?.url}
            alt={img.label}
          />
          <div className="image-picker__versions">
            {img.versions.map((v) => (
              <button
                key={v.id}
                className={selected[img.id] === v.id ? "active" : ""}
                onClick={() => selectVersion(img.id, v.id)}
              >
                {v.type}
              </button>
            ))}
          </div>
          <p>{img.label}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### Update Media on an Existing Listing

```tsx
// Replace media on a listing (e.g. after AI enhancement completes)
async function updateListingMedia(listingId, versionIds, heroId) {
  const res = await fetch(`/listings/${listingId}/media`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      imageVersionIds: versionIds,
      heroImageVersionId: heroId,
    }),
  });

  const { media } = await res.json();
  return media;
}
```

---

### Project Dashboard Card

```tsx
// components/ProjectCard.tsx
export function ProjectCard({ project }) {
  return (
    <div className="project-card">
      <h3>{project.name}</h3>
      {project.clientName && (
        <p className="project-card__client">{project.clientName}</p>
      )}
      <div className="project-card__stats">
        <span>📸 {project._count.images} photos</span>
        <span>🏠 {project._count.listings} listings</span>
        <span>📝 {project._count.adCopies} ad copies</span>
      </div>
      <a href={`/dashboard/projects/${project.id}`}>Open Project →</a>
    </div>
  );
}
```
