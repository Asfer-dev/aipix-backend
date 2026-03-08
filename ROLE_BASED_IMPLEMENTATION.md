# Role-Based User System Implementation

## Overview

Implemented a dual-sided platform with role-based access control allowing users to be BUYERS, LISTERS, or both.

## Database Changes

### Schema Updates (prisma/schema.prisma)

1. **Added UserRole enum**:
   - BUYER: Browse, favorite, book, message
   - LISTER: Create listings, projects, use AI tools
   - EDITOR: Manual review of AI outputs
   - MODERATOR: Review flagged content
   - ADMIN: Full system access

2. **Updated User model**:
   - `primaryRole`: Current active role (default: BUYER)
   - `roles[]`: Array of roles user has access to
   - `onboardingComplete`: Track if user completed onboarding
   - Removed old `UserRole` junction table and `Role` model

3. **Migration Required**:
   ```bash
   npx prisma migrate dev --name add_role_based_system
   npx prisma generate
   ```

## API Endpoints

### Authentication & Role Management (`/api/auth`)

#### Updated Endpoints:

- **POST /auth/register**
  - Added `primaryRole` field (optional, defaults to "BUYER")
  - Request: `{ email, password, displayName, primaryRole?: "BUYER" | "LISTER" }`
  - Validates role and creates user with single role initially

- **GET /auth/me**
  - Now returns: `{ id, email, displayName, isEmailVerified, mfaEnabled, primaryRole, roles[], onboardingComplete, organizationId }`

#### New Endpoints:

- **POST /auth/switch-role**
  - Switch between available roles
  - Request: `{ role: "BUYER" | "LISTER" }`
  - Response: Updated user object
  - Errors: INVALID_ROLE, ROLE_NOT_AVAILABLE

- **POST /auth/add-role**
  - Add a new role to user's account
  - Request: `{ role: "BUYER" | "LISTER" }`
  - Automatically switches to new role
  - Response: `{ success: true, user, message }`
  - Errors: INVALID_ROLE, ROLE_ALREADY_EXISTS

- **GET /auth/available-roles**
  - Get user's current and available roles
  - Response: `{ current, available[], canAdd[] }`

- **POST /auth/complete-onboarding**
  - Mark user's onboarding as complete
  - Response: Updated user object

## Middleware Updates

### Enhanced authMiddleware

Now fetches full user details including:

- `id`, `email`, `displayName`
- `emailVerified` (boolean)
- `roles[]` (array of role strings)
- `primaryRole` (current active role)
- `organizationId`
- `onboardingComplete`

### New Role-Based Middleware

#### Generic:

- **requireRole(...allowedRoles)**
  - Factory function for custom role requirements
  - Usage: `requireRole("BUYER", "ADMIN")`

#### Specific:

- **requireLister**: Requires LISTER or ADMIN role
- **requireBuyer**: Requires BUYER, LISTER, or ADMIN (listers can browse)
- **requireModerator**: Requires MODERATOR or ADMIN
- **requireEditor**: Requires EDITOR or ADMIN
- **requireAdmin**: Requires ADMIN role only

## Protected Routes

### LISTER-Only Routes:

- `/api/projects/*` - All project management
- `/api/enhancement/*` - AI enhancement jobs
- `/api/listings` (POST, GET my listings, PATCH, DELETE)

### Public Routes (No Auth):

- `/api/listings/marketplace/*` - Browse listings

### Mixed Access:

Future endpoints like bookings, messages, and favorites will support both roles with appropriate restrictions.

## Usage Examples

### Frontend Registration Flow

```typescript
// User selects role during signup
const response = await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "securePassword123",
    displayName: "John Doe",
    primaryRole: "LISTER", // or 'BUYER'
  }),
});
```

### Switch Role

```typescript
const response = await fetch("/api/auth/switch-role", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ role: "LISTER" }),
});
```

### Add Second Role

```typescript
// Buyer wants to become a lister
const response = await fetch("/api/auth/add-role", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ role: "LISTER" }),
});
```

### Get Available Roles

```typescript
const response = await fetch("/api/auth/available-roles", {
  headers: { Authorization: `Bearer ${token}` },
});
// Response: { current: 'BUYER', available: ['BUYER'], canAdd: ['LISTER'] }
```

## Error Codes

| Error Code          | Description                           | HTTP Status |
| ------------------- | ------------------------------------- | ----------- |
| INVALID_ROLE        | Role must be BUYER or LISTER          | 400         |
| ROLE_NOT_AVAILABLE  | User doesn't have access to this role | 403         |
| ROLE_ALREADY_EXISTS | User already has this role            | 400         |
| USER_NOT_FOUND      | User doesn't exist                    | 404         |

## Service Layer Functions

### auth.service.ts - New Functions:

1. **registerUser(email, password, displayName, primaryRole)**
   - Updated to accept role parameter
   - Validates role before creating user

2. **switchUserRole(userId, newRole)**
   - Changes user's primary role
   - Validates user has access to the role

3. **addUserRole(userId, roleToAdd)**
   - Adds new role to user's roles array
   - Automatically switches to new role

4. **getUserRoles(userId)**
   - Returns current, available, and addable roles

5. **completeOnboarding(userId)**
   - Marks onboarding complete

## Frontend Integration Guide

### User Context

```typescript
interface User {
  id: number;
  email: string;
  displayName: string;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  primaryRole: "BUYER" | "LISTER";
  roles: string[];
  onboardingComplete: boolean;
  organizationId?: number;
}
```

### Role Switcher Component

```typescript
function RoleSwitcher() {
  const { user, switchRole } = useAuth();

  if (user.roles.length === 1) return null; // Only one role

  return (
    <select value={user.primaryRole} onChange={(e) => switchRole(e.target.value)}>
      {user.roles.map(role => (
        <option key={role} value={role}>
          {role === 'BUYER' ? '🏠 Browse Properties' : '✨ Manage Listings'}
        </option>
      ))}
    </select>
  );
}
```

### Conditional Dashboard Rendering

```typescript
function Dashboard() {
  const { user } = useAuth();

  if (user.primaryRole === 'LISTER') {
    return <ListerDashboard />;
  }

  return <BuyerDashboard />;
}
```

## Testing Checklist

- [ ] Register as BUYER
- [ ] Register as LISTER
- [ ] Login and verify role in /me response
- [ ] Switch between roles (if user has multiple)
- [ ] Add LISTER role to BUYER account
- [ ] Access LISTER-only routes (should work)
- [ ] Access LISTER routes as BUYER (should get 403)
- [ ] Complete onboarding
- [ ] Verify role persistence after logout/login

## Next Steps

1. **Run Migration**:

   ```bash
   npx prisma migrate dev --name add_role_based_system
   npx prisma generate
   ```

2. **Restart Server**:

   ```bash
   npm run dev
   ```

3. **Test Endpoints** using Postman or curl

4. **Future Modules to Add Role Protection**:
   - Bookings (BUYER creates, LISTER manages)
   - Messages (both roles)
   - Favorites (BUYER only)
   - Virtual Staging (LISTER only)
   - Ad Generator (LISTER only)

## Migration Notes

### Existing Users

If you have existing users in the database:

1. They will need default values for new fields
2. Add migration logic to set:
   - `primaryRole = 'BUYER'`
   - `roles = ['BUYER']`
   - `onboardingComplete = false`

### Data Migration Script

```sql
-- After migration, update existing users
UPDATE "User"
SET
  "primaryRole" = 'BUYER',
  "roles" = ARRAY['BUYER']::text[],
  "onboardingComplete" = false
WHERE "primaryRole" IS NULL;
```

## Security Considerations

1. **Role Validation**: Always validate roles on the backend, never trust frontend
2. **Token Claims**: Roles are not in JWT token; fetched from DB on each request
3. **Permission Checks**: Every protected endpoint checks user roles via middleware
4. **Audit Trail**: Consider logging role changes for security audits

## Performance Optimization

The authMiddleware now makes a database call to fetch user details. For high-traffic scenarios:

1. Implement Redis caching for user roles
2. Add role information to JWT token (requires token refresh on role change)
3. Use connection pooling for database queries

## Support

For questions or issues:

- Check error responses for specific error codes
- Review middleware logs for authorization failures
- Verify user has correct roles in database
