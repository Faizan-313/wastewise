import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import type { IUser } from "../types/schema.types.js";

interface IUserMethods {
    generateAccessToken(): string;
    generateRefreshToken(): string;
}

const userSchema = new mongoose.Schema<IUser, mongoose.Model<IUser, {}, IUserMethods>, IUserMethods>({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    refreshToken: { type: String, default: null },
}, {
    timestamps: true
});


userSchema.pre("save", async function () {
    if (this.isModified("passwordHash")) {
        this.passwordHash = await bcrypt.hash(this.passwordHash, parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10));
    }
});


userSchema.methods.generateAccessToken = function () {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const expiresIn = process.env.ACCESS_TOKEN_EXPIRY;
    if (!secret || !expiresIn) {
        throw new Error("Access token secret and expiry must be configured");
    }

    return jwt.sign(
        {
            _id: this._id,
            email: this.email
        },
        secret,
        {
            algorithm: "HS256",
            expiresIn: expiresIn as NonNullable<jwt.SignOptions["expiresIn"]>
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    const expiresIn = process.env.REFRESH_TOKEN_EXPIRY;
    if (!secret || !expiresIn) {
        throw new Error("Refresh token secret and expiry must be configured");
    }

    return jwt.sign(
        {
            _id: this._id
        },
        secret,
        {
            algorithm: "HS256",
            expiresIn: expiresIn as NonNullable<jwt.SignOptions["expiresIn"]>
        }
    )
}

const User = mongoose.model('User', userSchema);

export default User;