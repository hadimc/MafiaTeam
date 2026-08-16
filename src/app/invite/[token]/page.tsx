import { SetPasswordForm } from "./SetPasswordForm";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SetPasswordForm kind="invite" token={token} />;
}
