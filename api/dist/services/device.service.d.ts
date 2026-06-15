export declare function bindDevice(userId: string, deviceId: string, platform?: string): Promise<void>;
export declare function getSharedDevices(): Promise<Array<{
    deviceId: string;
    accounts: Array<{
        userId: string;
        username: string;
        email: string;
        isFlagged: boolean;
    }>;
}>>;
//# sourceMappingURL=device.service.d.ts.map