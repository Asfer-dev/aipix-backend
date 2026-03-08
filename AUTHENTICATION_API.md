# 📚 AIPIX Backend - Authentication Routes Documentation

## Base URL

All authentication endpoints are prefixed with `/auth`

**Example:** `http://localhost:4000/auth/register`

---

## 🔓 Public Routes (No Authentication Required)

### 1. **Register New User**

**POST** `/auth/register`

Creates a new user account and sends email verification.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "John Doe",
  "primaryRole": "BUYER" // Optional: "BUYER" (default) or "LISTER"
}
```

**Success Response (201):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Error Responses:**

- `400` - Missing required fields
- `409` - Email already registered
- `400` - Invalid role (must be BUYER or LISTER)

**Note:** After registration, a verification email is sent to the user's inbox with a link like:

```
http://localhost:3000/verify-email?token=abc-123-def-456
```

---

### 2. **Login**

**POST** `/auth/login`

Authenticates user and returns JWT token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "mfaCode": "123456" // Optional: Only required if MFA is enabled
}
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Error Responses:**

- `400` - Missing email or password
- `401` - Invalid email or password
- `401` - MFA code required (`{ error: "MFA code required", mfaRequired: true }`)
- `401` - Invalid MFA code

**Usage:** Store the `token` in localStorage/sessionStorage and include in Authorization header for protected routes.

---

### 3. **Verify Email**

**POST** `/auth/verify-email`

Verifies user's email address using token from email link.

**Request Body:**

```json
{
  "token": "abc-123-def-456"
}
```

**Success Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

- `400` - Token required
- `400` - Invalid token
- `400` - Token already used
- `400` - Token expired (tokens expire after 1 hour)

**Frontend Flow:**

1. User clicks email verification link: `/verify-email?token=abc-123-def-456`
2. Frontend extracts token from query parameter
3. Frontend POSTs token to this endpoint
4. Show success message and redirect to login/dashboard

---

### 4. **Resend Verification Email**

**POST** `/auth/resend-verification`

Sends a new verification email if the original expired or was lost.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "message": "Verification email resent. Please check your inbox."
}
```

**Error Responses:**

- `400` - Email required
- `404` - User not found
- `400` - Email already verified (`{ error: "ALREADY_VERIFIED" }`)

---

### 5. **Forgot Password**

**POST** `/auth/forgot-password`

Sends password reset email to user.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true
}
```

**Note:** Always returns success even if email doesn't exist (security best practice). Reset email contains link like:

```
http://localhost:3000/reset-password?token=xyz-789-abc-123
```

---

### 6. **Reset Password**

**POST** `/auth/reset-password`

Resets password using token from email.

**Request Body:**

```json
{
  "token": "xyz-789-abc-123",
  "newPassword": "NewSecurePass456!"
}
```

**Success Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

- `400` - Token and newPassword required
- `400` - Invalid token
- `400` - Token already used
- `400` - Token expired (tokens expire after 1 hour)

**Frontend Flow:**

1. User clicks reset link: `/reset-password?token=xyz-789-abc-123`
2. Frontend shows password reset form
3. User enters new password
4. Frontend POSTs token + newPassword
5. Show success and redirect to login

---

## 🔒 Protected Routes (Authentication Required)

**All routes below require JWT token in Authorization header:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 7. **Get Current User**

**GET** `/auth/me`

Returns current authenticated user's profile.

**Success Response (200):**

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

- `401` - Unauthorized (missing or invalid token)
- `404` - User not found

**Usage:** Call this on app load to check if user is logged in and get profile data.

---

## 🔐 Multi-Factor Authentication (MFA)

### 8. **Setup MFA**

**POST** `/auth/mfa/setup`

Generates MFA secret and QR code for authenticator apps.

**Success Response (200):**

```json
{
  "otpauthUrl": "otpauth://totp/AIPIX:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=AIPIX",
  "base32": "JBSWY3DPEHPK3PXP"
}
```

**Frontend Flow:**

1. Call this endpoint
2. Display QR code using `otpauthUrl` (use qrcode library)
3. Show `base32` secret for manual entry
4. User scans QR code in Google Authenticator/Authy
5. User enters 6-digit code from app
6. Call `/auth/mfa/enable` with the code

---

### 9. **Enable MFA**

**POST** `/auth/mfa/enable`

Activates MFA after verifying code from authenticator app.

**Request Body:**

```json
{
  "code": "123456"
}
```

**Success Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

- `400` - Code required
- `400` - Invalid MFA code
- `401` - Unauthorized

---

### 10. **Disable MFA**

**POST** `/auth/mfa/disable`

Deactivates MFA (requires current MFA code for security).

**Request Body:**

```json
{
  "code": "123456"
}
```

**Success Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

- `400` - Code required
- `400` - Invalid MFA code
- `401` - Unauthorized

---

## 👥 Role Management

AIPIX supports multiple user roles:

- **BUYER**: Can browse listings, book properties, send messages
- **LISTER**: Can create listings, upload images, use AI tools
- **EDITOR**: Internal team, can review AI outputs
- **MODERATOR**: Can review flagged content
- **ADMIN**: Full system access

### 11. **Switch Active Role**

**POST** `/auth/switch-role`

Changes the user's primary active role.

**Request Body:**

```json
{
  "role": "LISTER"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "primaryRole": "LISTER",
    "roles": ["BUYER", "LISTER"]
  }
}
```

**Error Responses:**

- `400` - Role required
- `400` - Invalid role
- `403` - You do not have access to this role
- `401` - Unauthorized

**Usage:** User can switch between roles they already have (e.g., BUYER → LISTER).

---

### 12. **Add New Role**

**POST** `/auth/add-role`

Adds a new role to user's account (e.g., upgrading BUYER to also be LISTER).

**Request Body:**

```json
{
  "role": "LISTER"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "primaryRole": "BUYER",
    "roles": ["BUYER", "LISTER"]
  },
  "message": "LISTER role added successfully"
}
```

**Error Responses:**

- `400` - Role required
- `400` - Invalid role
- `400` - You already have this role
- `401` - Unauthorized

---

### 13. **Get Available Roles**

**GET** `/auth/available-roles`

Returns user's current roles and available roles.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "primaryRole": "BUYER",
    "roles": ["BUYER", "LISTER"],
    "availableRoles": ["BUYER", "LISTER"]
  }
}
```

**Error Responses:**

- `401` - Unauthorized
- `404` - User not found

---

## 🎯 Onboarding

### 14. **Complete Onboarding**

**POST** `/auth/complete-onboarding`

Marks user's onboarding as complete.

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "onboardingComplete": true
  }
}
```

**Error Responses:**

- `401` - Unauthorized

**Usage:** Call after user completes onboarding wizard/tutorial.

---

## 🔄 Frontend Integration Examples

### React Example

```typescript
// auth.service.ts
const API_BASE = "http://localhost:4000";

export const authService = {
  async register(
    email: string,
    password: string,
    displayName: string,
    primaryRole?: string,
  ) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, primaryRole }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    return data;
  },

  async login(email: string, password: string, mfaCode?: string) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, mfaCode }),
    });

    if (!response.ok) {
      const error = await response.json();

      // Check if MFA is required
      if (error.mfaRequired) {
        throw { code: "MFA_REQUIRED", message: error.error };
      }

      throw new Error(error.error);
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    return data;
  },

  async getCurrentUser() {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        return null;
      }
      throw new Error("Failed to fetch user");
    }

    return response.json();
  },

  async verifyEmail(token: string) {
    const response = await fetch(`${API_BASE}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json();
  },

  logout() {
    localStorage.removeItem("token");
  },
};
```

### Vue.js Example

```typescript
// composables/useAuth.ts
import { ref } from "vue";

const token = ref(localStorage.getItem("token"));
const user = ref(null);

export function useAuth() {
  const login = async (email: string, password: string) => {
    const response = await fetch("http://localhost:4000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      token.value = data.token;
      user.value = data.user;
      localStorage.setItem("token", data.token);
    } else {
      throw new Error(data.error);
    }
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
  };

  return { token, user, login, logout };
}
```

---

## 📧 Email Verification Flow

1. **User Registers** → Backend sends email with verification link
2. **User Clicks Link** → Frontend receives `?token=abc-123`
3. **Frontend Calls** → `POST /auth/verify-email` with token
4. **Success** → Show confirmation, redirect to dashboard/login
5. **If Expired** → Show "Resend Verification" button
6. **User Clicks Resend** → `POST /auth/resend-verification` with email

---

## 🔒 Security Best Practices

1. **Store JWT Securely**: Use httpOnly cookies (preferred) or localStorage
2. **Token Expiration**: Tokens expire in 1 hour (configurable via JWT_EXPIRES_IN)
3. **Email Tokens**: Verification/reset tokens expire in 1 hour
4. **MFA**: Implement 2FA for sensitive accounts
5. **HTTPS Only**: Always use HTTPS in production
6. **CORS**: Configure allowed origins properly

---

## ⚙️ Environment Variables

Frontend needs to configure:

```env
VITE_API_URL=http://localhost:4000
VITE_APP_URL=http://localhost:3000
```

Backend uses:

```env
PORT=4000
APP_BASE_URL=http://localhost:3000  # Frontend URL for email links
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
```

---

## 📝 Quick Reference

| Endpoint                    | Method | Auth Required | Description               |
| --------------------------- | ------ | ------------- | ------------------------- |
| `/auth/register`            | POST   | ❌            | Register new user         |
| `/auth/login`               | POST   | ❌            | Login user                |
| `/auth/verify-email`        | POST   | ❌            | Verify email address      |
| `/auth/resend-verification` | POST   | ❌            | Resend verification email |
| `/auth/forgot-password`     | POST   | ❌            | Request password reset    |
| `/auth/reset-password`      | POST   | ❌            | Reset password with token |
| `/auth/me`                  | GET    | ✅            | Get current user profile  |
| `/auth/mfa/setup`           | POST   | ✅            | Generate MFA secret       |
| `/auth/mfa/enable`          | POST   | ✅            | Enable MFA                |
| `/auth/mfa/disable`         | POST   | ✅            | Disable MFA               |
| `/auth/switch-role`         | POST   | ✅            | Switch active role        |
| `/auth/add-role`            | POST   | ✅            | Add new role to account   |
| `/auth/available-roles`     | GET    | ✅            | Get user's roles          |
| `/auth/complete-onboarding` | POST   | ✅            | Complete onboarding       |

---

For questions or issues, contact the backend team or check the source code in `/src/modules/auth/`.
