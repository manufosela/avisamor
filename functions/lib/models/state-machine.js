"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_TRANSITIONS = void 0;
exports.isValidTransition = isValidTransition;
const alert_js_1 = require("./alert.js");
exports.VALID_TRANSITIONS = new Map([
    [alert_js_1.AlertStatus.ACTIVE, [alert_js_1.AlertStatus.ACCEPTED, alert_js_1.AlertStatus.CANCELLED, alert_js_1.AlertStatus.EXPIRED]],
    [alert_js_1.AlertStatus.ACCEPTED, [alert_js_1.AlertStatus.RESOLVED, alert_js_1.AlertStatus.CANCELLED]],
    [alert_js_1.AlertStatus.RESOLVED, []],
    [alert_js_1.AlertStatus.CANCELLED, []],
    [alert_js_1.AlertStatus.EXPIRED, []],
]);
function isValidTransition(from, to) {
    const allowed = exports.VALID_TRANSITIONS.get(from);
    return allowed !== undefined && allowed.includes(to);
}
//# sourceMappingURL=state-machine.js.map