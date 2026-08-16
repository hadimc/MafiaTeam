import { SetPasswordForm } from "../../invite/[token]/SetPasswordForm";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SetPasswordForm kind="reset" token={token} />;
}
