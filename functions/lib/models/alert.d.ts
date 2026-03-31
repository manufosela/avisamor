import { type Timestamp } from "firebase-admin/firestore";
export declare enum AlertStatus {
    ACTIVE = "active",
    ACCEPTED = "accepted",
    RESOLVED = "resolved",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}
export declare enum TriggerSource {
    FLIC = "flic",
    PWA = "pwa",
    ANDROID = "android"
}
export interface AcceptedByEntry {
    uid: string;
    displayName: string;
    acceptedAt: Timestamp;
}
export interface Alert {
    alertId: string;
    groupId: string;
    triggeredBy: string;
    triggerSource: TriggerSource;
    status: AlertStatus;
    createdAt: Timestamp;
    expiresAt: Timestamp;
    acceptedBy: AcceptedByEntry[];
    firstAcceptedBy?: string;
    firstAcceptedAt?: Timestamp;
    resolvedAt?: Timestamp;
    resolvedBy?: string;
    cancelledAt?: Timestamp;
}
export type AlertHistory = Alert & {
    archivedAt: Timestamp;
};
//# sourceMappingURL=alert.d.ts.map