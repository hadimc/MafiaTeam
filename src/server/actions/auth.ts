"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { clearSession, safeNextPath, setSession } from "@/lib/auth";

export type AuthState = { error?: string } | null;

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
