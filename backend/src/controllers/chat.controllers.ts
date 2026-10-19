import { HttpError } from "../lib/http-error.js";
import { analyzeWaste } from "../services/ai.service.js";
import Chat from "../models/chat.model.js";
import { audioToText } from "../utils/audio-to-text.utils.js";
import { redisClient } from "../config/redis.config.js";

import type { RequestHandler } from "express";

interface ChatRequestContext {
    text: string;
    imageFile: Express.Multer.File | undefined;
    audioFile: Express.Multer.File | undefined;
    analysisInput: string;
}

const getAuthenticatedUserId = (req: Parameters<RequestHandler>[0]) => {
    const userId = req.user && typeof req.user.id === "string" ? req.user.id : undefined;
    return userId && userId.length > 0 ? userId : undefined;
};

const parseChatRequest = async (req: Parameters<RequestHandler>[0]): Promise<ChatRequestContext> => {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const files = Array.isArray(req.files) ? req.files : [];

    const imageFiles = files.filter((file) => file.mimetype.startsWith("image/"));
    const audioFiles = files.filter((file) => file.mimetype.startsWith("audio/"));

    if (!text && imageFiles.length === 0 && audioFiles.length === 0) {
        throw new HttpError(400, "BAD_REQUEST", "No text or files provided");
    }

    if (imageFiles.length > 1 || audioFiles.length > 1 || files.length !== imageFiles.length + audioFiles.length) {
        throw new HttpError(400, "BAD_REQUEST", "Provide at most one image and one audio file");
    }

    const imageFile = imageFiles[0];
    const audioFile = audioFiles[0];
    let audioText = "";

    if (audioFile) {
        audioText = await audioToText(audioFile);
    }

    return {
        text,
        imageFile,
        audioFile,
        analysisInput: [text, audioText].filter(Boolean).join("\n"),
    };
};

const toAiImageInput = (imageFile?: Express.Multer.File) =>
    imageFile
        ? {
            mimeType: imageFile.mimetype,
            data: imageFile.buffer.toString("base64"),
        }
        : undefined;

const persistChatMessage = async (userId: string | undefined, chatId: string, messages: Array<{ role: "user" | "assistant"; content: string }>) => {
    if (userId) {
        await Chat.create({ userId, messages });
        return;
    }

    await redisClient.setEx(`chat:${chatId}`, 1000 * 60 * 30, JSON.stringify({ messages }));
};

const getChatId = (userId: string | undefined) => `${userId ? "private" : "public"}:${crypto.randomUUID()}`;

// @desc  Analyze the first request from the user and start a chat
// @route POST /api/conversation
const analyzeItem: RequestHandler = async (req, res, next) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { analysisInput, imageFile } = await parseChatRequest(req);

        const aiResponse = await analyzeWaste(
            analysisInput || "Please analyze the item shown in the attached image.",
            toAiImageInput(imageFile),
        );

        if (aiResponse.status === "error") {
            return next(new HttpError(502, "AI_SERVICE_ERROR", aiResponse.message));
        }

        const chatId = getChatId(userId);
        const messages = [
            { role: "user" as const, content: analysisInput || "Analyze the item in the attached image." },
            { role: "assistant" as const, content: aiResponse.text },
        ];

        await persistChatMessage(userId, chatId, messages);

        return res.status(201).json({
            chatId,
            analysis: aiResponse.text,
        });
    } catch (error) {
        return next(new HttpError(500, "INTERNAL_SERVER_ERROR", "An error occurred while processing the chat request"));
    }
};

// @desc  Handle the rest of the conversation after the first request from the user
// @route POST /api/chat/:chatId
const chatController: RequestHandler = async (req, res, next) => {
    try {
        const chatId = req.params.chatId;

        if (typeof chatId !== "string" || chatId.length === 0) {
            return next(new HttpError(400, "BAD_REQUEST", "Invalid chatId"));
        }

        const userId = getAuthenticatedUserId(req);

        if (chatId.startsWith("private:") && !userId) {
            return next(new HttpError(403, "FORBIDDEN", "You must be signed in to access this chat"));
        }

        const { analysisInput, imageFile } = await parseChatRequest(req);

        const aiResponse = await analyzeWaste(
            analysisInput || "Please analyze the item shown in the attached image.",
            toAiImageInput(imageFile),
        );

        if (aiResponse.status === "error") {
            return next(new HttpError(502, "AI_SERVICE_ERROR", aiResponse.message));
        }

        const messages = [
            { role: "user" as const, content: analysisInput || "Analyze the item in the attached image." },
            { role: "assistant" as const, content: aiResponse.text },
        ];

        await persistChatMessage(userId, chatId, messages);

        return res.status(201).json({
            chatId,
            analysis: aiResponse.text,
        });
    } catch (error) {
        return next(new HttpError(500, "INTERNAL_SERVER_ERROR", "An error occurred while processing the chat request"));
    }
};

export { analyzeItem, chatController };
