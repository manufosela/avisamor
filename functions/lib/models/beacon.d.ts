import { type Timestamp } from "firebase-admin/firestore";
export interface Beacon {
    beaconId: string;
    groupId: string;
    zoneName: string;
    floor: number;
    rssiAtOneMeter: number;
    active: boolean;
    createdAt: Timestamp;
    createdBy: string;
}
//# sourceMappingURL=beacon.d.ts.map