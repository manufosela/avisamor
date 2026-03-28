import { type Timestamp } from "firebase-admin/firestore";
export declare enum AlertStatus {
    ACTIVE = "ACTIVE",
    ACCEPTED = "ACCEPTED",
    RESOLVED = "RESOLVED",
    CANCELLED = "CANCELLED",
    EXPIRED = "EXPIRED"
}
export declare enum TriggerSource {
    FLIC = "FLIC",
    PWA = "PWA",
    ANDROID = "ANDROID"
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