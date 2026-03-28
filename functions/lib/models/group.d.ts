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
    ALERTER = "ALERTER",
    RESPONDER = "RESPONDER"
}
export interface GroupMember {
    memberId: string;
    uid: string;
    groupId: string;
    role: MemberRole;
    displayName: string;
    fcmToken: string;
    joinedAt: Timestamp;
}
//# sourceMappingURL=group.d.ts.map