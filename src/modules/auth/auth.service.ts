import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import speakeasy from "speakeasy";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../../lib/mailer";
import prisma from "../../prisma";

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "1h";

export interface AuthPayload {
  id: number;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthPayload;
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResponse> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("EMAIL_TAKEN");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
    },
  });

  const payload: AuthPayload = { id: user.id, email: user.email };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);

  const emailTokenRecord = await createEmailVerificationToken(user.id);

  // Build verification link (frontend route can read ?token=)
  const verifyUrl = `${APP_BASE_URL}/verify-email?token=${emailTokenRecord.token}`;

  // Send verification email
  await sendEmail({
    to: user.email,
    subject: "Verify your email for AIPIX",
    text: `Hi ${user.displayName},\n\nPlease verify your email by clicking the link below:\n${verifyUrl}\n\nIf you did not sign up, you can ignore this email.`,
    html: `
      <p>Hi ${user.displayName},</p>
      <p>Thank you for signing up to <strong>AIPIX</strong>.</p>
      <p>Please verify your email by clicking the button below:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:white;text-decoration:none;border-radius:4px;">Verify Email</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p><code>${verifyUrl}</code></p>
      <p>If you did not sign up, you can ignore this email.</p>
    `,
  });

  // For the API response we don't need to return the token anymore
  return { token, user: payload };
}

export async function loginUser(
  email: string,
  password: string,
  mfaCode?: string
): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("INVALID_CREDENTIALS");

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new Error("INVALID_CREDENTIALS");

  if (user.mfaEnabled) {
    if (!mfaCode) {
      throw new Error("MFA_REQUIRED");
    }
    if (!user.mfaSecret) {
      throw new Error("MFA_MISCONFIGURED");
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token: mfaCode,
      window: 1,
    });

    if (!verified) {
      throw new Error("MFA_INVALID");
    }
  }

  const payload: AuthPayload = {
    id: user.id,
    email: user.email,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);

  // Optional: update lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { token, user: payload };
}

async function createEmailVerificationToken(userId: number) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const record = await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return record;
}

export async function verifyEmail(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    throw new Error("INVALID_TOKEN");
  }

  if (record.usedAt) {
    throw new Error("TOKEN_USED");
  }

  if (record.expiresAt < new Date()) {
    throw new Error("TOKEN_EXPIRED");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true };
}

// Password Reset
async function createPasswordResetToken(userId: number) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const record = await prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return record;
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Do not leak existence of email
  if (!user) {
    return { success: true };
  }

  const resetRecord = await createPasswordResetToken(user.id);

  const resetUrl = `${APP_BASE_URL}/reset-password?token=${resetRecord.token}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your AIPIX password",
    text: `Hi ${user.displayName},\n\nYou requested to reset your password. Click the link below to continue:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <p>Hi ${user.displayName},</p>
      <p>We received a request to reset your <strong>AIPIX</strong> account password.</p>
      <p>Click the button below to choose a new password:</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:white;text-decoration:none;border-radius:4px;">Reset Password</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p><code>${resetUrl}</code></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });

  return { success: true };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record) throw new Error("INVALID_TOKEN");
  if (record.usedAt) throw new Error("TOKEN_USED");
  if (record.expiresAt < new Date()) throw new Error("TOKEN_EXPIRED");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true };
}

// MFA
export function generateMfaSecretForUser(email: string) {
  const secret = speakeasy.generateSecret({
    name: `AIPIX (${email})`,
  });

  return {
    base32: secret.base32,
    otpauthUrl: secret.otpauth_url!,
  };
}

export async function setupMfa(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  const secret = generateMfaSecretForUser(user.email);

  // Store the secret but don't enable MFA yet
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaSecret: secret.base32,
    },
  });

  return {
    otpauthUrl: secret.otpauthUrl,
    base32: secret.base32,
  };
}

export async function enableMfa(userId: number, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret) throw new Error("MFA_NOT_SETUP");

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: code,
    window: 1,
  });

  if (!verified) throw new Error("MFA_INVALID");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: true,
    },
  });

  return { success: true };
}

export async function disableMfa(userId: number, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret) throw new Error("MFA_NOT_SETUP");

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: code,
    window: 1,
  });

  if (!verified) throw new Error("MFA_INVALID");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
    },
  });

  return { success: true };
}
