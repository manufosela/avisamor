"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggerSource = exports.AlertStatus = void 0;
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "active";
    AlertStatus["ACCEPTED"] = "accepted";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["CANCELLED"] = "cancelled";
    AlertStatus["EXPIRED"] = "expired";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var TriggerSource;
(function (TriggerSource) {
    TriggerSource["FLIC"] = "flic";
    TriggerSource["PWA"] = "pwa";
    TriggerSource["ANDROID"] = "android";
})(TriggerSource || (exports.TriggerSource = TriggerSource = {}));
//# sourceMappingURL=alert.js.map