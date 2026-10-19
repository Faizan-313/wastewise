import { HttpError } from "../lib/http-error.js";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";

import type { CookieOptions, RequestHandler } from "express";

const isProduction = process.env.NODE_ENV === "production";

const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
};

const generateTokens = async (user: InstanceType<typeof User>) => {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
}

const validateEmailAndPassword = (email: string, password: string) => {
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        return new HttpError(400, "BAD_REQUEST", "Invalid email format");
    }
    if(password.length < 8 || password.length > 64 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)){
        return new HttpError(400, "BAD_REQUEST", "Password must be between 8 and 64 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character");
    }
    return null;
}


// @desc  Handles the login request
// @route POST /api/auth/login
const login: RequestHandler = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if(!email || email.trim() === "" || !password || password.trim() === ""){
            return next(new HttpError(400, "BAD_REQUEST", "Email and password are required"));
        }

        // Validate email format and password strength
        const emailPasswordError = validateEmailAndPassword(email, password);
        if (emailPasswordError) {
            return next(emailPasswordError);
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        
        //instead of directly returing from here we will still do the hash comapring with the dummy hash if the user is not found to avoid timing attacks
        if(!user){
            const dummyHash = process.env.DUMMY_PASSWORD_HASH || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3OTQ5OTU4NTJ9.KWjCoZEFT-vVOEh_-vMFX5APJpgGV24PHrmfE_0cjXE"; 
            await bcrypt.compare(password, dummyHash);
            return next(new HttpError(401, "UNAUTHORIZED", "Invalid email or password"));
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if(!isPasswordValid){
            return next(new HttpError(401, "UNAUTHORIZED", "Invalid email or password"));
        }

        //password is valid, we can generate two tokens here, access and refresh token
        const { accessToken, refreshToken } = await generateTokens(user);

        if(!accessToken || !refreshToken){
            return next(new HttpError(500, "INTERNAL_SERVER_ERROR", "Failed to generate tokens"));
        }

        res.cookie("refreshToken", refreshToken, options);
        res.cookie("accessToken", accessToken, options);
        return res.status(200);

    }catch (error){
        return next(new HttpError(500, "INTERNAL_SERVER_ERROR", "An error occurred while processing the login request"));
    }
}

// @desc  Handles the registration request
// @route POST /api/auth/register
const register: RequestHandler = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        if([name, email, password].some(field => !field || field.trim() === "")){
            return next(new HttpError(400, "BAD_REQUEST", "name, email and password are required"));
        }

        const emailPasswordError = validateEmailAndPassword(email, password);
        if (emailPasswordError) {
            return next(emailPasswordError);
        }

        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if(existingUser){
            return next(new HttpError(409, "CONFLICT", "Email is already registered"));
        }

        const newUser = new User({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            passwordHash: password
        })

        const userCreated = await newUser.save();
        if(!userCreated){
            return next(new HttpError(500, "INTERNAL_SERVER_ERROR", "Failed to register user"));
        }

        return res.status(201).json({ message: "User registered successfully" });

    }catch (error) {
        return next(new HttpError(500, "INTERNAL_SERVER_ERROR", "An error occurred while processing the registration request"));
    }
}

// @desc  Handles the logout request
// @route POST /api/auth/logout
const logout: RequestHandler = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        if(!refreshToken){
            return next(new HttpError(400, "BAD_REQUEST", "Refresh token is required for logout"));
        }

        const user = await User.findOne({ refreshToken });
        if(!user){
            return next(new HttpError(401, "UNAUTHORIZED", "Invalid request"));
        }

        user.refreshToken = null;
        const result = await user.save({ validateBeforeSave: false });
        if(!result){
            return next(new HttpError(500, "INTERNAL_SERVER_ERROR", "Failed to logout user"));
        }

        res.clearCookie('refreshToken');
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        return next(new HttpError(500, "INTERNAL_SERVER_ERROR", "An error occurred while processing the logout request"));
    }
}

// @desc  Handles the regenration of auth tokens using the refresh token
// @route POST /api/auth/refresh
const refreshTokens: RequestHandler = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        if(!refreshToken){
            return next(new HttpError(400, "BAD_REQUEST", "Refresh token is required"));
        }

        const user = await User.findOne({ refreshToken });
        if(!user){
            return next(new HttpError(401, "UNAUTHORIZED", "Invalid request"));
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);
        if(!accessToken || !newRefreshToken){
            return next(new HttpError(500, "INTERNAL_SERVER_ERROR", "Failed to generate tokens"));
        }

        res.cookie("refreshToken", newRefreshToken, options);
        res.cookie("accessToken", accessToken, options);
        return res.status(200);


    } catch (error) {
        return next(new HttpError(500, "INTERNAL_SERVER_ERROR", "An error occurred while processing the token refresh request"));
    }
}

export {
    login, 
    register,
    logout,
    refreshTokens
}