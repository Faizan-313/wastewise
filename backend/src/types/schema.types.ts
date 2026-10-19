export interface IUser {
    name: string;
    email: string;
    passwordHash: string;
    refreshToken: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

