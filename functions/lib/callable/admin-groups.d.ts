export declare const adminGetGroup: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    group: {
        groupId: string;
    };
    members: {
        id: string;
    }[];
    beacons: {
        id: string;
    }[];
    alerts: Record<string, unknown>[];
}>, unknown>;
export declare const adminCreateGroupFromAdmin: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    groupId: string;
    code: string;
}>, unknown>;
export declare const adminUpdateMember: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
export declare const adminDeleteMember: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
export declare const adminDeleteBeacon: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
//# sourceMappingURL=admin-groups.d.ts.map