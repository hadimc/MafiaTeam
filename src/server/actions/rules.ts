"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function createRuleAction(formData: FormData) {
  await requireAdmin();
  const titleEn = String(formData.get("title") ?? "").trim();
  const bodyEn = String(formData.get("body") ?? "").trim();
  if (!titleEn || !bodyEn) return;
  const last = await prisma.houseRule.findFirst({ orderBy: { sortOrder: "desc" } });
  await prisma.houseRule.create({
    data: {
      title: titleEn,
      titleEn,
      body: bodyEn,
      bodyEn,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/admin/rules");
  revalidatePath("/rules");
}

export async function updateRuleAction(id: string, formData: FormData) {
  await requireAdmin();
  const titleEn = String(formData.get("title") ?? "").trim();
  const bodyEn = String(formData.get("body") ?? "").trim();
  if (!titleEn || !bodyEn) return;
  await prisma.houseRule.update({
    where: { id },
    data: { title: titleEn, titleEn, body: bodyEn, bodyEn },
  });
  revalidatePath("/admin/rules");
  revalidatePath("/rules");
}

export async function deleteRuleAction(id: string) {
  await requireAdmin();
  await prisma.houseRule.delete({ where: { id } });
  revalidatePath("/admin/rules");
  revalidatePath("/rules");
}
