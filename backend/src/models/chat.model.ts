import mongoose, { type Document, type Types } from "mongoose";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface ChatDocument extends Document {
    userId?: Types.ObjectId;
    messages: ChatMessage[];
}

const chatSchema = new mongoose.Schema<ChatDocument>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        messages: {
            type: [
                {
                    role: { 
                        type: String, 
                        enum: ["user", "assistant"], 
                        required: true 
                    },
                    content: { 
                        type: String, 
                        required: true 
                    },
                },
            ],
            required: true,
            default: [],
        },
    },
    { timestamps: true },
);

const Chat = mongoose.model<ChatDocument>("Chat", chatSchema);

export default Chat;