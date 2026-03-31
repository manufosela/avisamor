export declare const registerBeacon: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    id: string;
    beaconId: string;
    zoneName: string;
    floor: number;
}>, unknown>;
export declare const listBeacons: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    beacons: {
        id: string;
        beaconId: any;
        zoneName: any;
        floor: any;
        rssiAtOneMeter: any;
    }[];
}>, unknown>;
//# sourceMappingURL=register-beacon.d.ts.map