import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";

export type TokenType = "invite" | "reset";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export async function issueToken(userId: string, type: TokenType, hours: number) {
  await prisma.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  const { token, tokenHash } = newToken();
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function consumeToken(token: string, type: TokenType) {
  const row = await prisma.authToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!row || row.type !== type || row.usedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  await prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row.user;
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function inviteUrl(token: string) {
  return `${appUrl()}/invite/${token}`;
}

export function resetUrl(token: string) {
  return `${appUrl()}/reset/${token}`;
}

export async function uniqueUsername(base: string) {
  const cleaned = base.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "player";
  let username = cleaned;
  let n = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${cleaned}${++n}`;
  }
  return username;
}
