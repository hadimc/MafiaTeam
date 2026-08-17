"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { inviteUrl, issueToken, resetUrl, uniqueUsername, consumeToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mail";

function emailOf(value: string) {
  return value.trim().toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type LinkResult = { error?: string; url?: string };

export async function inviteUserAction(formData: FormData): Promise<LinkResult> {
  await requireAdmin();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = emailOf(String(formData.get("email") ?? ""));
  const isAdmin = String(formData.get("isAdmin") ?? "") === "on";
  if (!displayName || !isEmail(email)) return { error: "invalid" };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "exists" };

  const user = await prisma.user.create({
    data: {
      username: await uniqueUsername(email.split("@")[0] ?? displayName),
      email,
      displayName,
      displayNameEn: displayName,
      isAdmin,
      enabled: true,
    },
  });

  const token = await issueToken(user.id, "invite", 24 * 7);
  const url = inviteUrl(token);
  await sendMail({
    to: email,
    subject: "MafiaTeam invitation",
    text: `You were invited to MafiaTeam.\nSet your password:\n${url}\nThis link expires in 7 days.`,
  });
  revalidatePath("/admin/users");
  return { url };
}

export async function updateUserAction(userId: string, formData: FormData): Promise<{ error?: string } | void> {
  const admin = await requireAdmin();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = emailOf(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const isAdmin = String(formData.get("isAdmin") ?? "") === "on";
  if (!displayName || !isEmail(email)) return { error: "invalid" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "not_found" };

  const clash = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
  if (clash) return { error: "exists" };

  if (target.isAdmin && !isAdmin) {
    const admins = await prisma.user.count({ where: { isAdmin: true, enabled: true } });
    if (admins <= 1) return { error: "last_admin" };
  }
  if (target.id === admin.id && !isAdmin) return { error: "self" };

  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName,
      displayNameEn: displayName,
      email,
      isAdmin,
      ...(password.length >= 8 ? { passwordHash: bcrypt.hashSync(password, 10) } : {}),
    },
  });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function setUserEnabledAction(userId: string, enabled: boolean) {
  const admin = await requireAdmin();
  if (admin.id === userId) return { error: "self" };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "not_found" };
  if (target.isAdmin && !enabled) {
    const admins = await prisma.user.count({ where: { isAdmin: true, enabled: true } });
    if (admins <= 1) return { error: "last_admin" };
  }
  await prisma.user.update({ where: { id: userId }, data: { enabled } });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function sendResetLinkAction(userId: string): Promise<LinkResult> {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "not_found" };
  const token = await issueToken(user.id, "reset", 24);
  const url = resetUrl(token);
  await sendMail({
    to: user.email,
    subject: "MafiaTeam password reset",
    text: `Reset your MafiaTeam password:\n${url}\nThis link expires in 24 hours.`,
  });
  return { url };
}

export async function resendInviteAction(userId: string): Promise<LinkResult> {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "not_found" };
  const token = await issueToken(user.id, "invite", 24 * 7);
  const url = inviteUrl(token);
  await sendMail({
    to: user.email,
    subject: "MafiaTeam invitation",
    text: `You were invited to MafiaTeam.\nSet your password:\n${url}\nThis link expires in 7 days.`,
  });
  return { url };
}

export async function deleteUserAction(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) return { error: "self" };
  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { gamePlayers: true, registrations: true },
  });
  if (!target) return { error: "not_found" };
  if (target.gamePlayers.length > 0 || target.registrations.length > 0) {
    return { error: "in_use" };
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

function passwordOk(hash: string | null, password: string) {
  return Boolean(hash && password && bcrypt.compareSync(password, hash));
}

export async function updateMyProfileAction(formData: FormData): Promise<{ error?: string } | void> {
  const user = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) return { error: "invalid" };

  await prisma.user.update({
    where: { id: user.id },
    data: { displayName, displayNameEn: displayName },
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function updateMyEmailAction(formData: FormData): Promise<{ error?: string } | void> {
  const session = await requireUser();
  const email = emailOf(String(formData.get("email") ?? ""));
  const currentPassword = String(formData.get("currentPassword") ?? "");
  if (!isEmail(email)) return { error: "invalid" };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { error: "not_found" };
  if (!passwordOk(user.passwordHash, currentPassword)) return { error: "password" };

  const clash = await prisma.user.findFirst({ where: { email, NOT: { id: user.id } } });
  if (clash) return { error: "exists" };

  await prisma.user.update({ where: { id: user.id }, data: { email } });
  revalidatePath("/profile");
}

export async function updateMyPasswordAction(formData: FormData): Promise<{ error?: string } | void> {
  const session = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "short" };
  if (password !== confirm) return { error: "mismatch" };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { error: "not_found" };
  if (!passwordOk(user.passwordHash, currentPassword)) return { error: "password" };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: bcrypt.hashSync(password, 10) },
  });
  revalidatePath("/profile");
}

export async function setPasswordWithTokenAction(
  kind: "invite" | "reset",
  token: string,
  formData: FormData,
) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "short" };
  if (password !== confirm) return { error: "mismatch" };

  const user = await consumeToken(token, kind);
  if (!user) return { error: "expired" };
  if (!user.enabled) return { error: "disabled" };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: bcrypt.hashSync(password, 10) },
  });
  return { ok: true as const };
}
