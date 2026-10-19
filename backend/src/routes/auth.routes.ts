import express from "express";
import {
    login, 
    register,
    logout,
    refreshTokens
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);

router.post("/logout", logout);
router.post("/refresh", refreshTokens);

export default router;
