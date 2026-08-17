"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";
import { Button, Panel } from "@/components/ui";

type UserRow = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  displayNameEn: string;
  isAdmin: boolean;
  enabled: boolean;
  hasPassword: boolean;
};

export function AdminUsers({ users }: { users: UserRow[] }) {
  const { t } = useLang();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Button href="/admin/users/new">{t("inviteUser")}</Button>
      <Panel className="space-y-2 p-2">
        {users.map((user) => {
          const status = !user.enabled
            ? t("disabled")
            : user.hasPassword
              ? t("enabled")
              : t("pendingInvite");
          return (
            <Link
              key={user.id}
              href={`/admin/users/${user.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-bg-elev px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {user.displayNameEn || user.displayName}
                  {user.isAdmin ? " ★" : ""}
                </p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <span className={`shrink-0 text-[11px] ${user.enabled ? "text-citizen" : "text-red-2"}`}>
                {status}
              </span>
            </Link>
          );
        })}
      </Panel>
    </div>
  );
}
