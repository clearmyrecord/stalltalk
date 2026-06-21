import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_RESET_MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_RESET_TOKEN_MINUTES = 60;

export function validateNewPassword(password: string) {
  if (!password || password.length < PASSWORD_RESET_MIN_PASSWORD_LENGTH) return `Password must be at least ${PASSWORD_RESET_MIN_PASSWORD_LENGTH} characters.`;
  return null;
}

export function createPasswordResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string) {
  const secret = process.env.AUTH_SECRET || "setup-required";
  return createHash("sha256").update(`${token}:${secret}`).digest("hex");
}

export function passwordResetExpiresAt() {
  return new Date(Date.now() + PASSWORD_RESET_TOKEN_MINUTES * 60 * 1000);
}

export function publicBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
