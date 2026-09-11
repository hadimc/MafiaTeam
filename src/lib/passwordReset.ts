import { sendMail } from "./mail";
import { issueToken, resetUrl } from "./tokens";

export async function issuePasswordReset(user: { id: string; email: string }) {
  const token = await issueToken(user.id, "reset", 24);
  const url = resetUrl(token);
  const mail = await sendMail({
    to: user.email,
    subject: "MafiaTeam password reset",
    text: `Reset your MafiaTeam password:\n${url}\nThis link expires in 24 hours.`,
  });
  return { url, mail };
}
