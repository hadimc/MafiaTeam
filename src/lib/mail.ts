/**
 * Local-first mailer. Logs the message so invite/reset still works without SMTP.
 * When SMTP is added later, send through this function only.
 */
export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}) {
  console.info("[mail]", {
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  return { delivered: false as const };
}
