import { Firestore, FieldValue } from "@google-cloud/firestore";

let firestore;

function clearLocalCredentialsInCloudRun() {
  if (!process.env.K_SERVICE) return;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

export function getFirestore() {
  if (!firestore) {
    clearLocalCredentialsInCloudRun();
    const projectId =
      process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    firestore = new Firestore(projectId ? { projectId } : undefined);
  }
  return firestore;
}

export async function saveSnapshotRequest(input) {
  const ref = getFirestore().collection("linuxlens_snapshot_requests").doc();
  await ref.set({
    source: "linuxlens",
    name: input.name,
    email: input.email.toLowerCase(),
    role: input.role || null,
    estate: input.estate || null,
    notes: input.notes || null,
    message: input.message || null,
    userAgent: input.userAgent || null,
    ipHash: input.ipHash || null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
