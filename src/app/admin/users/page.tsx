import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/queries";
import { AdminUsers } from "@/components/screens/AdminUsers";

export default async function Page() {
  await requireAdmin();
  const users = await listUsers();
  return (
    <AdminUsers
      users={users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        enabled: user.enabled,
        hasPassword: Boolean(user.passwordHash),
      }))}
    />
  );
}
