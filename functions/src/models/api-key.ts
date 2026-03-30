import { type Timestamp } from "firebase-admin/firestore";

export interface ApiKey {
  keyId: string;
  keyHash: string;
  groupId: string;
  createdAt: Timestamp;
  active: boolean;
  label: string;
  expiresAt?: Timestamp | null;
  lastUsedAt?: Timestamp | null;
}
