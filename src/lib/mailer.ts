import nodemailer from "nodemailer";

/**
 * Email delivery over SMTP (works with Gmail, Resend, or any SMTP provider).
 * Configured entirely through environment variables, so no secret ever lives
 * in the code. When SMTP is not configured the app falls back to demo mode
 * (the reset link is shown on screen instead of emailed).
 */

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const from = process.env.MAIL_FROM ?? `Glow By Diellza <${process.env.SMTP_USER}>`;
  await getTransporter().sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
}

/** Branded HTML for the password-reset email. */
export function resetPasswordEmail(link: string): { subject: string; html: string } {
  const subject = "Rivendos fjalëkalimin — Glow By Diellza";
  const html = `
  <div style="margin:0;padding:24px;background:#faf7f4;font-family:Arial,Helvetica,sans-serif;color:#2b2622">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e7ded6">
      <h1 style="margin:0 0 4px;font-size:22px;color:#2b2622">
        Glow <span style="color:#b76e79">By Diellza</span>
      </h1>
      <h2 style="margin:20px 0 8px;font-size:18px;color:#2b2622">Rivendos fjalëkalimin</h2>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#6f645c">
        Ke kërkuar të rivendosësh fjalëkalimin. Kliko butonin më poshtë për të vendosur një të ri.
        Linku skadon për një orë.
      </p>
      <a href="${link}"
         style="display:inline-block;background:#b76e79;color:#ffffff;text-decoration:none;
                padding:12px 22px;border-radius:12px;font-size:14px;font-weight:600">
        Vendos fjalëkalimin e ri
      </a>
      <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#a3968c">
        Nëse nuk e ke kërkuar ti këtë, thjesht shpërfille këtë email — fjalëkalimi yt mbetet i njëjti.
      </p>
    </div>
  </div>`;
  return { subject, html };
}
