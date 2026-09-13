import { randomUUID } from "node:crypto";
import { saveSnapshotRequest } from "./firestore.mjs";
import { notifySnapshotRequest } from "./mail.mjs";
import { rateLimitAllowContact } from "./rate-limit.mjs";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * LinuxLens snapshot request — same dual-email + Firestore pattern as suherman.net contact.
 */
export async function handleContact({ body, userAgent, ipHash }) {
  // Honeypot
  if (body.website) {
    return { status: 200, body: { ok: true } };
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const role = String(body.role || "").trim();
  const estate = String(body.estate || "").trim();
  const notes = String(body.notes || body.message || "").trim();

  if (name.length < 2 || name.length > 120) {
    return { status: 400, body: { error: "Please enter a valid name." } };
  }
  if (!isValidEmail(email) || email.length > 200) {
    return { status: 400, body: { error: "Please enter a valid email." } };
  }
  if (!role || role.length > 120) {
    return { status: 400, body: { error: "Please select a role." } };
  }
  if (!estate || estate.length > 120) {
    return { status: 400, body: { error: "Please select an estate size." } };
  }
  if (notes.length > 4000) {
    return { status: 400, body: { error: "Context is too long." } };
  }

  const limitKey = ipHash || email.toLowerCase();
  if (!rateLimitAllowContact(limitKey)) {
    return {
      status: 429,
      body: { error: "Too many requests. Please try again later." },
    };
  }

  const message = [
    `Linux Risk Snapshot request`,
    `Role: ${role}`,
    `Estate size: ${estate}`,
    notes ? `Context: ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    let contactId;
    try {
      contactId = await saveSnapshotRequest({
        name,
        email,
        role,
        estate,
        notes,
        message,
        userAgent,
        ipHash,
      });
    } catch (storeErr) {
      console.error("[contact] firestore save failed:", storeErr);
      contactId = randomUUID();
    }

    try {
      await notifySnapshotRequest({
        name,
        email,
        role,
        estate,
        notes,
        contactId,
      });
    } catch (mailErr) {
      console.error("[contact] notify email failed:", mailErr);
      // Still OK if stored — same soft-fail mail pattern as suherman when mail throws after save.
      // If SMTP is missing entirely, surface error so deploy misconfig is visible.
      if (String(mailErr?.message || "").includes("is not configured")) {
        return {
          status: 500,
          body: { error: "Could not send your message. Please try again." },
        };
      }
    }

    return { status: 200, body: { ok: true, id: contactId } };
  } catch (err) {
    console.error("contact failed:", err);
    return {
      status: 500,
      body: { error: "Could not send your message. Please try again." },
    };
  }
}
