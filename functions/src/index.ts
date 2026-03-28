import { initializeApp, getApps } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

if (getApps().length === 0) {
  initializeApp();
}

setGlobalOptions({ region: "europe-west1" });

export { createGroup } from "./callable/create-group.js";
export { joinGroup } from "./callable/join-group.js";
export { registerFcmToken } from "./callable/register-fcm-token.js";
