"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expireAlerts = exports.onAlertUpdated = exports.onAlertCreated = exports.updateMemberZone = exports.listBeacons = exports.registerBeacon = exports.getHistory = exports.cancelAlert = exports.resolveAlert = exports.acceptAlert = exports.createAlert = exports.triggerAlert = exports.registerFcmToken = exports.joinGroup = exports.createGroup = void 0;
const app_1 = require("firebase-admin/app");
const v2_1 = require("firebase-functions/v2");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
(0, v2_1.setGlobalOptions)({ region: "europe-west1" });
var create_group_js_1 = require("./callable/create-group.js");
Object.defineProperty(exports, "createGroup", { enumerable: true, get: function () { return create_group_js_1.createGroup; } });
var join_group_js_1 = require("./callable/join-group.js");
Object.defineProperty(exports, "joinGroup", { enumerable: true, get: function () { return join_group_js_1.joinGroup; } });
var register_fcm_token_js_1 = require("./callable/register-fcm-token.js");
Object.defineProperty(exports, "registerFcmToken", { enumerable: true, get: function () { return register_fcm_token_js_1.registerFcmToken; } });
var trigger_alert_js_1 = require("./api/trigger-alert.js");
Object.defineProperty(exports, "triggerAlert", { enumerable: true, get: function () { return trigger_alert_js_1.triggerAlert; } });
var create_alert_js_1 = require("./callable/create-alert.js");
Object.defineProperty(exports, "createAlert", { enumerable: true, get: function () { return create_alert_js_1.createAlert; } });
var accept_alert_js_1 = require("./callable/accept-alert.js");
Object.defineProperty(exports, "acceptAlert", { enumerable: true, get: function () { return accept_alert_js_1.acceptAlert; } });
var resolve_cancel_alert_js_1 = require("./callable/resolve-cancel-alert.js");
Object.defineProperty(exports, "resolveAlert", { enumerable: true, get: function () { return resolve_cancel_alert_js_1.resolveAlert; } });
Object.defineProperty(exports, "cancelAlert", { enumerable: true, get: function () { return resolve_cancel_alert_js_1.cancelAlert; } });
var get_history_js_1 = require("./callable/get-history.js");
Object.defineProperty(exports, "getHistory", { enumerable: true, get: function () { return get_history_js_1.getHistory; } });
var register_beacon_js_1 = require("./callable/register-beacon.js");
Object.defineProperty(exports, "registerBeacon", { enumerable: true, get: function () { return register_beacon_js_1.registerBeacon; } });
Object.defineProperty(exports, "listBeacons", { enumerable: true, get: function () { return register_beacon_js_1.listBeacons; } });
var update_member_zone_js_1 = require("./callable/update-member-zone.js");
Object.defineProperty(exports, "updateMemberZone", { enumerable: true, get: function () { return update_member_zone_js_1.updateMemberZone; } });
var on_alert_created_js_1 = require("./triggers/on-alert-created.js");
Object.defineProperty(exports, "onAlertCreated", { enumerable: true, get: function () { return on_alert_created_js_1.onAlertCreated; } });
var on_alert_updated_js_1 = require("./triggers/on-alert-updated.js");
Object.defineProperty(exports, "onAlertUpdated", { enumerable: true, get: function () { return on_alert_updated_js_1.onAlertUpdated; } });
var expire_alerts_js_1 = require("./scheduled/expire-alerts.js");
Object.defineProperty(exports, "expireAlerts", { enumerable: true, get: function () { return expire_alerts_js_1.expireAlerts; } });
//# sourceMappingURL=index.js.map