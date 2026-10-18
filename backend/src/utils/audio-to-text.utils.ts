import { HttpError } from "../lib/http-error.js";
import axios from "axios";

import type { UploadedFile } from "../types/main.types.js";

export const audioToText = async (audioFile: UploadedFile): Promise<string> => {
    const serviceUrl = process.env.audio_to_text_service_url;
    if (!serviceUrl) {
        throw new HttpError(503, "AUDIO_TO_TEXT_SERVICE_UNAVAILABLE", "Audio transcription is not configured");
    }

    const formData = new FormData();
    formData.append(
        "file",
        new Blob([new Uint8Array(audioFile.buffer)], { type: audioFile.mimetype }),
        audioFile.originalname,
    );
    const transcriptionUrl = new URL("transcribe", `${serviceUrl.replace(/\/+$/, "")}/`);
    let transcriptionResponse;
    try {
        transcriptionResponse = await axios.post(transcriptionUrl.toString(), formData);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new HttpError(502, "AUDIO_TO_TEXT_SERVICE_ERROR", "Audio transcription request failed");
        }
        throw error;
    }
    const transcription = transcriptionResponse.data;

    if (
        transcription?.status === "error" ||
        typeof transcription?.text !== "string" ||
        transcription.text.trim().length === 0
    ) {
        throw new HttpError(502, "AUDIO_TO_TEXT_SERVICE_ERROR", "Audio service did not return a transcription");
    }

    return transcription.text.trim();
};