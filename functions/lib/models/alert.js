"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggerSource = exports.AlertStatus = void 0;
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "ACTIVE";
    AlertStatus["ACCEPTED"] = "ACCEPTED";
    AlertStatus["RESOLVED"] = "RESOLVED";
    AlertStatus["CANCELLED"] = "CANCELLED";
    AlertStatus["EXPIRED"] = "EXPIRED";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var TriggerSource;
(function (TriggerSource) {
    TriggerSource["FLIC"] = "FLIC";
    TriggerSource["PWA"] = "PWA";
    TriggerSource["ANDROID"] = "ANDROID";
})(TriggerSource || (exports.TriggerSource = TriggerSource = {}));
//# sourceMappingURL=alert.js.map