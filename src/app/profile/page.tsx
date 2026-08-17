import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { SettingsView } from "@/components/screens/SettingsView";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireUser("/profile");
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) notFound();
  return (
    <SettingsView
      profile={{
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        displayNameEn: user.displayNameEn,
      }}
    />
  );
}
