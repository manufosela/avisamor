export declare const adminListUsers: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    users: {
        uid: string;
        displayName: string;
        email: string;
        photoURL: string;
        isAdmin: boolean;
        groupCount: number;
        lastSignIn: string | null;
    }[];
}>, unknown>;
export declare const adminUpdateUser: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
export declare const adminDeleteUser: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
//# sourceMappingURL=admin-users.d.ts.map