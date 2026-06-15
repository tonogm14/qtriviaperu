import { User } from '@prisma/client';
export type SafeUser = Omit<User, 'password'>;
export declare function generateToken(user: SafeUser): string;
export declare function sanitizeUser(user: User): SafeUser;
export declare function registerUser(data: {
    name: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
}): Promise<{
    token: string;
    user: SafeUser;
}>;
export declare function checkAvailability(data: {
    email?: string;
    username?: string;
}): Promise<{
    emailTaken: boolean;
    usernameTaken: boolean;
}>;
export declare function loginUser(data: {
    email: string;
    password: string;
}): Promise<{
    token: string;
    user: SafeUser;
}>;
export declare function getUserById(id: string): Promise<SafeUser | null>;
export declare function updateUserProfile(id: string, data: {
    name?: string;
    phone?: string;
    password?: string;
}): Promise<SafeUser>;
//# sourceMappingURL=auth.service.d.ts.map