# Test Schema Mismatches - Fixes Needed

## Summary

The test files were written with assumptions about the database schema that don't match the actual Prisma schema. This document lists all mismatches that need to be addressed.

## Critical Field Mismatches

### User Model

| Test Code Uses              | Actual Schema Has                   | Fix Required                                                               |
| --------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `isAdmin: boolean`          | ADMIN role in `roles[]`             | Use `roles: ["ADMIN"]` or `primaryRole: "ADMIN"`                           |
| `emailVerified: boolean`    | `emailVerifiedAt: DateTime?`        | Use `emailVerifiedAt: new Date()` or `null`                                |
| `creditsAvailable: number`  | **Doesn't exist**                   | Credits tracked in `Subscription.currentCreditsUsed`                       |
| `storageQuotaBytes: number` | **Doesn't exist**                   | Storage tracked in `Plan.maxStorageMb` and `Subscription.currentStorageMb` |
| `storageUsedBytes: number`  | **Doesn't exist**                   | Use `Subscription.currentStorageMb`                                        |
| `avatarUrl: string`         | **Doesn't exist**                   | Field not in schema                                                        |
| `availableRoles`            | `roles: UserRole[]`                 | Rename to `roles`                                                          |
| `resetPasswordToken`        | Separate model `PasswordResetToken` | Create separate record                                                     |
| `resetPasswordExpiry`       | `PasswordResetToken.expiresAt`      | Use separate model                                                         |
| `emailVerificationToken`    | `EmailVerificationToken` model      | Use separate model                                                         |

### Project Model

| Test Code Uses  | Actual Schema Has | Fix Required     |
| --------------- | ----------------- | ---------------- |
| `title: string` | `name: string`    | Rename to `name` |

### Model Name Mismatches

| Test Code Uses            | Correct Model Name   |
| ------------------------- | -------------------- |
| `prisma.subscriptionPlan` | `prisma.plan`        |
| `prisma.creditHistory`    | `prisma.creditUsage` |
| `prisma.projectImage`     | `prisma.image`       |

### Enum Value Mismatches

All enums in Prisma are UPPERCASE:

| Test Code Uses        | Actual Schema Value   |
| --------------------- | --------------------- |
| `status: "pending"`   | `status: "PENDING"`   |
| `status: "completed"` | `status: "COMPLETED"` |
| `type: "enhance"`     | `type: "ENHANCEMENT"` |

### Plan Model Fields

The schema has different field names than tests assume:

| Test Code Uses    | Actual Schema Has               |
| ----------------- | ------------------------------- |
| `price`           | `monthlyPriceUsd`               |
| `creditsPerMonth` | `maxAiCredits`                  |
| `storageGB`       | `maxStorageMb`                  |
| `billingPeriod`   | **Doesn't exist**               |
| `currency`        | **Doesn't exist** (implied USD) |

## Affected Tests by Module

### auth.test.ts (27 tests)

- ✅ AUTH-001 to AUTH-015: Fixed (roles field)
- ⚠️ AUTH-024: Uses PasswordResetToken (skipped, needs rewrite)
- ⚠️ AUTH-025: Uses EmailVerificationToken (skipped, needs rewrite)
- ✅ AUTH-026, AUTH-027: Should work

### projects.test.ts (20 tests)

- ⚠️ All tests using `title` need to use `name` instead
- ⚠️ Storage tracking tests need Subscription model

### jobs-billing.test.ts (33 tests)

- ⚠️ Admin user creation: Fixed (use primaryRole: ADMIN)
- ⚠️ **All billing tests need major rewrites**:
  - Credits tracked in Subscription, not User
  - subscriptionPlan → plan
  - creditHistory → creditUsage
  - Wrong field names for Plan model
  - Payment status enum values uppercase

### marketplace-admin.test.ts (36 tests)

- ⚠️ Admin user: Fixed
- ⚠️ ADM-004: Uses `creditsAvailable` (needs Subscription)
- ⚠️ ADM-010: Job creation with wrong enum values

### database.test.ts (25 tests)

- ⚠️ DB-001: Uses `title` for Project (should be `name`)
- ⚠️ DB-002, DB-003: Still has `hashedPassword` instead of `passwordHash`
- ⚠️ DB-003: Uses `emailVerified` (should be `emailVerifiedAt`)
- ⚠️ DB-004: Uses `creditsAvailable`
- ⚠️ DB-008, DB-009: Uses `emailVerified` in bulk operations
- ⚠️ DB-010: Uses wrong string types for `primaryRole`
- ⚠️ DB-011: References `hashedPassword` in comment
- ⚠️ DB-012: Uses `creditsAvailable`

### integration.test.ts (10 tests)

- ✅ No TypeScript errors found

## Recommended Approach

1. **Quick fixes** (can do now):
   - Fix all `passwordHash` mismatches
   - Fix `emailVerified` → `emailVerifiedAt`
   - Fix `title` → `name` for Projects
   - Fix enum values to uppercase
   - Fix model names (subscriptionPlan → plan, etc.)

2. **Needs redesign** (skip for now):
   - All credit management tests (need to use Subscription model)
   - All storage quota tests (need to use Subscription/StorageUsage)
   - Plan/subscription tests (wrong field names)
   - Password reset/email verification (need to use separate models properly)

3. **After API implementation**:
   - Many tests are testing endpoints that may not exist yet
   - Run tests to see which API endpoints are implemented
   - Rewrite tests to match actual API behavior

## Next Steps

1. Skip all tests with schema mismatches that can't be quickly fixed
2. Run the remaining tests to see which APIs are actually implemented
3. Based on actual API implementation, rewrite tests to match
4. Update TESTING_REPORT.md with actual results from passing tests
