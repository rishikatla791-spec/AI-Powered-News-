import { siteUrl } from "@/lib/env";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function frame(title: string, body: string, footer: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f6f6f3;color:#1d2025;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f3"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:24px;border-bottom:1px solid #d9dad4"><span style="font-size:22px;font-weight:800;letter-spacing:-0.02em">Lede</span></td></tr>
<tr><td style="padding:28px 0">${body}</td></tr>
<tr><td style="padding-top:20px;border-top:1px solid #d9dad4;font-size:12px;line-height:1.5;color:#5f646d">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export function magicLinkEmail(url: string) {
  const subject = "Your sign-in link for Lede";
  const html = frame(
    subject,
    `<p style="font-size:17px;line-height:1.5;margin:0 0 20px">Use this link to sign in. It works once and expires in 15 minutes.</p>
     <a href="${esc(url)}" style="display:inline-block;background:#1d2025;color:#f6f6f3;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">Sign in to Lede</a>
     <p style="font-size:13px;line-height:1.5;color:#5f646d;margin:24px 0 0">If you didn't ask for this, you can ignore this email. No account is created until the link is used.</p>`,
    `Sent by Lede · <a href="${siteUrl()}/privacy" style="color:#5f646d">Privacy</a>`,
  );
  const text = `Sign in to Lede (link expires in 15 minutes):\n${url}\n\nIf you didn't ask for this, ignore this email.`;
  return { subject, html, text };
}

export function passwordResetEmail(url: string) {
  const subject = "Reset your Lede password";
  const html = frame(
    subject,
    `<p style="font-size:17px;line-height:1.5;margin:0 0 20px">Use this link to choose a new password. It works once and expires in 30 minutes.</p>
     <a href="${esc(url)}" style="display:inline-block;background:#1d2025;color:#f6f6f3;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">Choose a new password</a>
     <p style="font-size:13px;line-height:1.5;color:#5f646d;margin:24px 0 0">If you didn't ask for this, you can ignore this email. Your password stays the same.</p>`,
    `Sent by Lede · <a href="${siteUrl()}/privacy" style="color:#5f646d">Privacy</a>`,
  );
  const text = `Choose a new password for Lede (link expires in 30 minutes):\n${url}\n\nIf you didn't ask for this, ignore this email.`;
  return { subject, html, text };
}

export type BriefItem ={ headline: string; slug: string; keyPoint: string | null; outletCount: number };

export function briefEmail(items: BriefItem[], dateLabel: string, unsubscribeUrl: string) {
  const subject = `Your Lede brief for ${dateLabel}`;
  const list = items
    .map(
      (s) => `<tr><td style="padding:16px 0;border-bottom:1px solid #ececE7">
        <a href="${siteUrl()}/s/${esc(s.slug)}" style="color:#1d2025;text-decoration:none;font-size:19px;font-weight:700;line-height:1.25">${esc(s.headline)}</a>
        ${s.keyPoint ? `<p style="margin:8px 0 0;font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#3c4048">${esc(s.keyPoint)}</p>` : ""}
        <p style="margin:6px 0 0;font-size:12px;color:#5f646d">Reported by ${s.outletCount} outlets</p></td></tr>`,
    )
    .join("");
  const html = frame(
    subject,
    `<p style="font-size:15px;color:#5f646d;margin:0 0 8px">${esc(dateLabel)}</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list}</table>`,
    `You get this because you turned on the daily brief. <a href="${esc(unsubscribeUrl)}" style="color:#5f646d">Turn off the brief</a> · <a href="${siteUrl()}/settings" style="color:#5f646d">Settings</a>`,
  );
  const text = `${subject}\n\n${items.map((s) => `${s.headline}\n${siteUrl()}/s/${s.slug}\n`).join("\n")}\nTurn off: ${unsubscribeUrl}`;
  return { subject, html, text };
}
