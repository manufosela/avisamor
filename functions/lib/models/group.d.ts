import { type Timestamp } from "firebase-admin/firestore";
export interface Group {
    groupId: string;
    code: string;
    name: string;
    createdAt: Timestamp;
    createdBy: string;
    alertExpirySeconds: number;
    escalateTo112: boolean;
    escalateAfterSeconds: number;
}
export declare enum MemberRole {
    ALERTER = "alerter",
    RESPONDER = "responder"
}
export interface GroupMember {
    memberId: string;
    uid: string;
    groupId: string;
    role: MemberRole;
    displayName: string;
    fcmToken: string | null;
    joinedAt: Timestamp;
    currentZone?: string | null;
    currentZoneUpdatedAt?: Timestamp | null;
}
//# sourceMappingURL=group.d.ts.map