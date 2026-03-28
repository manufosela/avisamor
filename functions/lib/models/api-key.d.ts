import { type Timestamp } from "firebase-admin/firestore";
export interface ApiKey {
    keyId: string;
    keyHash: string;
    groupId: string;
    createdAt: Timestamp;
    active: boolean;
    label: string;
}
//# sourceMappingURL=api-key.d.ts.map