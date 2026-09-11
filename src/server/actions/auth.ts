"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { clearSession, safeNextPath, setSession } from "@/lib/auth";
import { issuePasswordReset } from "@/lib/passwordReset";
import { hitRateLimit } from "@/lib/rateLimit";

export type AuthState = { error?: string } | null;
export type ForgotState = { error?: string; sent?: boolean } | null;

const RESET_COOLDOWN_MS = 60_000;

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const login = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!login || !password) return { error: "missing" };

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: login }, { email: login }] },
  });
  if (!user || !user.passwordHash) return { error: "invalid" };
  if (!user.enabled) return { error: "disabled" };
  if (!bcrypt.compareSync(password, user.passwordHash)) return { error: "invalid" };

  await setSession({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    displayNameEn: user.displayNameEn,
    isAdmin: user.isAdmin,
  });
  redirect(safeNextPath(String(formData.get("next") ?? "")));
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

async function requestIp() {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || list.get("x-real-ip") || "local";
}

export async function requestPasswordResetAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const login = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!login) return { error: "missing" };

  const ip = await requestIp();
  if (
    hitRateLimit(`reset:id:${login}`, RESET_COOLDOWN_MS, 1) ||
    hitRateLimit(`reset:ip:${ip}`, 10 * 60 * 1000, 8)
  ) {
    return { error: "rate" };
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: login }, { email: login }] },
  });
  if (!user || !user.enabled) return { sent: true };

  const recent = await prisma.authToken.findFirst({
    where: {
      userId: user.id,
      type: "reset",
      createdAt: { gt: new Date(Date.now() - RESET_COOLDOWN_MS) },
    },
    select: { id: true },
  });
  if (recent) return { sent: true };

  const { url, mail } = await issuePasswordReset(user);
  if (!mail.delivered && process.env.NODE_ENV !== "production") {
    console.info("[auth] password reset URL (dev only):", url);
  } else if (!mail.delivered) {
    console.info("[auth] password reset issued; email was not sent");
  }
  return { sent: true };
}
