import { initializeApp, getApps, deleteApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "avisador-avisamor";

let app: App;

export function getTestApp(): App {
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      app = initializeApp({ projectId: "avisador-avisamor" });
    }
  }
  return app;
}

export function getTestFirestore() {
  return getFirestore(getTestApp());
}

export async function clearFirestore() {
  const db = getTestFirestore();
  const collections = ["groups", "groupMembers", "alerts", "alertHistory"];
  for (const col of collections) {
    const snap = await db.collection(col).get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

export async function cleanupApp() {
  if (app) {
    await deleteApp(app);
  }
}
