import nodemailer from "nodemailer";

const PERSON_NAME = "Iman Suherman";
const SITE_URL = "https://linuxlens.suherman.net";
const BRAND = "LinuxLens";
const TAGLINE = "See your Linux risk before it becomes an incident.";
const CONTACT_EMAIL = "iman.suherman@gmail.com";
const LOGO_URL = `${SITE_URL}/assets/logo-mark.png?v=5`;

/** Same cream-card email system as suherman.net, with LinuxLens accents. */
const COLORS = {
  background: "#ebe3d6",
  surface: "#f4efe6",
  ink: "#132033",
  accent: "#1e4d8c",
  brand: "#0066ff",
  muted: "#5b6b7c",
  border: "rgba(19, 32, 51, 0.1)",
  codeBg: "#132033",
  codeFg: "#cfe0ff",
};

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getNotifyToEmails() {
  const raw =
    process.env.CONTACT_TO_EMAILS?.trim() ||
    process.env.WEBINAR_NOTIFY_EMAIL?.trim() ||
    CONTACT_EMAIL;
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Same Nodemailer + Gmail SMTP pattern as suherman.net / ArahBaik / Workbench.
 * From display must be a person name — not a bare domain — over Gmail SMTP.
 */
export async function sendMail(input) {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS").replace(/\s+/g, "");
  const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim() || user;
  const configuredName = process.env.EMAIL_FROM_NAME?.trim();
  const fromName =
    !configuredName ||
    configuredName.toLowerCase() === "suherman.net" ||
    configuredName.toLowerCase() === "linuxlens" ||
    configuredName.toLowerCase() === "alocare"
      ? PERSON_NAME
      : configuredName;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: Array.isArray(input.to) ? input.to.join(", ") : input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(value) {
  return escapeHtml(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "<br />");
}

function paragraph(html) {
  return `<p style="margin:0 0 14px;color:${COLORS.muted};font-size:15px;line-height:1.6;">${html}</p>`;
}

function detailRow(label, valueHtml) {
  return `<p style="margin:0 0 10px;color:${COLORS.ink};font-size:15px;line-height:1.5;"><strong style="color:${COLORS.accent};">${escapeHtml(label)}:</strong> ${valueHtml}</p>`;
}

function ctaButton(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;">
  <tr>
    <td style="border-radius:999px;background:${COLORS.brand};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.01em;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

function codeBlock(lines) {
  const body = lines.map((line) => escapeHtml(line)).join("<br />");
  return `<div style="margin:0 0 16px;padding:14px 16px;background:${COLORS.codeBg};border-radius:12px;color:${COLORS.codeFg};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12.5px;line-height:1.55;overflow-wrap:anywhere;">${body}</div>`;
}

/**
 * Card layout matching suherman.net emails (logo header, title, body, footer).
 */
export function renderEmailLayout({ preview, title, bodyHtml, footer }) {
  const footerText =
    footer ??
    `${BRAND} — ${TAGLINE} This message was sent automatically from ${SITE_URL}.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;text-align:center;background:linear-gradient(180deg,#faf7f1 0%,#f4efe6 100%);">
              <img src="${escapeHtml(LOGO_URL)}" alt="${escapeHtml(BRAND)}" width="96" height="96" style="display:inline-block;border:0;outline:none;text-decoration:none;" />
              <p style="margin:14px 0 0;font-size:22px;letter-spacing:-0.02em;color:${COLORS.ink};font-weight:600;">${escapeHtml(BRAND)}</p>
              <p style="margin:6px 0 0;font-size:13px;color:${COLORS.accent};">${escapeHtml(TAGLINE)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <h1 style="margin:20px 0 0;font-size:22px;line-height:1.3;color:${COLORS.ink};font-weight:600;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 28px;color:${COLORS.muted};font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <hr style="border:none;border-top:1px solid ${COLORS.border};margin:0 0 16px;" />
              <p style="margin:0;font-size:12px;line-height:1.5;color:${COLORS.muted};">${escapeHtml(footerText)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderStaffNotify(input) {
  const subject = `[${BRAND}] Snapshot request — ${input.name}`;
  const bodyHtml = [
    paragraph(`New Linux Risk Snapshot request on ${escapeHtml(SITE_URL)}.`),
    detailRow("Name", escapeHtml(input.name)),
    detailRow("Email", escapeHtml(input.email)),
    detailRow("Role", escapeHtml(input.role || "—")),
    detailRow("Estate size", escapeHtml(input.estate || "—")),
    detailRow("Request ID", escapeHtml(input.contactId)),
    input.notes
      ? paragraph(
          `<strong style="color:${COLORS.accent};">Context:</strong><br />${nl2br(input.notes)}`,
        )
      : "",
    paragraph(
      `<span style="color:#8fa59c;">Reply directly to ${escapeHtml(input.email)}</span>`,
    ),
  ].join("");

  const text = [
    "New Linux Risk Snapshot request",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Role: ${input.role || "—"}`,
    `Estate size: ${input.estate || "—"}`,
    `Request ID: ${input.contactId}`,
    "",
    "Context:",
    input.notes || "(none)",
    "",
    `Reply to ${input.email}`,
    SITE_URL,
  ].join("\n");

  return {
    subject,
    html: renderEmailLayout({
      preview: `Snapshot request from ${input.name}`,
      title: "New snapshot request",
      bodyHtml,
    }),
    text,
  };
}

export function renderAutoReply(input) {
  const name = input.name.trim() || "there";
  const subject = `Thanks — we received your ${BRAND} snapshot request`;
  const bodyHtml = [
    paragraph(`Hi ${escapeHtml(name)},`),
    paragraph(
      "Thanks for requesting a <strong style=\"color:#132033;\">Linux Risk Snapshot</strong>. We received your details and will follow up at this address with next steps — including an offline collection path if nothing may leave your environment.",
    ),
    paragraph(
      "Meanwhile you can run the open-source collector yourself:",
    ),
    codeBlock([
      "curl -fsSL https://linuxlens.suherman.net/install.sh | bash",
      "source ~/.linuxlens_env",
      "linuxlens assess localhost",
    ]),
    ctaButton(SITE_URL, "Open LinuxLens"),
    paragraph(`Best regards,<br />${escapeHtml(PERSON_NAME)}`),
  ].join("");

  const text = [
    `Hi ${name},`,
    "",
    "Thanks for requesting a Linux Risk Snapshot. We received your details and will follow up at this address with next steps.",
    "",
    "Meanwhile you can run the open-source collector yourself:",
    "curl -fsSL https://linuxlens.suherman.net/install.sh | bash",
    "source ~/.linuxlens_env",
    "linuxlens assess localhost",
    "",
    SITE_URL,
    "",
    "Best regards,",
    PERSON_NAME,
  ].join("\n");

  return {
    subject,
    html: renderEmailLayout({
      preview: `Confirmation from ${PERSON_NAME}`,
      title: "Request received",
      bodyHtml,
      footer: `${PERSON_NAME} · ${BRAND} · ${SITE_URL}`,
    }),
    text,
  };
}

export async function notifySnapshotRequest(input) {
  const recipients = getNotifyToEmails();
  if (recipients.length === 0) {
    throw new Error("CONTACT_TO_EMAILS is empty");
  }

  const staff = renderStaffNotify(input);
  await sendMail({
    to: recipients,
    subject: staff.subject,
    html: staff.html,
    text: staff.text,
    replyTo: input.email,
  });

  try {
    const auto = renderAutoReply(input);
    await sendMail({
      to: input.email,
      subject: auto.subject,
      html: auto.html,
      text: auto.text,
      replyTo: process.env.EMAIL_FROM_ADDRESS?.trim() || CONTACT_EMAIL,
    });
  } catch (error) {
    console.warn(
      "[contact] staff notify sent but auto-reply failed for",
      input.email,
      error,
    );
  }
}
