export declare const setAdminClaim: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
export declare const adminListGroups: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    groups: {
        groupId: string;
        name: any;
        planId: any;
        blocked: any;
        createdBy: any;
        createdAt: any;
        membersCount: number;
        beaconsCount: number;
        lastAlertAt: any;
    }[];
}>, unknown>;
export declare const adminGetDashboard: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    totalGroups: number;
    totalMembers: number;
    totalBeacons: number;
    alertsToday: number;
    alertsWeek: number;
    totalAlerts: number;
}>, unknown>;
export declare const adminUpdateGroup: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    groupId: string;
    updates: Record<string, unknown>;
}>, unknown>;
export declare const adminCheckSetup: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    setupComplete: boolean;
}>, unknown>;
export declare const adminCreatePlan: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    plan: {
        planId: string;
        name: string;
        priceMonthly: number;
        order: number;
        active: boolean;
        limits: {
            maxGroups: number;
            maxMembers: number;
            maxBeacons: number;
            supervisionPanel: boolean;
            adminPanel: boolean;
        };
    };
}>, unknown>;
export declare const adminUpdatePlan: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    planId: string;
}>, unknown>;
//# sourceMappingURL=admin.d.ts.map