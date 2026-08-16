import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserEditor } from "@/components/screens/UserEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();
  return (
    <UserEditor
      user={{
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        displayNameEn: user.displayNameEn,
        isAdmin: user.isAdmin,
        enabled: user.enabled,
        hasPassword: Boolean(user.passwordHash),
      }}
    />
  );
}
