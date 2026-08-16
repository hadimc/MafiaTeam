import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const COOKIE = "mt_session";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  displayNameEn: string;
  isAdmin: boolean;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function setSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = String(payload.id ?? "");
    if (!id) return null;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.enabled) return null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      displayNameEn: user.displayNameEn,
      isAdmin: user.isAdmin,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}

export function locName(user: { displayName: string; displayNameEn: string }) {
  return user.displayNameEn?.trim() || user.displayName;
}
