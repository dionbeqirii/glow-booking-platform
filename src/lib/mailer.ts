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

/**
 * Best-effort delivery for transactional emails triggered by an action that
 * must never fail because of a mail problem (booking confirmed/cancelled...).
 * Mirrors the isMailConfigured()/try-catch fallback already used by the
 * password-reset flow, just reusable across every call site instead of
 * repeated inline. When SMTP isn't configured, this is demo-mode: log only.
 */
export async function sendTransactionalMail(opts: { to: string; subject: string; html: string; logTag: string }): Promise<void> {
  if (!isMailConfigured()) {
    console.log(`[${opts.logTag}] (demo mode, SMTP not configured) → ${opts.to}: ${opts.subject}`);
    return;
  }
  try {
    await sendMail({ to: opts.to, subject: opts.subject, html: opts.html });
  } catch (err) {
    console.error(`[${opts.logTag}] email failed`, err);
  }
}

// Transactional emails are always sent in English, regardless of the
// client's own app locale preference (a deliberate choice — the studio
// doesn't want to depend on per-client email translation quality/coverage).
export const EMAIL_LOCALE = "en";

type EmailTranslator = (key: string, values?: Record<string, string | number>) => string;

/** Shared branded wrapper (logo, card, footer) — mirrors resetPasswordEmail's look. */
function emailShell(inner: string): string {
  return `
  <div style="margin:0;padding:24px;background:#faf7f4;font-family:Arial,Helvetica,sans-serif;color:#2b2622">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e7ded6">
      <h1 style="margin:0 0 4px;font-size:22px;color:#2b2622">
        Glow <span style="color:#b76e79">By Diellza</span>
      </h1>
      ${inner}
    </div>
  </div>`;
}

function emailButton(href: string, label: string): string {
  return `<a href="${href}"
     style="display:inline-block;background:#b76e79;color:#ffffff;text-decoration:none;
            padding:12px 22px;border-radius:12px;font-size:14px;font-weight:600">
    ${label}
  </a>`;
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#a3968c;white-space:nowrap">${label}</td>
      <td style="padding:6px 0 6px 16px;font-size:14px;color:#2b2622;font-weight:600;text-align:right">${value}</td>
    </tr>`;
}

/** Sent when a booking is created (FR-05), whether the client booked it
 *  themselves or staff/admin booked it on their behalf. */
export function bookingConfirmationEmail(opts: {
  t: EmailTranslator;
  origin: string;
  clientName: string;
  serviceName: string;
  staffName: string;
  dateLabel: string;
  timeLabel: string;
  durationMin: number;
  price: number;
}): { subject: string; html: string } {
  const { t } = opts;
  const subject = t("confirmationSubject");
  const html = emailShell(`
      <h2 style="margin:20px 0 8px;font-size:18px;color:#2b2622">${t("confirmationHeading")}</h2>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#6f645c">
        ${t("confirmationIntro", { name: opts.clientName })}
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px" role="presentation">
        ${detailRow(t("serviceRowLabel"), opts.serviceName)}
        ${detailRow(t("staffRowLabel"), opts.staffName)}
        ${detailRow(t("dateRowLabel"), opts.dateLabel)}
        ${detailRow(t("timeRowLabel"), opts.timeLabel)}
        ${detailRow(t("durationRowLabel"), t("durationValue", { min: opts.durationMin }))}
        ${detailRow(t("priceRowLabel"), `${opts.price.toFixed(2)} €`)}
      </table>
      ${emailButton(`${opts.origin}/client/terminet`, t("viewBookingCta"))}
      <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#a3968c">
        ${t("confirmationFooter")}
      </p>`);
  return { subject, html };
}

/** Sent when a booking is cancelled by staff or admin (never for a client's
 *  own self-cancel — they already know). */
export function bookingCancelledEmail(opts: {
  t: EmailTranslator;
  origin: string;
  clientName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
}): { subject: string; html: string } {
  const { t } = opts;
  const subject = t("cancelledSubject");
  const html = emailShell(`
      <h2 style="margin:20px 0 8px;font-size:18px;color:#2b2622">${t("cancelledHeading")}</h2>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#6f645c">
        ${t("cancelledIntro", { name: opts.clientName, service: opts.serviceName, date: opts.dateLabel, time: opts.timeLabel })}
      </p>
      ${emailButton(`${opts.origin}/client/rezervo`, t("rebookCta"))}
      <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#a3968c">
        ${t("cancelledFooter")}
      </p>`);
  return { subject, html };
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
