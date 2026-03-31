import { initializeApp, getApps } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

if (getApps().length === 0) {
  initializeApp();
}

setGlobalOptions({ region: "europe-west1" });

export { createGroup } from "./callable/create-group.js";
export { joinGroup } from "./callable/join-group.js";
export { registerFcmToken } from "./callable/register-fcm-token.js";
export { triggerAlert } from "./api/trigger-alert.js";
export { createAlert } from "./callable/create-alert.js";
export { acceptAlert } from "./callable/accept-alert.js";
export { resolveAlert, cancelAlert } from "./callable/resolve-cancel-alert.js";
export { getHistory } from "./callable/get-history.js";
export { registerBeacon, listBeacons } from "./callable/register-beacon.js";
export { updateMemberZone } from "./callable/update-member-zone.js";
export { getPlans } from "./callable/get-plans.js";
export { onAlertCreated } from "./triggers/on-alert-created.js";
export { onAlertUpdated } from "./triggers/on-alert-updated.js";
export { expireAlerts } from "./scheduled/expire-alerts.js";
