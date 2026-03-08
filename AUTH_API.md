# Authentication & Authorization API Documentation

**For Frontend Developers**

This document provides comprehensive documentation for all authentication and authorization endpoints in the AiPix backend system.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [User Model](#user-model)
4. [Public Endpoints](#public-endpoints)
   - [Register](#1-register)
   - [Login](#2-login)
   - [Verify Email](#3-verify-email)
   - [Resend Verification](#4-resend-verification)
   - [Forgot Password](#5-forgot-password)
   - [Reset Password](#6-reset-password)
5. [Protected Endpoints](#protected-endpoints)
   - [Get Current User](#1-get-current-user-me)
   - [MFA Setup](#2-mfa-setup)
   - [MFA Enable](#3-mfa-enable)
   - [MFA Disable](#4-mfa-disable)
   - [Switch Role](#5-switch-role)
   - [Add Role](#6-add-role)
   - [Get Available Roles](#7-get-available-roles)
   - [Complete Onboarding](#8-complete-onboarding)
6. [Role-Based Access Control](#role-based-access-control)
7. [Frontend Integration Examples](#frontend-integration-examples)
8. [Error Handling](#error-handling)

---

## Overview

The AiPix authentication system provides:

- **Email/Password Registration** with optional phone number
- **JWT-based Authentication** (token expires in 1 hour by default)
- **Email Verification** with expiring tokens
- **Password Reset** with secure tokens
- **Multi-Factor Authentication (MFA)** using TOTP (Google Authenticator, etc.)
- **Role-Based Access Control** (BUYER, LISTER, EDITOR, MODERATOR, ADMIN)
- **Multi-Role Support** (users can have both BUYER and LISTER roles)

---

## Authentication Flow

### Registration Flow

```
1. User submits registration form
   ↓
2. Backend creates user account (isActive: true, emailVerifiedAt: null)
   ↓
3. Backend sends verification email with token
   ↓
4. Backend returns JWT token for immediate access
   ↓
5. User clicks email verification link
   ↓
6. Backend marks email as verified (emailVerifiedAt: timestamp)
```

### Login Flow

```
1. User submits email/password
   ↓
2. Backend validates credentials
   ↓
3. If MFA enabled → Request MFA code
   ↓
4. Backend validates MFA code (if applicable)
   ↓
5. Backend returns JWT token
   ↓
6. Frontend stores token and includes in Authorization header
```

### MFA Setup Flow

```
1. User requests MFA setup (authenticated)
   ↓
2. Backend generates secret and QR code URL
   ↓
3. User scans QR code with authenticator app
   ↓
4. User submits TOTP code to enable MFA
   ↓
5. Backend verifies code and enables MFA
```

---

## User Model

```typescript
interface User {
  id: number;
  organizationId: number | null;
  email: string;
  displayName: string;
  phoneNumber: string | null; // NEW: Optional phone number
  isActive: boolean;
  mfaEnabled: boolean;

  // Role Management
  primaryRole: "BUYER" | "LISTER" | "EDITOR" | "MODERATOR" | "ADMIN";
  roles: Array<"BUYER" | "LISTER" | "EDITOR" | "MODERATOR" | "ADMIN">;
  onboardingComplete: boolean;

  // Verification
  emailVerifiedAt: string | null; // ISO timestamp
  lastLoginAt: string | null;

  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

### Role Descriptions

| Role          | Description                        | Capabilities                                                         |
| ------------- | ---------------------------------- | -------------------------------------------------------------------- |
| **BUYER**     | Default role for property browsers | Browse listings, favorite, book viewings, message listers            |
| **LISTER**    | Property owners/agents             | Create listings, manage projects, use AI tools, respond to inquiries |
| **EDITOR**    | Internal team members              | Manually review AI outputs, QA listings                              |
| **MODERATOR** | Content moderators                 | Review flagged content, approve/reject listings and messages         |
| **ADMIN**     | System administrators              | Full system access, user management, analytics                       |

---

## Public Endpoints

### 1. Register

**Endpoint:** `POST /api/auth/register`

**Description:** Create a new user account. Sends verification email automatically.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "displayName": "John Doe",
  "primaryRole": "BUYER",
  "phoneNumber": "+1234567890"
}
```

**Field Requirements:**

- `email` (required): Valid email address, must be unique
- `password` (required): Minimum 8 characters recommended
- `displayName` (required): User's display name
- `primaryRole` (optional): Either "BUYER" or "LISTER" (default: "BUYER")
- `phoneNumber` (optional): Phone number in any format

**Response (201 Created):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Important Notes:**

- JWT token is returned immediately for seamless user experience
- User can access the platform before email verification
- Email verification link expires in 1 hour
- Password is hashed with bcrypt (10 rounds)

**Error Responses:**

```json
// 400 - Missing required fields
{ "error": "Missing fields" }

// 409 - Email already exists
{ "error": "Email already registered" }

// 400 - Invalid role
{ "error": "Invalid role. Must be BUYER or LISTER" }
```

---

### 2. Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate with email and password. Returns JWT token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "mfaCode": "123456"
}
```

**Field Requirements:**

- `email` (required): User's email address
- `password` (required): User's password
- `mfaCode` (optional): 6-digit TOTP code if MFA is enabled

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**MFA Required Response (401):**

```json
{
  "error": "MFA code required",
  "mfaRequired": true
}
```

**Error Responses:**

```json
// 400 - Missing fields
{ "error": "Missing fields" }

// 401 - Invalid credentials
{ "error": "Invalid email or password" }

// 401 - Invalid MFA code
{ "error": "Invalid MFA code" }
```

**Important Notes:**

- Token expires after 1 hour (configurable via JWT_EXPIRES_IN env var)
- `lastLoginAt` is updated on successful login
- Account must be active (isActive: true)

---

### 3. Verify Email

**Endpoint:** `POST /api/auth/verify-email`

**Description:** Verify user's email address using token from email link.

**Request Body:**

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Error Responses:**

```json
// 400 - Missing token
{ "error": "Token required" }

// 400 - Invalid token
{ "error": "Invalid token" }

// 400 - Token already used
{ "error": "Token already used" }

// 400 - Token expired (1 hour)
{ "error": "Token expired" }
```

**Token Flow:**

- Token is UUID v4 format
- Valid for 1 hour from creation
- Can only be used once
- Sets `emailVerifiedAt` timestamp on success

---

### 4. Resend Verification

**Endpoint:** `POST /api/auth/resend-verification`

**Description:** Resend email verification link to user's email.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**

```json
{
  "message": "Verification email resent. Please check your inbox."
}
```

**Error Responses:**

```json
// 400 - Missing email
{ "error": "Email required" }

// 404 - User not found
{ "error": "USER_NOT_FOUND" }

// 400 - Already verified
{
  "error": "ALREADY_VERIFIED",
  "message": "Email is already verified."
}
```

**Important Notes:**

- No authentication required
- New token replaces old ones (old tokens remain valid until expiration)
- Safe to call even if user not found (doesn't leak account existence)

---

### 5. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Request password reset email with secure token.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Important Notes:**

- Always returns success (doesn't leak account existence)
- Reset token valid for 1 hour
- Email contains link to frontend reset page with token
- Multiple requests create multiple valid tokens

**Error Response:**

```json
// 400 - Missing email
{ "error": "Email required" }
```

---

### 6. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Description:** Reset password using token from email.

**Request Body:**

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "newPassword": "newSecurePassword456!"
}
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Error Responses:**

```json
// 400 - Missing fields
{ "error": "Token and newPassword required" }

// 400 - Invalid token
{ "error": "Invalid token" }

// 400 - Token already used
{ "error": "Token already used" }

// 400 - Token expired
{ "error": "Token expired" }
```

**Important Notes:**

- Password is hashed before storage
- Token can only be used once
- Old sessions remain valid (user should re-login)
- Consider requiring minimum password strength on frontend

---

## Protected Endpoints

All protected endpoints require the `Authorization` header with JWT token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 1. Get Current User (/me)

**Endpoint:** `GET /api/auth/me`

**Auth:** Required

**Description:** Get current authenticated user's profile.

**Response (200 OK):**

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "isEmailVerified": true,
    "mfaEnabled": false,
    "primaryRole": "BUYER",
    "roles": ["BUYER"],
    "onboardingComplete": true,
    "organizationId": null
  }
}
```

**Error Responses:**

```json
// 401 - Not authenticated
{ "error": "UNAUTHORIZED" }

// 404 - User not found (deleted account)
{ "error": "USER_NOT_FOUND" }
```

**Use Cases:**

- Check authentication status on app load
- Display user info in navigation
- Verify email verification status
- Redirect based on role and onboarding status

---

### 2. MFA Setup

**Endpoint:** `POST /api/auth/mfa/setup`

**Auth:** Required

**Description:** Generate MFA secret and QR code for authenticator app setup.

**Response (200 OK):**

```json
{
  "otpauthUrl": "otpauth://totp/AIPIX%20(user@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=AIPIX",
  "base32": "JBSWY3DPEHPK3PXP"
}
```

**Important Notes:**

- Secret is stored but MFA not enabled yet
- `otpauthUrl` should be converted to QR code on frontend
- User must complete enable step with verification code
- Use libraries like `qrcode` (npm) to generate QR code from URL

**Frontend QR Code Generation:**

```typescript
import QRCode from "qrcode";

async function displayMfaQr(otpauthUrl: string) {
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  // Display qrCodeDataUrl in <img> tag
}
```

---

### 3. MFA Enable

**Endpoint:** `POST /api/auth/mfa/enable`

**Auth:** Required

**Description:** Enable MFA by verifying code from authenticator app.

**Request Body:**

```json
{
  "code": "123456"
}
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Error Responses:**

```json
// 400 - Missing code
{ "error": "Code required" }

// 400 - Invalid code
{ "error": "Invalid MFA code" }
```

**Important Notes:**

- Code is 6-digit TOTP (Time-based One-Time Password)
- Must call `/mfa/setup` first to generate secret
- Once enabled, login requires MFA code
- Window of ±30 seconds is accepted for time drift

---

### 4. MFA Disable

**Endpoint:** `POST /api/auth/mfa/disable`

**Auth:** Required

**Description:** Disable MFA for the account.

**Request Body:**

```json
{
  "code": "123456"
}
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Error Responses:**

```json
// 400 - Missing code
{ "error": "Code required" }

// 400 - Invalid code
{ "error": "Invalid MFA code" }
```

**Important Notes:**

- Requires valid MFA code for security
- Removes MFA secret from database
- Future logins won't require MFA code

---

### 5. Switch Role

**Endpoint:** `POST /api/auth/switch-role`

**Auth:** Required

**Description:** Switch active role for users with multiple roles.

**Request Body:**

```json
{
  "role": "LISTER"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "primaryRole": "LISTER",
    "roles": ["BUYER", "LISTER"],
    "emailVerifiedAt": "2026-03-08T10:00:00.000Z",
    "onboardingComplete": true
  }
}
```

**Error Responses:**

```json
// 400 - Missing role
{ "error": "Role required" }

// 400 - Invalid role
{ "error": "Invalid role. Must be BUYER or LISTER" }

// 403 - Role not available
{ "error": "You do not have access to this role" }

// 404 - User not found
{ "error": "User not found" }
```

**Use Cases:**

- User wants to switch from browsing (BUYER) to listing properties (LISTER)
- User has both roles and wants to change active context
- UI shows role switcher only when user has multiple roles

---

### 6. Add Role

**Endpoint:** `POST /api/auth/add-role`

**Auth:** Required

**Description:** Add a new role to the current user.

**Request Body:**

```json
{
  "role": "LISTER"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "primaryRole": "LISTER",
    "roles": ["BUYER", "LISTER"],
    "emailVerifiedAt": "2026-03-08T10:00:00.000Z",
    "onboardingComplete": true
  },
  "message": "LISTER role added successfully"
}
```

**Error Responses:**

```json
// 400 - Missing role
{ "error": "Role required" }

// 400 - Invalid role
{ "error": "Invalid role. Must be BUYER or LISTER" }

// 400 - Already have role
{ "error": "You already have this role" }

// 404 - User not found
{ "error": "User not found" }
```

**Important Notes:**

- Automatically switches to new role as primaryRole
- Users can have multiple roles (e.g., BUYER + LISTER)
- Only BUYER and LISTER can be self-assigned
- EDITOR, MODERATOR, ADMIN must be assigned by system admin

---

### 7. Get Available Roles

**Endpoint:** `GET /api/auth/available-roles`

**Auth:** Required

**Description:** Get current user's role information.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "current": "BUYER",
    "available": ["BUYER"],
    "canAdd": ["LISTER"]
  }
}
```

**Field Descriptions:**

- `current`: Currently active role (primaryRole)
- `available`: All roles user has access to (can switch between)
- `canAdd`: Roles user can add to their account

**Error Response:**

```json
// 404 - User not found
{ "error": "User not found" }
```

---

### 8. Complete Onboarding

**Endpoint:** `POST /api/auth/complete-onboarding`

**Auth:** Required

**Description:** Mark user's onboarding process as complete.

**Response (200 OK):**

```json
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

**Use Cases:**

- User completes tutorial/walkthrough
- User fills out profile information
- User acknowledges terms and conditions
- Redirect new users to onboarding if not complete

---

## Role-Based Access Control

### Middleware Protection

Routes can be protected by role using middleware:

```typescript
// Require authentication
router.get("/protected", authMiddleware, handler);

// Require LISTER role
router.post("/listings", authMiddleware, requireLister, handler);

// Require ADMIN role
router.get("/admin/users", authMiddleware, requireAdmin, handler);

// Require MODERATOR or ADMIN
router.get("/moderation", authMiddleware, requireModeratorOrAdmin, handler);
```

### Available Middleware

| Middleware                | Required Role(s)       | Description               |
| ------------------------- | ---------------------- | ------------------------- |
| `authMiddleware`          | Any authenticated user | Base authentication check |
| `requireLister`           | LISTER                 | Requires LISTER role      |
| `requireAdmin`            | ADMIN                  | Requires ADMIN role       |
| `requireModeratorOrAdmin` | MODERATOR or ADMIN     | Requires either role      |

### Role Hierarchy

```
ADMIN (highest privileges)
  ↓
MODERATOR (content moderation)
  ↓
EDITOR (internal QA)
  ↓
LISTER (create listings)
  ↓
BUYER (default role)
```

**Important Notes:**

- Users can have multiple roles (stored in `roles` array)
- `primaryRole` determines current active role
- Role switching doesn't require re-authentication
- Higher roles don't automatically inherit lower role permissions

---

## Frontend Integration Examples

### Example 1: Registration Form

```typescript
interface RegisterForm {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  primaryRole: "BUYER" | "LISTER";
}

async function register(form: RegisterForm) {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();

    // Store token
    localStorage.setItem("authToken", data.token);

    // Show success message
    showSuccess("Account created! Please check your email to verify.");

    // Redirect to dashboard
    router.push("/dashboard");

    return data;
  } catch (error) {
    if (error.message === "Email already registered") {
      showError("This email is already in use. Please login instead.");
    } else {
      showError("Registration failed. Please try again.");
    }
    throw error;
  }
}

// Usage in Vue/React component
const handleSubmit = async () => {
  await register({
    email: email.value,
    password: password.value,
    displayName: displayName.value,
    phoneNumber: phoneNumber.value || undefined,
    primaryRole: isLister.value ? "LISTER" : "BUYER",
  });
};
```

---

### Example 2: Login with MFA Support

```typescript
async function login(email: string, password: string, mfaCode?: string) {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, mfaCode }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Check if MFA is required
      if (data.mfaRequired) {
        // Show MFA code input
        setShowMfaInput(true);
        return { requiresMfa: true };
      }

      throw new Error(data.error);
    }

    // Store token
    localStorage.setItem("authToken", data.token);

    // Redirect to dashboard
    router.push("/dashboard");

    return data;
  } catch (error) {
    showError(error.message || "Login failed");
    throw error;
  }
}

// Two-step login flow
const handleLogin = async () => {
  const result = await login(email.value, password.value);

  if (result.requiresMfa) {
    // Show MFA input form
    showMfaDialog.value = true;
  }
};

const handleMfaSubmit = async () => {
  await login(email.value, password.value, mfaCode.value);
};
```

---

### Example 3: Protected Route Check

```typescript
// Auth guard for Vue Router
router.beforeEach(async (to, from, next) => {
  const publicPages = ["/login", "/register", "/forgot-password"];
  const authRequired = !publicPages.includes(to.path);
  const token = localStorage.getItem("authToken");

  if (authRequired) {
    if (!token) {
      // Not logged in, redirect to login
      return next("/login");
    }

    try {
      // Verify token is still valid
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token invalid, clear and redirect
        localStorage.removeItem("authToken");
        return next("/login");
      }

      const { user } = await response.json();

      // Check email verification for certain routes
      if (to.meta.requiresVerification && !user.isEmailVerified) {
        return next("/verify-email-notice");
      }

      // Check role requirements
      if (to.meta.requiresRole && !user.roles.includes(to.meta.requiresRole)) {
        return next("/unauthorized");
      }

      // Check onboarding
      if (!user.onboardingComplete && to.path !== "/onboarding") {
        return next("/onboarding");
      }

      next();
    } catch (error) {
      localStorage.removeItem("authToken");
      next("/login");
    }
  } else {
    // Public page
    next();
  }
});
```

---

### Example 4: MFA Setup Flow

```typescript
// Step 1: Setup MFA
async function setupMfa() {
  try {
    const response = await fetch("/api/auth/mfa/setup", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    // Generate QR code from otpauthUrl
    const qrCodeDataUrl = await QRCode.toDataURL(data.otpauthUrl);

    // Display QR code to user
    setQrCode(qrCodeDataUrl);
    setSecret(data.base32); // Show as backup

    // Show "Next" button to proceed to verification
    setStep("verify");
  } catch (error) {
    showError("Failed to setup MFA");
  }
}

// Step 2: Enable MFA with verification code
async function enableMfa(code: string) {
  try {
    const response = await fetch("/api/auth/mfa/enable", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    showSuccess("MFA enabled successfully! Your account is now more secure.");

    // Update user state
    user.value.mfaEnabled = true;

    // Close MFA setup dialog
    closeMfaDialog();
  } catch (error) {
    if (error.message === "Invalid MFA code") {
      showError("Invalid code. Please try again.");
    } else {
      showError("Failed to enable MFA");
    }
  }
}
```

---

### Example 5: Role Management

```typescript
// Get available roles
async function loadAvailableRoles() {
  try {
    const response = await fetch("/api/auth/available-roles", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const { data } = await response.json();

    // data.current: "BUYER"
    // data.available: ["BUYER"]
    // data.canAdd: ["LISTER"]

    // Show role switcher if user has multiple roles
    if (data.available.length > 1) {
      setShowRoleSwitcher(true);
    }

    // Show "Become a Lister" button if user can add LISTER role
    if (data.canAdd.includes("LISTER")) {
      setCanBecomeLister(true);
    }

    return data;
  } catch (error) {
    console.error("Failed to load roles:", error);
  }
}

// Switch role
async function switchRole(newRole: string) {
  try {
    const response = await fetch("/api/auth/switch-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const { user } = await response.json();

    // Update current user state
    currentUser.value = user;

    showSuccess(`Switched to ${newRole} mode`);

    // Redirect to appropriate dashboard
    router.push(
      newRole === "LISTER" ? "/lister/dashboard" : "/buyer/dashboard",
    );
  } catch (error) {
    showError("Failed to switch role");
  }
}

// Add role
async function addListerRole() {
  try {
    const response = await fetch("/api/auth/add-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: "LISTER" }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const { user, message } = await response.json();

    // Update current user state
    currentUser.value = user;

    showSuccess(message);

    // Redirect to lister onboarding
    router.push("/lister/onboarding");
  } catch (error) {
    showError("Failed to add LISTER role");
  }
}
```

---

### Example 6: Email Verification Flow

```typescript
// Check verification status on app load
async function checkEmailVerification() {
  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const { user } = await response.json();

    if (!user.isEmailVerified) {
      // Show verification banner
      showVerificationBanner.value = true;
    }
  } catch (error) {
    console.error("Failed to check verification status");
  }
}

// Resend verification email
async function resendVerification() {
  try {
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user.value.email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    showSuccess("Verification email sent! Please check your inbox.");
  } catch (error) {
    if (error.message === "ALREADY_VERIFIED") {
      showInfo("Your email is already verified.");
    } else {
      showError("Failed to send verification email");
    }
  }
}

// Verify email from link
async function verifyEmailFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    showError("Invalid verification link");
    return;
  }

  try {
    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    showSuccess("Email verified successfully!");

    // Redirect to dashboard
    router.push("/dashboard");
  } catch (error) {
    if (error.message === "Token expired") {
      showError("Verification link expired. Please request a new one.");
      showResendButton.value = true;
    } else {
      showError("Email verification failed");
    }
  }
}
```

---

### Example 7: Password Reset Flow

```typescript
// Step 1: Request reset
async function requestPasswordReset(email: string) {
  try {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    await response.json();

    // Always show success (don't leak account existence)
    showSuccess(
      "If an account exists with this email, " +
        "you will receive a password reset link shortly.",
    );

    // Redirect to login
    router.push("/login");
  } catch (error) {
    showError("An error occurred. Please try again.");
  }
}

// Step 2: Reset password with token
async function resetPassword(token: string, newPassword: string) {
  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    showSuccess(
      "Password reset successfully! Please login with your new password.",
    );

    // Redirect to login
    router.push("/login");
  } catch (error) {
    if (error.message === "Token expired") {
      showError("Reset link expired. Please request a new one.");
      router.push("/forgot-password");
    } else if (error.message === "Invalid token") {
      showError("Invalid reset link.");
    } else {
      showError("Password reset failed. Please try again.");
    }
  }
}

// Extract token from URL on reset password page
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    showError("Invalid reset link");
    router.push("/forgot-password");
    return;
  }

  resetToken.value = token;
});
```

---

## Error Handling

### Common Error Patterns

```typescript
async function handleAuthRequest<T>(
  requestFn: () => Promise<Response>,
): Promise<T | null> {
  try {
    const response = await requestFn();

    if (!response.ok) {
      const error = await response.json();

      // Handle specific auth errors
      switch (response.status) {
        case 401:
          // Unauthorized - clear token and redirect
          localStorage.removeItem("authToken");
          router.push("/login");
          showError("Session expired. Please login again.");
          break;

        case 403:
          // Forbidden - insufficient permissions
          showError("You do not have permission to perform this action.");
          router.push("/unauthorized");
          break;

        case 409:
          // Conflict (e.g., email already exists)
          showError(error.error || "Conflict error");
          break;

        case 400:
          // Bad request (validation error)
          showError(error.error || "Invalid request");
          break;

        default:
          showError("An error occurred. Please try again.");
      }

      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Auth request error:", error);
    showError("Network error. Please check your connection.");
    return null;
  }
}

// Usage
const result = await handleAuthRequest<{ token: string; user: any }>(() =>
  fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }),
);

if (result) {
  localStorage.setItem("authToken", result.token);
  router.push("/dashboard");
}
```

---

### Error Response Mapping

| HTTP Status | Error Type   | User Message                                     |
| ----------- | ------------ | ------------------------------------------------ |
| 400         | Bad Request  | "Please check your input and try again"          |
| 401         | Unauthorized | "Please login to continue"                       |
| 403         | Forbidden    | "You don't have permission for this action"      |
| 404         | Not Found    | "Resource not found"                             |
| 409         | Conflict     | "Email already exists" / "Role already assigned" |
| 500         | Server Error | "Something went wrong. Please try again later"   |

---

## API Endpoints Quick Reference

### Public Endpoints

| Method | Endpoint                        | Description               |
| ------ | ------------------------------- | ------------------------- |
| POST   | `/api/auth/register`            | Create new account        |
| POST   | `/api/auth/login`               | Login with credentials    |
| POST   | `/api/auth/verify-email`        | Verify email with token   |
| POST   | `/api/auth/resend-verification` | Resend verification email |
| POST   | `/api/auth/forgot-password`     | Request password reset    |
| POST   | `/api/auth/reset-password`      | Reset password with token |

### Protected Endpoints

| Method | Endpoint                        | Description         | Auth |
| ------ | ------------------------------- | ------------------- | ---- |
| GET    | `/api/auth/me`                  | Get current user    | ✓    |
| POST   | `/api/auth/mfa/setup`           | Setup MFA           | ✓    |
| POST   | `/api/auth/mfa/enable`          | Enable MFA          | ✓    |
| POST   | `/api/auth/mfa/disable`         | Disable MFA         | ✓    |
| POST   | `/api/auth/switch-role`         | Switch active role  | ✓    |
| POST   | `/api/auth/add-role`            | Add new role        | ✓    |
| GET    | `/api/auth/available-roles`     | Get role info       | ✓    |
| POST   | `/api/auth/complete-onboarding` | Complete onboarding | ✓    |

---

## Security Best Practices

### For Frontend Developers

1. **Token Storage**
   - Store JWT in `localStorage` or secure cookie
   - Clear token on logout or 401 errors
   - Don't store token in URL or session storage

2. **Password Handling**
   - Never log passwords
   - Use type="password" for input fields
   - Consider password strength indicator
   - Minimum 8 characters recommended

3. **MFA**
   - Encourage users to enable MFA
   - Show security benefits clearly
   - Provide backup codes (future feature)

4. **Role Checks**
   - Always verify role on backend (never trust frontend)
   - Hide UI elements user can't access
   - Show helpful messages for insufficient permissions

5. **Token Refresh**
   - Implement token refresh before expiration
   - Handle expired tokens gracefully
   - Redirect to login on authentication failure

6. **HTTPS Only**
   - Always use HTTPS in production
   - Never send tokens over HTTP

---

## Summary

### Key Takeaways

**Registration & Login:**

- ✅ Email + password with optional phone number
- ✅ Choose role during registration (BUYER or LISTER)
- ✅ Immediate JWT token for seamless experience
- ✅ Email verification sent automatically

**Security Features:**

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication (1 hour expiration)
- ✅ MFA support with TOTP (Google Authenticator)
- ✅ Secure password reset flow

**Role Management:**

- ✅ Multi-role support (one user, multiple roles)
- ✅ Switch between roles without re-authentication
- ✅ Self-service role addition (BUYER ↔ LISTER)
- ✅ Role-based route protection

**User Experience:**

- ✅ Email verification optional for initial access
- ✅ Onboarding tracking
- ✅ Password recovery
- ✅ Profile management via /me endpoint

---

**End of Documentation**

For questions or feature requests, please contact the backend team.
