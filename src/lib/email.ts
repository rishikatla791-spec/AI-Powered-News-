import { Resend } from "resend";
import { env } from "@/lib/env";

let client: Resend | null = null;

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; headers?: Record<string, string> }) {
  const key = env().RESEND_API_KEY;
  if (!key) {
    // Local development: print the email so magic links still work without an account.
    console.info(`\n[email] to=${msg.to}\nsubject=${msg.subject}\n${msg.text}\n`);
    return;
  }
  client ??= new Resend(key);
  const { error } = await client.emails.send({
    from: env().EMAIL_FROM ?? "Lede <onboarding@resend.dev>",
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    headers: msg.headers,
  });
  if (error) throw new Error(`Email failed: ${error.message}`);
}
