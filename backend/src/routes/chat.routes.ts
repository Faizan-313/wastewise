import express from "express";
import multer from "multer";
import { analyzeItem, chatController } from "../controllers/chat.controllers.js";

const router = express.Router();

const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 2,
    },
});

router.post("/", upload.any(), analyzeItem);
router.post("/:chatId", upload.any(), chatController);

export default router;